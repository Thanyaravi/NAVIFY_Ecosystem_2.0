"""Unit tests for Reflective Surface & Glare Detection Module (FIG 1.1 Architecture)."""

import unittest
import numpy as np
import cv2
from edge.detection.reflective import ReflectiveSurfaceDetector


class TestReflectiveSurfaceDetector(unittest.TestCase):
    def setUp(self):
        self.detector = ReflectiveSurfaceDetector(min_area_ratio=0.03, glare_threshold=220)

    def test_matte_surface_no_reflection(self):
        # Create normal diffuse matte frame (random noise texture, moderate brightness)
        np.random.seed(42)
        frame = np.random.randint(50, 150, (480, 640, 3), dtype=np.uint8)
        result = self.detector.analyze(frame)

        self.assertFalse(result.is_reflective)
        self.assertEqual(result.safety_state, "NORMAL")
        self.assertEqual(len(result.regions), 0)

    def test_specular_glare_mirror_surface_detected(self):
        # Create frame with a large bright specular highlight (mirror/glass panel)
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Low saturation, high brightness (V=255, S=10)
        hsv_glare = np.zeros((200, 250, 3), dtype=np.uint8)
        hsv_glare[:, :, 0] = 0    # Hue
        hsv_glare[:, :, 1] = 10   # Saturation (low)
        hsv_glare[:, :, 2] = 250  # Value (very bright)
        bgr_glare = cv2.cvtColor(hsv_glare, cv2.COLOR_HSV2BGR)

        # Place glare region in the center-right of frame
        frame[100:300, 200:450] = bgr_glare

        result = self.detector.analyze(frame)
        self.assertTrue(result.is_reflective)
        self.assertEqual(result.safety_state, "REFLECTIVE")
        self.assertGreaterEqual(len(result.regions), 1)
        self.assertIsNotNone(result.primary_warning)


if __name__ == "__main__":
    unittest.main()
