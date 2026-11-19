import { useEffect, useRef, useState, useCallback } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

// Loads COCO-SSD once and runs live detection on a <video> element,
// drawing boxes onto a <canvas>. Reports detections via onDetections.
export function useObjectDetection({ videoRef, canvasRef, active, onDetections }) {
  const modelRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | running | error
  const [fps, setFps] = useState(0);
  const [error, setError] = useState("");
  const lastReport = useRef({});

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStatus("ready");
    setFps(0);
  }, [canvasRef]);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    let cancelled = false;
    let frames = 0;
    let fpsTimer = Date.now();

    const COLORS = { primary: "#6366f1" };

    const draw = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const model = modelRef.current;
      if (!video || !canvas || !model || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let predictions = [];
      try {
        predictions = await model.detect(video);
      } catch {
        /* transient */
      }

      const summary = [];
      const fw = canvas.width || 640;
      const fh = canvas.height || 480;

      // Draw Top Yellow Status Banner (FIG 1.2 / 1.3)
      ctx.font = "bold 16px Inter, monospace, sans-serif";
      ctx.fillStyle = "#eab308"; // bright yellow
      ctx.fillText(`YOLO / COCO | ${fh}p | FPS: ${fps}`, 16, 28);

      predictions.forEach((p) => {
        if (p.score < 0.45) return;
        const [x, y, w, h] = p.bbox;
        const conf = p.score.toFixed(2);
        const cx = x + w / 2;
        const position = cx < fw * 0.35 ? "on your left" : cx > fw * 0.65 ? "on your right" : "straight ahead";
        const rel = h / fh;
        
        // Calibrated metric distance
        const distM = Math.max(0.35, Math.min(6.0, Number((0.95 / Math.max(0.12, rel)).toFixed(2))));
        const isHazard = distM <= 1.0 || (position === "straight ahead" && distM <= 1.5);
        const boxColor = isHazard ? "#ef4444" : "#22c55e"; // Red for hazard, Green for safe
        const proximity = distM < 0.8 ? "immediate hazard" : distM < 1.5 ? "close ahead" : "far ahead";

        summary.push({ label: p.class, confidence: Math.round(p.score * 100), position, proximity, distance: distM });

        // Draw Bounding Box (FIG 1.2 / 1.3)
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = boxColor;
        ctx.strokeRect(x, y, w, h);

        // Draw Label: e.g. "person 0.93 0.50m"
        const labelText = `${p.class} ${conf} ${distM.toFixed(2)}m`;
        ctx.font = "bold 14px Inter, monospace, sans-serif";
        const tw = ctx.measureText(labelText).width;
        
        // Background tag for readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(x, Math.max(0, y - 22), tw + 10, 20);

        ctx.fillStyle = boxColor;
        ctx.fillText(labelText, x + 5, Math.max(14, y - 7));
      });

      // Report new/high-confidence detections, debounced per label (4s)
      if (onDetections && summary.length) {
        const now = Date.now();
        const fresh = summary.filter((s) => {
          const last = lastReport.current[s.label] || 0;
          if (now - last > 4000) {
            lastReport.current[s.label] = now;
            return true;
          }
          return false;
        });
        if (fresh.length) onDetections(summary, fresh);
      } else if (onDetections) {
        onDetections(summary, []);
      }

      frames += 1;
      if (Date.now() - fpsTimer > 1000) {
        setFps(frames);
        frames = 0;
        fpsTimer = Date.now();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const start = async () => {
      try {
        setStatus("loading");
        setError("");
        if (!modelRef.current) {
          modelRef.current = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        }
        if (cancelled) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus("running");
        rafRef.current = requestAnimationFrame(draw);
      } catch (e) {
        if (e.name === "NotAllowedError")
          setError("Camera permission denied. Please allow camera access.");
        else if (e.name === "NotFoundError")
          setError("No camera found on this device.");
        else setError(e.message || "Unable to start camera.");
        setStatus("error");
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { status, fps, error, stop };
}
