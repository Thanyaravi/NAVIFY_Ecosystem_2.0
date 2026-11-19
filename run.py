"""NAVIFY Real-Time Indoor Assistive Vision Runner
Based on the BCI586 Research Paper:
'Real-Time Indoor Object Detection System for the Visually Impaired Using YOLOv11-M'
Department of CSE (AI & ML) - Sai Vidya Institute of Technology (SVIT)

Usage:
    python run.py                     # Run live camera assistant with real-time HUD
    python run.py --camera 1          # Specify camera index
    python run.py --video test.mp4    # Run on recorded video stream
"""

import sys
import os
from pathlib import Path

# Ensure root directory is on sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from run_live import main

if __name__ == "__main__":
    main()
