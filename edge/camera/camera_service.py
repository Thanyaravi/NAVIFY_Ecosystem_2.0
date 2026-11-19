"""NAVIFY Real-Time Camera Service
Captures live frames directly from:
1. Raspberry Pi Camera Module 3 (via Picamera2 on Linux/Pi)
2. Real Laptop / USB Webcam (via OpenCV VideoCapture on Windows/PC)
3. Live Video File / Stream (optional via video_source parameter)
No hardcoded or prefixed data.
"""

import time
import logging
from typing import Optional, Any
import numpy as np

logger = logging.getLogger("navify.camera")

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


class CameraService:
    def __init__(self, width: int = 640, height: int = 480, fps: int = 20, 
                 camera_index: int = 0, video_path: Optional[str] = None):
        self.width = width
        self.height = height
        self.fps = fps
        self.camera_index = camera_index
        self.video_path = video_path
        self.cap = None
        self.picam2 = None
        self.is_opened = False
        self.source_type = "NONE"

        self._initialize_camera()

    def _initialize_camera(self):
        # 0. If a real video file is specified by the user:
        if self.video_path and OPENCV_AVAILABLE:
            try:
                self.cap = cv2.VideoCapture(self.video_path)
                if self.cap.isOpened():
                    self.is_opened = True
                    self.source_type = f"VIDEO_FILE_{self.video_path}"
                    logger.info("Connected to input video file: %s", self.video_path)
                    return
            except Exception as e:
                logger.error("Failed opening video file: %s", e)

        # 1. Try Picamera2 (for Raspberry Pi OS Bookworm/Bullseye)
        try:
            from picamera2 import Picamera2
            self.picam2 = Picamera2()
            config = self.picam2.create_preview_configuration(
                main={"size": (self.width, self.height), "format": "RGB888"}
            )
            self.picam2.configure(config)
            self.picam2.start()
            self.is_opened = True
            self.source_type = "PICAMERA2"
            logger.info("Initialized Camera Module 3 via Picamera2 (%sx%s @ %sfps)", self.width, self.height, self.fps)
            return
        except (ImportError, Exception):
            pass

        # 2. Try Physical Webcam via OpenCV VideoCapture (Laptop webcam / USB camera)
        if OPENCV_AVAILABLE:
            # Try DSHOW, MSMF, and standard backend across indexes 0, 1, 2
            candidate_indexes = [self.camera_index, 0, 1, 2]
            # remove duplicates while preserving order
            candidate_indexes = list(dict.fromkeys(candidate_indexes))

            for idx in candidate_indexes:
                for api_backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
                    try:
                        cap = cv2.VideoCapture(idx, api_backend)
                        if cap.isOpened():
                            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                            cap.set(cv2.CAP_PROP_FPS, self.fps)
                            
                            ret, test_frame = cap.read()
                            if ret and test_frame is not None and test_frame.size > 0:
                                self.cap = cap
                                self.is_opened = True
                                self.source_type = f"WEBCAM_INDEX_{idx}"
                                logger.info("Successfully connected to LIVE physical camera at index %s (%dx%d)", 
                                            idx, test_frame.shape[1], test_frame.shape[0])
                                return
                            else:
                                cap.release()
                    except Exception as e:
                        logger.debug("Failed opening camera index %s backend %s: %s", idx, api_backend, e)

        logger.warning("No physical webcam could be opened in this session. (Ensure no other app is using your webcam).")
        self.is_opened = False
        self.source_type = "UNAVAILABLE"

    def capture_frame(self) -> Optional[np.ndarray]:
        """Captures a real live frame from the active camera or video source."""
        if not self.is_opened:
            return None

        # Picamera2 frame grab
        if self.picam2 is not None:
            try:
                frame = self.picam2.capture_array()
                return frame
            except Exception as e:
                logger.error("Picamera2 capture error: %s", e)
                return None

        # OpenCV VideoCapture frame grab
        if self.cap is not None:
            ret, frame = self.cap.read()
            if ret and frame is not None:
                return frame
            else:
                # If reading a video file, loop back to start
                if self.video_path:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = self.cap.read()
                    if ret:
                        return frame
                return None

        return None

    def release(self):
        if self.picam2 is not None:
            try:
                self.picam2.stop()
                self.picam2.close()
            except Exception:
                pass
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
        self.is_opened = False
        logger.info("Camera service released.")
