import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function Login() {
  const { login, register, authed } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authed) navigate("/dashboard");
  }, [authed, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || "NAVIFY User");
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF6FF] p-6 dark:from-[#070b16] dark:via-[#0b1120] dark:to-[#0f1a2e]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-24 top-8 h-[30rem] w-[30rem] rounded-full bg-indigo-300/40 blur-[110px] dark:bg-indigo-600/25" />
        <div
          className="animate-blob absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-300/40 blur-[110px] dark:bg-blue-600/25"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="animate-blob absolute bottom-0 left-1/3 h-[26rem] w-[26rem] rounded-full bg-sky-200/40 blur-[110px] dark:bg-sky-600/20"
          style={{ animationDelay: "6s" }}
        />
      </div>

      <button
        onClick={toggle}
        data-testid="login-theme-toggle"
        aria-label="Toggle theme"
        className="glass absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-transform hover:scale-105 dark:text-slate-300"
      >
        {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 w-full max-w-md rounded-[32px] p-9 sm:p-11"
        data-testid="login-card"
      >
        <div className="mb-9 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-600 to-blue-500 shadow-xl shadow-indigo-500/30"
          >
            <Navigation className="h-7 w-7 text-white" strokeWidth={2.4} />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            NAVIFY
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-400 dark:text-slate-500">
            Edge AI Assistive Navigation Console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="group relative overflow-hidden"
              >
                <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  data-testid="login-name-input"
                  className="w-full rounded-2xl border border-white/80 bg-white/70 py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-inner outline-none transition-all duration-200 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10 dark:focus:ring-indigo-500/20"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="group relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              data-testid="login-email-input"
              className="w-full rounded-2xl border border-white/80 bg-white/70 py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-inner outline-none transition-all duration-200 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10 dark:focus:ring-indigo-500/20"
            />
          </div>

          <div className="group relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              data-testid="login-password-input"
              className="w-full rounded-2xl border border-white/80 bg-white/70 py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-inner outline-none transition-all duration-200 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10 dark:focus:ring-indigo-500/20"
            />
          </div>

          {error && (
            <p className="text-center text-sm font-medium text-rose-500" data-testid="login-error">
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            data-testid="login-submit-button"
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </motion.button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === "login" ? "register" : "login"));
            setError("");
          }}
          data-testid="login-mode-toggle"
          className="mt-6 w-full text-center text-sm text-slate-400 transition-colors hover:text-indigo-500 dark:text-slate-500"
        >
          {mode === "login" ? (
            <>New here? <span className="font-semibold text-indigo-500">Create an account</span></>
          ) : (
            <>Already have an account? <span className="font-semibold text-indigo-500">Sign in</span></>
          )}
        </button>
      </motion.div>
    </div>
  );
}
