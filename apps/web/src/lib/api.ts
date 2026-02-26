type ApiError = { message?: string };

// Em dev (Vite), usamos proxy para evitar problemas de CORS/loopback (localhost vs 127.0.0.1).
// Em produ\u00e7\u00e3o, defina VITE_API_BASE_URL.
const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = (RAW_API_BASE || (import.meta.env.DEV ? "" : "")).replace(/\/+$/, "");
const API_BASE_MISSING_MESSAGE =
  !import.meta.env.DEV && !RAW_API_BASE
    ? "Configura\u00e7\u00e3o ausente: defina VITE_API_BASE_URL no deploy (Vercel) para apontar para a API do Growlify."
    : "";

function isLocalhostHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function altApiBaseIfLocal(base: string) {
  try {
    const u = new URL(base);
    if (!isLocalhostHost(u.hostname)) return null;
    const altHost = u.hostname === "127.0.0.1" ? "localhost" : "127.0.0.1";
    u.hostname = altHost;
    return u.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function networkErrorMessage() {
  try {
    const hostname = window.location.hostname;
    if (isLocalhostHost(hostname)) {
      const apiHint = API_BASE ? API_BASE : "http://localhost:8080";
      return `N\u00e3o foi poss\u00edvel conectar \u00e0 API do Growlify. Verifique se ela est\u00e1 online em ${apiHint}.`;
    }
  } catch {
    // ignore
  }
  return "Servi\u00e7o indispon\u00edvel no momento. Tente novamente.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (API_BASE_MISSING_MESSAGE) {
    const err: any = new Error(API_BASE_MISSING_MESSAGE);
    err.status = 0;
    throw err;
  }
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      },
      credentials: "include"
    });
  } catch {
    // Dev: alguns ambientes resolvem melhor localhost vs 127.0.0.1
    const altBase = altApiBaseIfLocal(API_BASE);
    if (altBase) {
      try {
        res = await fetch(`${altBase}${path}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {})
          },
          credentials: "include"
        });
      } catch {
        const err: any = new Error(networkErrorMessage());
        err.status = 0;
        throw err;
      }
    } else {
      const err: any = new Error(networkErrorMessage());
      err.status = 0;
      throw err;
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text().catch(() => "");
  let data: any = {};
  if (contentType.includes("application/json") || rawText.trim().startsWith("{")) {
    try {
      data = JSON.parse(rawText || "{}");
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("Erro na API", { url, status: res.status, responseText: rawText, data });
    }
    const msg = (data as ApiError)?.message || "Servi\u00e7o indispon\u00edvel no momento. Tente novamente.";
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export type UserMe = {
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
      request<{ token: string; user: any }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: any }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    forgotPassword: (body: { email: string }) =>
      request<{ ok: true; message: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
    resetPassword: (body: { token: string; password: string }) =>
      request<{ ok: true; message: string }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
    me: () => request<UserMe>("/api/auth/me"),
    logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" })
  },
  billing: {
    checkoutSession: () =>
      request<{ url: string }>("/api/billing/checkout-session", { method: "POST", body: JSON.stringify({}) }),
    portalSession: () => request<{ url: string }>("/api/billing/portal-session", { method: "POST", body: JSON.stringify({}) })
  },
  categories: {
    list: () => request<{ items: any[] }>("/api/categories"),
    create: (body: any) => request<{ item: any }>("/api/categories", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      request<{ item: any }>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: true }>(`/api/categories/${id}`, { method: "DELETE" })
  },
  transactions: {
    list: (q: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(q || {})) {
        if (v === undefined || v === null || v === "") continue;
        params.set(k, String(v));
      }
      return request<{ items: any[] }>(`/api/transactions?${params.toString()}`);
    },
    create: (body: any) => request<{ item: any }>("/api/transactions", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) =>
      request<{ item: any }>(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: true }>(`/api/transactions/${id}`, { method: "DELETE" })
  },
  reports: {
    summary: () => request<any>("/api/reports/summary"),
    exportCsvUrl: () => `${API_BASE}/api/reports/export.csv`
  },
  calculator: {
    saved: () => request<{ items: any[] }>("/api/calculator/saved"),
    runAndSave: (body: { type: string; params: Record<string, any>; title?: string }) =>
      request<{ item: any; items: any[]; result: any }>("/api/calculator/run-and-save", {
        method: "POST",
        body: JSON.stringify(body)
      }),
    removeSaved: (id: string) => request<{ ok: true; items: any[] }>(`/api/calculator/saved/${id}`, { method: "DELETE" })
  }
};
