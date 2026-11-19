import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Radio,
  Camera,
  BarChart3,
  FileText,
  ShieldAlert,
  Settings,
  LogOut,
  Navigation,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/smart-cane", label: "Smart Cane", icon: Radio },
  { to: "/live-monitor", label: "Live Monitor", icon: Camera },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/sos", label: "SOS Center", icon: ShieldAlert },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="hidden w-72 flex-shrink-0 p-4 md:flex" data-testid="app-sidebar">
      <div className="glass flex h-full w-full flex-col rounded-[28px] p-5">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/30">
            <Navigation className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              NAVIFY
            </p>
            <p className="-mt-0.5 text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Ecosystem
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "text-indigo-700 dark:text-indigo-300"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-2xl border border-indigo-100/70 bg-white shadow-[0_4px_16px_rgba(99,102,241,0.10)] dark:border-indigo-400/20 dark:bg-indigo-500/15"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "relative z-10 h-[18px] w-[18px] transition-colors",
                      isActive
                        ? "text-indigo-600 dark:text-indigo-300"
                        : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                    )}
                    strokeWidth={2.1}
                  />
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user?.name || "User"}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
            />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-sm font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-700">
              {(user?.name || "T").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {user?.name || "Thanya C Ravi"}
            </p>
            <p className="truncate text-xs capitalize text-slate-400 dark:text-slate-500">
              {user?.role || "User"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
