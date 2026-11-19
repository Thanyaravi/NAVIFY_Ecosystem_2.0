"""NAVIFY Cloud Synchronization Service
Bridges local offline SQLite data to Firebase / Web Dashboard when network is available.
Runs as an asynchronous background worker that drains unsynced queues.
"""

import time
import logging
import threading
import urllib.request
import json
from typing import Optional
from edge.config.settings import CLOUD_CONFIG
from edge.storage.event_store import EventStore

logger = logging.getLogger("navify.cloud_sync")

class CloudSyncService:
    def __init__(self, event_store: EventStore, sync_interval_sec: float = CLOUD_CONFIG["SYNC_INTERVAL_SEC"]):
        self.store = event_store
        self.interval = sync_interval_sec
        self.device_id = CLOUD_CONFIG["DEVICE_ID"]
        self.firebase_url = CLOUD_CONFIG["FIREBASE_URL"].rstrip("/")
        self.is_running = True
        self.is_online = False
        
        self.worker_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.worker_thread.start()

    def check_connectivity(self) -> bool:
        """Lightweight check to test if external internet connection is reachable."""
        try:
            # Quick probe to Google DNS or standard endpoint (timeout 1.5s)
            urllib.request.urlopen("https://www.google.com", timeout=1.5)
            self.is_online = True
            return True
        except Exception:
            self.is_online = False
            return False

    def _sync_table(self, table_name: str, endpoint_path: str):
        """Pushes unsynced rows from SQLite to Firebase REST endpoint."""
        records = self.store.get_unsynced_records(table_name, limit=20)
        if not records:
            return

        synced_ids = []
        for row in records:
            payload = dict(row)
            payload["device_id"] = self.device_id
            
            # If a real Firebase URL is configured, push via HTTP POST
            if "firebaseio.com" in self.firebase_url:
                try:
                    url = f"{self.firebase_url}/{endpoint_path}.json"
                    data = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
                    with urllib.request.urlopen(req, timeout=3.0) as resp:
                        if resp.status in (200, 201, 204):
                            synced_ids.append(row["id"])
                except Exception as e:
                    logger.debug("Cloud push failed for %s #%s: %s", table_name, row["id"], e)
                    break
            else:
                # Mock or local development: mark synced
                synced_ids.append(row["id"])

        if synced_ids:
            self.store.mark_records_synced(table_name, synced_ids)
            logger.info("Successfully synced %s records from %s to Cloud.", len(synced_ids), table_name)

    def _sync_loop(self):
        """Periodic sync daemon."""
        while self.is_running:
            try:
                online = self.check_connectivity()
                if online:
                    # Sync SOS events first (highest priority)
                    self._sync_table("sos_events", f"devices/{self.device_id}/sos_alerts")
                    # Sync Navigation decisions
                    self._sync_table("navigation_events", f"devices/{self.device_id}/navigation_history")
                    # Sync Detections
                    self._sync_table("detections", f"devices/{self.device_id}/detections")
                    # Sync Telemetry
                    self._sync_table("system_telemetry", f"devices/{self.device_id}/telemetry")
                else:
                    logger.debug("Operating in 100% OFFLINE mode. Data stored locally in SQLite.")
            except Exception as e:
                logger.error("Error in cloud sync loop: %s", e)

            time.sleep(self.interval)

    def stop(self):
        self.is_running = False
