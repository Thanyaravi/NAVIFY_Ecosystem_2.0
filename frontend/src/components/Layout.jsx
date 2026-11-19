import React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/context/AuthContext";

export const Layout = () => {
  const { authed, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF6FF] dark:from-[#070b16] dark:via-[#0b1120] dark:to-[#0f1a2e]">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!authed) return <Navigate to="/login" replace />;

  return (
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF6FF] dark:from-[#070b16] dark:via-[#0b1120] dark:to-[#0f1a2e]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-indigo-200/30 blur-[120px] dark:bg-indigo-600/15" />
        <div className="absolute -right-40 bottom-0 h-[34rem] w-[34rem] rounded-full bg-blue-200/30 blur-[120px] dark:bg-blue-600/15" />
      </div>

      <Sidebar />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 pb-12 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
