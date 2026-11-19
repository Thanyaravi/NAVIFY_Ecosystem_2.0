# NAVIFY Edge AI Software Stack
**Target Platform:** Raspberry Pi 4 Model B (4GB RAM) with Active Cooling  
**Institution:** Sai Vidya Institute of Technology (SVIT)  
**Project:** NAVIFY — Major Project Phase-II (BCI786)  

---

## 1. System Components

The `edge/` directory houses the entire local, offline-first intelligence and hardware control system:

```text
edge/
├── config/
│   └── settings.py          # Pinout (GPIO), thresholds, timing, corridor definitions
├── camera/
│   └── camera_service.py    # Picamera2 (Camera Module 3) & OpenCV VideoCapture
├── detection/
│   └── detector.py          # YOLOv11-M Ultralytics / ONNX Runtime + Mock fallback
├── sensors/
│   ├── ultrasonic.py        # Dual JSN-SR04T alternating ping engine (anti-crosstalk)
│   ├── sos_button.py        # GPIO17 interrupt with software debouncing
│   └── imu.py               # MPU6050 I2C interface (cane posture & walking state)
├── fusion/
│   └── sensor_fusion.py     # 3D spatial fusion of vision, range beams, and IMU
├── canie/
│   ├── engine.py            # Context-Aware Navigation Intelligence Engine
│   ├── priorities.py        # Threat evaluation & priority scoring
│   └── suppression.py       # Repeat-alert suppression & stationary obstacle memory
├── voice/
│   └── speech.py            # Offline TTS (pyttsx3) non-blocking audio queue
├── sos/
│   └── emergency.py         # Emergency SOS lifecycle coordinator
├── storage/
│   └── event_store.py       # Offline-first SQLite persistence engine (navify_local.db)
├── integration/
│   └── cloud_sync.py        # Firebase Realtime DB sync daemon with offline drain
└── main.py                  # Master perception-reasoning-action loop
```

---

## 2. Hardware Wiring Reference (Raspberry Pi 4 Model B)

| Function | Component Terminal | Pi Physical Pin | Pi Signal | Notes |
|---|---|---:|---|---|
| **Left Ultrasonic Power** | Left JSN-SR04T VCC | 2 | 5V | Sensor 5V Supply |
| **Left Ultrasonic GND** | Left JSN-SR04T GND | 6 | GND | Common ground reference |
| **Left Ultrasonic TRIG** | Left JSN-SR04T TRIG | 16 | GPIO23 | Pi 3.3V Output pulse |
| **Left Ultrasonic ECHO** | Left JSN-SR04T ECHO | 18 | GPIO24 | **Via 5V-to-3.3V Level Shifter** |
| **Right Ultrasonic Power** | Right JSN-SR04T VCC | 4 | 5V | Sensor 5V Supply |
| **Right Ultrasonic GND** | Right JSN-SR04T GND | 14 | GND | Common ground reference |
| **Right Ultrasonic TRIG** | Right JSN-SR04T TRIG | 13 | GPIO27 | Pi 3.3V Output pulse |
| **Right Ultrasonic ECHO** | Right JSN-SR04T ECHO | 15 | GPIO22 | **Via 5V-to-3.3V Level Shifter** |
| **SOS Push Button** | Switch Terminal 1 | 11 | GPIO17 | Pull-up, Active-LOW |
| **SOS Ground** | Switch Terminal 2 | 20 | GND | Button connects Pin 11 to GND |
| **IMU Power** | MPU6050 VCC | 1 | 3.3V | I2C Power |
| **IMU GND** | MPU6050 GND | 9 | GND | Common ground |
| **IMU SDA** | MPU6050 SDA | 3 | GPIO2 | I2C Data |
| **IMU SCL** | MPU6050 SCL | 5 | GPIO3 | I2C Clock |
| **Camera** | Camera Module 3 | CSI Ribbon | CSI Port | 15-pin CSI connector |
| **Audio** | Bluetooth Earpiece | Wireless | Bluetooth | Paired via `bluetoothctl` |

---

## 3. Running the Software

### A. Desktop / Laptop Simulation (No hardware needed)
```bash
python -m edge.main --simulate --test-cycles 10
```

### B. Trigger a Test SOS Event
```bash
python -m edge.main --simulate --test-cycles 5 --test-sos
```

### C. Run All Unit Tests
```bash
python -m unittest discover -s tests -v
```

### D. On the Physical Raspberry Pi 4 Model B
```bash
# 1. Enable Camera and I2C:
sudo raspi-config nonint do_camera 0
sudo raspi-config nonint do_i2c 0

# 2. Pair Bluetooth Earpiece:
bluetoothctl
# scan on -> pair <MAC> -> connect <MAC> -> trust <MAC>

# 3. Launch NAVIFY:
python3 -m edge.main
```
