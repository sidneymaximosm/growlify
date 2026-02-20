import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";

export function Paywall() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

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

