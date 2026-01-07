import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, getError } from "./api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const login = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(payload);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(getError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.signup(payload);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(getError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
