"""Unit tests for NAVIFY Local SQLite Event Store"""

import unittest
import tempfile
from pathlib import Path
from edge.storage.event_store import EventStore

class TestEventStore(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_navify.db"
        self.store = EventStore(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_log_detection(self):
        row_id = self.store.log_detection("chair", 0.92, (0.4, 0.4, 0.6, 0.8), 140.5, "CENTER")
        self.assertGreater(row_id, 0)

        unsynced = self.store.get_unsynced_records("detections")
        self.assertEqual(len(unsynced), 1)
        self.assertEqual(unsynced[0]["class_name"], "chair")
        self.assertEqual(unsynced[0]["synced"], 0)

    def test_log_navigation_and_sync(self):
        row_id = self.store.log_navigation_event(
            priority="HIGH",
            object_name="chair",
            distance_cm=140.0,
            corridor_state="OBSTRUCTED",
            avoidance_direction="RIGHT",
            steps_estimate=2,
            message_spoken="A chair is detected ahead, move 2 steps right."
        )
        self.assertGreater(row_id, 0)

        unsynced = self.store.get_unsynced_records("navigation_events")
        self.assertEqual(len(unsynced), 1)
        self.assertEqual(unsynced[0]["avoidance_direction"], "RIGHT")

        # Mark synced
        self.store.mark_records_synced("navigation_events", [row_id])
        remaining = self.store.get_unsynced_records("navigation_events")
        self.assertEqual(len(remaining), 0)

    def test_log_sos(self):
        row_id = self.store.log_sos_event("BUTTON_PRESS", 13.064, 77.595)
        self.assertGreater(row_id, 0)

        unsynced = self.store.get_unsynced_records("sos_events")
        self.assertEqual(len(unsynced), 1)
        self.assertEqual(unsynced[0]["trigger_type"], "BUTTON_PRESS")
        self.assertEqual(unsynced[0]["status"], "TRIGGERED")

if __name__ == "__main__":
    unittest.main()
