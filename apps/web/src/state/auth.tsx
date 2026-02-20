import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, UserMe } from "../lib/api";

type AuthState = {
  loading: boolean;
  me: UserMe["user"] | null;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<UserMe["user"] | null>(null);

  async function refresh() {
    try {
      const res = await api.auth.me();
      setMe(res.user);
    } catch (e: any) {
      if (e?.status === 401) setMe(null);
      else throw e;
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    await api.auth.login({ email, password });
    await refresh();
  }

  async function register(name: string, email: string, password: string) {
    await api.auth.register({ name, email, password });
    await refresh();
  }

  async function logout() {
    await api.auth.logout();
    setMe(null);
  }

  const value = useMemo<AuthState>(() => {
    const isAuthenticated = !!me;
    const hasActiveSubscription = me?.subscription_status === "active";
    return { loading, me, isAuthenticated, hasActiveSubscription, login, register, logout, refresh };
  }, [loading, me]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

