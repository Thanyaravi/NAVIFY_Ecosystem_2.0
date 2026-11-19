"""NAVIFY CANIE Priority & Safety Evaluation Matrix
Differentiates between SAFE (Positive) waypoints and UNSAFE (Negative) hazards.
Evaluates severity, urgency, and navigational utility.
"""

from enum import Enum
from typing import Optional, Tuple
from datasets.taxonomy import classify_any_object, ClassSafetyType

class Priority(Enum):
    CRITICAL = 5    # Immediate danger to life/limb (descending stairs, open trench, moving vehicle, overhead head-level impact)
    HIGH = 4        # Direct walking corridor obstruction (chair, pillar, wall, person in path)
    WAYPOINT = 3    # Safe target / waypoint (open door, elevator, crosswalk, tactile guide)
    MEDIUM = 2      # Nearby peripheral obstacle (sidewalk clutter, bag on floor)
    AMENITY = 1     # Beneficial amenity (bench to sit on, handrail, reception desk)
    LOW = 0         # Distant background object / clear path


def get_safety_type(class_name: str) -> ClassSafetyType:
    """Returns whether the object is classified as SAFE_POSITIVE or UNSAFE_NEGATIVE."""
    safety_type, _, _, _ = classify_any_object(class_name)
    return safety_type


def evaluate_priority(class_name: str, distance_cm: Optional[float], 
                      is_in_corridor: bool) -> Priority:
    """Evaluates the urgency or guidance priority across all 796 classes."""
    safety_type, sub_type, prio_level, _ = classify_any_object(class_name)

    if safety_type == ClassSafetyType.UNSAFE_NEGATIVE:
        if prio_level >= 5:
            return Priority.CRITICAL
        if is_in_corridor:
            if distance_cm is not None and distance_cm <= 90.0:
                return Priority.CRITICAL
            return Priority.HIGH
        if distance_cm is not None and distance_cm <= 150.0:
            return Priority.MEDIUM
        return Priority.LOW
    else:
        if is_in_corridor:
            return Priority.WAYPOINT
        if prio_level <= 1:
            return Priority.AMENITY
        return Priority.MEDIUM
