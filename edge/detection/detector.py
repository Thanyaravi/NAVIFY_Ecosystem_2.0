"""NAVIFY YOLOv11 Real-Time Object Detector Wrapper
Performs 100% real-time object detection on live camera frames using PyTorch / Ultralytics.
No hardcoded or prefixed data: every detection comes from live model predictions.
"""

import os
import logging
from dataclasses import dataclass
from typing import List, Tuple, Optional, Any
from edge.config.settings import VISION_CONFIG

logger = logging.getLogger("navify.detection")

@dataclass
class Detection:
    class_name: str
    confidence: float
    bbox: Tuple[float, float, float, float]  # Normalized [x1, y1, x2, y2] between 0.0 and 1.0
    center_x: float
    center_y: float
    width: float
    height: float


class ObjectDetector:
    def __init__(self, model_path: Optional[str] = None, conf_threshold: float = VISION_CONFIG["CONFIDENCE_THRESHOLD"]):
        self.conf_threshold = conf_threshold
        raw_targets = VISION_CONFIG.get("TARGET_CLASSES")
        self.target_classes = set(raw_targets) if raw_targets else set()
        self.model = None
        self.backend = "none"

        self._load_model(model_path)

    def _load_model(self, model_path: Optional[str]):
        # Check candidate model paths
        candidates = []
        if model_path:
            candidates.append(model_path)
        candidates.extend([
            VISION_CONFIG.get("MODEL_NAME", "yolo11n.pt"),
            "yolo11n.pt",
            "yolo11m.pt",
            "yolov11m.pt",
            "yolo11s.pt"
        ])

        found_path = None
        for cand in candidates:
            if os.path.exists(cand):
                found_path = cand
                break

        # If not on disk, default to 'yolo11n.pt' which ultralytics will auto-download
        if not found_path:
            found_path = "yolo11n.pt"

        try:
            from ultralytics import YOLO
            self.model = YOLO(found_path)
            self.backend = "ultralytics"
            logger.info("REAL-TIME YOLO Model loaded successfully from '%s' (%d classes)", 
                        found_path, len(self.model.names))
            return
        except Exception as e:
            logger.error("Failed to load Ultralytics YOLO model: %s", e)
            self.backend = "none"

    def detect(self, frame: Any) -> List[Detection]:
        """Runs live neural network inference on the current camera frame."""
        if frame is None or self.model is None or self.backend != "ultralytics":
            return []

        h, w = frame.shape[:2]

        try:
            results = self.model.predict(
                source=frame,
                conf=self.conf_threshold,
                iou=VISION_CONFIG["IOU_THRESHOLD"],
                verbose=False
            )
        except Exception as e:
            logger.error("YOLO inference error: %s", e)
            return []

        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                class_name = self.model.names[cls_id]
                confidence = float(box.conf[0])

                # Extract coordinates and normalize to [0.0, 1.0]
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                norm_x1 = max(0.0, min(1.0, x1 / w))
                norm_y1 = max(0.0, min(1.0, y1 / h))
                norm_x2 = max(0.0, min(1.0, x2 / w))
                norm_y2 = max(0.0, min(1.0, y2 / h))

                box_w = norm_x2 - norm_x1
                box_h = norm_y2 - norm_y1
                cx = norm_x1 + (box_w / 2.0)
                cy = norm_y1 + (box_h / 2.0)

                detections.append(Detection(
                    class_name=class_name,
                    confidence=round(confidence, 2),
                    bbox=(norm_x1, norm_y1, norm_x2, norm_y2),
                    center_x=round(cx, 3),
                    center_y=round(cy, 3),
                    width=round(box_w, 3),
                    height=round(box_h, 3)
                ))

        return detections
