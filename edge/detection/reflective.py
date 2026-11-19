"""Reflective Surface Detection Module (Texture Analysis)
Implements Reflective Surface Detection as defined in the NAVIFY System Workflow (FIG 1.1).
Detects mirrors, glass panels, glossy polished floors, and glare hazards using
specular highlights and texture energy (Laplacian variance) analysis.
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Optional


@dataclass
class ReflectiveRegion:
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2) in pixel coordinates
    confidence: float
    surface_type: str                # "GLASS_MIRROR_PANEL", "GLARE_SURFACE", "WET_POLISHED_FLOOR"


@dataclass
class ReflectiveAnalysisResult:
    is_reflective: bool
    safety_state: str                # "REFLECTIVE" or "NORMAL"
    regions: List[ReflectiveRegion]
    primary_warning: Optional[str]


class ReflectiveSurfaceDetector:
    def __init__(self, min_area_ratio: float = 0.04, glare_threshold: int = 230):
        self.min_area_ratio = min_area_ratio
        self.glare_threshold = glare_threshold

    def analyze(self, frame: np.ndarray) -> ReflectiveAnalysisResult:
        """
        Analyzes the video frame for reflective surfaces using texture analysis
        and specular reflection intensity.
        """
        if frame is None or frame.size == 0:
            return ReflectiveAnalysisResult(False, "NORMAL", [], None)

        h, w = frame.shape[:2]
        total_pixels = h * w
        min_contour_area = total_pixels * self.min_area_ratio

        # 1. Convert to HSV for Specular Highlight & Low Saturation isolation
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        _, s, v = cv2.split(hsv)

        # Specular glint: high brightness (V > glare_threshold), low saturation (S < 45)
        specular_mask = cv2.inRange(hsv, np.array([0, 0, self.glare_threshold]), np.array([180, 45, 255]))

        # 2. Texture Energy Analysis via Laplacian
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        texture_energy = np.abs(laplacian)

        # Reflective surfaces exhibit low local high-frequency texture despite high luminance
        # Smooth areas have low texture energy
        low_texture_mask = (texture_energy < 18.0).astype(np.uint8) * 255

        # Combine specular highlights with low texture
        combined_reflective = cv2.bitwise_and(specular_mask, low_texture_mask)

        # Morphological filtering to group connected reflective zones
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        morphed = cv2.morphologyEx(combined_reflective, cv2.MORPH_CLOSE, kernel)
        morphed = cv2.dilate(morphed, kernel, iterations=1)

        # Find candidate reflective regions
        contours, _ = cv2.findContours(morphed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions: List[ReflectiveRegion] = []
        warning = None

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= min_contour_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                x2 = min(w, x + bw)
                y2 = min(h, y + bh)

                # Determine type of reflective hazard based on geometry and placement
                aspect_ratio = bh / float(bw)
                is_ground_level = (y + bh) > (h * 0.70)

                if is_ground_level and bw > (w * 0.35):
                    stype = "WET_POLISHED_FLOOR"
                    label_desc = "Reflective or wet floor detected ahead"
                elif aspect_ratio > 1.2 or (y < h * 0.4 and is_ground_level):
                    stype = "GLASS_MIRROR_PANEL"
                    label_desc = "Glass or mirror reflection detected ahead"
                else:
                    stype = "GLARE_SURFACE"
                    label_desc = "Strong reflective glare detected"

                conf = min(0.95, round(float(area / (total_pixels * 0.25) * 0.7 + 0.25), 2))
                regions.append(ReflectiveRegion(
                    bbox=(x, y, x2, y2),
                    confidence=conf,
                    surface_type=stype
                ))

                if warning is None:
                    warning = label_desc

        is_reflective = len(regions) > 0
        safety_state = "REFLECTIVE" if is_reflective else "NORMAL"

        return ReflectiveAnalysisResult(
            is_reflective=is_reflective,
            safety_state=safety_state,
            regions=regions,
            primary_warning=warning
        )
