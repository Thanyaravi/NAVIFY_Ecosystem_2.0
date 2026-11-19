"""NAVIFY Local SQLite Persistence Engine
Provides offline-first logging for detections, navigation decisions, SOS events,
and system telemetry. Works seamlessly without an active internet connection.
"""

import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger("navify.storage")

class EventStore:
    def __init__(self, db_path: Path):
        self.db_path = str(db_path)
        self._init_db()

    @contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        """Initializes tables with indices for fast offline querying and syncing."""
        with self._connection() as conn:
            cursor = conn.cursor()
            
            # 1. Raw AI Detections
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    class_name TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    bbox_x1 REAL,
                    bbox_y1 REAL,
                    bbox_x2 REAL,
                    bbox_y2 REAL,
                    distance_cm REAL,
                    zone TEXT,
                    synced INTEGER DEFAULT 0
                )
            """)

            # 2. CANIE Navigation Decisions & Spoken Guidance
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS navigation_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    object_name TEXT,
                    distance_cm REAL,
                    corridor_state TEXT NOT NULL,
                    avoidance_direction TEXT,
                    steps_estimate INTEGER,
                    message_spoken TEXT NOT NULL,
                    synced INTEGER DEFAULT 0
                )
            """)

            # 3. Emergency SOS Events
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sos_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    trigger_type TEXT DEFAULT 'BUTTON_PRESS',
                    status TEXT DEFAULT 'TRIGGERED',
                    location_lat REAL,
                    location_lng REAL,
                    synced INTEGER DEFAULT 0
                )
            """)

            # 4. System Health & Telemetry
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_telemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    battery_pct REAL,
                    cpu_temp_c REAL,
                    inference_fps REAL,
                    network_online INTEGER,
                    synced INTEGER DEFAULT 0
                )
            """)

            # Indices for rapid sync queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_nav_synced ON navigation_events(synced)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sos_synced ON sos_events(synced)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_det_synced ON detections(synced)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_synced ON system_telemetry(synced)")

            conn.commit()
            logger.info("Local SQLite database initialized at %s", self.db_path)

    def log_detection(self, class_name: str, confidence: float, bbox: tuple, 
                      distance_cm: Optional[float], zone: str) -> int:
        """Stores an individual visual detection."""
        ts = datetime.now(timezone.utc).isoformat()
        x1, y1, x2, y2 = bbox if bbox else (None, None, None, None)
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO detections (timestamp, class_name, confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2, distance_cm, zone, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (ts, class_name, float(confidence), x1, y1, x2, y2, distance_cm, zone))
            conn.commit()
            return cursor.lastrowid

    def log_navigation_event(self, priority: str, object_name: Optional[str], distance_cm: Optional[float],
                             corridor_state: str, avoidance_direction: Optional[str], 
                             steps_estimate: Optional[int], message_spoken: str) -> int:
        """Stores a CANIE contextual decision and audio prompt."""
        ts = datetime.now(timezone.utc).isoformat()
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO navigation_events 
                (timestamp, priority, object_name, distance_cm, corridor_state, avoidance_direction, steps_estimate, message_spoken, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (ts, priority, object_name, distance_cm, corridor_state, avoidance_direction, steps_estimate, message_spoken))
            conn.commit()
            return cursor.lastrowid

    def log_sos_event(self, trigger_type: str = "BUTTON_PRESS", 
                      location_lat: Optional[float] = None, location_lng: Optional[float] = None) -> int:
        """Stores an emergency SOS alert."""
        ts = datetime.now(timezone.utc).isoformat()
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sos_events (timestamp, trigger_type, status, location_lat, location_lng, synced)
                VALUES (?, ?, 'TRIGGERED', ?, ?, 0)
            """, (ts, trigger_type, location_lat, location_lng))
            conn.commit()
            logger.warning("Emergency SOS event recorded locally! Row ID: %s", cursor.lastrowid)
            return cursor.lastrowid

    def log_telemetry(self, battery_pct: float, cpu_temp_c: float, 
                      inference_fps: float, network_online: bool) -> int:
        """Stores device health and performance metrics."""
        ts = datetime.now(timezone.utc).isoformat()
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_telemetry (timestamp, battery_pct, cpu_temp_c, inference_fps, network_online, synced)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (ts, battery_pct, cpu_temp_c, inference_fps, 1 if network_online else 0))
            conn.commit()
            return cursor.lastrowid

    def get_unsynced_records(self, table: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves a batch of unsynced records from the requested table."""
        allowed_tables = ("detections", "navigation_events", "sos_events", "system_telemetry")
        if table not in allowed_tables:
            raise ValueError(f"Invalid table: {table}")

        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table} WHERE synced = 0 ORDER BY id ASC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def mark_records_synced(self, table: str, ids: List[int]):
        """Marks successfully uploaded records as synced."""
        if not ids:
            return
        allowed_tables = ("detections", "navigation_events", "sos_events", "system_telemetry")
        if table not in allowed_tables:
            raise ValueError(f"Invalid table: {table}")

        placeholders = ",".join("?" for _ in ids)
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE {table} SET synced = 1 WHERE id IN ({placeholders})", ids)
            conn.commit()
