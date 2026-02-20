import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatBRL, formatPct } from "../../lib/format";
import { useToast } from "../../ui/Toast";

type Tx = any;

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function toISODate(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildLinePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  return points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function computeDailyNet(transactions: Tx[], days: number) {
  const now = new Date();
  const start = startOfDay(new Date(now.getTime() - (days - 1) * 86400_000));
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) map.set(toISODate(new Date(start.getTime() + i * 86400_000)), 0);

  for (const t of transactions) {
    const d = startOfDay(new Date(t.date));
    if (d < start) continue;
    const key = toISODate(d);
    if (!map.has(key)) continue;
    const signed = t.type === "income" ? t.amountCents : -t.amountCents;
    map.set(key, (map.get(key) || 0) + signed);
  }
  return Array.from(map.entries()).map(([date, netCents]) => ({ date, netCents }));
}

function CardStat(props: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="card">
      <div className="label">{props.title}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{props.value}</div>
      {props.subtitle ? (
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          {props.subtitle}
        </div>
      ) : null}
    </div>
  );
}

function MiniLineChart(props: { series: { date: string; netCents: number }[] }) {
  const w = 520;
  const h = 160;
  const pad = 14;
  const data = props.series;
  const min = Math.min(...data.map((d) => d.netCents), 0);
  const max = Math.max(...data.map((d) => d.netCents), 0);
  const span = Math.max(1, max - min);

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (d.netCents - min) / span) * (h - pad * 2);
    return { x, y };
  });

  const yZero = pad + (1 - (0 - min) / span) * (h - pad * 2);
  const path = buildLinePath(points);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="h2">Últimos 30 dias</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Linha representa o resultado diário (entradas menos saídas).
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, overflow: "hidden" }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Gráfico de linha de 30 dias">
          <defs>
            <linearGradient id="gl-line" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(56,189,248,.55)" />
              <stop offset="1" stopColor="rgba(34,197,94,.65)" />
            </linearGradient>
          </defs>
          <line x1={pad} y1={yZero} x2={w - pad} y2={yZero} stroke="rgba(30,58,95,.8)" />
          <path d={path} fill="none" stroke="url(#gl-line)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function Inicio() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<any | null>(null);
  const [last30, setLast30] = useState<Tx[]>([]);
  const [all, setAll] = useState<Tx[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const now = new Date();
        const from30 = new Date(now.getTime() - 29 * 86400_000).toISOString();
        const [summary, last30Res, allRes] = await Promise.all([
          api.reports.summary(),
          api.transactions.list({ from: from30 }),
          api.transactions.list({})
        ]);
        setMonth(summary);
        setLast30(last30Res.items || []);
        setAll(allRes.items || []);
      } catch (e: any) {
        toast({ title: "Início", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saldoAtualCents = useMemo(() => {
    let sum = 0;
    for (const t of all) sum += t.type === "income" ? t.amountCents : -t.amountCents;
    return sum;
  }, [all]);

  const series = useMemo(() => computeDailyNet(last30, 30), [last30]);

  const dist = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const t of last30) {
      if (t.type !== "expense") continue;
      const name = t.category?.name || "Sem categoria";
      map.set(name, (map.get(name) || 0) + t.amountCents);
      total += t.amountCents;
    }
    const items = Array.from(map.entries())
      .map(([name, cents]) => ({ name, cents, pct: total ? cents / total : 0 }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 6);
    return { items, total };
  }, [last30]);

  if (loading) {
    return (
      <div className="card">
        <div className="h2">Início</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Carregando informações…
        </div>
      </div>
    );
  }

  const insights = (month?.insights || []) as any[];
  const hasAny = all.length > 0;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="h1">Início</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Visão geral do seu controle financeiro.
          </div>
        </div>
      </div>

      {!hasAny ? (
        <div className="cardElev">
          <div className="h2">Comece pelo primeiro lançamento</div>
          <div className="text2" style={{ marginTop: 6 }}>
            Você ainda não tem lançamentos. Adicione o primeiro para ver seu diagnóstico.
          </div>
        </div>
      ) : null}

      <div className="grid4" style={{ marginTop: 12 }}>
        <CardStat title="Saldo atual" value={formatBRL(saldoAtualCents)} subtitle="Soma histórica de entradas e saídas." />
        <CardStat title="Receitas do mês" value={formatBRL(month?.totals?.income_cents || 0)} />
        <CardStat title="Despesas do mês" value={formatBRL(month?.totals?.expense_cents || 0)} />
        <CardStat title="Resultado do mês" value={formatBRL(month?.totals?.result_cents || 0)} />
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <MiniLineChart series={series} />
        <div className="card">
          <div className="h2">Distribuição por categoria</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Baseado nas despesas dos últimos 30 dias.
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {dist.items.length === 0 ? (
              <div className="muted">Nada para exibir.</div>
            ) : (
              dist.items.map((i) => (
                <div key={i.name}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="text2" style={{ fontSize: 14 }}>
                      {i.name}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatPct(i.pct)}
                    </div>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(30,58,95,.7)",
                      overflow: "hidden",
                      marginTop: 6
                    }}
                  >
                    <div style={{ width: `${Math.round(i.pct * 100)}%`, height: "100%", background: "rgba(34,197,94,.78)" }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }} className="card">
        <div className="h2">Alertas inteligentes</div>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          Mensagens automáticas para contextualizar variações.
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {insights.length === 0 ? (
            <div className="muted">Nenhum alerta educacional no momento.</div>
          ) : (
            insights.map((a) => (
              <div
                key={a.id}
                className={`badge ${a.severity === "warning" ? "badgeWarn" : "badgeGreen"}`}
                style={{ alignItems: "flex-start" }}
              >
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 2 }}>{a.title}</div>
                  <div style={{ color: "inherit", opacity: 0.95 }}>{a.message}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
