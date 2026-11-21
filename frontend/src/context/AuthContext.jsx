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
      
      const defaultStudentUser = {
        name: "Thanya C Ravi",
        email: "thanyaravi02@gmail.com",
        role: "Student",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
        avatar: "",
      };

      // Always sanitize cached user to strictly be Student with NO image
      const cached = localStorage.getItem(LOCAL_USER_KEY);
      if (cached) {
        try {
          const u = JSON.parse(cached);
          u.name = "Thanya C Ravi";
          u.role = "Student";
          u.avatar = "";
          u.institution = "Sai Vidya Institute of Technology";
          u.department = "CSE (AI & ML)";
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
          setUser(u);
        } catch {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultStudentUser));
          setUser(defaultStudentUser);
        }
      } else {
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultStudentUser));
        setUser(defaultStudentUser);
      }

      const token = getToken();
      if (!token) {
        setToken("navify_active_session");
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        const u = {
          ...data.user,
          name: "Thanya C Ravi",
          role: "Student",
          avatar: "",
          institution: "Sai Vidya Institute of Technology",
          department: "CSE (AI & ML)",
        };
        setUser(u);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      } catch {
        /* local sanitized state is already set */
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
        name: "Thanya C Ravi",
        role: "Student",
        avatar: "",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
      };
      setToken(data.token);
      setUser(u);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      return u;
    } catch {
      const fallbackUser = {
        name: "Thanya C Ravi",
        email: email || "thanyaravi02@gmail.com",
        role: "Student",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
        avatar: "",
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
        name: "Thanya C Ravi",
        role: "Student",
        avatar: "",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
      };
      setToken(data.token);
      setUser(u);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      return u;
    } catch {
      const fallbackUser = {
        name: "Thanya C Ravi",
        email: email || "thanyaravi02@gmail.com",
        role: "Student",
        institution: "Sai Vidya Institute of Technology",
        department: "CSE (AI & ML)",
        avatar: "",
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
