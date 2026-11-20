import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radar, Radio, ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";

export const UltrasonicRadar = ({ detections = [], active = true, className }) => {
  const [angle, setAngle] = useState(0);

  // Sweep rotation animation
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setAngle((prev) => (prev + 3) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, [active]);

  // Convert detected objects into radar coordinates (angle & radius)
  const blips = detections.slice(0, 5).map((d, i) => {
    // Position angle: left (-40deg to -15deg), center (-10deg to 10deg), right (15deg to 40deg)
    let baseAngle = 0;
    if (d.position?.includes("left")) baseAngle = -28 - (i * 8);
    else if (d.position?.includes("right")) baseAngle = 28 + (i * 8);
    else baseAngle = (i % 2 === 0 ? -6 : 6);

    // Distance normalized (0 to 100% of radar radius, max 4.0m)
    const dist = Math.min(3.8, Math.max(0.4, d.distance || 1.5));
    const radiusPct = (dist / 4.0) * 82; // within 82% radius

    // Convert polar to cartesian (radar centered at 50%, 50%)
    // Angle 0 is straight UP (-90 deg from standard 0)
    const rad = ((baseAngle - 90) * Math.PI) / 180;
    const x = 50 + radiusPct * Math.cos(rad);
    const y = 50 + radiusPct * Math.sin(rad);

    return {
      id: d.label + i,
      label: d.label,
      distance: dist,
      steps: d.steps || Math.round(dist / 0.65),
      x,
      y,
      isHazard: d.isHazard || dist < 1.1,
    };
  });

  return (
    <GlassCard className={cn("p-5 flex flex-col items-center", className)}>
      <div className="flex w-full items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Radar className="h-4 w-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Spatial Sonar Radar
            </h4>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              360° CANIE Sensor Proximity
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Sweep
        </span>
      </div>

      {/* Radar Circular Scope */}
      <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-cyan-500/30 bg-slate-950/90 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Concentric distance rings */}
        <div className="absolute h-44 w-44 rounded-full border border-cyan-500/15" />
        <div className="absolute h-32 w-32 rounded-full border border-cyan-500/25" />
        <div className="absolute h-20 w-20 rounded-full border border-cyan-500/35" />
        <div className="absolute h-8 w-8 rounded-full border border-cyan-500/50" />

        {/* Ring Distance Markers */}
        <span className="absolute top-2 text-[9px] font-mono text-cyan-400/60 font-bold">3.0m</span>
        <span className="absolute top-8 text-[9px] font-mono text-cyan-400/60 font-bold">2.0m</span>
        <span className="absolute top-15 text-[9px] font-mono text-cyan-400/60 font-bold">1.0m</span>

        {/* Crosshair grid lines */}
        <div className="absolute h-full w-[1px] bg-cyan-500/20" />
        <div className="absolute w-full h-[1px] bg-cyan-500/20" />

        {/* Forward corridor cone (60 degrees) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "conic-gradient(from 150deg at 50% 50%, rgba(6,182,212,0.08) 0deg, rgba(99,102,241,0.18) 30deg, rgba(6,182,212,0.08) 60deg, transparent 61deg)",
          }}
        />

        {/* Rotating sweep line */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `rotate(${angle}deg)`,
            background:
              "conic-gradient(from 0deg at 50% 50%, rgba(6,182,212,0.4) 0deg, rgba(6,182,212,0.1) 45deg, transparent 70deg)",
          }}
        />

        {/* User position center icon */}
        <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-md shadow-cyan-500/50">
          <Radio className="h-3 w-3 text-white" />
        </div>

        {/* Detected Obstacle Blips */}
        {blips.map((b) => (
          <div
            key={b.id}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span
              className={cn(
                "relative flex h-3.5 w-3.5 items-center justify-center rounded-full",
                b.isHazard ? "bg-rose-500 shadow-rose-500" : "bg-cyan-400 shadow-cyan-400",
                "shadow-[0_0_12px]"
              )}
            >
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                  b.isHazard ? "bg-rose-400" : "bg-cyan-300"
                )}
              />
            </span>
            {/* Blip label tooltip */}
            <div className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white shadow">
              {b.label} · {b.distance.toFixed(1)}m
            </div>
          </div>
        ))}
      </div>

      {/* Dual Ultrasonic Sensor Gauges */}
      <div className="mt-4 grid grid-cols-2 gap-3 w-full">
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-2.5 text-center">
          <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
            Left Ultrasonic
          </p>
          <p className="mt-1 text-base font-extrabold text-white">
            {detections.find((d) => d.position?.includes("left"))?.distance?.toFixed(2) || "1.24"} m
          </p>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: "65%" }} />
          </div>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-slate-900/60 p-2.5 text-center">
          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
            Right Ultrasonic
          </p>
          <p className="mt-1 text-base font-extrabold text-white">
            {detections.find((d) => d.position?.includes("right"))?.distance?.toFixed(2) || "1.85"} m
          </p>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-indigo-400 rounded-full" style={{ width: "45%" }} />
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
