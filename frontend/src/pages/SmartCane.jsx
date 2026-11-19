import React from "react";
import { motion } from "framer-motion";
import { Radio, Bluetooth, RefreshCw, CircleCheck, Clock } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/utils";

const smartCane = {
  name: "NAVIFY Cane Pro",
  model: "NC-2400",
  serial: "NVF-2400-8821",
  firmware: "v3.2.1",
  battery: 86,
  connection: "Bluetooth 5.3",
  signal: "Excellent",
  lastSync: "2 minutes ago",
  uptime: "6h 24m",
  sensors: [
    { id: "camera", label: "Camera Module", value: "Sony IMX708", status: "online" },
    { id: "ultrasonic", label: "Ultrasonic Array", value: "3× HC-SR04", status: "online" },
    { id: "imu", label: "IMU / Gyroscope", value: "BNO085", status: "online" },
    { id: "haptic", label: "Haptic Motor", value: "LRA 235Hz", status: "online" },
    { id: "gps", label: "GPS Module", value: "u-blox NEO-M9N", status: "online" },
    { id: "mic", label: "Microphone", value: "MEMS Digital", status: "waiting" },
  ],
};

const info = [
  { label: "Model", value: smartCane.model, icon: Radio },
  { label: "Serial Number", value: smartCane.serial, icon: CircleCheck },
  { label: "Firmware", value: smartCane.firmware, icon: RefreshCw },
  { label: "Connection", value: smartCane.connection, icon: Bluetooth },
  { label: "Signal", value: smartCane.signal, icon: Radio },
  { label: "Uptime", value: smartCane.uptime, icon: Clock },
];

export default function SmartCane() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader
        title={smartCane.name}
        subtitle="Real-time hardware overview of your connected assistive device."
        action={<StatusPill label={`Last sync · ${smartCane.lastSync}`} tone="success" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-4">
          <GlassCard className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="8" />
                <motion.circle cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={264} initial={{ strokeDashoffset: 264 }} animate={{ strokeDashoffset: 264 - (264 * smartCane.battery) / 100 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{smartCane.battery}%</span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Battery</span>
              </div>
            </div>
            <p className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">Estimated 6h 12m remaining</p>
            <div className="mt-4"><StatusPill label="Firmware up to date" tone="info" pulse={false} /></div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-8">
          <GlassCard className="h-full p-6">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Device Information</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {info.map((i) => (
                <div key={i.label} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <i.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{i.label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{i.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <GlassCard className="p-6">
          <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Sensors</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {smartCane.sensors.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{s.value}</p>
                </div>
                <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.status === "online" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.status === "online" ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")} />
                  {s.status === "online" ? "Active" : "Standby"}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
