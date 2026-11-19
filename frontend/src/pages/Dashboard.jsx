import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Camera, TrendingUp } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { StatusPill } from "@/components/StatusPill";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { dashboardStats, statusPills, hardwareStatus, recentDetections, deviceHealth } from "@/lib/mockData";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};

const STATUS_TONE = {
  online: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Online" },
  waiting: { dot: "bg-slate-300 dark:bg-slate-600", text: "text-slate-400 dark:text-slate-500", label: "Waiting" },
  offline: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", label: "Offline" },
};

const ACCENT = {
  indigo: "from-indigo-500/10 to-indigo-500/0 text-indigo-600 dark:text-indigo-400",
  blue: "from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400",
  emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
  rose: "from-rose-500/10 to-rose-500/0 text-rose-600 dark:text-rose-400",
};

const HEALTH_TONE = {
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

const ACTIVITY_TONE = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
};

const DET_ICON = { Person: "User", "Cell Phone": "Smartphone", Chair: "Armchair", Door: "DoorOpen", Stairs: "Footprints", Obstacle: "TriangleAlert", Vehicle: "Car" };

const Icon = ({ name, ...props }) => {
  const C = Icons[name] || Icons.Circle;
  return <C {...props} />;
};

const timeAgo = (iso) => {
  if (!iso) return "Just now";
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "Just now";
  if (diff < 60) return `${Math.round(diff)} min ago`;
  const h = Math.round(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    stats: dashboardStats,
    statusPills: statusPills,
    hardware: hardwareStatus,
    hardwareStatus: hardwareStatus,
    recentDetections: recentDetections,
    health: deviceHealth,
    deviceHealth: deviceHealth,
  });
  const [detections, setDetections] = useState(recentDetections);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get("/dashboard/summary");
        if (s?.data) {
          setSummary({
            stats: s.data.stats || dashboardStats,
            statusPills: s.data.statusPills || statusPills,
            hardware: s.data.hardware || s.data.hardwareStatus || hardwareStatus,
            hardwareStatus: s.data.hardwareStatus || s.data.hardware || hardwareStatus,
            recentDetections: s.data.recentDetections || recentDetections,
            health: s.data.health || s.data.deviceHealth || deviceHealth,
            deviceHealth: s.data.deviceHealth || s.data.health || deviceHealth,
          });
        }
      } catch {
        /* use defaults */
      }
      try {
        const d = await api.get("/detections", { params: { limit: 5 } });
        if (d?.data?.length) setDetections(d.data);
      } catch {
        /* keep default detections */
      }
    })();
  }, []);

  const recentActivity = [
    { id: 1, title: "Mobility Journey Active", detail: "Campus → Block B", time: "08:42 AM", icon: "Play", tone: "indigo" },
    { id: 2, title: "Obstacle Detected & Avoided", detail: "Chair obstruction at 1.20m safely bypassed", time: "08:51 AM", icon: "TriangleAlert", tone: "amber" },
    { id: 3, title: "CANIE Threat Scan", detail: "Drop-off and reflective surface checks clear", time: "09:15 AM", icon: "ShieldCheck", tone: "emerald" },
    { id: 4, title: "Telemetry Persisted", detail: `${detections.length} obstacle logs stored locally`, time: "09:30 AM", icon: "Cloud", tone: "blue" },
  ];

  const firstName = (user?.name || "Thanya").split(" ")[0];
  const statsList = summary.stats || dashboardStats;
  const pillsList = summary.statusPills || statusPills;
  const hwList = summary.hardwareStatus || summary.hardware || hardwareStatus;
  const healthList = summary.deviceHealth || summary.health || deviceHealth;
  const detList = detections || recentDetections;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.section variants={fadeUp} data-testid="dashboard-hero">
        <p className="text-sm font-semibold tracking-wide text-blue-600 dark:text-blue-400">
          {greeting()}, {firstName}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          NAVIFY Ecosystem Console
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-400">
          Real-time AI-powered assistive navigation ecosystem.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {pillsList.map((p) => (
            <StatusPill key={p.id} label={p.label} tone={p.tone} />
          ))}
        </div>
      </motion.section>

      <motion.section variants={stagger} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsList.map((s) => {
          const TrendIcon = s.trendUp ? ArrowUpRight : ArrowDownRight;
          return (
            <motion.div key={s.id} variants={fadeUp}>
              <GlassCard hover className="p-6" data-testid={`stat-card-${s.id}`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br", ACCENT[s.accent] || ACCENT.indigo)}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{s.value}</span>
                  {s.unit && <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">{s.unit}</span>}
                </div>
                <div className={cn("mt-3 inline-flex items-center gap-1 text-xs font-medium", s.trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {s.trend}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-8">
          <GlassCard className="overflow-hidden p-6" data-testid="dashboard-live-monitor">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Camera className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Live Camera</h3>
              </div>
              <StatusPill label="Standby" tone="slate" pulse={false} />
            </div>
            <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner dark:border-white/10 dark:from-slate-900 dark:to-slate-800">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_60%)]" />
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-md dark:bg-white/5"
              >
                <Camera className="h-7 w-7 text-slate-400" />
              </motion.div>
              <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Waiting for Raspberry Pi Camera...</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Open Live Monitor to run detection on your phone camera</p>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-4">
          <GlassCard className="p-6" data-testid="dashboard-hardware-status">
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Smart Cane Status</h3>
            <div className="space-y-1">
              {hwList.map((h) => {
                const tone = STATUS_TONE[h.status] || STATUS_TONE.online;
                return (
                  <div key={h.id} className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <Icon name={h.icon} className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{h.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
                      <span className={cn("text-xs font-medium", tone.text)}>{tone.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div variants={fadeUp}>
          <GlassCard className="h-full p-6" data-testid="dashboard-recent-detections">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Recent Detections</h3>
            {detList.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No detections yet</p>
            ) : (
              <div className="relative space-y-4 pl-2">
                <div className="absolute bottom-2 left-[19px] top-2 w-px bg-slate-100 dark:bg-white/10" />
                {detList.map((d) => (
                  <div key={d.id} className="relative flex items-center gap-3.5">
                    <div className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Icon name={DET_ICON[d.label] || "ScanEye"} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(d.created_at)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {d.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GlassCard className="h-full p-6" data-testid="dashboard-device-health">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Device Health</h3>
            <div className="space-y-4">
              {healthList.map((m) => (
                <div key={m.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{m.label}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{m.value}{m.suffix || "%"}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className={cn("h-full rounded-full", HEALTH_TONE[m.tone] || "bg-indigo-500")} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <GlassCard className="h-full p-6" data-testid="dashboard-recent-activity">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex gap-3.5">
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", ACTIVITY_TONE[a.tone] || ACTIVITY_TONE.indigo)}>
                    <Icon name={a.icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">{a.detail}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">{a.time}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </section>
    </motion.div>
  );
}
