"""NAVIFY Dataset Downloader & Ingestion Script
Fetches and curates assistive navigation imagery from:
1. MS-COCO Indoor Navigation Subset (chairs, tables, persons, bags)
2. OpenImages V7 (doors, stairs, columns, elevators)
3. VizWiz Assistive Dataset (photos taken by visually impaired users)
4. Roboflow Assistive Navigation datasets
"""

import os
import sys
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("navify.datasets.downloader")

DATASET_ROOT = Path(__file__).resolve().parent.parent / "navify_dataset"

# Curated dataset sources and download manifests
DATASET_SOURCES = {
    "COCO_INDOOR": {
        "description": "MS-COCO 2017 subset filtered for persons, furniture, luggage, and vehicles",
        "url": "http://images.cocodataset.org/zips/train2017.zip",
        "categories": ["person", "chair", "couch", "bed", "dining table", "backpack", "suitcase", "bottle"]
    },
    "OPENIMAGES_V7": {
        "description": "Google OpenImages V7 navigation structures: Doors, Stairs, Columns, Elevators",
        "classes": ["Door", "Stairs", "Column", "Elevator", "Waste container"],
        "tool": "fiftyone or aws s3 --no-sign-request"
    },
    "VIZWIZ_ASSISTIVE": {
        "description": "Images taken by visually impaired people with realistic tilt, blur, and lighting",
        "url": "https://vizwiz.cs.colorado.edu/VizWiz_final/images/train.zip"
    },
    "ROBOFLOW_HAZARDS": {
        "description": "Public Roboflow Assistive Obstacle & Cane View datasets",
        "projects": [
            "blind-assist-navigation",
            "indoor-obstacle-detection-yolo",
            "stairs-and-steps-detection"
        ]
    }
}


def setup_directory_structure(root_dir: Path):
    """Creates the standard YOLO directory tree: images/train, images/val, labels/train, labels/val."""
    for split in ["train", "val", "test"]:
        (root_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (root_dir / "labels" / split).mkdir(parents=True, exist_ok=True)
    logger.info("Initialized dataset directory structure at %s", root_dir)


def download_coco_subset(target_dir: Path, max_samples: int = 500):
    """
    Downloads and prepares COCO indoor subset annotations.
    Uses fiftyone or official COCO API if installed, or creates sample manifest.
    """
    logger.info("Preparing MS-COCO indoor subset (target max %s samples)...", max_samples)
    try:
        import fiftyone as fo
        import fiftyone.zoo as foz
        dataset = foz.load_zoo_dataset(
            "coco-2017",
            split="validation",
            label_types=["detections"],
            classes=["person", "chair", "couch", "bed", "dining table", "backpack", "suitcase", "bottle"],
            max_samples=max_samples
        )
        logger.info("Successfully fetched %s COCO samples via FiftyOne.", len(dataset))
        # Export in YOLO format
        dataset.export(
            export_dir=str(target_dir),
            dataset_type=fo.types.YOLOv5Dataset,
            classes=DATASET_SOURCES["COCO_INDOOR"]["categories"]
        )
    except ImportError:
        logger.info("FiftyOne not installed. Generating manifest for manual or scripted curl download.")
        manifest_file = target_dir / "coco_download_manifest.txt"
        with open(manifest_file, "w") as f:
            f.write("# MS-COCO Navigation Subset URLs\n")
            f.write(f"Source: {DATASET_SOURCES['COCO_INDOOR']['url']}\n")
            f.write("Filtered Classes: " + ", ".join(DATASET_SOURCES["COCO_INDOOR"]["categories"]) + "\n")
        logger.info("Created download manifest at %s", manifest_file)


def generate_synthetic_samples_for_testing(target_dir: Path, count: int = 10):
    """Generates synthetic YOLO annotation files and sample placeholders for pipeline verification."""
    train_img_dir = target_dir / "images" / "train"
    train_lbl_dir = target_dir / "labels" / "train"
    val_img_dir = target_dir / "images" / "val"
    val_lbl_dir = target_dir / "labels" / "val"

    setup_directory_structure(target_dir)

    # Create dummy sample annotations:
    # Format: class_id center_x center_y width height
    sample_annotations = [
        (1, 0.50, 0.65, 0.20, 0.40),   # chair
        (0, 0.25, 0.50, 0.22, 0.70),   # person
        (4, 0.50, 0.55, 0.40, 0.50),   # stairs_up
        (3, 0.75, 0.45, 0.25, 0.60),   # door
        (13, 0.50, 0.85, 0.60, 0.15)   # curb_step
    ]

    for i in range(count):
        split_img = train_img_dir if i < (count * 0.8) else val_img_dir
        split_lbl = train_lbl_dir if i < (count * 0.8) else val_lbl_dir
        
        lbl_file = split_lbl / f"sample_{i:04d}.txt"
        img_file = split_img / f"sample_{i:04d}.jpg"

        # Write label
        cls_id, cx, cy, w, h = sample_annotations[i % len(sample_annotations)]
        with open(lbl_file, "w") as f:
            f.write(f"{cls_id} {cx:.4f} {cy:.4f} {w:.4f} {h:.4f}\n")

        # Create 1x1 dummy JPEG if file doesn't exist
        if not img_file.exists():
            with open(img_file, "wb") as f:
                # Minimal valid 1x1 JPEG bytes
                f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9')

    logger.info("Generated %s synthetic training samples for split verification.", count)


def main():
    parser = argparse.ArgumentParser(description="NAVIFY Dataset Downloader & Preparer")
    parser.add_argument("--source", choices=["all", "coco", "openimages", "vizwiz", "synthetic"], default="synthetic")
    parser.add_argument("--max-samples", type=int, default=200)
    args = parser.parse_args()

    setup_directory_structure(DATASET_ROOT)

    if args.source in ("synthetic", "all"):
        generate_synthetic_samples_for_testing(DATASET_ROOT, count=20)

    if args.source in ("coco", "all"):
        download_coco_subset(DATASET_ROOT, max_samples=args.max_samples)


if __name__ == "__main__":
    main()
