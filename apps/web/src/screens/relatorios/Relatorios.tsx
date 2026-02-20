import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatBRL } from "../../lib/format";
import { useToast } from "../../ui/Toast";

function toISO(d: Date) {
  return d.toISOString();
}

function monthRange(d: Date) {
  const fromIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const toIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { fromIso, toIso };
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400_000);
}

function diffDays(a: Date, b: Date) {
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86400_000));
}

async function getSummary(from: Date, to: Date) {
  const qs = new URLSearchParams({ from: toISO(from), to: toISO(to) }).toString();
  const res = await fetch(`/api/reports/summary?${qs}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Serviço indisponível no momento. Tente novamente.");
  return data;
}

function rangeISO(from: string, to: string) {
  const fromIso = from ? `${from}T00:00:00.000Z` : "";
  const toIso = to ? `${to}T23:59:59.999Z` : "";
  return { fromIso, toIso };
}

export function Relatorios() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const r = monthRange(now);

  const [from, setFrom] = useState<string>(r.fromIso);
  const [to, setTo] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );

  const [curr, setCurr] = useState<any | null>(null);
  const [prev, setPrev] = useState<any | null>(null);
  const [txs, setTxs] = useState<any[]>([]);

  async function load() {
    try {
      setLoading(true);
      const { fromIso, toIso } = rangeISO(from, to);
      const fromD = new Date(fromIso);
      const toD = new Date(toIso);
      const days = diffDays(fromD, new Date(toD.getTime() + 1));
      const prevFrom = addDays(fromD, -days);
      const prevTo = addDays(toD, -days);

      const [currSum, prevSum, txList] = await Promise.all([
        getSummary(fromD, toD),
        getSummary(prevFrom, prevTo),
        api.transactions.list({ from: fromIso, to: toIso })
      ]);

      setCurr(currSum);
      setPrev(prevSum);
      setTxs(txList.items || []);
    } catch (e: any) {
      toast({ title: "Relatórios", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const top = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const name = t.category?.name || "Sem categoria";
      map.set(name, (map.get(name) || 0) + t.amountCents);
    }
    return Array.from(map.entries())
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 5);
  }, [txs]);

  const exportUrl = useMemo(() => {
    const { fromIso, toIso } = rangeISO(from, to);
    const qs = new URLSearchParams({ from: fromIso, to: toIso }).toString();
    return `${api.reports.exportCsvUrl()}?${qs}`;
  }, [from, to]);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="h1">Relatórios</div>
          <div className="muted" style={{ marginTop: 6 }}>Períodos, comparação e exportação.</div>
        </div>
        <div className="row">
          <a className="btn" href={exportUrl}>
            Exportar CSV
          </a>
          <button className="btn btnPrimary" type="button" onClick={() => load()}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="cardElev">
        <div className="grid2">
          <div>
            <div className="label">De</div>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="label">Até</div>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Selecione o período e clique em Atualizar.
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ marginTop: 12 }}>Carregando…</div>
      ) : (
        <>
          <div className="grid4" style={{ marginTop: 12 }}>
            <div className="card">
              <div className="label">Receitas do período</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{formatBRL(curr?.totals?.income_cents || 0)}</div>
            </div>
            <div className="card">
              <div className="label">Despesas do período</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{formatBRL(curr?.totals?.expense_cents || 0)}</div>
            </div>
            <div className="card">
              <div className="label">Resultado do período</div>
              <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{formatBRL(curr?.totals?.result_cents || 0)}</div>
            </div>
            <div className="card">
              <div className="label">Comparação (período anterior)</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                {formatBRL(prev?.totals?.result_cents || 0)} no período anterior.
              </div>
            </div>
          </div>

          <div className="grid2" style={{ marginTop: 12 }}>
            <div className="card">
              <div className="h2">Top categorias (despesas)</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>Ordenado por volume no período.</div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {top.length === 0 ? (
                  <div className="muted">Nada para exibir.</div>
                ) : (
                  top.map((t) => (
                    <div key={t.name} className="row" style={{ justifyContent: "space-between" }}>
                      <div className="text2">{t.name}</div>
                      <div style={{ fontWeight: 800 }}>{formatBRL(t.cents)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="card">
              <div className="h2">Observações do período</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                Leitura automática para contexto, sem interferir em operações financeiras.
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {(curr?.insights || []).length === 0 ? (
                  <div className="muted">Nenhum alerta educacional no momento.</div>
                ) : (
                  (curr.insights || []).map((i: any) => (
                    <div key={i.id} className={`badge ${i.severity === "warning" ? "badgeWarn" : "badgeGreen"}`}>
                      <div style={{ fontWeight: 800 }}>{i.title}</div>
                      <div style={{ marginLeft: 8 }}>{i.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
