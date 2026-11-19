"""NAVIFY CANIE Repeat Alert Suppression Engine
Prevents auditory fatigue by remembering recently announced obstacles and
suppressing redundant alerts while stationary, while ensuring immediate re-alerting
if an obstacle approaches significantly or hazard level escalates.
"""

import time
import logging
from dataclasses import dataclass
from typing import Dict, Optional
from edge.config.settings import SUPPRESSION_CONFIG
from edge.canie.priorities import Priority

logger = logging.getLogger("navify.canie.suppression")

@dataclass
class AnnouncedMemory:
    object_name: str
    zone: str
    priority: Priority
    last_distance_cm: Optional[float]
    last_announced_time: float


class AlertSuppressionEngine:
    def __init__(self):
        self.cooldown_sec = SUPPRESSION_CONFIG["STATIONARY_COOLDOWN_SEC"]
        self.distance_delta_cm = SUPPRESSION_CONFIG["DISTANCE_CHANGE_DELTA_CM"]
        self.high_priority_cooldown = SUPPRESSION_CONFIG["HIGH_PRIORITY_COOLDOWN_SEC"]
        
        # Memory keyed by (object_name, zone)
        self.memory: Dict[str, AnnouncedMemory] = {}

    def _make_key(self, object_name: str, zone: str) -> str:
        return f"{object_name.lower()}_{zone.upper()}"

    def should_announce(self, object_name: str, zone: str, priority: Priority, 
                        distance_cm: Optional[float]) -> bool:
        """
        Determines whether the alert should be spoken or suppressed.
        Returns True if alert should proceed, False if it should be silenced.
        """
        now = time.time()
        key = self._make_key(object_name, zone)
        
        # First time seeing this obstacle in this zone
        if key not in self.memory:
            return True

        last_entry = self.memory[key]
        time_elapsed = now - last_entry.last_announced_time

        # Check if priority escalated (e.g. LOW -> HIGH or CRITICAL)
        if priority.value > last_entry.priority.value:
            logger.debug("Priority escalated for %s (%s -> %s). Bypassing suppression.", 
                         object_name, last_entry.priority.name, priority.name)
            return True

        # Critical priority alerts repeat on a faster cooldown
        if priority == Priority.CRITICAL:
            return time_elapsed >= self.high_priority_cooldown

        # Check if distance closed significantly (user walked closer or obstacle approached)
        if distance_cm is not None and last_entry.last_distance_cm is not None:
            if (last_entry.last_distance_cm - distance_cm) >= self.distance_delta_cm:
                logger.debug("Distance closed by > %scm for %s. Bypassing suppression.", 
                             self.distance_delta_cm, object_name)
                return True

        # Otherwise enforce stationary cooldown period
        if time_elapsed < self.cooldown_sec:
            return False

        return True

    def mark_announced(self, object_name: str, zone: str, priority: Priority, 
                       distance_cm: Optional[float]):
        """Records that an alert was delivered to the user."""
        key = self._make_key(object_name, zone)
        self.memory[key] = AnnouncedMemory(
            object_name=object_name,
            zone=zone,
            priority=priority,
            last_distance_cm=distance_cm,
            last_announced_time=time.time()
        )
