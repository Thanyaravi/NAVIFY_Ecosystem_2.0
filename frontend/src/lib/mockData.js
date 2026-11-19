// Centralized institutional data for NAVIFY 2.0 Assistive Ecosystem.
// Department of CSE (AI & ML) - Sai Vidya Institute of Technology (SVIT)

export const user = {
  name: "Thanya C R",
  firstName: "Thanya",
  email: "thanyaravi02@gmail.com",
  role: "Lead Researcher",
  institution: "Sai Vidya Institute of Technology",
  department: "CSE (AI & ML)",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
};

export const dashboardStats = [
  { id: "journey", label: "Journey Today", value: "2.4", unit: "km", trend: "+18%", trendUp: true, accent: "indigo" },
  { id: "battery", label: "Battery", value: "86", unit: "%", trend: "-4%", trendUp: false, accent: "emerald" },
  { id: "detections", label: "AI Detections", value: "48", unit: "", trend: "+12", trendUp: true, accent: "blue" },
  { id: "sos", label: "SOS Status", value: "Safe", unit: "", trend: "All clear", trendUp: true, accent: "emerald" },
];

export const statusPills = [
  { id: "cane", label: "Smart Cane Connected", tone: "success" },
  { id: "cloud", label: "Cloud Synced", tone: "info" },
  { id: "yolo", label: "YOLOv11 Active", tone: "indigo" },
];

// status: online | waiting | offline
export const hardwareStatus = [
  { id: "camera", label: "Camera", icon: "Camera", status: "online", detail: "1080p · 30fps" },
  { id: "ultrasonic", label: "Ultrasonic Sensor", icon: "Radar", status: "online", detail: "Range 0–4m" },
  { id: "battery", label: "Battery", icon: "BatteryFull", status: "online", detail: "86% · 6h left" },
  { id: "gps", label: "GPS", icon: "MapPin", status: "online", detail: "Locked · 8 sats" },
  { id: "speaker", label: "Speaker", icon: "Volume2", status: "waiting", detail: "Standby" },
  { id: "pi", label: "Raspberry Pi", icon: "Cpu", status: "online", detail: "Pi 5 · 4GB" },
  { id: "cloud", label: "Cloud", icon: "Cloud", status: "online", detail: "Synced 2m ago" },
];

export const recentDetections = [
  { id: 1, label: "Person", icon: "User", time: "2 min ago", confidence: 98 },
  { id: 2, label: "Chair", icon: "Armchair", time: "6 min ago", confidence: 94 },
  { id: 3, label: "Door", icon: "DoorOpen", time: "11 min ago", confidence: 91 },
  { id: 4, label: "Stairs", icon: "Footprints", time: "18 min ago", confidence: 89 },
  { id: 5, label: "Obstacle", icon: "TriangleAlert", time: "24 min ago", confidence: 87 },
];

export const deviceHealth = [
  { id: "battery", label: "Battery", value: 86, tone: "emerald" },
  { id: "cpu", label: "CPU", value: 42, tone: "indigo" },
  { id: "temp", label: "Temperature", value: 54, tone: "amber", suffix: "°C" },
  { id: "storage", label: "Storage", value: 63, tone: "blue" },
  { id: "ram", label: "RAM", value: 38, tone: "indigo" },
];

export const recentActivity = [
  { id: 1, title: "Journey Started", detail: "Home → Central Park", time: "08:42 AM", icon: "Play", tone: "indigo" },
  { id: 2, title: "Obstacle Detected", detail: "Low-hanging branch avoided", time: "08:51 AM", icon: "TriangleAlert", tone: "amber" },
  { id: 3, title: "SOS Checked", detail: "Guardian confirmed safe", time: "09:15 AM", icon: "ShieldCheck", tone: "emerald" },
  { id: 4, title: "Cloud Synced", detail: "48 detections uploaded", time: "09:30 AM", icon: "Cloud", tone: "blue" },
];

export const smartCane = {
  name: "NAVIFY Cane Pro",
  model: "NC-2400",
  serial: "NVF-2400-8821",
  firmware: "v3.2.1",
  firmwareLatest: "v3.2.1",
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

export const liveDetections = [
  { id: 1, label: "Person", confidence: 98, box: "center" },
  { id: 2, label: "Chair", confidence: 94, box: "left" },
  { id: 3, label: "Backpack", confidence: 88, box: "right" },
  { id: 4, label: "Door", confidence: 82, box: "far" },
];

export const insights = {
  journey: [
    { label: "Total Distance", value: "184 km", sub: "This month" },
    { label: "Avg. Daily", value: "6.1 km", sub: "Last 30 days" },
    { label: "Trips", value: "72", sub: "Completed" },
    { label: "Active Hours", value: "48h", sub: "This month" },
  ],
  daily: [
    { day: "Mon", value: 62 },
    { day: "Tue", value: 78 },
    { day: "Wed", value: 45 },
    { day: "Thu", value: 88 },
    { day: "Fri", value: 71 },
    { day: "Sat", value: 94 },
    { day: "Sun", value: 40 },
  ],
  weekly: [
    { week: "W1", value: 320 },
    { week: "W2", value: 410 },
    { week: "W3", value: 380 },
    { week: "W4", value: 460 },
  ],
  mostDetected: [
    { label: "Person", count: 412, pct: 34 },
    { label: "Chair", count: 268, pct: 22 },
    { label: "Door", count: 194, pct: 16 },
    { label: "Stairs", count: 142, pct: 12 },
    { label: "Obstacle", count: 96, pct: 8 },
    { label: "Vehicle", count: 74, pct: 8 },
  ],
};

export const journeyHistory = [
  { id: 1, date: "Jun 12, 2026", route: "Home → Office", distance: "3.2 km", duration: "42 min", detections: 24 },
  { id: 2, date: "Jun 11, 2026", route: "Office → Cafe", distance: "1.1 km", duration: "16 min", detections: 9 },
  { id: 3, date: "Jun 11, 2026", route: "Cafe → Home", distance: "2.8 km", duration: "38 min", detections: 18 },
  { id: 4, date: "Jun 10, 2026", route: "Home → Park", distance: "2.4 km", duration: "31 min", detections: 21 },
  { id: 5, date: "Jun 09, 2026", route: "Park → Market", distance: "1.6 km", duration: "22 min", detections: 14 },
];

export const detectionHistory = [
  { id: 1, object: "Person", time: "Jun 12, 09:12 AM", confidence: 98, action: "Alerted" },
  { id: 2, object: "Stairs", time: "Jun 12, 09:05 AM", confidence: 91, action: "Warned" },
  { id: 3, object: "Door", time: "Jun 12, 08:58 AM", confidence: 89, action: "Guided" },
  { id: 4, object: "Obstacle", time: "Jun 12, 08:44 AM", confidence: 87, action: "Rerouted" },
  { id: 5, object: "Chair", time: "Jun 12, 08:40 AM", confidence: 94, action: "Alerted" },
];

export const emergencyContacts = [
  { id: 1, name: "Priya Sharma", relation: "Daughter", phone: "+91 98••• ••210", primary: true },
  { id: 2, name: "Dr. Mehta", relation: "Physician", phone: "+91 98••• ••554", primary: false },
  { id: 3, name: "Rahul Verma", relation: "Neighbour", phone: "+91 99••• ••102", primary: false },
];

export const sosHistory = [
  { id: 1, type: "Manual Trigger", status: "Resolved", time: "Jun 08, 2026 · 06:24 PM", location: "MG Road, Bengaluru" },
  { id: 2, type: "Fall Detected", status: "Resolved", time: "May 29, 2026 · 11:02 AM", location: "Indiranagar, Bengaluru" },
  { id: 3, type: "Manual Trigger", status: "False Alarm", time: "May 21, 2026 · 04:47 PM", location: "Koramangala, Bengaluru" },
];

export const currentLocation = {
  label: "Indiranagar, Bengaluru",
  coords: "12.9716° N, 77.6412° E",
  accuracy: "±4 m",
  updated: "Just now",
};
