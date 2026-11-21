// Centralized institutional data for NAVIFY 2.0 Assistive Ecosystem.
// Department of CSE (AI & ML) - Sai Vidya Institute of Technology (SVIT)

export const user = {
  name: "Thanya C Ravi",
  firstName: "Thanya",
  email: "thanyaravi02@gmail.com",
  role: "Student",
  institution: "Sai Vidya Institute of Technology",
  department: "CSE (AI & ML)",
  avatar: "",
};

export const dashboardStats = [
  { id: "journey", label: "Journey Today", value: "2.4", unit: "km", trend: "+18%", trendUp: true, accent: "indigo" },
  { id: "battery", label: "Battery", value: "86", unit: "%", trend: "-4%", trendUp: false, accent: "emerald" },
  { id: "detections", label: "AI Detections", value: "33", unit: "", trend: "+0 today", trendUp: true, accent: "blue" },
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
  { id: 1, label: "Bottle", icon: "Wine", time: "Just now", confidence: 96, created_at: new Date(Date.now() - 1 * 60000).toISOString() },
  { id: 2, label: "Person", icon: "User", time: "2 min ago", confidence: 98, created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 3, label: "Cell Phone", icon: "Smartphone", time: "5 min ago", confidence: 94, created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 4, label: "Chair", icon: "Armchair", time: "11 min ago", confidence: 91, created_at: new Date(Date.now() - 11 * 60000).toISOString() },
  { id: 5, label: "Door", icon: "DoorOpen", time: "18 min ago", confidence: 89, created_at: new Date(Date.now() - 18 * 60000).toISOString() },
];

export const deviceHealth = [
  { id: "battery", label: "Battery", value: 86, tone: "emerald" },
  { id: "cpu", label: "CPU", value: 42, tone: "indigo" },
  { id: "temp", label: "Temperature", value: 54, tone: "amber", suffix: "°C" },
  { id: "storage", label: "Storage", value: 63, tone: "blue" },
  { id: "ram", label: "RAM", value: 38, tone: "indigo" },
];

export const recentActivity = [
  { id: 1, title: "Journey Started", detail: "Campus → Block B", time: "08:42 AM", icon: "Play", tone: "indigo" },
  { id: 2, title: "Obstacle Detected", detail: "Chair obstruction at 1.20m safely bypassed", time: "08:51 AM", icon: "TriangleAlert", tone: "amber" },
  { id: 3, title: "SOS Checked", detail: "Guardian confirmed safe", time: "09:15 AM", icon: "ShieldCheck", tone: "emerald" },
  { id: 4, title: "Cloud Synced", detail: "33 detections recorded", time: "09:30 AM", icon: "Cloud", tone: "blue" },
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
  { id: 1, label: "Cell Phone", confidence: 85, box: "left", proximity: "Close · On Your Left" },
  { id: 2, label: "Person", confidence: 67, box: "center", proximity: "Very Close · Straight Ahead" },
];

export const insights = {
  journey: [
    { label: "Total Distance", value: "9.5 km", sub: "All journeys" },
    { label: "Avg. Daily", value: "1.4 km", sub: "Last 7 days" },
    { label: "Trips", value: "4", sub: "Completed" },
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
    { label: "Person", count: 18, pct: 64 },
    { label: "Cell Phone", count: 2, pct: 7 },
    { label: "Chair", count: 2, pct: 7 },
    { label: "Door", count: 2, pct: 7 },
    { label: "Vase", count: 2, pct: 7 },
    { label: "Cat", count: 1, pct: 4 },
  ],
};

export const journeyHistory = [
  { id: 1, date: "Aug 02, 2026", route: "Campus → Block B", distance: "3.2 km", duration: "42 min", detections: 18 },
  { id: 2, date: "Jul 28, 2026", route: "Academic Corridor → Lab 4", distance: "1.1 km", duration: "16 min", detections: 5 },
  { id: 3, date: "Jul 24, 2026", route: "Main Gate → Library", distance: "2.8 km", duration: "38 min", detections: 7 },
  { id: 4, date: "Jul 19, 2026", route: "Lab 4 → Seminar Hall", distance: "2.4 km", duration: "31 min", detections: 3 },
];

export const detectionHistory = [
  { id: 1, object: "Person", time: "Aug 02, 09:12 AM", confidence: 98, action: "Alerted" },
  { id: 2, object: "Cell Phone", time: "Aug 02, 09:05 AM", confidence: 94, action: "Detected" },
  { id: 3, object: "Chair", time: "Aug 02, 08:58 AM", confidence: 91, action: "Guided" },
  { id: 4, object: "Door", time: "Aug 02, 08:44 AM", confidence: 89, action: "Rerouted" },
  { id: 5, object: "Obstacle", time: "Aug 02, 08:40 AM", confidence: 87, action: "Warned" },
];

export const emergencyContacts = [
  { id: 1, name: "Vikram Sir", relation: "Guide/Mentor", phone: "7875738893", email: "vikramadhithan.ac@saividya.ac.in", primary: true },
  { id: 2, name: "Tejas P", relation: "Friend", phone: "9535829902", email: "tejas.p.23aiml@saividya.ac.in", primary: false },
];

export const sosHistory = [
  { id: 1, type: "Manual Trigger", status: "Resolved", time: "Aug 02, 2026 · 04:29 PM", location: "MG Road, Bengaluru" },
  { id: 2, type: "Fall Detected", status: "Resolved", time: "Jul 28, 2026 · 04:29 PM", location: "Indiranagar, Bengaluru" },
];

export const currentLocation = {
  label: "Current position",
  coords: "13.06475°, 77.59545°",
  accuracy: "±92 m",
  updated: "Just now",
};
