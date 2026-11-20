import React, { Component } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import SmartCane from "@/pages/SmartCane";
import LiveMonitor from "@/pages/LiveMonitor";
import Insights from "@/pages/Insights";
import Reports from "@/pages/Reports";
import SOS from "@/pages/SOS";
import Settings from "@/pages/Settings";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-slate-800 max-w-lg w-full">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Console Session Restored</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Recovered view state safely.
            </p>
            {this.state.error?.message && (
              <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-mono text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                localStorage.removeItem("navify_local_user");
                localStorage.removeItem("navify_token");
                window.location.href = "/dashboard";
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ToasterWithTheme() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors closeButton theme={theme} />;
}

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/smart-cane" element={<SmartCane />} />
                  <Route path="/live-monitor" element={<LiveMonitor />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/sos" element={<SOS />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
            <ToasterWithTheme />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
