import { API_BASE_URL } from "../config";

type ApiError = { message?: string };

async function request<T>(path: string, init?: RequestInit & { token?: string | null }): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...(init?.headers || {})
    }
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : {};

  if (!res.ok) {
    const msg = (data as ApiError)?.message || "Serviço indisponível no momento. Tente novamente.";
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    subscription_status: "inactive" | "active" | "past_due" | "canceled";
    subscription_current_period_end?: string | null;
  };
};

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<{ token: string; user: MeResponse["user"] }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: MeResponse["user"] }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: (token: string) => request<MeResponse>("/api/auth/me", { token })
  },
  billing: {
    checkoutSession: (token: string) =>
      request<{ url: string }>("/api/billing/checkout-session", { method: "POST", body: JSON.stringify({}), token }),
    portalSession: (token: string) =>
      request<{ url: string }>("/api/billing/portal-session", { method: "POST", body: JSON.stringify({}), token })
  },
  categories: {
    list: (token: string) => request<{ items: any[] }>("/api/categories", { token }),
    create: (token: string, body: any) =>
      request<{ item: any }>("/api/categories", { method: "POST", body: JSON.stringify(body), token }),
    update: (token: string, id: string, body: any) =>
      request<{ item: any }>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
    remove: (token: string, id: string) => request<{ ok: true }>(`/api/categories/${id}`, { method: "DELETE", token })
  },
  transactions: {
    list: (token: string, q: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(q || {})) {
        if (v === undefined || v === null || v === "") continue;
        params.set(k, String(v));
      }
      return request<{ items: any[] }>(`/api/transactions?${params.toString()}`, { token });
    },
    create: (token: string, body: any) =>
      request<{ item: any }>("/api/transactions", { method: "POST", body: JSON.stringify(body), token }),
    remove: (token: string, id: string) => request<{ ok: true }>(`/api/transactions/${id}`, { method: "DELETE", token })
  },
  reports: {
    summary: (token: string, q: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(q || {})) {
        if (v === undefined || v === null || v === "") continue;
        params.set(k, String(v));
      }
      return request<any>(`/api/reports/summary?${params.toString()}`, { token });
    }
  },
  calculator: {
    saved: (token: string) => request<{ items: any[] }>("/api/calculator/saved", { token }),
    runAndSave: (token: string, body: { type: string; params: Record<string, any>; title?: string }) =>
      request<{ item: any; items: any[]; result: any }>("/api/calculator/run-and-save", { method: "POST", body: JSON.stringify(body), token })
  }
};
