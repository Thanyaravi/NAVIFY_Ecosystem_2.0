# NAVIFY Dataset & Model Training Hub
**Project:** NAVIFY — Smart Assistive Navigation Ecosystem for the Visually Impaired  
**Institution:** Sai Vidya Institute of Technology (SVIT) — Phase-II (BCI786)  

---

## 1. Dataset Overview

Standard computer-vision datasets (like full MS-COCO) are broad and general, containing objects irrelevant to cane mobility (such as airplanes or giraffes). For NAVIFY, we curate and merge datasets focused on **indoor/outdoor mobility obstacles, structural transitions, and trip hazards**.

### Curated Dataset Sources

| Dataset Source | Modality / Environment | Key Classes Extracted | Role in NAVIFY |
|---|---|---|---|
| **MS-COCO 2017 (Indoor Subset)** | High-resolution everyday indoor images | `person`, `chair`, `table`, `couch`, `bed`, `backpack`, `suitcase`, `bottle` | Foundational detection of furniture, people, and path clutter |
| **Google OpenImages V7** | Diverse architectural scenes | `door`, `stairs`, `column/pole`, `elevator`, `waste container` | Architectural landmark and structural navigation point identification |
| **VizWiz Assistive Dataset** | Low-angle, blurred, real-world photos taken by blind users | Real-world blind-person camera views, variable lighting, tilted perspectives | Robustness testing against cane swing, glare, and partial occlusion |
| **SUN RGB-D / NYU Depth V2** | Calibrated indoor room scenes with 3D boundaries | Furniture clustering, hallway ends, narrow doorways | Spatial corridor obstruction testing |
| **Roboflow Assistive Hazards** | Labeled urban sidewalk and indoor navigation sets | `curb_step`, `construction_barrier`, `wet_floor_sign`, `trash_bin` | Detection of sidewalk drop-offs and temporary ground hazards |

---

## 2. Unified 20-Class NAVIFY Taxonomy

All source datasets are mapped into a standardized 20-class schema defined in [datasets/taxonomy.py](file:///c:/Users/Dell/OneDrive/Desktop/Navify%20Ecosystem%202.0/datasets/taxonomy.py):

| Class ID | Class Label | Type | Behavioral Impact on CANIE |
|---|---|---|---|
| `0` | `person` | Dynamic | Prompt user to slow down or yield |
| `1` | `chair` | Obstacle | Check left/right clearance; give lateral step advice |
| `2` | `table` | Obstacle | Check if corridor is blocked; navigate around |
| `3` | `door` | Waypoint | Identify doorway entrance / exit |
| `4` | `stairs_up` | Landmark / Hazard | Alert user to ascend; engage white cane tip |
| `5` | `stairs_down` | **Critical Hazard** | **Immediate STOP alert** (drop-off / fall prevention) |
| `6` | `couch_sofa` | Obstacle | Major pathway blockage in domestic rooms |
| `7` | `bed` | Obstacle | Low bedroom obstacle |
| `8` | `backpack_bag` | Trip Hazard | Low ground obstacle |
| `9` | `luggage_suitcase` | Obstacle | Often found in corridors, transit stations |
| `10` | `pole_pillar` | Structural Hazard | Rigid obstacle in transit halls / sidewalks |
| `11` | `vehicle_car` | High Hazard | Critical warning if in outdoor street crossing |
| `12` | `bicycle_motorcycle`| Hazard | Parked or approaching two-wheelers on sidewalks |
| `13` | `curb_step` | Level Change | Single step down or up |
| `14` | `wall_partition` | Dead End | End of corridor warning |
| `15` | `elevator_door` | Waypoint | Elevator call area identified |
| `16` | `trash_bin` | Obstacle | Common street/hallway trip hazard |
| `17` | `bottle_small_hazard`| Trip Hazard | Low floor item that can cause slips |
| `18` | `sign_board` | Obstacle | A-frame signs, caution wet floor signs |
| `19` | `construction_barrier`| Critical Hazard | Blocked construction zone / barrier tape |

---

## 3. Cane Perspective Data Augmentation

Standard dataset photos are shot at adult eye-level (~1.6m – 1.8m height) from a stationary stance.  
On the NAVIFY Smart Cane, the camera is mounted at **handle height (~0.85m – 0.95m)**, angled downwards by ~10–15 degrees, and subjected to **lateral swing** as the user walks.

The script [datasets/scripts/augment_cane_perspective.py](file:///c:/Users/Dell/OneDrive/Desktop/Navify%20Ecosystem%202.0/datasets/scripts/augment_cane_perspective.py) applies:
- **Low-Angle Keystoning / Perspective Warp**: Re-scales objects from ground level up.
- **Dynamic Swing Rotation**: Simulates $\pm 8^\circ$ periodic roll.
- **Motion Blur & Lighting Variation**: Simulates indoor fluorescent glare and walking cadence.
- **Automatic Bounding Box Clipping**: Recomputes YOLO coordinates so they remain strictly bounded.

---

## 4. Preparing and Training YOLOv11-M

### Step 1: Initialize Dataset Structure & Samples
```bash
python datasets/scripts/download_datasets.py --source synthetic --max-samples 50
```

### Step 2: Download COCO Indoor Subset (requires `fiftyone`)
```bash
python datasets/scripts/download_datasets.py --source coco --max-samples 1000
```

### Step 3: Run Fine-Tuning & Export to ONNX
```bash
python datasets/scripts/train_yolov11.py --epochs 50 --batch 16 --weights yolo11m.pt --device 0
```
The script will automatically export an optimized `yolov11m.onnx` file ready to transfer to the Raspberry Pi 4 Model B!
