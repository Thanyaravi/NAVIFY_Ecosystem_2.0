import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  Radio,
  Gauge,
  ScanEye,
  Activity,
  CameraOff,
  Play,
  Square,
  Loader2,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { UltrasonicRadar } from "@/components/UltrasonicRadar";
import { useObjectDetection } from "@/hooks/useObjectDetection";
import { audioService } from "@/lib/audioService";
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
  
  // Voice Guidance state - Default to TRUE for assistive accessibility
  const [voice, setVoice] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpeech, setLastSpeech] = useState("Audio guidance active. Tap 'Test Audio' anytime.");
  
  // Fine-tuning settings
  const [confThreshold, setConfThreshold] = useState(0.40);
  const [focusMode, setFocusMode] = useState("all"); // all | bottle_focus
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Sync voice state with audioService
  useEffect(() => {
    audioService.enabled = voice;
    const unsub = audioService.subscribe((event, text) => {
      if (event === "start") {
        setIsSpeaking(true);
        if (text) setLastSpeech(text);
      } else if (event === "end") {
        setIsSpeaking(false);
      }
    });
    return () => unsub();
  }, [voice]);

  // Load device stream URL from settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings");
        setStreamUrl(data?.device?.streamUrl || "");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleTestVoice = () => {
    setVoice(true);
    const phrase = audioService.testVoice();
    toast.success("Voice Feedback Test", {
      description: phrase,
      icon: "🔊",
    });
  };

  const speakGuidance = useCallback((fresh) => {
    if (!voice || !fresh.length) return;
    const top = fresh[0];

    let phrase = "";
    if (top.isHazard) {
      phrase = `Warning! ${top.label} directly ahead at ${top.distance.toFixed(1)} meters, about ${top.steps} step!`;
    } else if (top.label.toLowerCase() === "bottle") {
      phrase = `Bottle detected ${top.position} at ${top.distance.toFixed(1)} meters, approximately ${top.steps} steps.`;
    } else {
      phrase = `${top.label} ${top.position} at ${top.distance.toFixed(1)} meters, ${top.steps} steps ahead.`;
    }

    audioService.speak(phrase, { immediate: top.isHazard });
  }, [voice]);

  const handleDetections = useCallback(
    (summary, fresh) => {
      // Filter if in Bottle Focus mode
      const filtered = focusMode === "bottle_focus"
        ? summary.filter((s) => s.label.toLowerCase().includes("bottle") || s.isHazard)
        : summary;

      // Deduplicate by label for clean telemetry display
      const map = {};
      filtered.forEach((s) => {
        if (!map[s.label] || s.confidence > map[s.label].confidence) {
          map[s.label] = s;
        }
      });
      setLive(Object.values(map));

      if (fresh.length) {
        speakGuidance(fresh);

        // Telemetry persistence
        fresh.forEach(async (d) => {
          try {
            await api.post("/detections", {
              label: d.label,
              confidence: d.confidence,
              source: "mobile",
            });
            setLoggedCount((c) => c + 1);
          } catch {
            /* ignore */
          }
        });
      }
    },
    [focusMode, speakGuidance]
  );

  const { status, fps, error } = useObjectDetection({
    videoRef,
    canvasRef,
    active: active && source === "mobile",
    confidenceThreshold: confThreshold,
    onDetections: handleDetections,
  });

  const handleToggleCamera = () => {
    if (!active) {
      setActive(true);
      if (voice) {
        audioService.speak("NAVIFY camera active. Scanning environment for obstacles.", { immediate: true });
      }
    } else {
      setActive(false);
      setLive([]);
      audioService.stop();
    }
  };

  useEffect(() => {
    setActive(false);
    setLive([]);
    setStreamError(false);
  }, [source]);

  const metrics = [
    { label: "Neural FPS", value: source === "mobile" && active ? `${fps} fps` : "—", icon: Gauge, tone: "indigo" },
    { label: "Active Detections", value: live.length, icon: ScanEye, tone: "cyan" },
    {
      label: "Avg. Confidence",
      value: live.length ? `${Math.round(live.reduce((a, b) => a + b.confidence, 0) / live.length)}%` : "—",
      icon: Activity,
      tone: "emerald",
    },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader
        title="Live Monitor"
        subtitle="Real-time edge AI object detection & step-based voice navigation (YOLOv11 / CANIE Calibration)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestVoice}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Test Voice Feedback
            </button>
            <StatusPill
              label={loggedCount ? `${loggedCount} logged to cloud` : "AI Engine Ready"}
              tone={loggedCount ? "success" : "info"}
              pulse={false}
            />
          </div>
        }
      />

      {/* Control Navigation Header */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-4">
        {/* Source Switcher */}
        <div className="glass inline-flex rounded-full p-1.5" data-testid="source-toggle">
          {[
            { id: "mobile", label: "Mobile / Webcam AI", icon: Camera },
            { id: "cane", label: "Smart Cane Stream", icon: Radio },
          ].map((s) => {
            const SourceIcon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSource(s.id)}
                data-testid={`source-${s.id}`}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                  source === s.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                {source === s.id && (
                  <motion.div
                    layoutId="source-active"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 shadow-lg shadow-indigo-500/30"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <SourceIcon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Fine-Tuning Chips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFocusMode((m) => (m === "all" ? "bottle_focus" : "all"));
              toast.info(
                focusMode === "all"
                  ? "🎯 Bottle & Container Priority Mode activated"
                  : "🛡️ Standard All-Object Detection Mode activated"
              );
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border",
              focusMode === "bottle_focus"
                ? "border-cyan-400 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
            {focusMode === "bottle_focus" ? "Bottle Disambiguation: ON" : "Focus: All Hazards"}
          </button>

          {/* Voice Guidance Toggle */}
          <button
            onClick={() => {
              const next = !voice;
              setVoice(next);
              if (next) {
                audioService.playTone("chime");
                audioService.speak("Voice guidance enabled.");
              } else {
                audioService.stop();
              }
              toast.info(next ? "Voice Feedback Enabled" : "Voice Feedback Muted");
            }}
            data-testid="voice-toggle"
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all border",
              voice
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400"
            )}
          >
            {voice ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {voice ? "Voice Feedback: ON" : "Voice Muted"}
            {voice && isSpeaking && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Main Vision & Radar Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Live Camera Panel with Cyberpunk HUD */}
        <motion.div variants={fadeUp} className="lg:col-span-8">
          <GlassCard className="overflow-hidden p-6" data-testid="live-camera-panel">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Assistive Optical Feed
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Spatial perception with calibrated metric obstacle alerts
                  </p>
                </div>
              </div>

              {source === "mobile" && (
                <button
                  onClick={handleToggleCamera}
                  data-testid="camera-start-stop"
                  disabled={status === "loading"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95",
                    active
                      ? "bg-rose-500 shadow-rose-500/30 hover:bg-rose-600"
                      : "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 shadow-indigo-500/30 hover:opacity-95"
                  )}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading Model…
                    </>
                  ) : active ? (
                    <>
                      <Square className="h-4 w-4" /> Stop Camera
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Start Camera
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Video Viewport Container */}
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-950 shadow-2xl dark:border-white/10">
              {/* Corner Decorative HUD Brackets */}
              <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-cyan-400 z-10" />
              <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-cyan-400 z-10" />
              <div className="pointer-events-none absolute left-3 bottom-3 h-5 w-5 border-l-2 border-b-2 border-cyan-400 z-10" />
              <div className="pointer-events-none absolute right-3 bottom-3 h-5 w-5 border-r-2 border-b-2 border-cyan-400 z-10" />

              {/* Video + Canvas Elements */}
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

              {/* Standby & Pi Camera States */}
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
                  <StatusPill label="Pi Camera Stream Active" tone="success" />
                </div>
              )}
              {source === "cane" && streamUrl && streamError && (
                <div className="relative flex flex-col items-center px-6 text-center z-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-md">
                    <CameraOff className="h-7 w-7 text-rose-400" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">Cannot reach Pi stream</p>
                  <p className="mt-1 max-w-xs break-all text-xs text-slate-400">{streamUrl}</p>
                  <button
                    onClick={() => setStreamError(false)}
                    className="mt-3 rounded-full bg-cyan-500/20 px-3.5 py-1.5 text-xs font-semibold text-cyan-300"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
              {source === "cane" && !streamUrl && (
                <div className="relative flex flex-col items-center z-10 text-center px-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-md">
                    <Camera className="h-7 w-7 text-cyan-400" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-white">
                    Raspberry Pi Camera Standby
                  </p>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    Connect your Raspberry Pi stream in Settings → Device, or switch to Mobile / Webcam AI.
                  </p>
                </div>
              )}

              {source === "mobile" && !active && status !== "loading" && (
                <div className="relative flex flex-col items-center px-6 text-center z-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-md shadow-indigo-500/10">
                    <Camera className="h-7 w-7 text-indigo-400" />
                  </div>
                  <p className="mt-4 text-base font-bold text-white">
                    {error || "Assistive Camera Ready"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    {error
                      ? "Check browser permissions for camera access."
                      : "Click 'Start Camera' to launch real-time object detection and step-by-step voice guidance."}
                  </p>
                  {!error && (
                    <button
                      onClick={handleToggleCamera}
                      className="mt-4 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95"
                    >
                      Start Camera Now
                    </button>
                  )}
                </div>
              )}

              {source === "mobile" && status === "loading" && (
                <div className="relative flex flex-col items-center z-10 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                  <p className="mt-4 text-sm font-bold text-white">
                    Initializing YOLOv11 & CANIE Tensor Engine…
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Loading fine-tuned models into GPU memory</p>
                </div>
              )}
            </div>

            {/* Glowing Live Spoken Voice Transcript Bar */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-indigo-500/20 bg-slate-900/80 p-3.5 backdrop-blur-md">
              <div className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                isSpeaking ? "bg-emerald-500/20 text-emerald-400 animate-pulse" : "bg-indigo-500/20 text-indigo-400"
              )}>
                <Volume2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    {isSpeaking ? "Speaking Aloud" : "Speech Guidance Output"}
                  </span>
                  {isSpeaking && (
                    <span className="flex items-center gap-0.5">
                      <span className="h-2 w-0.5 bg-emerald-400 animate-bounce" />
                      <span className="h-3 w-0.5 bg-emerald-400 animate-bounce delay-75" />
                      <span className="h-2 w-0.5 bg-emerald-400 animate-bounce delay-150" />
                    </span>
                  )}
                </div>
                <p className="truncate text-xs font-medium text-slate-200 mt-0.5">
                  "{lastSpeech}"
                </p>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-white/70 bg-white/60 p-4 text-center dark:border-white/10 dark:bg-white/5 backdrop-blur-sm"
                >
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {m.value}
                  </p>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Right Column: Ultrasonic Radar + Detected Objects List */}
        <motion.div variants={fadeUp} className="space-y-6 lg:col-span-4">
          {/* Spatial Sonar Radar Component */}
          <UltrasonicRadar
            detections={live.length ? live : (active ? [] : liveDetections)}
            active={active}
          />

          {/* Real-time Objects Card */}
          <GlassCard className="p-6" data-testid="live-detection-list">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Detected Objects
              </h3>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                {live.length ? `${live.length} in corridor` : "Standby"}
              </span>
            </div>

            {((live.length ? live : (active ? [] : liveDetections)).length === 0) ? (
              <div className="flex h-36 flex-col items-center justify-center text-center">
                <ScanEye className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                  No obstacles in forward walking corridor
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(live.length ? live : (active ? [] : liveDetections)).map((d) => {
                  const isBottle = d.label.toLowerCase() === "bottle";
                  return (
                    <div
                      key={d.label}
                      className={cn(
                        "rounded-2xl border p-3.5 transition-all",
                        d.isHazard
                          ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20"
                          : isBottle
                          ? "border-cyan-500/40 bg-cyan-500/5 dark:bg-cyan-950/20"
                          : "border-white/70 bg-white/50 dark:border-white/10 dark:bg-white/5"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold capitalize text-slate-900 dark:text-white">
                            {d.label}
                          </span>
                          {d.calibrated && (
                            <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                              Calibrated
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs font-bold",
                          d.isHazard ? "text-rose-500" : isBottle ? "text-cyan-500" : "text-indigo-600 dark:text-indigo-400"
                        )}>
                          {d.confidence}%
                        </span>
                      </div>

                      {/* Distance & Proximity Details */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{d.proximity || (d.distance ? `${d.distance.toFixed(1)}m away` : "Close")}</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                          {d.steps ? `~${d.steps} steps` : "In path"}
                        </span>
                      </div>

                      {/* Progress Confidence Bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <motion.div
                          animate={{ width: `${d.confidence}%` }}
                          transition={{ duration: 0.4 }}
                          className={cn(
                            "h-full rounded-full",
                            d.isHazard
                              ? "bg-rose-500"
                              : isBottle
                              ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                              : "bg-gradient-to-r from-indigo-500 to-blue-500"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
