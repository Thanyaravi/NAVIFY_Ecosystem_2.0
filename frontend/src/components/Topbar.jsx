import React from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const TITLES = {
  "/dashboard": { title: "Dashboard", welcome: "Welcome back" },
  "/smart-cane": { title: "Smart Cane", welcome: "Device overview" },
  "/live-monitor": { title: "Live Monitor", welcome: "Real-time vision" },
  "/insights": { title: "Insights", welcome: "Your navigation trends" },
  "/reports": { title: "Reports", welcome: "History & exports" },
  "/sos": { title: "SOS Center", welcome: "Safety & emergency" },
  "/settings": { title: "Settings", welcome: "Manage your console" },
};

const ThemeToggle = () => {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      data-testid="theme-toggle-button"
      aria-label="Toggle theme"
      className="relative flex h-11 w-[72px] items-center rounded-full border border-white/70 bg-white/60 p-1 backdrop-blur-xl transition-all duration-200 hover:shadow-md dark:border-white/10 dark:bg-white/5"
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md"
        style={{ marginLeft: isDark ? 30 : 0 }}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </motion.div>
      <Sun className="pointer-events-none absolute left-2.5 h-4 w-4 text-amber-400/70" />
      <Moon className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400/60" />
    </button>
  );
};

export const Topbar = () => {
  const { pathname } = useLocation();
  const meta = TITLES[pathname] || { title: "Dashboard", welcome: "Welcome back" };

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 md:px-10 md:py-6"
      data-testid="app-topbar"
    >
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {meta.title}
        </h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {meta.welcome}, Thanya.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/60 text-slate-500 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-800 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
          data-testid="notifications-button"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        </button>
        <button
          className="flex items-center gap-2 rounded-full border border-white/70 bg-white/60 p-1 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
          data-testid="profile-button"
          aria-label="Profile"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-sm font-bold text-white shadow-md ring-2 ring-white/50 dark:ring-slate-700">
            T
          </div>
        </button>
      </div>
    </header>
  );
};
