"""NAVIFY Voice Guidance & Audio Output System
Converts CANIE navigational decisions into clear, concise voice alerts.
Uses pyttsx3 for 100% offline text-to-speech output routed to a paired
Bluetooth earpiece, with a non-blocking background worker thread.
"""

import queue
import threading
import logging
from typing import Optional
from edge.config.settings import VOICE_CONFIG

logger = logging.getLogger("navify.voice")

try:
    import pyttsx3
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False


class VoiceSynthesizer:
    def __init__(self):
        self.speech_queue = queue.PriorityQueue()
        self.is_running = True
        self.engine = None
        self.tts_available = TTS_AVAILABLE

        if self.tts_available:
            try:
                self.engine = pyttsx3.init()
                self.engine.setProperty("rate", VOICE_CONFIG["SPEECH_RATE"])
                self.engine.setProperty("volume", VOICE_CONFIG["VOLUME"])
                logger.info("pyttsx3 TTS Engine initialized successfully.")
            except Exception as e:
                logger.warning("pyttsx3 failed to initialize audio driver: %s. Falling back to log-speech.", e)
                self.tts_available = False

        # Start non-blocking consumer thread
        self.worker_thread = threading.Thread(target=self._speech_worker, daemon=True)
        self.worker_thread.start()

    def speak(self, message: str, priority_level: int = 2):
        """
        Enqueues a speech message.
        Priority levels:
        0 = Emergency SOS / Critical Hazard (Immediate)
        1 = High Warning
        2 = Normal Advisory / Context Guidance
        """
        if not message:
            return
        # PriorityQueue sorts lower numbers first
        self.speech_queue.put((priority_level, message))
        logger.info("[QUEUED SPEECH p=%s]: %s", priority_level, message)

    def _speech_worker(self):
        """Processes messages sequentially without blocking the perception loop."""
        while self.is_running:
            try:
                priority_level, message = self.speech_queue.get(timeout=1.0)
                logger.info(">>> [SPEAKING via Bluetooth]: %s", message)

                if self.tts_available and self.engine is not None:
                    try:
                        self.engine.say(message)
                        self.engine.runAndWait()
                    except Exception as e:
                        logger.error("TTS run error: %s", e)

                self.speech_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error("Unexpected error in speech worker: %s", e)

    def shutdown(self):
        self.is_running = False
        if self.engine is not None:
            try:
                self.engine.stop()
            except Exception:
                pass
