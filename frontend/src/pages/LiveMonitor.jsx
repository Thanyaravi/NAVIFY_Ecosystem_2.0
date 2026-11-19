import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Radio, Gauge, ScanEye, Activity, CameraOff, Play, Square, Loader2, Volume2, VolumeX } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { liveDetections } from "@/lib/mockData";

export default function LiveMonitor() {
  const [source, setSource] = useState("mobile"); // cane | mobile
  const [active, setActive] = useState(false);
  const [live, setLive] = useState([]);
  const [loggedCount, setLoggedCount] = useState(0);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamError, setStreamError] = useState(false);
  const [voice, setVoice] = useState(false);
  const voiceRef = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    voiceRef.current = voice;
    if (!voice && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [voice]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings");
        setStreamUrl(data?.device?.streamUrl || "");
        setVoice(!!data?.device?.voice);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const speak = (items) => {
    if (!voiceRef.current || !items.length || !("speechSynthesis" in window)) return;
    const top = items[0];
    const steps = Math.max(1, Math.min(5, Math.round((top.distance || 1.5) / 0.65)));
    const phrase = `In ${steps} steps, ${top.label} ahead at ${top.distance ? top.distance.toFixed(1) + " meters" : "close range"}. Move carefully.`;
    const u = new SpeechSynthesisUtterance(phrase);
    u.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const handleDetections = useCallback((summary, fresh) => {
    // dedupe by label for the live list
    const map = {};
    summary.forEach((s) => {
      if (!map[s.label] || s.confidence > map[s.label].confidence)
        map[s.label] = { confidence: s.confidence, position: s.position, proximity: s.proximity };
    });
    setLive(Object.entries(map).map(([label, v]) => ({ label, ...v })));

    if (fresh.length) speak(fresh);

    fresh.forEach(async (d) => {
      try {
        await api.post("/detections", {
          label: d.label.charAt(0).toUpperCase() + d.label.slice(1),
          confidence: d.confidence,
          source: "mobile",
        });
        setLoggedCount((c) => c + 1);
      } catch {
        /* ignore */
      }
    });
  }, []);

  const { status, fps, error } = useObjectDetection({
    videoRef,
    canvasRef,
    active: active && source === "mobile",
    onDetections: handleDetections,
  });

  useEffect(() => {
    setActive(false);
    setLive([]);
    setStreamError(false);
  }, [source]);

  const metrics = [
    { label: "FPS", value: source === "mobile" && active ? fps : "—", icon: Gauge },
    { label: "Detections", value: live.length, icon: ScanEye },
    {
      label: "Avg. Confidence",
      value: live.length ? `${Math.round(live.reduce((a, b) => a + b.confidence, 0) / live.length)}%` : "—",
      icon: Activity,
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader
        title="Live Monitor"
        subtitle="Real-time object detection powered by on-device AI (YOLOv11 on cane · COCO-SSD in browser)."
        action={
          <StatusPill
            label={loggedCount ? `${loggedCount} logged to cloud` : "Ready"}
            tone={loggedCount ? "success" : "slate"}
            pulse={false}
          />
        }
      />

      {/* Source toggle */}
      <motion.div variants={fadeUp}>
        <div className="glass inline-flex rounded-full p-1.5" data-testid="source-toggle">
          {[
            { id: "cane", label: "Smart Cane", icon: Radio },
            { id: "mobile", label: "Mobile Camera", icon: Camera },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              data-testid={`source-${s.id}`}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
                source === s.id ? "text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              {source === s.id && (
                <motion.div
                  layoutId="source-active"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 shadow-md shadow-indigo-500/30"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <s.icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{s.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-8">
          <GlassCard className="overflow-hidden p-6" data-testid="live-camera-panel">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Camera className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  Live Camera
                </h3>
              </div>
              {source === "mobile" && (
                <button
                  onClick={() => setVoice((v) => !v)}
                  data-testid="voice-toggle"
                  aria-label="Toggle voice guidance"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-all",
                    voice
                      ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "border-white/70 bg-white/60 text-slate-400 dark:border-white/10 dark:bg-white/5"
                  )}
                >
                  {voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              )}
              {source === "mobile" && (
                <button
                  onClick={() => setActive((a) => !a)}
                  data-testid="camera-start-stop"
                  disabled={status === "loading"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition-all active:scale-95",
                    active ? "bg-rose-500 shadow-rose-500/30" : "bg-gradient-to-r from-indigo-600 to-blue-500 shadow-indigo-500/30"
                  )}
                >
                  {status === "loading" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading AI…</>
                  ) : active ? (
                    <><Square className="h-4 w-4" /> Stop</>
                  ) : (
                    <><Play className="h-4 w-4" /> Start Camera</>
                  )}
                </button>
              )}
            </div>

            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner dark:border-white/10 dark:from-slate-900 dark:to-slate-800">
              {/* Video + canvas overlay (mobile source) */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  source === "mobile" && active ? "opacity-100" : "opacity-0"
                )}
              />
              <canvas
                ref={canvasRef}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  source === "mobile" && active ? "opacity-100" : "opacity-0"
                )}
              />

              {/* Placeholder states */}
              {source === "cane" && streamUrl && !streamError && (
                <img
                  src={streamUrl}
                  alt="Raspberry Pi camera stream"
                  data-testid="pi-stream-img"
                  onError={() => setStreamError(true)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {source === "cane" && streamUrl && !streamError && (
                <div className="absolute left-4 top-4 z-10">
                  <StatusPill label="Pi Live" tone="success" />
                </div>
              )}
              {source === "cane" && streamUrl && streamError && (
                <div className="relative flex flex-col items-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-md dark:bg-white/5">
                    <CameraOff className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Cannot reach the Pi camera stream</p>
                  <p className="mt-1 max-w-xs break-all text-xs text-slate-400 dark:text-slate-500">{streamUrl}</p>
                  <button onClick={() => setStreamError(false)} className="mt-3 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">Retry</button>
                </div>
              )}
              {source === "cane" && !streamUrl && (
                <div className="relative flex flex-col items-center">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-md dark:bg-white/5"
                  >
                    <Camera className="h-7 w-7 text-slate-400" />
                  </motion.div>
                  <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Waiting for Raspberry Pi Camera...
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Add your Pi stream URL in Settings → Device, or use Mobile Camera
                  </p>
                </div>
              )}

              {source === "mobile" && !active && status !== "loading" && (
                <div className="relative flex flex-col items-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-md dark:bg-white/5">
                    <CameraOff className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {error || "Press Start Camera to begin live detection"}
                  </p>
                  {!error && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Uses your device camera · runs fully in your browser
                    </p>
                  )}
                </div>
              )}

              {source === "mobile" && status === "loading" && (
                <div className="relative flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Loading detection model…
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-white/70 bg-white/50 p-4 text-center dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {m.value}
                  </p>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-4">
          <GlassCard className="h-full p-6" data-testid="live-detection-list">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              Detected Objects
            </h3>
            {((live.length ? live : (active ? [] : liveDetections)).length === 0) ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <ScanEye className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
                  No objects detected yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(live.length ? live : (active ? [] : liveDetections)).map((d) => (
                  <div
                    key={d.label}
                    className="rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">
                        {d.label}
                      </span>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {d.confidence}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <motion.div
                        animate={{ width: `${d.confidence}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                      />
                    </div>
                    {(d.proximity || d.position) && (
                      <p className="mt-1.5 text-xs capitalize text-slate-400 dark:text-slate-500">
                        {[d.proximity, d.position].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
