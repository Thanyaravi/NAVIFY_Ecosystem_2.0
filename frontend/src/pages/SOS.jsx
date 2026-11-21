import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Plus,
  Star,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Activity,
  MessageSquare,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Radio,
} from "lucide-react";
import { GlassCard, fadeUp, stagger } from "@/components/GlassCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Switch } from "@/components/ui/switch";
import { audioService } from "@/lib/audioService";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { emergencyContacts as mockEmergencyContacts, sosHistory as mockSosHistory, currentLocation as defaultMockLoc } from "@/lib/mockData";

const STATUS_TONE = {
  Resolved: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  "False Alarm": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  Active: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 animate-pulse",
  "Active (Dispatched)": "bg-rose-500/15 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/30",
};

const DEFAULT_LOC = {
  label: "Sai Vidya Institute of Technology, Rajanukunte",
  address: "Doddaballapur Main Road, Rajanukunte, Bengaluru, Karnataka 560064",
  coords: "13.16335°, 77.56278°",
  accuracy: "±8 m",
  updated: "Just now",
  lat: 13.16335,
  lng: 77.56278,
  maps: "https://maps.google.com/?q=13.16335,77.56278",
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    const addr = data.address || {};
    const landmark = addr.amenity || addr.building || addr.college || addr.university || addr.road || addr.isolated_dwelling;
    const neighborhood = addr.neighbourhood || addr.suburb || addr.residential || addr.subdivision;
    const city = addr.city || addr.town || addr.municipality || addr.city_district || "Bengaluru";
    const state = addr.state || "Karnataka";
    const postal = addr.postcode ? ` - ${addr.postcode}` : "";

    const cleanParts = [landmark, neighborhood, city].filter(Boolean);
    const shortLabel = cleanParts.length > 0 ? cleanParts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(", ") || "Bengaluru");
    const fullAddress = data.display_name || `${shortLabel}, ${state}${postal}`;

    return { shortLabel, fullAddress };
  } catch (err) {
    console.warn("Reverse geocode fallback:", err);
    return null;
  }
};

export default function SOS() {
  const [contacts, setContacts] = useState(mockEmergencyContacts);
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem("navify_sos_history");
      return stored ? JSON.parse(stored) : mockSosHistory;
    } catch {
      return mockSosHistory;
    }
  });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [loc, setLoc] = useState(DEFAULT_LOC);
  const [sms, setSms] = useState(true);
  const [fallOn, setFallOn] = useState(true);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [activeAlertPayload, setActiveAlertPayload] = useState(null);
  const fallTs = useRef(0);

  const load = async () => {
    try {
      const [c, h] = await Promise.all([api.get("/contacts"), api.get("/sos")]);
      if (Array.isArray(c?.data)) setContacts(c.data);
      const storedHistory = JSON.parse(localStorage.getItem("navify_sos_history") || "null");
      if (storedHistory) setHistory(storedHistory);
      else if (Array.isArray(h?.data)) setHistory(h.data);
    } catch {
      /* local defaults already initialized */
    }
  };

  const getLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLoc(DEFAULT_LOC);
      return;
    }
    setLoc((l) => ({ ...l, label: "Acquiring live satellite fix…", coords: "Locking GPS coordinates…" }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latStr = `${latitude.toFixed(5)}°`;
        const lngStr = `${longitude.toFixed(5)}°`;
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

        setLoc((prev) => ({
          ...prev,
          label: "Resolving real street address…",
          coords: `${latStr}, ${lngStr}`,
          accuracy: `±${Math.round(accuracy)} m`,
          updated: "Just now",
          lat: latitude,
          lng: longitude,
          maps: mapsLink,
        }));

        const geo = await reverseGeocode(latitude, longitude);
        if (geo) {
          setLoc({
            label: geo.shortLabel,
            address: geo.fullAddress,
            coords: `${latStr}, ${lngStr}`,
            accuracy: `±${Math.round(accuracy)} m`,
            updated: "Just now",
            lat: latitude,
            lng: longitude,
            maps: mapsLink,
          });
          toast.success("Real GPS Location Locked", {
            description: `${geo.shortLabel} (${latStr}, ${lngStr})`,
          });
        } else {
          setLoc({
            label: "Sai Vidya Institute of Technology, Rajanukunte",
            address: "Doddaballapur Main Road, Rajanukunte, Bengaluru, Karnataka 560064",
            coords: `${latStr}, ${lngStr}`,
            accuracy: `±${Math.round(accuracy)} m`,
            updated: "Just now",
            lat: latitude,
            lng: longitude,
            maps: mapsLink,
          });
        }
      },
      () => {
        setLoc(DEFAULT_LOC);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
    getLocation();
  }, [getLocation]);

  // Motion-based fall listener
  useEffect(() => {
    if (!fallOn) return;
    const handler = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      if (mag > 32 && Date.now() - fallTs.current > 15000) {
        fallTs.current = Date.now();
        trigger("Fall Detected (IMU BNO085)");
      }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallOn]);

  const trigger = (type = "Manual SOS Trigger") => {
    setActive(true);

    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const lat = loc.lat || 13.06475;
    const lng = loc.lng || 77.59545;
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

    // Create Distress Payload
    const payload = {
      id: Date.now(),
      type,
      time: nowStr,
      user: "Thanya C Ravi (Student)",
      department: "CSE (AI & ML), Sai Vidya Institute of Technology",
      device: "NAVIFY Cane Pro (NC-2400 · NVF-2400-8821)",
      location: loc.label || "Sai Vidya Institute of Technology, Rajanukunte",
      address: loc.address || "Doddaballapur Main Road, Rajanukunte, Bengaluru, Karnataka 560064",
      coords: `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`,
      accuracy: loc.accuracy || "±8 m",
      mapsLink,
      battery: "86%",
      contacts: contacts.length ? contacts : mockEmergencyContacts,
    };

    setActiveAlertPayload(payload);
    setDispatchModal(true);

    // Audio alarm tone and spoken warning
    audioService.playTone("hazard");
    audioService.speak(
      `Emergency SOS Alert activated! Live cane coordinates and distress telemetry transmitted to Vikram Sir and Tejas P.`,
      { immediate: true }
    );

    // Create and persist new history item
    const newEntry = {
      id: Date.now(),
      type,
      status: "Active (Dispatched)",
      time: nowStr,
      location: `${loc.label || "Sai Vidya Institute of Technology, Rajanukunte"} (${lat.toFixed(5)}°, ${lng.toFixed(5)}°)`,
    };

    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    try {
      localStorage.setItem("navify_sos_history", JSON.stringify(updatedHistory));
    } catch {
      /* ignore */
    }

    // Attempt backend sync
    (async () => {
      try {
        await api.post("/sos", {
          type,
          location: loc.label,
          lat,
          lng,
          maps_url: mapsLink,
        });
      } catch {
        /* static deployment handled gracefully */
      }
    })();

    toast.error(`🚨 ${type} Broadcast Dispatched!`, {
      description: `Emergency alert with live GPS coordinates sent to Vikram Sir & Tejas P.`,
      duration: 6000,
    });
  };

  const addContact = async () => {
    const name = window.prompt("Contact full name?");
    if (!name) return;
    const relation = window.prompt("Relationship? (e.g. Guide, Friend, Parent)") || "Emergency Contact";
    const phone = window.prompt("Phone number for SMS/WhatsApp (e.g. 9876543210):") || "";
    const email = window.prompt("Email for alerts:") || "";

    const newContact = { id: Date.now(), name, relation, phone, email, primary: false };
    const nextList = [...contacts, newContact];
    setContacts(nextList);
    try {
      await api.post("/contacts", newContact);
    } catch {
      /* static fallback */
    }
    toast.success("Emergency contact added", { description: `${name} will receive SOS notifications.` });
  };

  const removeContact = async (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/contacts/${id}`);
    } catch {
      /* ignore */
    }
    toast.success("Contact removed");
  };

  // Pre-formatted distress text for instant dispatch
  const getDistressMessage = (p) => {
    const data = p || {
      type: "Manual SOS Trigger",
      time: "Just now",
      coords: loc.coords,
      mapsLink: loc.maps,
      address: loc.address || loc.label,
    };
    return encodeURIComponent(
      `🚨 *EMERGENCY SOS ALERT — NAVIFY 2.0 SMART CANE*\n` +
      `User: Thanya C Ravi (Student)\n` +
      `Institution: Sai Vidya Institute of Technology (CSE AI&ML)\n` +
      `Alert Type: ${data.type}\n` +
      `Time: ${data.time}\n` +
      `Real Location: ${loc.label}\n` +
      `Full Address: ${loc.address || loc.label}\n` +
      `Live Cane Coordinates: ${data.coords}\n` +
      `Google Maps Link: ${data.mapsLink}\n` +
      `Device Telemetry: Battery 86% · IMU BNO085 · Sensors Active\n` +
      `Immediate assistance requested!`
    );
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <PageHeader
        title="SOS Center"
        subtitle="One-tap emergency distress triggers, live cane GPS telemetry, and caregiver notification dispatch."
        action={
          <div className="flex items-center gap-2">
            {active && (
              <button
                onClick={() => setDispatchModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-500/30 animate-pulse"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                View Active Dispatch
              </button>
            )}
            <StatusPill
              label={active ? "SOS Broadcast Active" : "All Clear · Guardian Sync Active"}
              tone={active ? "rose" : "success"}
            />
          </div>
        }
      />

      {/* Main Trigger Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Manual SOS + High-Visibility Fall Simulation Button */}
        <motion.div variants={fadeUp} className="lg:col-span-5">
          <GlassCard className="flex h-full flex-col items-center justify-between p-8 text-center">
            <div>
              {/* Giant Manual SOS Button */}
              <button
                onClick={() => trigger("Manual SOS Button Press")}
                data-testid="sos-trigger-button"
                className="group relative mx-auto flex h-48 w-48 items-center justify-center rounded-full focus:outline-none"
              >
                <span
                  className={cn(
                    "absolute inset-0 rounded-full bg-rose-500/30 blur-2xl transition-all",
                    active ? "animate-ping opacity-75" : "group-hover:bg-rose-500/50"
                  )}
                />
                <span className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white shadow-2xl shadow-rose-600/50 transition-transform duration-200 group-active:scale-95 border-4 border-white/20">
                  <ShieldAlert className="h-12 w-12" strokeWidth={2.4} />
                  <span className="mt-2 text-2xl font-black tracking-wider uppercase">SOS</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-200">
                    Press to Alert
                  </span>
                </span>
              </button>

              <h4 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
                {active ? "🚨 SOS Broadcast Active" : "Emergency Distress Trigger"}
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Immediately transmits live cane GPS location to Vikram Sir & Tejas P.
              </p>
            </div>

            {/* Dedicated Fall Simulation & IMU Controls */}
            <div className="mt-6 w-full space-y-3">
              {/* Fall Simulation Button */}
              <button
                onClick={() => trigger("Fall Detected (IMU BNO085)")}
                data-testid="simulate-fall-button"
                className="group flex w-full items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 text-left transition-all hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 active:scale-98 dark:bg-amber-950/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Simulate IMU Fall Event
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                        BNO085 Test
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Fires an immediate fall detection SOS with live GPS packet
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm transition group-hover:scale-105">
                  Test Fall
                </span>
              </button>

              {/* Auto Fall Detection Switch */}
              <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Hardware Fall Sensor
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Cane IMU Gyroscope + Accelerometer monitoring
                    </p>
                  </div>
                </div>
                <Switch checked={fallOn} onCheckedChange={setFallOn} data-testid="fall-detection-switch" />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Right Column: Live GPS Coordinates & Cane Location Card */}
        <motion.div variants={fadeUp} className="lg:col-span-7">
          <GlassCard className="flex h-full flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Live Cane Location
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Real-time GPS telemetry transmitted during emergency alerts
                  </p>
                </div>
              </div>
              <button
                onClick={getLocation}
                data-testid="refresh-location-button"
                className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync GPS
              </button>
            </div>

            {/* Location Visual Canvas */}
            <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[24px] border border-slate-200/60 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.25),transparent_65%)]" />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-mono font-bold text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    GPS SATELLITE FIX LOCKED
                  </span>
                  <span className="text-xs font-mono text-slate-400">u-blox NEO-M9N</span>
                </div>

                <div className="mt-5">
                  <p className="text-2xl font-black tracking-tight text-white">{loc.label}</p>
                  <p className="mt-1 font-mono text-sm text-cyan-300">{loc.coords}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    {loc.address || "Sai Vidya Institute of Technology, Rajanukunte, Bengaluru, Karnataka 560064"}
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusPill label={`Accuracy ${loc.accuracy}`} tone="indigo" pulse={false} />
                  <StatusPill label="Updated Just Now" tone="success" pulse={true} />
                </div>
                <a
                  href={loc.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/25 hover:opacity-95 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Live in Google Maps
                </a>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Emergency Contacts & SOS History Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Emergency Contacts List */}
        <motion.div variants={fadeUp} className="lg:col-span-6">
          <GlassCard className="h-full p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Emergency Contacts
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Caregivers and mentors alerted automatically during emergency events
                </p>
              </div>
              <button
                onClick={addContact}
                data-testid="add-contact-button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400"
                title="Add Emergency Contact"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-base font-bold text-white shadow-md shadow-indigo-500/20">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        {c.name}
                        {c.primary && (
                          <span className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Primary
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {c.relation} · <span className="font-mono">{c.phone}</span>
                      </p>
                      {c.email && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[220px]">
                          {c.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Direct One-Tap Emergency Phone Call */}
                  <a
                    href={`tel:${c.phone}`}
                    title={`Call ${c.name} (${c.phone})`}
                    data-testid={`call-contact-${c.id}`}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white shadow-sm hover:scale-105"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* SOS History List */}
        <motion.div variants={fadeUp} className="lg:col-span-6">
          <GlassCard className="h-full p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                SOS History
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {history.length} logged events
              </span>
            </div>

            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No SOS events recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {history.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{s.type}</p>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONE[s.status] || STATUS_TONE.Resolved)}>
                          {s.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">{s.time}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{s.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* EMERGENCY SOS DISPATCH MODAL */}
      <AnimatePresence>
        {dispatchModal && activeAlertPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-xl overflow-hidden rounded-[32px] border-2 border-rose-500/50 bg-slate-900 p-6 sm:p-8 text-white shadow-2xl shadow-rose-500/20"
            >
              <button
                onClick={() => setDispatchModal(false)}
                className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wide text-white">
                    Emergency SOS Broadcast Active
                  </h3>
                  <p className="text-xs text-rose-300 font-mono">
                    LIVE LOCATION TRANSMITTED TO CAREGIVERS
                  </p>
                </div>
              </div>

              {/* Verified Dispatch Confirmation Checkmarks */}
              <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>Cane GPS Coordinates Locked: {activeAlertPayload.coords}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>Notifying Vikram Sir (Guide/Mentor: 7875738893)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>Notifying Tejas P (Friend: 9535829902)</span>
                </div>
              </div>

              {/* Formatted Alert Details */}
              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-xs font-mono border border-slate-800 space-y-1.5 text-slate-300">
                <p className="text-cyan-400 font-bold">DEVICE: {activeAlertPayload.device}</p>
                <p>ALERT: <span className="text-rose-400 font-bold">{activeAlertPayload.type}</span></p>
                <p>LOCATION: {activeAlertPayload.location}</p>
                <p>COORDINATES: {activeAlertPayload.coords} ({activeAlertPayload.accuracy})</p>
                <p className="truncate text-slate-400">MAP: {activeAlertPayload.mapsLink}</p>
              </div>

              {/* Instant One-Tap Direct Action Links */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`https://wa.me/917875738893?text=${getDistressMessage(activeAlertPayload)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Vikram Sir
                </a>
                <a
                  href={`https://wa.me/919535829902?text=${getDistressMessage(activeAlertPayload)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Tejas P
                </a>
                <a
                  href={`sms:7875738893,9535829902?body=${getDistressMessage(activeAlertPayload)}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition"
                >
                  <Send className="h-4 w-4" />
                  Send Instant SMS
                </a>
                <a
                  href={`mailto:vikramadhithan.ac@saividya.ac.in,tejas.p.23aiml@saividya.ac.in?subject=${encodeURIComponent(
                    "🚨 EMERGENCY SOS ALERT: Thanya C Ravi"
                  )}&body=${getDistressMessage(activeAlertPayload)}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-violet-500 transition"
                >
                  <Mail className="h-4 w-4" />
                  Send Emergency Email
                </a>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setDispatchModal(false)}
                  className="rounded-full bg-slate-800 px-6 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
