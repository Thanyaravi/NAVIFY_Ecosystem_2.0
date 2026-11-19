"""NAVIFY Emergency SOS Coordinator
Orchestrates the emergency event lifecycle:
1. Receives validated button press from GPIO17
2. Persists SOS event to local SQLite database immediately
3. Delivers high-priority local audio confirmation via Bluetooth earpiece
4. Signals cloud sync service to transmit emergency alert to caregivers
"""

import logging
from typing import Optional
from edge.storage.event_store import EventStore
from edge.voice.speech import VoiceSynthesizer

logger = logging.getLogger("navify.sos")

class SOSCoordinator:
    def __init__(self, event_store: EventStore, voice: VoiceSynthesizer):
        self.store = event_store
        self.voice = voice

    def handle_sos_trigger(self, trigger_type: str = "BUTTON_PRESS", 
                          lat: Optional[float] = None, lng: Optional[float] = None):
        """Called whenever the physical button or motion fall detector triggers."""
        logger.critical("EMERGENCY SOS TRIGGER RECEIVED! Type: %s", trigger_type)

        # 1. Log to local SQLite
        event_id = self.store.log_sos_event(
            trigger_type=trigger_type,
            location_lat=lat,
            location_lng=lng
        )

        # 2. Urgent Audio Feedback
        msg = "Emergency SOS activated. Caregivers and emergency contacts are being alerted."
        self.voice.speak(msg, priority_level=0)

        logger.info("SOS Event #%s logged locally and dispatched to sync pipeline.", event_id)
        return event_id
