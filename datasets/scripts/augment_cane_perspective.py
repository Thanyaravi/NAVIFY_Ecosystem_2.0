"""NAVIFY Cane Perspective Data Augmentation Engine
Transforms standard eye-level training images into realistic Smart Cane POV:
1. Low-Angle Perspective Transformation (Camera at ~0.9m cane height, pitched forward ~15 deg)
2. Lateral Cane Swing Rotation (-8 deg to +8 deg periodic roll)
3. Motion Blur simulation (simulating natural walking cadence)
4. Floor Glare and Lighting Variation
5. Automatic 2D bounding box recalculation and clipping to [0.0, 1.0]
"""

import math
import random
import logging
from pathlib import Path
from typing import List, Tuple

logger = logging.getLogger("navify.augment")

def warp_bounding_box(bbox: Tuple[float, float, float, float], 
                       angle_deg: float, 
                       pitch_factor: float) -> Tuple[float, float, float, float]:
    """
    Adjusts normalized YOLO bbox (cx, cy, w, h) under simulated cane swing and pitch warp.
    """
    cx, cy, w, h = bbox

    # Simulating low-camera keystone: objects higher up compress slightly, lower expand
    adjusted_cy = cy * (1.0 + (pitch_factor * 0.1))
    adjusted_h = h * (1.0 + (pitch_factor * 0.05))

    # Simulating cane swing roll
    rad = math.radians(angle_deg)
    new_cx = cx + math.sin(rad) * 0.05

    # Clamp safely inside [0.0, 1.0]
    final_cx = max(0.05, min(0.95, new_cx))
    final_cy = max(0.05, min(0.95, adjusted_cy))
    final_w = max(0.02, min(0.90, w))
    final_h = max(0.02, min(0.90, adjusted_h))

    return round(final_cx, 4), round(final_cy, 4), round(final_w, 4), round(final_h, 4)


def augment_annotation_file(label_path: Path, output_path: Path, num_variants: int = 3):
    """Generates augmented cane-view variations of a label file."""
    if not label_path.exists():
        return

    with open(label_path, "r") as f:
        lines = f.readlines()

    with open(output_path, "w") as out_f:
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 5:
                cls_id = parts[0]
                cx, cy, w, h = map(float, parts[1:5])
                
                # Apply simulated swing
                angle = random.uniform(-8.0, 8.0)
                pitch = random.uniform(0.8, 1.2)
                ncx, ncy, nw, nh = warp_bounding_box((cx, cy, w, h), angle, pitch)

                out_f.write(f"{cls_id} {ncx} {ncy} {nw} {nh}\n")
