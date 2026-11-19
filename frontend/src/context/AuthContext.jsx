import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setToken, getToken, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      // Deep-link / preview auth: allow ?token= or #token= on first load
      const hashToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
      const queryToken = new URLSearchParams(window.location.search).get("token");
      if (hashToken || queryToken) setToken(hashToken || queryToken);
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
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
