import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { insights as mockInsights, journeyHistory } from "@/lib/mockData";

const OBJ_COLORS = ["bg-indigo-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-violet-500"];

const daily = [
  { day: "Mon", value: 62 }, { day: "Tue", value: 78 }, { day: "Wed", value: 45 },
  { day: "Thu", value: 88 }, { day: "Fri", value: 71 }, { day: "Sat", value: 94 }, { day: "Sun", value: 40 },
];
const weekly = [
  { week: "W1", value: 320 }, { week: "W2", value: 410 }, { week: "W3", value: 380 }, { week: "W4", value: 460 },
];

export default function Insights() {
  const [mostDetected, setMostDetected] = useState(mockInsights.mostDetected);
  const [journeys, setJourneys] = useState(journeyHistory);

  useEffect(() => {
    (async () => {
      try {
        const [stats, j] = await Promise.all([api.get("/detections/stats"), api.get("/journeys")]);
        if (Array.isArray(stats?.data)) setMostDetected(stats.data);
        if (Array.isArray(j?.data)) setJourneys(j.data);
      } catch {
        /* static fallback already in state */
      }
    })();
  }, []);

  const totalKm = journeys.reduce((a, b) => a + parseFloat(b.distance) || 0, 0);
  const journeyStats = [
    { label: "Total Distance", value: `${totalKm.toFixed(1)} km`, sub: "All journeys" },
    { label: "Avg. Daily", value: `${(totalKm / 7).toFixed(1)} km`, sub: "Last 7 days" },
    { label: "Trips", value: String(journeys.length), sub: "Completed" },
    { label: "Active Hours", value: "48h", sub: "This month" },
  ];
  const maxDaily = Math.max(...daily.map((d) => d.value));
  const maxDet = Math.max(...mostDetected.map((o) => o.count), 1);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader title="Insights" subtitle="A calm overview of your navigation habits and detection trends." />

      <motion.section variants={stagger} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {journeyStats.map((j) => (
          <motion.div key={j.label} variants={fadeUp}>
            <GlassCard hover className="p-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{j.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{j.value}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{j.sub}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-7">
          <GlassCard className="h-full p-6">
            <h3 className="mb-6 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Daily Activity</h3>
            <div className="flex h-52 items-end justify-between gap-3">
              {daily.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: Math.round((d.value / maxDaily) * 170) }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-indigo-500 to-blue-400"
                  />
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{d.day}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-5">
          <GlassCard className="h-full p-6">
            <h3 className="mb-6 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Most Detected Objects</h3>
            {mostDetected.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No detections logged yet</p>
            ) : (
              <div className="space-y-4">
                {mostDetected.map((o, i) => (
                  <div key={o.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize text-slate-600 dark:text-slate-300">{o.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{o.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(o.count / maxDet) * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className={cn("h-full rounded-full", OBJ_COLORS[i % OBJ_COLORS.length])} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-6">
          <h3 className="mb-6 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Weekly Activity</h3>
          <div className="grid grid-cols-4 gap-4">
            {weekly.map((w) => (
              <div key={w.week} className="rounded-2xl border border-white/70 bg-white/50 p-5 text-center dark:border-white/10 dark:bg-white/5">
                <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{w.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{w.week} · detections</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
