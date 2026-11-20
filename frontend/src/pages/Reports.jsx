import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, FileText, MapPin, ScanEye, Clock, Loader2 } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { journeyHistory, detectionHistory } from "@/lib/mockData";

const reports = [
  { id: "journey", title: "Journey Report", detail: "Full route history, distances and durations", icon: MapPin },
  { id: "detection", title: "Detection Report", detail: "AI detections with confidence and actions", icon: ScanEye },
  { id: "summary", title: "Monthly Summary", detail: "Consolidated activity overview as PDF", icon: FileText },
];

const timeFmt = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function Reports() {
  const [journeys, setJourneys] = useState([]);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [j, d] = await Promise.all([api.get("/journeys"), api.get("/detections", { params: { limit: 20 } })]);
        setJourneys(Array.isArray(j?.data) ? j.data : journeyHistory);
        setDetections(Array.isArray(d?.data) ? d.data : detectionHistory);
      } catch {
        setJourneys(journeyHistory);
        setDetections(detectionHistory);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const downloadCSV = (name, rows) => {
    if (!rows.length) {
      toast.error("Nothing to export yet");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${r[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (r) => {
    if (r.id === "journey") downloadCSV("navify-journeys", journeys.map(({ user_id, ...x }) => x));
    else if (r.id === "detection") downloadCSV("navify-detections", detections.map(({ user_id, ...x }) => x));
    else downloadCSV("navify-summary", [{ trips: journeys.length, detections: detections.length, generated: new Date().toISOString() }]);
    toast.success(`${r.title} exported`, { description: "Your file has been downloaded." });
  };

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div>;
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader title="Reports" subtitle="Download and review your journey and detection history." />

      <motion.section variants={stagger} className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {reports.map((r) => (
          <motion.div key={r.id} variants={fadeUp}>
            <GlassCard hover className="flex h-full flex-col p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white">{r.title}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{r.detail}</p>
              <button
                onClick={() => handleExport(r)}
                data-testid={`export-${r.id}-button`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-lg active:scale-95"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </GlassCard>
          </motion.div>
        ))}
      </motion.section>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-6" data-testid="journey-history">
          <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Journey History</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-white/10 dark:text-slate-500">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Route</th>
                  <th className="pb-3 font-medium">Distance</th>
                  <th className="pb-3 font-medium">Duration</th>
                  <th className="pb-3 text-right font-medium">Detections</th>
                </tr>
              </thead>
              <tbody>
                {journeys.map((j) => (
                  <tr key={j.id} className="border-b border-slate-50 transition-colors hover:bg-white/60 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="py-3.5 font-medium text-slate-500 dark:text-slate-400">{j.date}</td>
                    <td className="py-3.5 font-medium text-slate-800 dark:text-slate-100">{j.route}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-300">{j.distance}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-300">{j.duration}</td>
                    <td className="py-3.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{j.detections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-6" data-testid="detection-history">
          <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Detection History</h3>
          <div className="space-y-2">
            {detections.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <ScanEye className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.label}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="h-3 w-3" /> {timeFmt(d.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">{d.confidence}%</span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium capitalize text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">{d.source}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
