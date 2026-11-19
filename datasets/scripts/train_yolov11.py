"""NAVIFY YOLOv11-M Training & Fine-Tuning Pipeline
Loads pretrained YOLOv11-M weights, trains on the NAVIFY 20-class dataset,
calculates evaluation metrics, and automatically exports an optimized ONNX model
for deployment on the Raspberry Pi 4 Model B.
"""

import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("navify.train")

DATA_YAML = Path(__file__).resolve().parent.parent / "data.yaml"


def train_model(epochs: int = 50, batch_size: int = 16, img_size: int = 640, 
                weights: str = "yolo11m.pt", device: str = "0"):
    """Runs Ultralytics fine-tuning on the NAVIFY dataset."""
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("Ultralytics not installed. Install with: pip install ultralytics")
        return

    logger.info("Initializing YOLOv11-M with base weights: %s", weights)
    model = YOLO(weights)

    logger.info("Starting training on %s (epochs=%s, batch=%s, imgsz=%s)...", 
                DATA_YAML, epochs, batch_size, img_size)

    # Train with edge-optimized hyperparameters
    results = model.train(
        data=str(DATA_YAML),
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        cos_lr=True,
        close_mosaic=10,
        project="navify_runs",
        name="yolov11m_navify",
        exist_ok=True
    )

    logger.info("Training complete. Evaluating validation metrics...")
    metrics = model.val()
    logger.info("Validation mAP@50: %.4f, mAP@50-95: %.4f", metrics.box.map50, metrics.box.map)

    # Export to ONNX for Raspberry Pi 4 Model B inference
    logger.info("Exporting trained model to ONNX format...")
    onnx_path = model.export(format="onnx", imgsz=img_size, dynamic=False, simplify=True)
    logger.info("Exported ONNX model saved to: %s", onnx_path)


def main():
    parser = argparse.ArgumentParser(description="NAVIFY YOLOv11-M Training Script")
    parser.add_argument("--epochs", type=int, default=50, help="Training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--weights", type=str, default="yolo11m.pt", help="Pretrained weights (.pt)")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or 0, 1 for GPU)")
    args = parser.parse_args()

    train_model(
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        weights=args.weights,
        device=args.device
    )


if __name__ == "__main__":
    main()
