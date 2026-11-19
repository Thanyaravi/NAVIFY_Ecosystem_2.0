"""Unit tests for Alert Suppression Engine"""

import unittest
import time
from edge.canie.suppression import AlertSuppressionEngine
from edge.canie.priorities import Priority

class TestAlertSuppression(unittest.TestCase):
    def setUp(self):
        self.suppressor = AlertSuppressionEngine()

    def test_repeat_alert_suppression(self):
        # First alert should be announced
        first_allowed = self.suppressor.should_announce("chair", "CENTER", Priority.HIGH, 150.0)
        self.assertTrue(first_allowed)
        self.suppressor.mark_announced("chair", "CENTER", Priority.HIGH, 150.0)

        # Immediate identical alert should be suppressed
        second_allowed = self.suppressor.should_announce("chair", "CENTER", Priority.HIGH, 150.0)
        self.assertFalse(second_allowed)

    def test_distance_closing_bypasses_suppression(self):
        self.suppressor.mark_announced("chair", "CENTER", Priority.HIGH, 180.0)
        
        # Distance closes by 50cm (from 180cm to 130cm, which is > 40cm threshold)
        approached_allowed = self.suppressor.should_announce("chair", "CENTER", Priority.HIGH, 130.0)
        self.assertTrue(approached_allowed)

    def test_priority_escalation_bypasses_suppression(self):
        self.suppressor.mark_announced("chair", "CENTER", Priority.LOW, 280.0)

        # Priority escalates to CRITICAL
        escalated_allowed = self.suppressor.should_announce("chair", "CENTER", Priority.CRITICAL, 80.0)
        self.assertTrue(escalated_allowed)

if __name__ == "__main__":
    unittest.main()
