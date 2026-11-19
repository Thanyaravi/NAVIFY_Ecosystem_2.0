import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Phone, Mail, MapPin, Plus, Star, Loader2, Trash2, RefreshCw, ExternalLink, Activity } from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  Resolved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  "False Alarm": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  Active: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

const DEFAULT_LOC = { label: "Locating…", coords: "Waiting for GPS", accuracy: "—", updated: "", lat: null, lng: null, maps: "" };

export default function SOS() {
  const [contacts, setContacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [loc, setLoc] = useState(DEFAULT_LOC);
  const [sms, setSms] = useState(false);
  const [fallOn, setFallOn] = useState(false);
  const fallTs = useRef(0);

  const load = async () => {
    const [c, h] = await Promise.all([api.get("/contacts"), api.get("/sos")]);
    setContacts(c.data);
    setHistory(h.data);
  };

  const getLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLoc((l) => ({ ...l, label: "Location unsupported", coords: "This device has no GPS" }));
      return;
    }
    setLoc((l) => ({ ...l, label: "Locating…", coords: "Waiting for GPS" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLoc({
          label: "Current position",
          coords: `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`,
          accuracy: `±${Math.round(accuracy)} m`,
          updated: "Just now",
          lat: latitude,
          lng: longitude,
          maps: `https://maps.google.com/?q=${latitude},${longitude}`,
        });
      },
      () => setLoc((l) => ({ ...l, label: "Location blocked", coords: "Enable location access in your browser" })),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
        try {
          const { data } = await api.get("/notifications/status");
          setSms(!!data.sms_configured);
        } catch { /* ignore */ }
      } finally {
        setLoading(false);
      }
    })();
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (!fallOn) return;
    const handler = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      if (mag > 30 && Date.now() - fallTs.current > 15000) {
        fallTs.current = Date.now();
        toast.warning("Possible fall detected", { description: "Triggering emergency SOS…" });
        trigger("Fall Detected");
      }
    };
    (async () => {
      try {
        if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
          const p = await DeviceMotionEvent.requestPermission();
          if (p !== "granted") {
            toast.error("Motion permission denied");
            setFallOn(false);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      window.addEventListener("devicemotion", handler);
    })();
    return () => window.removeEventListener("devicemotion", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallOn]);

  const trigger = async (type = "Manual Trigger") => {
    setActive(true);
    const placeholder =
      !loc.label || loc.label === "Current position" || loc.label.startsWith("Locating") || loc.label.startsWith("Location");
    const locName = placeholder ? (loc.coords && loc.coords !== "Waiting for GPS" ? loc.coords : "Unknown") : loc.label;
    try {
      const { data } = await api.post("/sos", {
        type,
        location: locName,
        lat: loc.lat,
        lng: loc.lng,
        maps_url: loc.maps,
      });
      const n = data.notified || {};
      const parts = [];
      if (n.email) parts.push(`${n.email} by email`);
      if (n.sms) parts.push(`${n.sms} by SMS`);
      toast.error(type === "Fall Detected" ? "Fall SOS sent" : "SOS triggered", {
        description: parts.length
          ? `Notified ${parts.join(" & ")} with your location.`
          : "Logged. Add contacts with an email or phone to alert them.",
      });
      await load();
    } catch {
      toast.error("SOS logged", { description: "Could not reach the notification service." });
    }
    setTimeout(() => setActive(false), 4000);
  };

  const addContact = async () => {
    const name = window.prompt("Contact name?");
    if (!name) return;
    const relation = window.prompt("Relation?") || "Contact";
    const phone = window.prompt("Phone in E.164 for SMS (e.g. +15551234567) — leave blank to skip:") || "";
    const email = window.prompt("Email for alerts (optional):") || null;
    await api.post("/contacts", { name, relation, phone, email, primary: false });
    await load();
    toast.success("Contact added");
  };

  const removeContact = async (id) => {
    await api.delete(`/contacts/${id}`);
    await load();
    toast.success("Contact removed");
  };

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div>;
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader
        title="SOS Center"
        subtitle="Emergency contacts, live location and one-tap safety alerts."
        action={<StatusPill label={active ? "SOS Active" : "All Safe"} tone={active ? "rose" : "success"} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-5">
          <GlassCard className="flex h-full flex-col items-center justify-center p-8 text-center">
            <button onClick={() => trigger()} data-testid="sos-trigger-button" className="group relative flex h-44 w-44 items-center justify-center rounded-full">
              <span className={cn("absolute inset-0 rounded-full bg-rose-400/30 blur-xl transition-all", active ? "animate-ping" : "group-hover:bg-rose-400/50")} />
              <span className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-2xl shadow-rose-500/40 transition-transform duration-200 group-active:scale-95">
                <ShieldAlert className="h-10 w-10" strokeWidth={2.2} />
                <span className="mt-2 text-lg font-bold tracking-tight">SOS</span>
              </span>
            </button>
            <p className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              {active ? "Contacts notified. Help is on the way." : "Press to alert your emergency contacts"}
            </p>

            <div className="mt-6 w-full rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto Fall Detection</span>
                </div>
                <Switch checked={fallOn} onCheckedChange={setFallOn} data-testid="fall-detection-switch" />
              </div>
              <p className="mt-1 text-left text-xs text-slate-400 dark:text-slate-500">
                Uses motion sensors to fire an SOS automatically on a detected fall.
              </p>
              {fallOn && (
                <button
                  onClick={() => trigger("Fall Detected")}
                  data-testid="simulate-fall-button"
                  className="mt-3 w-full rounded-full bg-slate-100 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Simulate a fall
                </button>
              )}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-7">
          <GlassCard className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Current Location</h3>
              </div>
              <button
                onClick={getLocation}
                data-testid="refresh-location-button"
                className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Update
              </button>
            </div>
            <div className="relative flex flex-1 items-center overflow-hidden rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 shadow-inner dark:border-white/10 dark:from-indigo-950/40 dark:to-blue-950/40">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.12),transparent_55%)]" />
              <div className="relative">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md dark:bg-slate-800">
                  <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white" data-testid="location-label">{loc.label}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loc.coords}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill label={`Accuracy ${loc.accuracy}`} tone="indigo" pulse={false} />
                  {loc.updated && <StatusPill label={loc.updated} tone="success" />}
                  {loc.maps && (
                    <a href={loc.maps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-400">
                      <ExternalLink className="h-3 w-3" /> Open in Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeUp} className="lg:col-span-6">
          <GlassCard className="h-full p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Emergency Contacts</h3>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {sms ? "Alerts sent by email & SMS" : "Emails active · SMS pending Twilio setup"}
                </p>
              </div>
              <button onClick={addContact} data-testid="add-contact-button" className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c.id} className="group flex items-center justify-between rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white">{c.name.charAt(0)}</div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {c.name}
                        {c.primary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {c.relation}{c.phone ? ` · ${c.phone}` : ""}
                      </p>
                      {c.email && (
                        <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Mail className="h-3 w-3" /> {c.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeContact(c.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Phone className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-6">
          <GlassCard className="h-full p-6">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">SOS History</h3>
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No SOS events yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.type}</p>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONE[s.status])}>{s.status}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{s.time}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{s.location}</p>
                    </div>
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
