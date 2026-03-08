import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";

export function Paywall() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    if (params.get("pagamento") !== "sucesso") return;

    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        await api.billing.sync();
        const me = await api.auth.me();
        if (cancelled) return;

        if (me?.user?.subscription_status === "active") {
          navigate("/inicio", { replace: true });
          return;
        }

        toast({
          title: "Assinatura",
          description:
            "O pagamento foi confirmado, mas a assinatura ainda está em atualização. Aguarde alguns segundos e atualize a página."
        });
      } catch (err: any) {
        if (cancelled) return;
        toast({ title: "Assinatura", description: err?.message || "Serviço indisponível no momento. Tente novamente." });
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, toast]);


  async function subscribe() {
    try {
      setBusy(true);
      const res = await api.billing.checkoutSession();
      window.location.href = res.url;
    } catch (err: any) {
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
          <button className="btn btnPrimary" onClick={subscribe} disabled={busy} type="button">
            {busy ? "Abrindo pagamento…" : "Assinar por R$ 27,90/mês"}
          </button>
        </div>
      </div>
    </div>
  );
}

