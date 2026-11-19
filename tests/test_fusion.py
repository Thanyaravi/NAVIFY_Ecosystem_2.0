"""Unit tests for NAVIFY Sensor Fusion Engine"""

import unittest
from edge.detection.detector import Detection
from edge.fusion.sensor_fusion import SensorFusionEngine

class TestSensorFusion(unittest.TestCase):
    def setUp(self):
        self.fusion = SensorFusionEngine()

    def test_center_corridor_obstruction(self):
        # A chair right in the middle (center_x = 0.5)
        detections = [
            Detection(
                class_name="chair",
                confidence=0.89,
                bbox=(0.4, 0.4, 0.6, 0.8),
                center_x=0.5,
                center_y=0.6,
                width=0.2,
                height=0.4
            )
        ]
        # Left sensor has 140cm, right sensor has 250cm
        ultrasonic = {"left": 140.0, "right": 250.0}
        imu = {"pitch_deg": 15.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        
        self.assertEqual(len(scene.obstacles), 1)
        obs = scene.obstacles[0]
        self.assertEqual(obs.zone, "CENTER")
        self.assertTrue(obs.is_in_walking_path)
        self.assertEqual(obs.distance_cm, 140.0) # Picked min distance
        self.assertTrue(scene.center_corridor_blocked)
        self.assertFalse(scene.left_corridor_clear) # 140cm < 150cm threshold
        self.assertTrue(scene.right_corridor_clear) # 250cm >= 150cm threshold

    def test_lateral_clearance_determination(self):
        # Person on the left side (center_x = 0.2)
        detections = [
            Detection(
                class_name="person",
                confidence=0.91,
                bbox=(0.1, 0.2, 0.3, 0.8),
                center_x=0.2,
                center_y=0.5,
                width=0.2,
                height=0.6
            )
        ]
        # Left has 110cm, right has 300cm
        ultrasonic = {"left": 110.0, "right": 300.0}
        imu = {"pitch_deg": 10.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        self.assertFalse(scene.center_corridor_blocked)
        self.assertFalse(scene.left_corridor_clear)
        self.assertTrue(scene.right_corridor_clear)

if __name__ == "__main__":
    unittest.main()
