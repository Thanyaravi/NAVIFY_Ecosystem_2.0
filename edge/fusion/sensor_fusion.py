"""NAVIFY Sensor Fusion Layer
Combines 2D computer vision detections, dual-channel ultrasonic range data,
and 6-DOF IMU cane posture into a unified 3D spatial scene representation.
"""

import logging
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from edge.config.settings import CORRIDOR_CONFIG
from edge.detection.detector import Detection

logger = logging.getLogger("navify.fusion")

@dataclass
class FusedObstacle:
    class_name: str
    confidence: float
    zone: str               # "LEFT", "CENTER", "RIGHT"
    distance_cm: Optional[float]
    distance_valid: bool
    is_in_walking_path: bool
    bbox: Tuple[float, float, float, float]
    center_x: float
    center_y: float

@dataclass
class FusedScene:
    obstacles: List[FusedObstacle]
    left_clearance_cm: Optional[float]
    right_clearance_cm: Optional[float]
    center_corridor_blocked: bool
    left_corridor_clear: bool
    right_corridor_clear: bool
    imu_state: Dict[str, any]


class SensorFusionEngine:
    def __init__(self):
        self.left_max_x = CORRIDOR_CONFIG["LEFT_MAX_X"]
        self.center_min_x = CORRIDOR_CONFIG["CENTER_MIN_X"]
        self.center_max_x = CORRIDOR_CONFIG["CENTER_MAX_X"]
        self.right_min_x = CORRIDOR_CONFIG["RIGHT_MIN_X"]
        self.clear_passage_min_cm = CORRIDOR_CONFIG["CLEAR_PASSAGE_MIN_CM"]
        self.critical_dist_cm = CORRIDOR_CONFIG["CRITICAL_DIST_CM"]

    def _determine_zone(self, center_x: float) -> str:
        if center_x < self.center_min_x:
            return "LEFT"
        elif center_x > self.center_max_x:
            return "RIGHT"
        else:
            return "CENTER"

    def fuse(self, detections: List[Detection], 
             ultrasonic_data: Dict[str, Optional[float]], 
             imu_state: Dict[str, any]) -> FusedScene:
        """
        Fuses visual bounding boxes with left & right ultrasonic readings.
        """
        left_dist = ultrasonic_data.get("left")
        right_dist = ultrasonic_data.get("right")

        fused_obstacles: List[FusedObstacle] = []
        center_blocked = False

        for det in detections:
            zone = self._determine_zone(det.center_x)
            
            # Associate distance from the respective ultrasonic beam
            if zone == "LEFT":
                assigned_dist = left_dist
            elif zone == "RIGHT":
                assigned_dist = right_dist
            else: # CENTER zone: walking corridor
                # Pick the closer obstacle distance if both sensors see it
                valid_dists = [d for d in (left_dist, right_dist) if d is not None]
                assigned_dist = min(valid_dists) if valid_dists else None

            dist_valid = assigned_dist is not None

            # An obstacle is obstructing the walking path if it sits in the CENTER zone
            # and is within warning range
            is_obstructing = False
            if zone == "CENTER":
                if assigned_dist is not None:
                    if assigned_dist <= CORRIDOR_CONFIG["WARNING_DIST_CM"]:
                        is_obstructing = True
                        center_blocked = True
                else:
                    # Vision sees object centered in path even if ultrasonic missed/angled
                    is_obstructing = True
                    center_blocked = True

            fused_obstacles.append(FusedObstacle(
                class_name=det.class_name,
                confidence=det.confidence,
                zone=zone,
                distance_cm=assigned_dist,
                distance_valid=dist_valid,
                is_in_walking_path=is_obstructing,
                bbox=det.bbox,
                center_x=det.center_x,
                center_y=det.center_y
            ))

        # Check lateral corridor clearance
        left_clear = (left_dist is None or left_dist >= self.clear_passage_min_cm)
        right_clear = (right_dist is None or right_dist >= self.clear_passage_min_cm)

        # Invalidate clearances if any visual obstacle is detected on that side
        for obs in fused_obstacles:
            if obs.zone == "LEFT" and (obs.distance_cm is None or obs.distance_cm < self.clear_passage_min_cm):
                left_clear = False
            elif obs.zone == "RIGHT" and (obs.distance_cm is None or obs.distance_cm < self.clear_passage_min_cm):
                right_clear = False

        return FusedScene(
            obstacles=fused_obstacles,
            left_clearance_cm=left_dist,
            right_clearance_cm=right_dist,
            center_corridor_blocked=center_blocked,
            left_corridor_clear=left_clear,
            right_corridor_clear=right_clear,
            imu_state=imu_state
        )
