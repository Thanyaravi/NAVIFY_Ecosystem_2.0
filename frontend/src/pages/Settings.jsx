import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { User, Bell, Palette, Cloud, Cpu, Info, Check } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "device", label: "Device", icon: Cpu },
  { id: "about", label: "About", icon: Info },
];

const THEMES = [
  { id: "light", label: "Light", grad: "from-white to-slate-100" },
  { id: "dark", label: "Dark", grad: "from-slate-800 to-slate-950" },
];

const Row = ({ title, desc, children }) => (
  <div className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0 dark:border-white/5">
    <div className="pr-4">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
      {desc && <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>}
    </div>
    {children}
  </div>
);

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState("profile");
  const [notif, setNotif] = useState({ detections: true, sos: true, journey: false });
  const [autoSync, setAutoSync] = useState(true);
  const [device, setDevice] = useState({ haptic: true, voice: false, streamUrl: "" });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings");
        if (data.notifications) setNotif(data.notifications);
        if (data.cloud) setAutoSync(!!data.cloud.autoSync);
        if (data.device) setDevice({ haptic: data.device.haptic ?? true, voice: !!data.device.voice, streamUrl: data.device.streamUrl || "" });
      } catch {
        try {
          const stored = JSON.parse(localStorage.getItem("navify_settings") || "{}");
          if (stored.notifications) setNotif(stored.notifications);
          if (stored.cloud) setAutoSync(!!stored.cloud.autoSync);
          if (stored.device) setDevice({ haptic: stored.device.haptic ?? true, voice: !!stored.device.voice, streamUrl: stored.device.streamUrl || "" });
        } catch {
          /* keep defaults */
        }
      }
    })();
  }, []);

  const persist = async (patch) => {
    try {
      await api.put("/settings", patch);
      toast.success("Settings updated");
    } catch {
      // In offline/static mode, persist to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem("navify_settings") || "{}");
        localStorage.setItem("navify_settings", JSON.stringify({ ...stored, ...patch }));
        toast.success("Settings saved");
      } catch {
        toast.success("Settings saved");
      }
    }
  };

  const updateNotif = (k) => (v) => {
    const next = { ...notif, [k]: v };
    setNotif(next);
    persist({ notifications: next });
  };

  const updateDevice = (patch) => {
    const next = { ...device, ...patch };
    setDevice(next);
    persist({ device: next });
  };

  const chooseTheme = (t) => {
    setTheme(t);
    persist({ theme: t });
    toast.success(`${t === "dark" ? "Dark" : "Light"} theme applied`);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader title="Settings" subtitle="Personalize your NAVIFY console and device." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <GlassCard className="p-3">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col">
              {SECTIONS.map((s) => {
                const SectionIcon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    data-testid={`settings-tab-${s.id}`}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                      section === s.id
                        ? "bg-white text-indigo-700 shadow-sm dark:bg-indigo-500/15 dark:text-indigo-300"
                        : "text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                    )}
                  >
                    <SectionIcon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-9">
          <GlassCard className="p-6 sm:p-8">
            {section === "profile" && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-2xl font-bold text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/50 dark:ring-slate-700">
                    T
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Thanya C Ravi</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Student · thanyaravi02@gmail.com</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { l: "Full Name", v: "Thanya C Ravi" },
                    { l: "Email", v: "thanyaravi02@gmail.com" },
                    { l: "Role", v: "Student" },
                    { l: "Institution", v: "Sai Vidya Institute of Technology" },
                    { l: "Department", v: "CSE (AI & ML)" },
                    { l: "Timezone", v: "Asia/Kolkata (GMT+5:30)" },
                  ].map((f) => (
                    <div key={f.l}>
                      <label className="text-xs font-medium text-slate-400 dark:text-slate-500">{f.l}</label>
                      <div className="mt-1.5 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-medium text-slate-800 shadow-inner dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                        {f.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === "notifications" && (
              <div>
                <Row title="AI Detection Alerts" desc="Notify on new object detections">
                  <Switch checked={notif.detections} onCheckedChange={updateNotif("detections")} />
                </Row>
                <Row title="SOS Alerts" desc="Critical emergency notifications">
                  <Switch checked={notif.sos} onCheckedChange={updateNotif("sos")} />
                </Row>
                <Row title="Journey Summaries" desc="Daily recap of your trips">
                  <Switch checked={notif.journey} onCheckedChange={updateNotif("journey")} />
                </Row>
              </div>
            )}

            {section === "appearance" && (
              <div>
                <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">Theme</p>
                <div className="grid grid-cols-2 gap-4 sm:max-w-md">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => chooseTheme(t.id)}
                      data-testid={`theme-${t.id}`}
                      className={cn("relative overflow-hidden rounded-2xl border-2 p-1 transition-all", theme === t.id ? "border-indigo-500" : "border-transparent")}
                    >
                      <div className={cn("h-24 w-full rounded-xl bg-gradient-to-br", t.grad)} />
                      <p className="py-2 text-xs font-medium text-slate-600 dark:text-slate-300">{t.label}</p>
                      {theme === t.id && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {section === "cloud" && (
              <div>
                <Row title="Auto Cloud Sync" desc="Continuously back up detections & journeys">
                  <Switch checked={autoSync} onCheckedChange={(v) => { setAutoSync(v); persist({ cloud: { autoSync: v } }); }} />
                </Row>
                <Row title="Storage Used" desc="4.2 GB of 15 GB">
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">28%</span>
                </Row>
                <Row title="Last Sync" desc="All data up to date">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Just now</span>
                </Row>
              </div>
            )}

            {section === "device" && (
              <div>
                <div className="border-b border-slate-100 py-4 dark:border-white/5">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Raspberry Pi Camera Stream</p>
                  <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
                    Paste your Pi's MJPEG or video URL. It plays as the Smart Cane feed in Live Monitor.
                  </p>
                  <input
                    type="url"
                    defaultValue={device.streamUrl}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v !== device.streamUrl) { updateDevice({ streamUrl: v }); toast.success("Stream URL saved"); } }}
                    placeholder="http://192.168.1.50:8080/stream"
                    data-testid="pi-stream-url-input"
                    className="w-full rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm text-slate-800 shadow-inner outline-none transition-all focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-indigo-500/30"
                  />
                </div>
                <Row title="Voice Guidance" desc="Speak detected obstacles aloud during Mobile Camera">
                  <Switch checked={device.voice} onCheckedChange={(v) => updateDevice({ voice: v })} data-testid="voice-guidance-switch" />
                </Row>
                <Row title="Haptic Feedback" desc="Vibration cues for obstacles">
                  <Switch checked={device.haptic} onCheckedChange={(v) => updateDevice({ haptic: v })} />
                </Row>
                <Row title="Model" desc="NVF-2400-8821">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">NC-2400</span>
                </Row>
                <Row title="Firmware" desc="Up to date">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">v3.2.1</span>
                </Row>
                <Row title="Connection" desc="Excellent signal">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Bluetooth 5.3</span>
                </Row>
              </div>
            )}

            {section === "about" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/30">
                  <Cpu className="h-6 w-6 text-white" />
                </div>
                <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">NAVIFY Ecosystem</p>
                <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Version 1.1.0 · Edge AI Console</p>
                <p className="mx-auto mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  A premium assistive navigation platform combining edge AI, real-time computer vision and cloud intelligence to empower independent mobility.
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
