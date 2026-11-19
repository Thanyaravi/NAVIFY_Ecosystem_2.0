# NAVIFY Edge AI System Configuration
import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = STORAGE_DIR / "navify_local.db"

# System Operation Mode
# Automatically detected if hardware GPIO is unavailable
SIMULATION_MODE = os.getenv("NAVIFY_SIMULATION", "false").lower() in ("true", "1", "yes")

# Hardware Pin Assignments (Raspberry Pi 4 Model B Physical Header)
# GPIO numbers use BCM naming convention
PINS = {
    # Left Ultrasonic (JSN-SR04T #1)
    "LEFT_TRIG": 23,   # Physical Pin 16
    "LEFT_ECHO": 24,   # Physical Pin 18 (via 5V->3.3V level shifter)

    # Right Ultrasonic (JSN-SR04T #2)
    "RIGHT_TRIG": 27,  # Physical Pin 13
    "RIGHT_ECHO": 22,  # Physical Pin 15 (via 5V->3.3V level shifter)

    # SOS Emergency Button (Momentary switch to Ground)
    "SOS_BUTTON": 17,  # Physical Pin 11 (Internal pull-up enabled, Active LOW)

    # MPU6050 IMU (I2C-1)
    "I2C_SDA": 2,      # Physical Pin 3
    "I2C_SCL": 3,      # Physical Pin 5
    "MPU6050_ADDR": 0x68,
}

# Ultrasonic Sensor Timing & Range Calibration
ULTRASONIC_CONFIG = {
    "SOUND_SPEED_CM_S": 34300.0,
    "MIN_DISTANCE_CM": 20.0,      # Blind spot cutoff for JSN-SR04T
    "MAX_DISTANCE_CM": 450.0,     # Max reliable range
    "TRIGGER_PULSE_SEC": 0.000015,# 15 microsecond trigger pulse
    "ECHO_TIMEOUT_SEC": 0.030,    # 30 ms timeout (~5 meters max)
    "INTER_SENSOR_QUIET_SEC": 0.040, # 40ms quiet interval between left and right pings to prevent cross-talk
}

# Vision & YOLO Configuration
VISION_CONFIG = {
    "MODEL_NAME": "yolo11n.pt",   # Official Ultralytics YOLOv11-N
    "MODEL_ONNX_NAME": "yolov11n.onnx",
    "INPUT_WIDTH": 640,
    "INPUT_HEIGHT": 640,
    "CONFIDENCE_THRESHOLD": 0.40,
    "IOU_THRESHOLD": 0.45,
    # None = Detect ALL objects across MS-COCO, Objects365, OpenImages V7 & HomeObjects-3K
    "TARGET_CLASSES": None,
}

# CANIE Spatial Corridor Boundaries (Normalized 0.0 to 1.0 horizontally)
CORRIDOR_CONFIG = {
    "LEFT_MAX_X": 0.35,      # Left zone: 0.00 to 0.35
    "CENTER_MIN_X": 0.35,    # Forward walking path: 0.35 to 0.65
    "CENTER_MAX_X": 0.65,
    "RIGHT_MIN_X": 0.65,     # Right zone: 0.65 to 1.00
    
    # Distance Danger Thresholds (cm)
    "CRITICAL_DIST_CM": 90.0,    # Immediate hazard (< 0.9m)
    "WARNING_DIST_CM": 180.0,    # Obstructing corridor (< 1.8m)
    "CAUTION_DIST_CM": 300.0,    # Approaching obstacle (< 3.0m)
    "CLEAR_PASSAGE_MIN_CM": 150.0, # Minimum clearance to suggest safe passage
    
    # Estimated user step length in centimeters (for step-based advice)
    "AVERAGE_STEP_LENGTH_CM": 65.0,
}

# Repeat Suppression & Speech Memory
SUPPRESSION_CONFIG = {
    "STATIONARY_COOLDOWN_SEC": 6.0,  # Do not re-announce identical stationary obstacle for 6s
    "DISTANCE_CHANGE_DELTA_CM": 40.0,# Re-alert if obstacle moves closer by > 40cm
    "HIGH_PRIORITY_COOLDOWN_SEC": 2.5,
}

# Voice Guidance (pyttsx3 TTS)
VOICE_CONFIG = {
    "SPEECH_RATE": 170,    # Words per minute (crisp, not dragged)
    "VOLUME": 1.0,         # Max volume for Bluetooth earpiece clarity
    "VOICE_ID": None,      # Default system voice
}

# Cloud Synchronization
CLOUD_CONFIG = {
    "ENABLED": True,
    "SYNC_INTERVAL_SEC": 5.0,
    "BATCH_SIZE": 25,
    "FIREBASE_URL": os.getenv("NAVIFY_FIREBASE_URL", "https://navify-ecosystem-default-rtdb.firebaseio.com"),
    "DEVICE_ID": os.getenv("NAVIFY_DEVICE_ID", "NAVIFY_CANE_SVIT_01"),
}
