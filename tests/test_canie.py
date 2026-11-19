"""Unit tests for NAVIFY CANIE Dual-Mode (Safe / Unsafe & Compound) Decision Engine"""

import unittest
from edge.detection.detector import Detection
from edge.fusion.sensor_fusion import SensorFusionEngine
from edge.canie.engine import CANIEEngine
from edge.canie.priorities import Priority

class TestCANIEDualModeEngine(unittest.TestCase):
    def setUp(self):
        self.fusion = SensorFusionEngine()
        self.canie = CANIEEngine()

    # =========================================================================
    # 1. UNSAFE / NEGATIVE HAZARD TESTS
    # =========================================================================
    def test_unsafe_chair_obstruction_suggests_right_avoidance(self):
        # Obstructing chair in center path, right side clear
        detections = [
            Detection(class_name="chair", confidence=0.90, bbox=(0.4, 0.4, 0.6, 0.8),
                      center_x=0.5, center_y=0.6, width=0.2, height=0.4)
        ]
        ultrasonic = {"left": 120.0, "right": 280.0}
        imu = {"pitch_deg": 12.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.safety_mode, "UNSAFE_HAZARD")
        self.assertEqual(decision.corridor_state, "OBSTRUCTED")
        self.assertEqual(decision.avoidance_direction, "RIGHT")
        self.assertEqual(decision.steps_estimate, 2)
        self.assertTrue(decision.should_speak)
        self.assertIn("chair", decision.spoken_message.lower())
        self.assertIn("move 2 steps right", decision.spoken_message.lower())

    def test_unsafe_stairs_down_triggers_critical_stop(self):
        # Descending stairs (critical drop-off hazard)
        detections = [
            Detection(class_name="stairs_down", confidence=0.92, bbox=(0.3, 0.5, 0.7, 0.9),
                      center_x=0.5, center_y=0.7, width=0.4, height=0.4)
        ]
        ultrasonic = {"left": 120.0, "right": 120.0}
        imu = {"pitch_deg": 10.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.priority, Priority.CRITICAL)
        self.assertEqual(decision.avoidance_direction, "STOP")
        self.assertIn("danger! drop-off hazard", decision.spoken_message.lower())
        self.assertIn("stop immediately", decision.spoken_message.lower())

    def test_unsafe_overhead_hazard_triggers_duck_alert(self):
        # Low hanging tree branch or scaffolding
        detections = [
            Detection(class_name="overhead_obstacle", confidence=0.87, bbox=(0.35, 0.05, 0.65, 0.35),
                      center_x=0.5, center_y=0.2, width=0.3, height=0.3)
        ]
        ultrasonic = {"left": 160.0, "right": 160.0}
        imu = {"pitch_deg": 12.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.priority, Priority.CRITICAL)
        self.assertIn("overhead collision hazard at head height", decision.spoken_message.lower())

    # =========================================================================
    # 2. SAFE / POSITIVE WAYPOINT TESTS
    # =========================================================================
    def test_safe_open_doorway_guidance(self):
        # Open door straight ahead, walkway clear
        detections = [
            Detection(class_name="door_open", confidence=0.94, bbox=(0.35, 0.2, 0.65, 0.9),
                      center_x=0.5, center_y=0.55, width=0.3, height=0.7)
        ]
        ultrasonic = {"left": 250.0, "right": 250.0}
        imu = {"pitch_deg": 10.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.safety_mode, "SAFE_WAYPOINT")
        self.assertEqual(decision.corridor_state, "WAYPOINT_AHEAD")
        self.assertTrue(decision.should_speak)
        self.assertIn("open doorway ahead", decision.spoken_message.lower())
        self.assertIn("path is clear to enter", decision.spoken_message.lower())

    def test_safe_tactile_paving_guidance(self):
        # Yellow tactile paving on ground
        detections = [
            Detection(class_name="tactile_paving", confidence=0.89, bbox=(0.3, 0.6, 0.7, 1.0),
                      center_x=0.5, center_y=0.8, width=0.4, height=0.4)
        ]
        ultrasonic = {"left": 200.0, "right": 200.0}
        imu = {"pitch_deg": 10.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.safety_mode, "SAFE_WAYPOINT")
        self.assertIn("tactile paving detected on your path", decision.spoken_message.lower())

    def test_safe_handrail_guidance(self):
        # Handrail on the right side
        detections = [
            Detection(class_name="handrail", confidence=0.91, bbox=(0.7, 0.3, 0.95, 0.8),
                      center_x=0.82, center_y=0.55, width=0.25, height=0.5)
        ]
        ultrasonic = {"left": 250.0, "right": 120.0}
        imu = {"pitch_deg": 10.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.safety_mode, "SAFE_WAYPOINT")
        self.assertIn("handrail available on your right", decision.spoken_message.lower())

    # =========================================================================
    # 3. COMPOUND SCENE (UNSAFE OBSTACLE + SAFE WAYPOINT IN SAME SCENE)
    # =========================================================================
    def test_compound_scene_obstacle_and_doorway(self):
        # Chair blocking center, but open doorway visible on the right side!
        detections = [
            Detection(class_name="chair", confidence=0.90, bbox=(0.4, 0.4, 0.6, 0.8),
                      center_x=0.5, center_y=0.6, width=0.2, height=0.4),
            Detection(class_name="door_open", confidence=0.93, bbox=(0.7, 0.2, 0.95, 0.85),
                      center_x=0.82, center_y=0.52, width=0.25, height=0.65)
        ]
        ultrasonic = {"left": 110.0, "right": 250.0} # Right corridor is clear
        imu = {"pitch_deg": 10.0, "roll_deg": 0.0, "is_walking": True, "tilt_warning": False}

        scene = self.fusion.fuse(detections, ultrasonic, imu)
        decision = self.canie.process(scene)

        self.assertIsNotNone(decision)
        self.assertEqual(decision.safety_mode, "COMPOUND_DETOUR")
        self.assertEqual(decision.avoidance_direction, "RIGHT")
        self.assertEqual(decision.steps_estimate, 2)
        # Should mention both the chair obstruction and moving right toward the open door
        self.assertIn("chair is", decision.spoken_message.lower())
        self.assertIn("door open is visible to your right", decision.spoken_message.lower())
        self.assertIn("move 2 steps right toward the door open", decision.spoken_message.lower())

if __name__ == "__main__":
    unittest.main()
