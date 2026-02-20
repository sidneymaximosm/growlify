import React, { createContext, useContext, useMemo, useState } from "react";

type ToastData = { title: string; description: string } | null;
type ToastApi = { toast: (t: { title: string; description: string }) => void; clear: () => void; current: ToastData };

const Ctx = createContext<ToastApi>({} as ToastApi);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastData>(null);

  function toast(t: { title: string; description: string }) {
    setCurrent(t);
    window.clearTimeout((toast as any)._t);
    (toast as any)._t = window.setTimeout(() => setCurrent(null), 4200);
  }

  function clear() {
    setCurrent(null);
  }

  const value = useMemo(() => ({ toast, clear, current }), [current]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useToast() {
  return useContext(Ctx);
}

export function ToastView() {
  const { current } = useToast();
  if (!current) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <p className="toastTitle">{current.title}</p>
      <p className="toastDesc">{current.description}</p>
    </div>
  );
}

