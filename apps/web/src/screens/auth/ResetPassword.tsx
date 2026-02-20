import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";

export function ResetPasswordPage() {
  const { toast } = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => (params.get("token") || "").trim(), [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast({ title: "Redefinição de senha", description: "Token inválido ou ausente." });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Redefinição de senha", description: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Redefinição de senha", description: "As senhas não conferem." });
      return;
    }

    try {
      setBusy(true);
      await api.auth.resetPassword({ token, password });
      toast({ title: "Redefinição de senha", description: "Senha atualizada com sucesso. Entre novamente." });
      nav("/entrar", { replace: true });
    } catch (err: any) {
      toast({ title: "Redefinição de senha", description: err?.message || "Serviço indisponível no momento. Tente novamente." });
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
          Redefinir senha
        </p>

        {!token ? (
          <div className="card" style={{ padding: 14 }}>
            <div className="h3" style={{ margin: 0 }}>
              Link inválido
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              O token de redefinição não foi identificado. Solicite um novo link.
            </p>
            <p className="muted" style={{ margin: "10px 0 0" }}>
              <Link to="/forgot-password">Solicitar novo link</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 10 }}>
              <div className="label">Nova senha</div>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={busy}
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
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10.6 10.6a3 3 0 004.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Mínimo de 8 caracteres.
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div className="label">Confirmar nova senha</div>
              <input
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={busy}
              />
            </div>

            <button className="btn btnPrimary" style={{ width: "100%" }} disabled={busy} type="submit">
              {busy ? "Salvando\u2026" : "Atualizar senha"}
            </button>

            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              <Link to="/entrar">Voltar para Entrar</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
