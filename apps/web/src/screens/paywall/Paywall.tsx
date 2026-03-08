import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";

const CHECKOUT_PENDING_KEY = "growlify_checkout_pending_v1";
const PAYWALL_SYNC_MARKER_KEY = "growlify_paywall_sync_marker_v1";

function readPendingCheckoutMs(): number | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_PENDING_KEY);
    if (!raw) return null;
    const ms = Number(raw);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return ms;
  } catch {
    return null;
  }
}

function clearPendingCheckout() {
  try {
    localStorage.removeItem(CHECKOUT_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function Paywall() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const flags = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const pagamento = params.get("pagamento");
    const cameFromSuccess = pagamento === "sucesso";
    const pendingMs = readPendingCheckoutMs();
    const hasPendingCheckout = typeof pendingMs === "number";
    return { cameFromSuccess, hasPendingCheckout };
  }, [location.search]);

  async function syncAndRefresh(opts?: { showToastOnPending?: boolean }) {
    const showToastOnPending = opts?.showToastOnPending ?? false;

    try {
      setBusy(true);
      await api.billing.sync();
      const me = await api.auth.me();

      if (me?.user?.subscription_status === "active") {
        clearPendingCheckout();
        navigate("/inicio", { replace: true });
        return;
      }

      if (showToastOnPending) {
        toast({
          title: "Assinatura",
          description:
            "O pagamento foi confirmado, mas a assinatura ainda está em atualização. Aguarde alguns segundos e atualize a página."
        });
      }
    } catch (err: any) {
      if (showToastOnPending) {
        toast({
          title: "Assinatura",
          description: err?.message || "Serviço indisponível no momento. Tente novamente."
        });
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Em hash routes, o retorno do Stripe chega como /#/paywall?pagamento=sucesso.
    // Também marcamos um "checkout pendente" antes de sair do app para cobrir casos
    // onde o parâmetro não chega ao Paywall.
    const marker = `${flags.cameFromSuccess ? "success" : ""}|${flags.hasPendingCheckout ? "pending" : ""}`;

    try {
      const last = sessionStorage.getItem(PAYWALL_SYNC_MARKER_KEY);
      if (last === marker) return;
      sessionStorage.setItem(PAYWALL_SYNC_MARKER_KEY, marker);
    } catch {
      // ignore
    }

    if (!flags.cameFromSuccess && !flags.hasPendingCheckout) return;

    let cancelled = false;
    (async () => {
      await syncAndRefresh({ showToastOnPending: flags.cameFromSuccess });
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [flags.cameFromSuccess, flags.hasPendingCheckout]);

  async function subscribe() {
    try {
      setBusy(true);
      try {
        localStorage.setItem(CHECKOUT_PENDING_KEY, String(Date.now()));
      } catch {
        // ignore
      }

      const res = await api.billing.checkoutSession();
      window.location.href = res.url;
    } catch (err: any) {
      // Se já existe assinatura (ativa/em teste), o backend pode recusar o Checkout.
      if (err?.status === 409) {
        await syncAndRefresh();
        return;
      }
      toast({ title: "Assinatura", description: err?.message || "Não foi possível iniciar o pagamento." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="cardElev">
        <p className="h1">Assinatura necessária</p>
        <p className="text2" style={{ marginTop: 8 }}>
          Para usar o Growlify, assine o Plano Growlify por <strong>R$ 27,90/mês</strong>.
        </p>
        <p className="muted" style={{ marginTop: 6 }}>
          Teste gratuito por 7 dias. Cartão obrigatório. Cancele antes do fim do teste sem cobranças.
        </p>
        <p className="muted" style={{ marginTop: 6 }}>Cancele quando quiser. Sem fidelidade.</p>
        <p className="muted" style={{ marginTop: 10 }}>
          <Link to="/termos">Termos e responsabilidades</Link>
        </p>

        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => syncAndRefresh({ showToastOnPending: true })} disabled={busy} type="button">
            {busy ? "Atualizando..." : "Já assinei, atualizar acesso"}
          </button>
          <button className="btn btnPrimary" onClick={subscribe} disabled={busy} type="button">
            {busy ? "Abrindo pagamento..." : "Assinar por R$ 27,90/mês"}
          </button>
        </div>
      </div>
    </div>
  );
}
