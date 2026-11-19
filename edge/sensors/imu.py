"""MPU6050 (GY-521) 6-DOF IMU Sensor Interface for NAVIFY
Reads accelerometer and gyroscope data over I2C (Bus 1, Address 0x68).
Estimates cane tilt angles and detects whether the user is stationary or actively walking.
"""

import time
import math
import logging
from typing import Dict, Any, Optional
from edge.config.settings import PINS

logger = logging.getLogger("navify.sensors.imu")

try:
    import smbus2
    I2C_AVAILABLE = True
except ImportError:
    I2C_AVAILABLE = False


class MPU6050Sensor:
    # Registers
    PWR_MGMT_1 = 0x6B
    ACCEL_XOUT_H = 0x3B
    GYRO_XOUT_H = 0x43

    def __init__(self, bus_num: int = 1, address: int = PINS["MPU6050_ADDR"]):
        self.bus_num = bus_num
        self.address = address
        self.bus = None
        self.is_connected = False
        self.simulation_mode = not I2C_AVAILABLE
        
        # Motion state variables
        self.last_accel_magnitude = 1.0
        self.walking_motion_detected = False

        if not self.simulation_mode:
            self._init_sensor()

    def _init_sensor(self):
        try:
            self.bus = smbus2.SMBus(self.bus_num)
            # Wake up MPU6050 (by default it starts in sleep mode)
            self.bus.write_byte_data(self.address, self.PWR_MGMT_1, 0x00)
            time.sleep(0.05)
            self.is_connected = True
            logger.info("MPU6050 IMU initialized on I2C bus %s, address 0x%02X", self.bus_num, self.address)
        except Exception as e:
            logger.warning("MPU6050 not detected on I2C: %s. Falling back to simulation mode.", e)
            self.simulation_mode = True

    def _read_word_2c(self, reg: int) -> int:
        high = self.bus.read_byte_data(self.address, reg)
        low = self.bus.read_byte_data(self.address, reg + 1)
        val = (high << 8) + low
        if val >= 0x8000:
            return -((65535 - val) + 1)
        return val

    def read_motion_state(self) -> Dict[str, Any]:
        """
        Reads acceleration & gyro, returning:
        - pitch, roll angles (degrees)
        - dynamic acceleration magnitude (g)
        - is_walking: boolean flag
        """
        if self.simulation_mode or not self.is_connected:
            # Simulated typical cane posture: slight forward pitch ~15 deg, moderate swing
            return {
                "pitch_deg": 15.0,
                "roll_deg": 2.0,
                "is_walking": True,
                "tilt_warning": False,
                "simulated": True
            }

        try:
            # Read raw accel (sensitivity +/- 2g => scale by 16384.0)
            ax = self._read_word_2c(self.ACCEL_XOUT_H) / 16384.0
            ay = self._read_word_2c(self.ACCEL_XOUT_H + 2) / 16384.0
            az = self._read_word_2c(self.ACCEL_XOUT_H + 4) / 16384.0

            # Calculate pitch and roll in degrees
            pitch = math.atan2(ax, math.sqrt(ay * ay + az * az)) * (180.0 / math.pi)
            roll = math.atan2(ay, math.sqrt(ax * ax + az * az)) * (180.0 / math.pi)

            # Detect walking activity from acceleration variance
            magnitude = math.sqrt(ax * ax + ay * ay + az * az)
            motion_delta = abs(magnitude - self.last_accel_magnitude)
            self.last_accel_magnitude = magnitude
            is_walking = motion_delta > 0.08

            # Tilt warning if cane is tipped too far forward/backward (e.g. fallen cane)
            tilt_warning = abs(pitch) > 65.0

            return {
                "pitch_deg": round(pitch, 1),
                "roll_deg": round(roll, 1),
                "is_walking": is_walking,
                "tilt_warning": tilt_warning,
                "simulated": False
            }
        except Exception as e:
            logger.error("Failed to read MPU6050: %s", e)
            return {
                "pitch_deg": 0.0,
                "roll_deg": 0.0,
                "is_walking": False,
                "tilt_warning": False,
                "simulated": True
            }

    def cleanup(self):
        if self.bus:
            try:
                self.bus.close()
            except Exception:
                pass
