import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, MeResponse } from "../lib/api";

type AuthState = {
  loading: boolean;
  token: string | null;
  me: MeResponse["user"] | null;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const KEY = "growlify:v1:session_token";
const Ctx = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);

  async function refresh() {
    if (!token) {
      setMe(null);
      return;
    }
    try {
      const res = await api.auth.me(token);
      setMe(res.user);
    } catch (e: any) {
      if (e?.status === 401) {
        await AsyncStorage.removeItem(KEY);
        setToken(null);
        setMe(null);
        return;
      }
      throw e;
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved) setToken(saved);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token]);

  async function login(email: string, password: string) {
    const res = await api.auth.login({ email, password });
    await AsyncStorage.setItem(KEY, res.token);
    setToken(res.token);
    setMe(res.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.auth.register({ name, email, password });
    await AsyncStorage.setItem(KEY, res.token);
    setToken(res.token);
    setMe(res.user);
  }

  async function logout() {
    await AsyncStorage.removeItem(KEY);
    setToken(null);
    setMe(null);
  }

  const value = useMemo<AuthState>(() => {
    const isAuthenticated = !!token;
    const hasActiveSubscription = me?.subscription_status === "active";
    return { loading, token, me, isAuthenticated, hasActiveSubscription, login, register, logout, refresh };
  }, [loading, token, me]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

