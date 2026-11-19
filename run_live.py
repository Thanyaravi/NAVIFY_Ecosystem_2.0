"""NAVIFY Real-Time Live Detection Software
Based on BCI586 Research Paper:
'Real-Time Indoor Object Detection System for the Visually Impaired Using YOLOv11-M'
Department of CSE (AI & ML) - Sai Vidya Institute of Technology (SVIT)

100% Standalone Detection Software:
- Directly connects to your live physical camera / webcam
- Runs real-time YOLOv11 object detection
- Computes metric distance estimation (0.50m, 1.25m, etc.)
- Performs Reflective Surface & Glare Detection (Texture Analysis - FIG 1.1)
- Speaks natural step-based voice guidance via your speakers/headphones
- Zero localhost dependencies: runs completely self-contained on your device
"""

import os
import sys
import argparse
from pathlib import Path

# Ensure workspace root is in Python sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from edge.main import NavifyEdgeApplication


def main():
    parser = argparse.ArgumentParser(description="NAVIFY Real-Time Assistive Vision Software")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index (default: 0)")
    parser.add_argument("--video", type=str, default=None, help="Optional path to a test video file")
    parser.add_argument("--headless", action="store_true", help="Run without opening visual HUD window")
    parser.add_argument("--test-cycles", type=int, default=None, help="Run a fixed number of cycles and exit")
    parser.add_argument("--test-sos", action="store_true", help="Trigger a test SOS alert")
    args = parser.parse_args()

    print("=" * 70)
    print("   NAVIFY Real-Time Assistive Vision System (YOLOv11-M)   ")
    print("   Department of CSE (AI & ML) - SVIT                      ")
    print("   [Q] / [ESC] : Quit window                              ")
    print("   [S]         : Trigger Emergency SOS                    ")
    print("=" * 70)

    # Initialize live detection application (Zero localhost dependency)
    app = NavifyEdgeApplication(
        camera_index=args.camera,
        video_path=args.video,
        show_gui=not args.headless
    )

    if args.test_sos:
        import time
        time.sleep(1.0)
        app.sos_coord.handle_sos_trigger("CLI_TEST_TRIGGER")

    app.start(max_iterations=args.test_cycles)


if __name__ == "__main__":
    main()
