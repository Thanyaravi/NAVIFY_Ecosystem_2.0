"""NAVIFY Real-Time Live Assistant (VS Code Entry Point)
Run this file directly in VS Code by clicking the Play (▷) button at the top-right.

Features:
- Opens your real physical laptop webcam
- Performs live YOLOv11 object detection
- Dynamically estimates distance from live camera geometry
- Context-Aware Navigation Intelligence Engine (CANIE) analyzes walking path
- Speaks actionable guidance out loud via your speakers/headphones
- Press 's' to trigger an Emergency SOS test
- Press 'q' or 'ESC' to stop
"""

import os
import sys
from pathlib import Path

# Ensure workspace root is in Python sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from edge.main import NavifyEdgeApplication

def main():
    print("=" * 65)
    print("   NAVIFY Real-Time Edge AI Assistant (Live Camera Mode)   ")
    print("   Press 'q' in the camera window to quit.                 ")
    print("   Press 's' in the camera window to trigger SOS.          ")
    print("=" * 65)

    # Initialize live application using real webcam and on-screen HUD window
    app = NavifyEdgeApplication(camera_index=0, show_gui=True)
    app.start()

if __name__ == "__main__":
    main()
