"""NAVIFY Multi-Dataset YOLOv11-N Training Engine
Supports fine-tuning YOLOv11-N on:
1. MS-COCO (coco.yaml)
2. Objects365 (Objects365.yaml)
3. HomeObjects-3K (HomeObjects-3K.yaml)
4. Google OpenImages V7 (open-images-v7.yaml)
All leveraging official Ultralytics dataset configurations with auto-download and export.
"""

import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("navify.multidataset.train")

DATASET_CONFIG_MAP = {
    "coco": "coco.yaml",
    "objects365": "Objects365.yaml",
    "homeobjects": "HomeObjects-3K.yaml",
    "openimages": "open-images-v7.yaml"
}

def train_yolo11n(dataset_key: str = "homeobjects", epochs: int = 30, batch_size: int = 16, 
                  img_size: int = 640, device: str = "cpu", weights: str = "yolo11n.pt"):
    """Runs Ultralytics YOLOv11-N training on the chosen dataset."""
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("Ultralytics is not installed. Please run: pip install ultralytics")
        return

    config_yaml = DATASET_CONFIG_MAP.get(dataset_key.lower())
    if not config_yaml:
        logger.error("Unknown dataset '%s'. Choose from: %s", dataset_key, list(DATASET_CONFIG_MAP.keys()))
        return

    logger.info("=" * 65)
    logger.info("   NAVIFY YOLOv11-N Multi-Dataset Training Engine")
    logger.info("   Dataset: %s (%s)", dataset_key.upper(), config_yaml)
    logger.info("   Base Model: %s | Epochs: %d | Batch: %d | Image Size: %d", weights, epochs, batch_size, img_size)
    logger.info("=" * 65)

    model = YOLO(weights)

    # Train using Ultralytics native dataset pipeline
    results = model.train(
        data=config_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        project="navify_multidataset_runs",
        name=f"yolo11n_{dataset_key}",
        exist_ok=True,
        optimizer="AdamW",
        lr0=0.001,
        cos_lr=True,
        verbose=True
    )

    logger.info("Training complete for dataset %s. Validating...", dataset_key)
    metrics = model.val()
    logger.info("Validation Results -> mAP@50: %.4f | mAP@50-95: %.4f", metrics.box.map50, metrics.box.map)

    # Export to optimized ONNX for Raspberry Pi 4 Model B
    logger.info("Exporting fine-tuned model to ONNX format...")
    onnx_path = model.export(format="onnx", imgsz=img_size, dynamic=False, simplify=True)
    logger.info("Model exported successfully to: %s", onnx_path)


def main():
    parser = argparse.ArgumentParser(description="NAVIFY Multi-Dataset YOLOv11-N Training")
    parser.add_argument("--dataset", choices=["coco", "objects365", "homeobjects", "openimages"], 
                        default="homeobjects", help="Ultralytics dataset to train on")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution")
    parser.add_argument("--weights", type=str, default="yolo11n.pt", help="Pretrained weights (.pt)")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu, 0, 1)")
    args = parser.parse_args()

    train_yolo11n(
        dataset_key=args.dataset,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        weights=args.weights
    )


if __name__ == "__main__":
    main()
