"""NAVIFY Multi-Dataset Assistive Navigation Taxonomy
Unified across:
- MS-COCO (80 classes)
- Objects365 Dataset (365 classes)
- Google OpenImages V7 (601 classes)
- HomeObjects-3K Dataset (12 domestic indoor classes)
Automatically maps all 796 classes into SAFE (Positive Waypoint/Guide) vs UNSAFE (Negative Hazard/Obstacle).
"""

from enum import Enum
from typing import Dict, Any, Tuple

class ClassSafetyType(Enum):
    SAFE_POSITIVE = "SAFE_POSITIVE"     # Waypoints, open doorways, tactile guides, seating, handrails
    UNSAFE_NEGATIVE = "UNSAFE_NEGATIVE" # Obstacles, drop-offs, overhead collisions, moving vehicles, clutter


def classify_any_object(class_name: str) -> Tuple[ClassSafetyType, str, int, str]:
    """
    Classifies any class from MS-COCO, Objects365, OpenImages V7, or HomeObjects-3K
    into (safety_type, sub_type, priority_level, voice_template).
    """
    n = class_name.lower().strip()

    # 1. CRITICAL HAZARDS (Drop-offs, holes, high-speed vehicles, overhead impacts)
    if any(k in n for k in ("stair", "step down", "drop", "pothole", "trench", "hole", "pit", "cliff")):
        if "up" in n:
            return ClassSafetyType.UNSAFE_NEGATIVE, "STRUCTURAL_TRANSITION", 4, "Ascending stairs detected {dist} ahead. Prepare cane."
        return ClassSafetyType.UNSAFE_NEGATIVE, "CRITICAL_DROP_OFF", 5, "Danger! Drop-off hazard detected {dist} ahead. Stop immediately."

    if any(k in n for k in ("overhead", "branch", "awning", "pipe", "wire", "casement window", "ceiling")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "HEAD_LEVEL_HAZARD", 5, "Caution! Low hanging overhead obstacle at head height, {dist}."

    if any(k in n for k in ("car", "truck", "bus", "van", "motorcycle", "train", "ambulance", "vehicle")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "VEHICLE_HAZARD", 5, "Alert! Vehicle detected {dist}. Use caution."

    if any(k in n for k in ("barrier", "construction", "cone", "barricade", "caution tape")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "RESTRICTED_ZONE", 4, "Construction barrier blocking path {dist}."

    # 2. SAFE / POSITIVE WAYPOINTS, ACCESSIBILITY AIDS, & AMENITIES
    if any(k in n for k in ("door", "entrance", "exit", "gateway", "doorway")):
        if "closed" in n:
            return ClassSafetyType.SAFE_POSITIVE, "WAYPOINT_DOOR", 3, "Closed door ahead, {dist}. Reach forward for handle."
        return ClassSafetyType.SAFE_POSITIVE, "WAYPOINT_DOOR", 3, "Open doorway ahead, {dist}. Path is clear to enter."

    if any(k in n for k in ("elevator", "lift")):
        return ClassSafetyType.SAFE_POSITIVE, "WAYPOINT_TRANSIT", 3, "Elevator entrance detected ahead, {dist}."

    if any(k in n for k in ("tactile", "paving", "guide line", "yellow strip")):
        return ClassSafetyType.SAFE_POSITIVE, "TACTILE_GUIDE", 3, "Tactile paving detected on your path. Follow the guide line."

    if any(k in n for k in ("handrail", "banister", "guard rail")):
        return ClassSafetyType.SAFE_POSITIVE, "GUIDE_SUPPORT", 2, "Handrail available on your {side}, {dist}."

    if any(k in n for k in ("bench", "empty seat", "couch", "sofa", "resting seat")):
        return ClassSafetyType.SAFE_POSITIVE, "AMENITY_SEATING", 1, "Seating available on your {side}, {dist} if you wish to rest."

    if any(k in n for k in ("crosswalk", "zebra", "pedestrian crossing")):
        return ClassSafetyType.SAFE_POSITIVE, "PEDESTRIAN_CROSSING", 3, "Pedestrian zebra crosswalk detected ahead."

    if any(k in n for k in ("ramp", "slope")):
        return ClassSafetyType.SAFE_POSITIVE, "ACCESSIBLE_PATH", 2, "Accessible ramp ahead, {dist}. Gentle slope."

    if any(k in n for k in ("reception", "service counter", "information desk", "ticket window")):
        return ClassSafetyType.SAFE_POSITIVE, "WAYPOINT_SERVICE", 2, "Information or service counter ahead, {dist}."

    if any(k in n for k in ("restroom", "toilet", "bathroom", "washroom")):
        return ClassSafetyType.SAFE_POSITIVE, "AMENITY_RESTROOM", 2, "Restroom facility detected {dist}."

    if any(k in n for k in ("sidewalk", "walkway", "pathway", "hallway", "corridor")):
        return ClassSafetyType.SAFE_POSITIVE, "CLEAR_CORRIDOR", 1, "Clear walkway corridor ahead. Path is open."

    # 3. DYNAMIC PEDESTRIANS
    if any(k in n for k in ("person", "pedestrian", "man", "woman", "child", "girl", "boy")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "DYNAMIC_PERSON", 3, "Person ahead, {dist}. Slow down."

    if any(k in n for k in ("crowd", "people", "group")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "DENSE_CROWD", 3, "Crowded area ahead, {dist}. Proceed with care."

    # 4. STANDARD OBSTACLES, FURNITURE & GROUND CLUTTER
    if any(k in n for k in ("bottle", "can", "cup", "glass", "mug", "spill", "slipper", "shoe", "toy")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "LOW_TRIP_HAZARD", 2, "Small trip or slip hazard on floor {dist} ahead."

    if any(k in n for k in ("bag", "backpack", "handbag", "satchel", "tote", "briefcase", "luggage", "suitcase")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "TRIP_OBSTACLE", 3, "Bag or luggage in path {dist}."

    if any(k in n for k in ("chair", "stool", "armchair", "recliner", "swivel chair")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "FURNITURE_OBSTACLE", 3, "Chair detected {dist} in path."

    if any(k in n for k in ("table", "desk", "coffee table", "counter")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "FURNITURE_OBSTACLE", 3, "Table detected {dist} ahead."

    if any(k in n for k in ("pole", "pillar", "column", "post", "lamppost", "tree trunk", "bollard")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "RIGID_COLLISION", 4, "Pillar or pole detected directly ahead, {dist}."

    if any(k in n for k in ("wall", "partition", "divider", "fence", "gate")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "DEAD_END", 4, "Wall or partition ahead, {dist}."

    if any(k in n for k in ("bin", "trash", "waste container", "garbage")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "GROUND_OBSTACLE", 2, "Waste bin {dist} on your {side}."

    if any(k in n for k in ("cart", "trolley", "stroller", "wheelbarrow")):
        return ClassSafetyType.UNSAFE_NEGATIVE, "WHEELED_OBSTACLE", 3, "Cart or stroller in path, {dist}."

    # Default general physical object in environment
    return ClassSafetyType.UNSAFE_NEGATIVE, "GENERAL_OBSTACLE", 2, "{name} detected {dist} ahead."


def is_safe_class(class_name: str) -> bool:
    safety_type, _, _, _ = classify_any_object(class_name)
    return safety_type == ClassSafetyType.SAFE_POSITIVE

def is_unsafe_class(class_name: str) -> bool:
    safety_type, _, _, _ = classify_any_object(class_name)
    return safety_type == ClassSafetyType.UNSAFE_NEGATIVE
