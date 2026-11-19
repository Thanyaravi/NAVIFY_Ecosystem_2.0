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

function ToasterWithTheme() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors closeButton theme={theme} />;
}

function App() {
  return (
    <div className="App">
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
    </div>
  );
}

export default App;
