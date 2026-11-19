"""NAVIFY CANIE (Context-Aware Navigation Intelligence Engine) - Dual-Mode Edition
Processes both SAFE (Positive / Waypoints / Navigational Aids) and UNSAFE (Negative / Hazards / Obstacles).
Handles standalone hazards, positive waypoint guidance, and compound scenes
(e.g., bypassing an obstacle directly toward a safe open doorway or handrail).
"""

import logging
from dataclasses import dataclass
from typing import Optional, List, Tuple
from edge.fusion.sensor_fusion import FusedScene, FusedObstacle
from edge.canie.priorities import Priority, evaluate_priority, get_safety_type
from edge.canie.suppression import AlertSuppressionEngine
from edge.config.settings import CORRIDOR_CONFIG
from datasets.taxonomy import classify_any_object, ClassSafetyType

logger = logging.getLogger("navify.canie.engine")

@dataclass
class NavigationDecision:
    priority: Priority
    safety_mode: str               # "UNSAFE_HAZARD", "SAFE_WAYPOINT", "COMPOUND_DETOUR", "CLEAR"
    object_name: Optional[str]
    distance_cm: Optional[float]
    corridor_state: str            # "CLEAR", "OBSTRUCTED", "HAZARDOUS", "WAYPOINT_AHEAD"
    avoidance_direction: Optional[str] # "LEFT", "RIGHT", "STOP", "TOWARD_TARGET", None
    steps_estimate: Optional[int]
    spoken_message: Optional[str]
    should_speak: bool


class CANIEEngine:
    def __init__(self):
        self.suppressor = AlertSuppressionEngine()
        self.step_length_cm = CORRIDOR_CONFIG["AVERAGE_STEP_LENGTH_CM"]

    def _format_distance(self, distance_cm: Optional[float]) -> str:
        """Formats centimeter distance into natural spoken meters or proximity phrase."""
        if distance_cm is None:
            return "ahead"
        if distance_cm < 100.0:
            return "less than one metre away"
        m = round(distance_cm / 100.0, 1)
        return f"approximately {m} metres away"

    def process(self, scene: FusedScene, reflective_result=None) -> Optional[NavigationDecision]:
        """
        Executes dual-mode positive/negative contextual analysis including
        Reflective Surface Detection (FIG 1.1 Architecture).
        """
        # 0. Check Reflective Surface / Glare Hazard (FIG 1.1 Architecture)
        if reflective_result and getattr(reflective_result, "is_reflective", False):
            ref_msg = getattr(reflective_result, "primary_warning", None) or "Reflective surface detected ahead"
            if self.suppressor.should_announce("reflective_surface", "CENTER", Priority.HIGH, 150.0):
                self.suppressor.mark_announced("reflective_surface", "CENTER", Priority.HIGH, 150.0)
                return NavigationDecision(
                    priority=Priority.HIGH,
                    safety_mode="REFLECTIVE",
                    object_name="reflective_surface",
                    distance_cm=150.0,
                    corridor_state="HAZARDOUS",
                    avoidance_direction="CAUTION",
                    steps_estimate=2,
                    spoken_message=f"In 2 steps, {ref_msg.lower()}. Move carefully.",
                    should_speak=True
                )

        # 1. Check IMU Tilt/Fall Alarm
        if scene.imu_state.get("tilt_warning", False):
            msg = "Cane is excessively tilted. Please check cane alignment."
            if self.suppressor.should_announce("tilt", "CENTER", Priority.CRITICAL, None):
                self.suppressor.mark_announced("tilt", "CENTER", Priority.CRITICAL, None)
                return NavigationDecision(
                    priority=Priority.CRITICAL,
                    safety_mode="UNSAFE_HAZARD",
                    object_name="cane_tilt",
                    distance_cm=None,
                    corridor_state="HAZARDOUS",
                    avoidance_direction="STOP",
                    steps_estimate=None,
                    spoken_message=msg,
                    should_speak=True
                )

        # Categorize detected objects into Unsafe (hazards) and Safe (waypoints/guides)
        hazards: List[FusedObstacle] = []
        safe_waypoints: List[FusedObstacle] = []

        for obs in scene.obstacles:
            stype = get_safety_type(obs.class_name)
            if stype == ClassSafetyType.UNSAFE_NEGATIVE:
                hazards.append(obs)
            else:
                safe_waypoints.append(obs)

        # ---------------------------------------------------------------------
        # 1. CRITICAL HAZARD CHECK (Life-safety threats override everything)
        # ---------------------------------------------------------------------
        for h in hazards:
            h_name = h.class_name.lower()
            
            # Descending Stairs / Drop-off
            if any(k in h_name for k in ("stairs_down", "pothole", "trench")):
                dist_str = self._format_distance(h.distance_cm)
                msg = f"Danger! Drop-off hazard detected {dist_str}. Stop immediately and sweep with your cane."
                if self.suppressor.should_announce(h_name, h.zone, Priority.CRITICAL, h.distance_cm):
                    self.suppressor.mark_announced(h_name, h.zone, Priority.CRITICAL, h.distance_cm)
                    return NavigationDecision(
                        priority=Priority.CRITICAL,
                        safety_mode="UNSAFE_HAZARD",
                        object_name=h_name,
                        distance_cm=h.distance_cm,
                        corridor_state="HAZARDOUS",
                        avoidance_direction="STOP",
                        steps_estimate=None,
                        spoken_message=msg,
                        should_speak=True
                    )

            # Overhead Head-Level Obstacle (Tree branches, open window)
            if any(k in h_name for k in ("overhead", "open_window")):
                dist_str = self._format_distance(h.distance_cm)
                msg = f"Caution! Overhead collision hazard at head height, {dist_str}. Duck or step aside."
                if self.suppressor.should_announce(h_name, h.zone, Priority.CRITICAL, h.distance_cm):
                    self.suppressor.mark_announced(h_name, h.zone, Priority.CRITICAL, h.distance_cm)
                    return NavigationDecision(
                        priority=Priority.CRITICAL,
                        safety_mode="UNSAFE_HAZARD",
                        object_name=h_name,
                        distance_cm=h.distance_cm,
                        corridor_state="HAZARDOUS",
                        avoidance_direction="STOP",
                        steps_estimate=None,
                        spoken_message=msg,
                        should_speak=True
                    )

            # Ascending Stairs
            if "stairs_up" in h_name or h_name == "stairs":
                dist_str = self._format_distance(h.distance_cm)
                msg = f"Ascending stairs detected {dist_str}. Please proceed carefully with your cane."
                if self.suppressor.should_announce(h_name, h.zone, Priority.HIGH, h.distance_cm):
                    self.suppressor.mark_announced(h_name, h.zone, Priority.HIGH, h.distance_cm)
                    return NavigationDecision(
                        priority=Priority.HIGH,
                        safety_mode="UNSAFE_HAZARD",
                        object_name=h_name,
                        distance_cm=h.distance_cm,
                        corridor_state="HAZARDOUS",
                        avoidance_direction="STOP",
                        steps_estimate=None,
                        spoken_message=msg,
                        should_speak=True
                    )

        # ---------------------------------------------------------------------
        # 2. PATHWAY OBSTRUCTION WITH COMPOUND SCENE SYNTHESIS
        # ---------------------------------------------------------------------
        obstructing_hazards = [h for h in hazards if h.is_in_walking_path or (h.zone == "CENTER" and (h.distance_cm or 999) < 200.0)]

        if obstructing_hazards or scene.center_corridor_blocked:
            # Sort by closest distance
            obstructing_hazards.sort(key=lambda x: (x.distance_cm if x.distance_cm is not None else 999.0))
            primary_hazard = obstructing_hazards[0] if obstructing_hazards else None
            hazard_name = primary_hazard.class_name.lower() if primary_hazard else "obstacle"
            hazard_dist = primary_hazard.distance_cm if primary_hazard else None
            hazard_dist_str = self._format_distance(hazard_dist)

            # Check if there is a SAFE waypoint visible to navigate toward (Compound Scene!)
            target_waypoint = safe_waypoints[0] if safe_waypoints else None

            # Determine safe lateral passage
            avoidance_dir = None
            steps = 2

            if scene.right_corridor_clear and not scene.left_corridor_clear:
                avoidance_dir = "RIGHT"
            elif scene.left_corridor_clear and not scene.right_corridor_clear:
                avoidance_dir = "LEFT"
            elif scene.right_corridor_clear and scene.left_corridor_clear:
                # If target waypoint exists, prefer the side of the waypoint!
                if target_waypoint and target_waypoint.zone in ("LEFT", "RIGHT"):
                    avoidance_dir = target_waypoint.zone
                else:
                    avoidance_dir = "RIGHT" if (primary_hazard and primary_hazard.center_x < 0.5) else "LEFT"
            else:
                avoidance_dir = "STOP"

            # Compute step estimate from distance (Appendix B & Section 4.6)
            dist_m = (hazard_dist / 100.0) if hazard_dist else 1.5
            calc_steps = max(1, min(6, int(round((hazard_dist or 150.0) / self.step_length_cm))))

            # Formulate compound or standard avoidance guidance
            if target_waypoint and avoidance_dir in ("LEFT", "RIGHT"):
                wp_name = target_waypoint.class_name.replace("_", " ")
                msg = (f"In {calc_steps} steps, {hazard_name.replace('_', ' ')} is ahead at {dist_m:.2f} meters obstructing path. "
                       f"{wp_name.capitalize()} is visible to your {avoidance_dir.lower()}. Move {calc_steps} steps {avoidance_dir.lower()} toward the {wp_name}.")
                mode = "COMPOUND_DETOUR"
            elif avoidance_dir in ("LEFT", "RIGHT"):
                msg = (f"In {calc_steps} steps, {hazard_name.replace('_', ' ')} is ahead at {dist_m:.2f} meters obstructing path. "
                       f"Clear path on your {avoidance_dir.lower()}. Move {calc_steps} steps {avoidance_dir.lower()} to avoid it.")
                mode = "UNSAFE_HAZARD"
            else:
                msg = f"In {calc_steps} steps, path blocked by {hazard_name.replace('_', ' ')} at {dist_m:.2f} meters. Stop and sweep with cane."
                mode = "UNSAFE_HAZARD"

            priority = Priority.HIGH
            should_speak = self.suppressor.should_announce(hazard_name, "CENTER", priority, hazard_dist)
            if should_speak:
                self.suppressor.mark_announced(hazard_name, "CENTER", priority, hazard_dist)

            return NavigationDecision(
                priority=priority,
                safety_mode=mode,
                object_name=hazard_name,
                distance_cm=hazard_dist,
                corridor_state="OBSTRUCTED",
                avoidance_direction=avoidance_dir,
                steps_estimate=steps if avoidance_dir in ("LEFT", "RIGHT") else None,
                spoken_message=msg if should_speak else None,
                should_speak=should_speak
            )

        # ---------------------------------------------------------------------
        # 3. SAFE / POSITIVE WAYPOINT GUIDANCE (Path is clear, positive target present)
        # ---------------------------------------------------------------------
        if safe_waypoints:
            # Sort by priority and proximity
            wp = safe_waypoints[0]
            wp_name = wp.class_name.lower()
            wp_dist_str = self._format_distance(wp.distance_cm)
            wp_side = wp.zone.lower()

            # Retrieve natural template from universal taxonomy classifier
            _, _, _, template = classify_any_object(wp_name)
            try:
                msg = template.format(dist=wp_dist_str, side=wp_side, name=wp_name.replace("_", " "))
            except Exception:
                msg = f"{wp_name.replace('_', ' ').capitalize()} detected on your {wp_side}, {wp_dist_str}."

            priority = evaluate_priority(wp_name, wp.distance_cm, wp.zone == "CENTER")
            should_speak = self.suppressor.should_announce(wp_name, wp.zone, priority, wp.distance_cm)
            if should_speak:
                self.suppressor.mark_announced(wp_name, wp.zone, priority, wp.distance_cm)

            return NavigationDecision(
                priority=priority,
                safety_mode="SAFE_WAYPOINT",
                object_name=wp_name,
                distance_cm=wp.distance_cm,
                corridor_state="WAYPOINT_AHEAD",
                avoidance_direction="TOWARD_TARGET" if wp.zone == "CENTER" else None,
                steps_estimate=None,
                spoken_message=msg if should_speak else None,
                should_speak=should_speak
            )

        # ---------------------------------------------------------------------
        # 4. PATH IS COMPLETELY CLEAR
        # ---------------------------------------------------------------------
        return NavigationDecision(
            priority=Priority.LOW,
            safety_mode="CLEAR",
            object_name=None,
            distance_cm=None,
            corridor_state="CLEAR",
            avoidance_direction=None,
            steps_estimate=None,
            spoken_message=None,
            should_speak=False
        )
