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
from edge.detection.reflective import ReflectiveSurfaceDetector
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

        # Reflective Surface & Glare Detector (FIG 1.1 Architecture)
        self.reflective_detector = ReflectiveSurfaceDetector()

        # 6. Fusion & CANIE Decision Engine
        logger.info("Initializing Sensor Fusion and Dual-Mode CANIE Reasoning Engine...")
        self.fusion = SensorFusionEngine()
        self.canie = CANIEEngine()

        # 7. Cloud Synchronization Worker
        logger.info("Starting Background Cloud Sync Service...")
        self.cloud_sync = CloudSyncService(self.store)

        # System start prompt
        self.voice.speak("NAVIFY Navigation system active. Ready.", priority_level=1)

    def draw_hud(self, frame, detections, scene, decision, reflective_res, fps: float):
        """
        Draws the real-time assistive HUD matching FIG 1.2 and FIG 1.3
        of the BCI586 Research Paper.
        """
        h, w = frame.shape[:2]

        # 1. TOP HEADER BANNER (Exact Style from FIG 1.2 & FIG 1.3)
        # Bold Yellow text: e.g. "COCO (fallback) | 480p | FPS: 42.5" or "YOLOv11-M | 480p | FPS: 50.3"
        model_tag = getattr(self.detector, "model_display_tag", "YOLOv11-M")
        res_tag = f"{h}p" if h in (480, 720, 1080) else f"{w}x{h}"
        header_text = f"{model_tag} | {res_tag} | FPS: {fps:.1f}"

        # Draw top yellow banner with slight black shadow for contrast readability
        cv2.putText(frame, header_text, (22, 37), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 3)
        cv2.putText(frame, header_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 255), 2)

        # 2. BOUNDING BOXES (Exact formatting from FIG 1.2 & 1.3: label conf dist_m)
        for det in detections:
            x1 = int(det.bbox[0] * w)
            y1 = int(det.bbox[1] * h)
            x2 = int(det.bbox[2] * w)
            y2 = int(det.bbox[3] * h)

            # Match obstacle distance from fusion or monocular geometry
            matching_obs = next((o for o in scene.obstacles if o.class_name == det.class_name), None)
            dist_cm = matching_obs.distance_cm if matching_obs else self.ultrasonic.estimate_distance_from_bbox(det.class_name, det.height, h)
            dist_m = max(0.2, (dist_cm / 100.0) if dist_cm else 1.50)

            # Color coding from Paper:
            # RED (0, 0, 255) for close/danger obstacles (< 1.0m or person/hazard in path)
            # GREEN (0, 255, 0) for safe distance obstacles (>= 1.0m)
            is_close_hazard = (dist_m <= 1.0) or (matching_obs and matching_obs.is_in_walking_path and dist_m <= 1.4)
            box_color = (0, 0, 255) if is_close_hazard else (0, 255, 0)

            # Draw crisp bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

            # Label text matching report: e.g. "person 0.93 0.50m"
            label_text = f"{det.class_name} {det.confidence:.2f} {dist_m:.2f}m"

            # Draw label directly above bounding box in matching color with subtle shadow
            label_y = max(22, y1 - 8)
            cv2.putText(frame, label_text, (x1 + 1, label_y + 1), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2)
            cv2.putText(frame, label_text, (x1, label_y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 2)

        # 3. REFLECTIVE SURFACE DETECTION OVERLAYS (FIG 1.1 Architecture)
        if reflective_res and getattr(reflective_res, "is_reflective", False):
            for reg in reflective_res.regions:
                rx1, ry1, rx2, ry2 = reg.bbox
                cyan_color = (255, 255, 0)
                cv2.rectangle(frame, (rx1, ry1), (rx2, ry2), cyan_color, 2)
                ref_label = f"Reflective Surface {reg.confidence:.2f} 1.50m"
                cv2.putText(frame, ref_label, (rx1, max(22, ry1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, cyan_color, 2)

        # 4. BOTTOM GUIDANCE & SAFETY STATUS BAR
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, h - 55), (w, h), (15, 15, 15), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

        # Safety State Indicator (FIG 1.1: Safe / Unsafe / Reflective)
        safety_mode = decision.safety_mode if decision else "CLEAR"
        if safety_mode == "REFLECTIVE":
            safety_badge = "STATE: REFLECTIVE"
            badge_color = (255, 255, 0)
        elif safety_mode in ("UNSAFE_HAZARD", "HAZARDOUS"):
            safety_badge = "STATE: UNSAFE"
            badge_color = (0, 0, 255)
        else:
            safety_badge = "STATE: SAFE"
            badge_color = (0, 255, 0)

        cv2.putText(frame, safety_badge, (15, h - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, badge_color, 2)

        # Spoken Guidance Text
        msg_text = decision.spoken_message if (decision and decision.spoken_message) else "Path is clear ahead."
        cv2.putText(frame, f"| {msg_text[:65]}", (190, h - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (230, 230, 230), 1)

        # Hotkeys
        cv2.putText(frame, "[Q] Quit  [S] SOS", (w - 140, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (160, 160, 160), 1)

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

        # 3. Reflective Surface Detection (Texture & Glare Analysis - FIG 1.1)
        reflective_res = self.reflective_detector.analyze(frame)

        # 4. Read Dual Range Data (Hardware GPIO on Pi, or Real-Time Optical Geometry on Laptop)
        ultrasonic_data = self.ultrasonic.read_coordinated_distances(live_detections=detections)

        # 5. Read IMU Motion State
        imu_state = self.imu.read_motion_state()

        # 6. Spatial Sensor Fusion
        scene = self.fusion.fuse(detections, ultrasonic_data, imu_state)

        # 7. CANIE Dual-Mode Contextual Decision Making with Reflective Analysis
        decision = self.canie.process(scene, reflective_result=reflective_res)

        # 8. Deliver Spoken Voice Guidance
        if decision and decision.should_speak and decision.spoken_message:
            self.voice.speak(decision.spoken_message, priority_level=1)

        # 9. Record Real Events to Local SQLite
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

        # 10. Display Live Video HUD Window (FIG 1.2 & FIG 1.3 Output)
        if self.show_gui and frame is not None:
            display_frame = self.draw_hud(frame.copy(), detections, scene, decision, reflective_res, fps)
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
