import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setToken, getToken, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);
const LOCAL_USER_KEY = "navify_local_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      // Deep-link / preview auth: allow ?token= or #token= on first load
      const hashToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
      const queryToken = new URLSearchParams(window.location.search).get("token");
      if (hashToken || queryToken) setToken(hashToken || queryToken);
      
      const token = getToken();
      if (!token) {
        // Auto-provision default console session for standalone deployment
        const defaultUser = {
          name: "Thanya C Ravi",
          email: "thanyaravi02@gmail.com",
          role: "Student",
          institution: "Sai Vidya Institute of Technology",
          department: "CSE (AI & ML)",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        };
        setToken("navify_active_session");
        setUser(defaultUser);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultUser));
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        const u = {
          ...data.user,
          name: data.user?.name && data.user?.name !== "Thanyaravi02" ? data.user.name : "Thanya C Ravi",
          role: "Student",
        };
        setUser(u);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      } catch {
        // Fallback for standalone/Vercel deployment
        const cached = localStorage.getItem(LOCAL_USER_KEY);
        if (cached) {
          try {
            const u = JSON.parse(cached);
            // Auto-upgrade role to Student and name to Thanya C Ravi
            if (u.role !== "Student") u.role = "Student";
            if (!u.name || u.name === "Thanyaravi02" || u.name === "Thanya C R" || u.name === "User") {
              u.name = "Thanya C Ravi";
            }
            if (!u.avatar) {
              u.avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80";
            }
            setUser(u);
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
          } catch {
            setToken(null);
          }
        } else {
          const defaultUser = {
            name: "Thanya C Ravi",
            email: "thanyaravi02@gmail.com",
            role: "Student",
            institution: "Sai Vidya Institute of Technology",
            department: "CSE (AI & ML)",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
          };
          setUser(defaultUser);
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultUser));
        }
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const u = {
        ...data.user,
        name: data.user?.name && data.user?.name !== "Thanyaravi02" ? data.user.name : "Thanya C Ravi",
        role: "Student",
      };
      setToken(data.token);
      setUser(u);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      return u;
    } catch {
      // Graceful offline/static fallback so user can always log in and test
      const cleanName = email && !email.toLowerCase().includes("thanya")
        ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Thanya C Ravi";
      const fallbackUser = {
        name: cleanName || "Thanya C Ravi",
        email: email || "thanyaravi02@gmail.com",
        role: "Student",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      };
      setToken("navify_auth_token_active");
      setUser(fallbackUser);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      const u = {
        ...data.user,
        name: name || (data.user?.name && data.user?.name !== "Thanyaravi02" ? data.user.name : "Thanya C Ravi"),
        role: "Student",
      };
      setToken(data.token);
      setUser(u);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      return u;
    } catch {
      // Graceful offline/static fallback so user registration always succeeds
      const fallbackUser = {
        name: name || "Thanya C Ravi",
        email: email || "thanyaravi02@gmail.com",
        role: "Student",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
      };
      setToken("navify_auth_token_active");
      setUser(fallbackUser);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(LOCAL_USER_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authed: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export { formatApiError };
