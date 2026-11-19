"""Physical SOS Emergency Push-Button Handler for NAVIFY
Monitors GPIO17 (Physical Pin 11) using an internal pull-up resistor.
When pressed, connects the pin to GND (Active LOW), triggers a software debounced
interrupt, and dispatches an emergency notification callback.
"""

import time
import logging
import threading
from typing import Callable, Optional
from edge.config.settings import PINS

logger = logging.getLogger("navify.sensors.sos")

try:
    import RPi.GPIO as GPIO
    HARDWARE_GPIO_AVAILABLE = True
except (ImportError, RuntimeError):
    HARDWARE_GPIO_AVAILABLE = False


class SOSButton:
    def __init__(self, on_press_callback: Optional[Callable[[], None]] = None, debounce_ms: int = 300):
        self.pin = PINS["SOS_BUTTON"]
        self.callback = on_press_callback
        self.debounce_sec = debounce_ms / 1000.0
        self.last_press_time = 0.0
        self.is_running = False
        self.simulation_mode = not HARDWARE_GPIO_AVAILABLE

        if not self.simulation_mode:
            self._setup_hardware()

    def _setup_hardware(self):
        """Sets up GPIO with internal pull-up resistor and edge detection."""
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.add_event_detect(
            self.pin, 
            GPIO.FALLING, 
            callback=self._handle_edge, 
            bouncetime=int(self.debounce_sec * 1000)
        )
        logger.info("SOS Button initialized on GPIO%s (Pin 11)", self.pin)

    def _handle_edge(self, channel):
        """Hardware interrupt callback with software time guard."""
        current_time = time.time()
        if (current_time - self.last_press_time) >= self.debounce_sec:
            # Confirm pin is still low after momentary glitch
            time.sleep(0.02)
            if GPIO.input(self.pin) == GPIO.LOW:
                self.last_press_time = current_time
                logger.warning("PHYSICAL SOS BUTTON PRESSED on GPIO%s!", channel)
                if self.callback:
                    threading.Thread(target=self.callback, daemon=True).start()

    def trigger_simulated_press(self):
        """Allows programmatic triggering for unit tests and simulation."""
        logger.warning("[SIMULATION] Programmatic SOS Trigger activated!")
        self.last_press_time = time.time()
        if self.callback:
            threading.Thread(target=self.callback, daemon=True).start()

    def cleanup(self):
        if not self.simulation_mode and HARDWARE_GPIO_AVAILABLE:
            try:
                GPIO.remove_event_detect(self.pin)
                GPIO.cleanup(self.pin)
            except Exception as e:
                logger.debug("SOS cleanup warning: %s", e)
