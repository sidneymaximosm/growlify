import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      await api.auth.forgotPassword({ email });
      setSent(true);
      toast({
        title: "Recuperação de senha",
        description: "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha."
      });
    } catch (err: any) {
      toast({ title: "Recuperação de senha", description: err?.message || "Serviço indisponível no momento. Tente novamente." });
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
          Esqueceu a senha
        </p>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>
          Informe seu e-mail. Se houver uma conta cadastrada, enviaremos um link para redefinição.
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 14 }}>
            <div className="label">E-mail</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              disabled={busy || sent}
            />
          </div>

          <button className="btn btnPrimary" style={{ width: "100%" }} disabled={busy || sent} type="submit">
            {busy ? "Enviando\u2026" : sent ? "Enviado" : "Enviar link"}
          </button>

          <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
            <Link to="/entrar">Voltar para Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
