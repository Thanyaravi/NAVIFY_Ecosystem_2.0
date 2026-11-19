"""NAVIFY Main Edge Navigation Application (100% Real-Time Edition)
Integrates Live Camera -> Real YOLOv11 Neural Inference -> Dual Ranging -> IMU -> Sensor Fusion -> CANIE -> Real Voice Guidance -> Local SQLite -> Cloud Sync.
Includes live real-time HUD window displaying detections, spatial zones, distances, and CANIE advice.
"""

import sys
import time
import argparse
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("navify.edge.main")

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

# Internal modules
from edge.config.settings import DB_PATH, PINS, CORRIDOR_CONFIG
from edge.storage.event_store import EventStore
from edge.voice.speech import VoiceSynthesizer
from edge.sos.emergency import SOSCoordinator
from edge.sensors.ultrasonic import DualUltrasonicSensor
from edge.sensors.sos_button import SOSButton
from edge.sensors.imu import MPU6050Sensor
from edge.camera.camera_service import CameraService
from edge.detection.detector import ObjectDetector
from edge.fusion.sensor_fusion import SensorFusionEngine
from edge.canie.engine import CANIEEngine
from edge.integration.cloud_sync import CloudSyncService


class NavifyEdgeApplication:
    def __init__(self, camera_index: int = 0, video_path: str = None, show_gui: bool = True):
        self.show_gui = show_gui and OPENCV_AVAILABLE
        self.running = True
        self.last_speech_time = 0.0

        logger.info("=" * 65)
        logger.info("   NAVIFY - 100% Real-Time Edge AI Assistive Navigation System   ")
        logger.info("   Department of CSE (AI & ML) - SVIT (Phase-II BCI786)      ")
        logger.info("=" * 65)

        # 1. Local SQLite Storage Engine
        logger.info("Initializing Local SQLite Persistence Engine...")
        self.store = EventStore(DB_PATH)

        # 2. Voice Guidance (Offline TTS via speakers / Bluetooth)
        logger.info("Initializing Voice Guidance Subsystem...")
        self.voice = VoiceSynthesizer()

        # 3. Emergency SOS Coordinator
        self.sos_coord = SOSCoordinator(self.store, self.voice)

        # 4. Hardware Sensors & Inputs
        logger.info("Initializing Sensors (Ultrasonic, SOS Button, IMU)...")
        self.ultrasonic = DualUltrasonicSensor()
        self.sos_button = SOSButton(on_press_callback=self.sos_coord.handle_sos_trigger)
        self.imu = MPU6050Sensor()

        # 5. Vision & Detection Pipeline
        logger.info("Connecting to LIVE physical camera/video...")
        self.camera = CameraService(camera_index=camera_index, video_path=video_path)
        
        logger.info("Loading REAL-TIME YOLOv11 Neural Model...")
        self.detector = ObjectDetector()

        # 6. Fusion & CANIE Decision Engine
        logger.info("Initializing Sensor Fusion and Dual-Mode CANIE Reasoning Engine...")
        self.fusion = SensorFusionEngine()
        self.canie = CANIEEngine()

        # 7. Cloud Synchronization Worker
        logger.info("Starting Background Cloud Sync Service...")
        self.cloud_sync = CloudSyncService(self.store)

        # System start prompt
        self.voice.speak("NAVIFY Navigation system active. Ready.", priority_level=1)

    def draw_hud(self, frame, detections, scene, decision, fps: float):
        """Draws the real-time assistive HUD on the video frame."""
        h, w = frame.shape[:2]

        # Draw Zone Partition Lines (LEFT | CENTER WALKING PATH | RIGHT)
        left_line_x = int(w * CORRIDOR_CONFIG["LEFT_MAX_X"])
        right_line_x = int(w * CORRIDOR_CONFIG["RIGHT_MIN_X"])

        # Semi-transparent overlay for center walking corridor
        overlay = frame.copy()
        cv2.rectangle(overlay, (left_line_x, 0), (right_line_x, h), (40, 40, 20), -1)
        cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)

        # Draw guideline borders
        cv2.line(frame, (left_line_x, 0), (left_line_x, h), (0, 255, 255), 2)
        cv2.line(frame, (right_line_x, 0), (right_line_x, h), (0, 255, 255), 2)

        # Zone Labels
        cv2.putText(frame, "LEFT ZONE", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
        cv2.putText(frame, "WALKING CORRIDOR", (left_line_x + 15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(frame, "RIGHT ZONE", (right_line_x + 15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)

        # Draw Detections & Distances
        for det in detections:
            x1 = int(det.bbox[0] * w)
            y1 = int(det.bbox[1] * h)
            x2 = int(det.bbox[2] * w)
            y2 = int(det.bbox[3] * h)

            # Match obstacle distance
            matching_obs = next((o for o in scene.obstacles if o.class_name == det.class_name), None)
            dist_val = matching_obs.distance_cm if matching_obs else None
            dist_str = f"{dist_val:.1f}cm" if dist_val else ""

            # Color coding: Red for corridor hazard, Green for safe/clear, Orange for peripheral
            color = (0, 0, 255) if (matching_obs and matching_obs.is_in_walking_path) else (0, 255, 0)

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{det.class_name} ({int(det.confidence*100)}%) {dist_str}"
            cv2.rectangle(frame, (x1, max(0, y1 - 25)), (x1 + len(label) * 10, y1), color, -1)
            cv2.putText(frame, label, (x1 + 3, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 2)

        # Header Information Banner
        cv2.rectangle(frame, (0, h - 85), (w, h), (20, 20, 20), -1)

        # Spoken CANIE Advice on Banner
        if decision and decision.spoken_message:
            cv2.putText(frame, f"CANIE: {decision.spoken_message[:65]}...", (15, h - 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 2)
        else:
            cv2.putText(frame, "CANIE: Path is clear. Continue forward.", (15, h - 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)

        # Telemetry & Status Line
        status_line = (f"FPS: {fps:.1f} | Left Clearance: {scene.left_clearance_cm:.0f}cm | "
                       f"Right Clearance: {scene.right_clearance_cm:.0f}cm | [Q] Quit  [S] SOS")
        cv2.putText(frame, status_line, (15, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)

        return frame

    def run_step(self):
        """Executes a single live perception-reasoning cycle."""
        start_time = time.perf_counter()

        # 1. Capture Real Live Frame from physical camera
        frame = self.camera.capture_frame()
        if frame is None:
            time.sleep(0.05)
            return 0.0, None, None

        # 2. Real-Time YOLO Inference
        detections = self.detector.detect(frame)

        # 3. Read Dual Range Data (Hardware GPIO on Pi, or Real-Time Optical Geometry on Laptop)
        ultrasonic_data = self.ultrasonic.read_coordinated_distances(live_detections=detections)

        # 4. Read IMU Motion State
        imu_state = self.imu.read_motion_state()

        # 5. Spatial Sensor Fusion
        scene = self.fusion.fuse(detections, ultrasonic_data, imu_state)

        # 6. CANIE Dual-Mode Contextual Decision Making
        decision = self.canie.process(scene)

        # 7. Deliver Spoken Voice Guidance
        if decision and decision.should_speak and decision.spoken_message:
            self.voice.speak(decision.spoken_message, priority_level=1)

        # 8. Record Real Events to Local SQLite
        for det in detections:
            matching_obs = next((o for o in scene.obstacles if o.class_name == det.class_name), None)
            zone = matching_obs.zone if matching_obs else "UNKNOWN"
            dist = matching_obs.distance_cm if matching_obs else None
            self.store.log_detection(det.class_name, det.confidence, det.bbox, dist, zone)

        if decision and decision.corridor_state != "CLEAR":
            self.store.log_navigation_event(
                priority=decision.priority.name,
                object_name=decision.object_name,
                distance_cm=decision.distance_cm,
                corridor_state=decision.corridor_state,
                avoidance_direction=decision.avoidance_direction,
                steps_estimate=decision.steps_estimate,
                message_spoken=decision.spoken_message or ""
            )

        elapsed = time.perf_counter() - start_time
        fps = round(1.0 / max(0.001, elapsed), 1)

        # 9. Display Live Video HUD Window
        if self.show_gui and frame is not None:
            display_frame = self.draw_hud(frame.copy(), detections, scene, decision, fps)
            cv2.imshow("NAVIFY Live Cane Vision (Real-Time HUD)", display_frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord('q'), 27): # 'q' or ESC to exit
                self.running = False
            elif key == ord('s'):      # 's' to test live SOS button trigger
                self.sos_coord.handle_sos_trigger("KEYBOARD_TEST")

        return fps, scene, decision

    def start(self, max_iterations: int = None):
        """Starts the real-time navigation loop."""
        logger.info("NAVIFY Live Real-Time Perception Loop Running.")
        if self.show_gui:
            logger.info("Live Video Window active. Press 'q' to stop, 's' to trigger SOS.")

        iteration = 0
        try:
            while self.running:
                fps, scene, decision = self.run_step()
                iteration += 1

                if max_iterations and iteration >= max_iterations:
                    break

        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received.")
        finally:
            self.shutdown()

    def shutdown(self):
        logger.info("Shutting down NAVIFY Edge components gracefully...")
        self.running = False
        if self.show_gui and OPENCV_AVAILABLE:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
        self.camera.release()
        self.ultrasonic.cleanup()
        self.sos_button.cleanup()
        self.imu.cleanup()
        self.voice.shutdown()
        self.cloud_sync.stop()
        logger.info("All hardware resources released.")


def main():
    parser = argparse.ArgumentParser(description="NAVIFY Real-Time Edge AI Navigation")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index (default: 0)")
    parser.add_argument("--video", type=str, default=None, help="Path to video file for testing (e.g. hallway.mp4)")
    parser.add_argument("--headless", action="store_true", help="Run without opening GUI video window")
    parser.add_argument("--test-cycles", type=int, default=None, help="Run a fixed number of cycles and exit")
    parser.add_argument("--test-sos", action="store_true", help="Trigger test emergency SOS alert")
    args = parser.parse_args()

    app = NavifyEdgeApplication(camera_index=args.camera, video_path=args.video, show_gui=not args.headless)

    if args.test_sos:
        time.sleep(1.0)
        app.sos_coord.handle_sos_trigger("CLI_TEST_TRIGGER")

    app.start(max_iterations=args.test_cycles)


if __name__ == "__main__":
    main()
