import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/auth";
import { useToast } from "../../ui/Toast";

export function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const next = loc?.state?.next || "/inicio";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      await login(email, password);
      nav(next, { replace: true });
    } catch (err: any) {
      toast({ title: "Acesso", description: err?.message || "N\u00e3o foi poss\u00edvel entrar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="cardElev" style={{ padding: 18 }}>
        <div className="topbar">
          <div className="row">
            <img src="/logo-growlify-mark.svg" alt="Growlify" className="logoMark" />
            <div>
              <p className="h1">Growlify</p>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Seu Administrador Financeiro Inteligente
              </p>
            </div>
          </div>
        </div>

        <p className="h2" style={{ marginBottom: 10 }}>
          Entrar
        </p>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div className="label">E-mail</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="label">Senha</div>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="btn"
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  padding: 0,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  opacity: 0.95
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 3l18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.6 10.6a3 3 0 004.2 4.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.9 5.1A10.6 10.6 0 0112 5c7 0 10 7 10 7a18.2 18.2 0 01-5.1 6.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.1 6.1A18.2 18.2 0 002 12s3 7 10 7c1 0 2-.1 2.9-.4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className="btn btnPrimary" style={{ width: "100%" }} disabled={busy} type="submit">
            {busy ? "Entrando\u2026" : "Entrar"}
          </button>

          <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
            <Link to="/forgot-password">Esqueceu a senha?</Link>
          </p>

          <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
            {"Ainda n\u00e3o tem conta? "} <Link to="/criar-conta">Criar conta</Link>
          </p>
          <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
            <Link to="/termos">Termos e responsabilidades</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
