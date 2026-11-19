"""Generates the Universal 796-Class Assistive Taxonomy combining:
- MS-COCO (80 classes)
- Objects365 (365 classes)
- OpenImages V7 (601 classes)
- HomeObjects-3K (12 classes)
All loaded directly from the official Ultralytics dataset configurations.
"""

import os
import yaml
import ultralytics
from pathlib import Path

CFG_DIR = Path(ultralytics.__file__).resolve().parent / "cfg" / "datasets"
ROOT_DIR = Path(__file__).resolve().parent.parent

def load_dataset_classes(yaml_name):
    path = CFG_DIR / yaml_name
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        names = data.get("names", {})
        if isinstance(names, dict):
            return [names[k] for k in sorted(names.keys())]
        return names

def classify_class(name):
    n = name.lower().strip()
    
    # 1. Critical Hazards (Drop-offs, pits, moving threats, overhead)
    if any(k in n for k in ("stair", "step down", "drop", "pothole", "trench", "hole", "pit", "cliff")):
        if "up" in n:
            return "UNSAFE_NEGATIVE", "STRUCTURAL_TRANSITION", 4, "Ascending stairs detected {dist} ahead. Prepare cane."
        return "UNSAFE_NEGATIVE", "CRITICAL_DROP_OFF", 5, "Danger! Drop-off hazard detected {dist} ahead. Stop immediately."

    if any(k in n for k in ("overhead", "branch", "awning", "pipe", "wire", "casement window", "ceiling")):
        return "UNSAFE_NEGATIVE", "HEAD_LEVEL_HAZARD", 5, "Caution! Low hanging overhead obstacle at head height, {dist}."

    if any(k in n for k in ("car", "truck", "bus", "van", "motorcycle", "train", "ambulance", "vehicle")):
        return "UNSAFE_NEGATIVE", "VEHICLE_HAZARD", 5, "Alert! Vehicle detected {dist}. Use caution."

    if any(k in n for k in ("barrier", "construction", "cone", "barricade", "caution tape")):
        return "UNSAFE_NEGATIVE", "RESTRICTED_ZONE", 4, "Construction barrier blocking path {dist}."

    # 2. Positive / Safe Waypoints & Guides
    if any(k in n for k in ("door", "entrance", "exit", "gateway", "doorway")):
        if "closed" in n:
            return "SAFE_POSITIVE", "WAYPOINT_DOOR", 3, "Closed door ahead, {dist}. Reach forward for handle."
        return "SAFE_POSITIVE", "WAYPOINT_DOOR", 3, "Doorway ahead, {dist}. Path leads through."

    if any(k in n for k in ("elevator", "lift")):
        return "SAFE_POSITIVE", "WAYPOINT_TRANSIT", 3, "Elevator entrance detected ahead, {dist}."

    if any(k in n for k in ("tactile", "paving", "guide line", "yellow strip")):
        return "SAFE_POSITIVE", "TACTILE_GUIDE", 3, "Tactile paving detected on path. Follow the line."

    if any(k in n for k in ("handrail", "banister", "guard rail")):
        return "SAFE_POSITIVE", "GUIDE_SUPPORT", 2, "Handrail available on your {side}, {dist}."

    if any(k in n for k in ("bench", "empty seat", "couch", "sofa", "resting seat")):
        return "SAFE_POSITIVE", "AMENITY_SEATING", 1, "Seating available on your {side}, {dist} if you wish to rest."

    if any(k in n for k in ("crosswalk", "zebra", "pedestrian crossing")):
        return "SAFE_POSITIVE", "PEDESTRIAN_CROSSING", 3, "Pedestrian zebra crosswalk detected ahead."

    if any(k in n for k in ("ramp", "slope")):
        return "SAFE_POSITIVE", "ACCESSIBLE_PATH", 2, "Accessible ramp ahead, {dist}."

    if any(k in n for k in ("reception", "service counter", "information desk", "ticket window")):
        return "SAFE_POSITIVE", "WAYPOINT_SERVICE", 2, "Information or service counter ahead, {dist}."

    if any(k in n for k in ("restroom", "toilet", "bathroom", "washroom")):
        return "SAFE_POSITIVE", "AMENITY_RESTROOM", 2, "Restroom facility detected {dist}."

    if any(k in n for k in ("sidewalk", "walkway", "pathway", "hallway", "corridor")):
        return "SAFE_POSITIVE", "CLEAR_CORRIDOR", 1, "Clear walkway corridor ahead. Path is open."

    # 3. Dynamic Pedestrians
    if any(k in n for k in ("person", "pedestrian", "man", "woman", "child", "girl", "boy")):
        return "UNSAFE_NEGATIVE", "DYNAMIC_PERSON", 3, "Person ahead, {dist}. Slow down."

    if any(k in n for k in ("crowd", "people", "group")):
        return "UNSAFE_NEGATIVE", "DENSE_CROWD", 3, "Crowded area ahead, {dist}. Proceed with care."

    # 4. Standard Obstacles & Trip Hazards
    if any(k in n for k in ("bottle", "can", "cup", "glass", "mug", "spill", "slipper", "shoe", "toy")):
        return "UNSAFE_NEGATIVE", "LOW_TRIP_HAZARD", 2, "Small trip or slip hazard on floor {dist} ahead."

    if any(k in n for k in ("bag", "backpack", "handbag", "satchel", "tote", "briefcase", "luggage", "suitcase")):
        return "UNSAFE_NEGATIVE", "TRIP_OBSTACLE", 3, "Bag or luggage in path {dist}."

    if any(k in n for k in ("chair", "stool", "armchair", "recliner", "swivel chair")):
        return "UNSAFE_NEGATIVE", "FURNITURE_OBSTACLE", 3, "Chair detected {dist} in path."

    if any(k in n for k in ("table", "desk", "coffee table", "counter")):
        return "UNSAFE_NEGATIVE", "FURNITURE_OBSTACLE", 3, "Table detected {dist} ahead."

    if any(k in n for k in ("pole", "pillar", "column", "post", "lamppost", "tree trunk", "bollard")):
        return "UNSAFE_NEGATIVE", "RIGID_COLLISION", 4, "Pillar or pole detected directly ahead, {dist}."

    if any(k in n for k in ("wall", "partition", "divider", "fence", "gate")):
        return "UNSAFE_NEGATIVE", "DEAD_END", 4, "Wall or partition ahead, {dist}."

    if any(k in n for k in ("bin", "trash", "waste container", "garbage")):
        return "UNSAFE_NEGATIVE", "GROUND_OBSTACLE", 2, "Waste bin {dist} on your {side}."

    if any(k in n for k in ("cart", "trolley", "stroller", "wheelbarrow")):
        return "UNSAFE_NEGATIVE", "WHEELED_OBSTACLE", 3, "Cart or stroller in path, {dist}."

    # Default general physical object in environment
    return "UNSAFE_NEGATIVE", "GENERAL_OBSTACLE", 2, "{name} detected {dist} ahead."

def build_universal_registry():
    coco = load_dataset_classes("coco.yaml")
    o365 = load_dataset_classes("Objects365.yaml")
    home = load_dataset_classes("HomeObjects-3K.yaml")
    oi7 = load_dataset_classes("open-images-v7.yaml")

    combined_map = {}
    for source_name, class_list in [("MS-COCO", coco), ("Objects365", o365), ("HomeObjects-3K", home), ("OpenImages-V7", oi7)]:
        for c in class_list:
            norm_key = c.lower().strip()
            if norm_key not in combined_map:
                stype, subtype, prio, voice = classify_class(c)
                combined_map[norm_key] = {
                    "original_name": c,
                    "sources": [source_name],
                    "safety_type": stype,
                    "sub_type": subtype,
                    "priority_level": prio,
                    "voice_template": voice
                }
            else:
                if source_name not in combined_map[norm_key]["sources"]:
                    combined_map[norm_key]["sources"].append(source_name)

    print(f"Compiled {len(combined_map)} unique classes across all 4 datasets.")
    return combined_map

if __name__ == "__main__":
    registry = build_universal_registry()
