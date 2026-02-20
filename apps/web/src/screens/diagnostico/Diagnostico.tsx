import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatBRL } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";

type Category = { id: string; name: string; kind: string; priority: string; monthlyBudgetCents?: number | null };
type Tx = any;

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfLastMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1, 0, 0, 0, 0));
}

function endOfLastMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0, 23, 59, 59, 999));
}

function sumExpensesByCategory(list: Tx[]) {
  const map = new Map<string, number>();
  for (const t of list) {
    if (t.type !== "expense") continue;
    const key = t.category?.name || "Sem categoria";
    map.set(key, (map.get(key) || 0) + t.amountCents);
  }
  return map;
}

function moneyToCents(input: string) {
  const raw = (input || "").trim().replace(/\./g, "").replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function Diagnostico() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tx90, setTx90] = useState<Tx[]>([]);
  const [summary, setSummary] = useState<any | null>(null);

  const [calcLimitMonth, setCalcLimitMonth] = useState<string>("");
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [saved, setSaved] = useState<any[]>([]);
  const [calcDaysBase, setCalcDaysBase] = useState<string>("auto");
  const [confirmDeleteCalc, setConfirmDeleteCalc] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const now = new Date();
        const from90 = new Date(now.getTime() - 89 * 86400_000).toISOString();
        const [cats, txs, sum] = await Promise.all([
          api.categories.list(),
          api.transactions.list({ from: from90 }),
          api.reports.summary()
        ]);
        setCategories(cats.items || []);
        setTx90(txs.items || []);
        setSummary(sum);
        // "Cálculos salvos" carregam separadamente para não quebrar o Diagnóstico.
      } catch (e: any) {
        toast({ title: "Diagnóstico", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const goals = await api.calculator.saved();
        setSaved(goals.items || []);
      } catch {
        setSaved([]);
      }
    })();
  }, []);

  const monthTx = useMemo(() => {
    const now = new Date();
    const from = startOfMonth(now);
    return tx90.filter((t) => new Date(t.date) >= from);
  }, [tx90]);

  const lastMonthTx = useMemo(() => {
    const now = new Date();
    const from = startOfLastMonth(now);
    const to = endOfLastMonth(now);
    return tx90.filter((t) => {
      const d = new Date(t.date);
      return d >= from && d <= to;
    });
  }, [tx90]);

  const topCut = useMemo(() => {
    const map = sumExpensesByCategory(monthTx);
    return Array.from(map.entries())
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 5);
  }, [monthTx]);

  const recurring = useMemo(() => {
    const map = new Map<string, { count: number; totalCents: number }>();
    for (const t of tx90) {
      if (t.type !== "expense") continue;
      const key = (t.description || "").trim().toLowerCase();
      if (!key) continue;
      const curr = map.get(key) || { count: 0, totalCents: 0 };
      curr.count += 1;
      curr.totalCents += t.amountCents;
      map.set(key, curr);
    }
    return Array.from(map.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([desc, v]) => ({ desc, ...v }))
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 6);
  }, [tx90]);

  const growth = useMemo(() => {
    const thisMap = sumExpensesByCategory(monthTx);
    const lastMap = sumExpensesByCategory(lastMonthTx);
    const rows: Array<{ name: string; pct: number }> = [];
    for (const [name, curr] of thisMap.entries()) {
      const prev = lastMap.get(name) || 0;
      if (prev <= 0 || curr <= 0) continue;
      const p = ((curr - prev) / prev) * 100;
      rows.push({ name, pct: p });
    }
    return rows.sort((a, b) => b.pct - a.pct).slice(0, 5);
  }, [monthTx, lastMonthTx]);

  const drip = useMemo(() => {
    const small = monthTx.filter((t) => t.type === "expense" && t.amountCents > 0 && t.amountCents <= 2000);
    const total = small.reduce((a, b) => a + b.amountCents, 0);
    return { count: small.length, totalCents: total };
  }, [monthTx]);

  const budgetNotes = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type !== "expense") continue;
      if (!t.categoryId) continue;
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amountCents);
    }
    const overs: Array<{ name: string; overCents: number }> = [];
    for (const c of categories) {
      if (!c.monthlyBudgetCents) continue;
      const spent = map.get(c.id) || 0;
      if (spent > c.monthlyBudgetCents) overs.push({ name: c.name, overCents: spent - c.monthlyBudgetCents });
    }
    return overs.sort((a, b) => b.overCents - a.overCents).slice(0, 4);
  }, [categories, monthTx]);

  const calc = useMemo(() => {
    const limit = moneyToCents(calcLimitMonth);
    if (limit === null || limit <= 0) return null;
    const now = new Date();
    const asOfDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const startDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    const autoDaysLeft = Math.max(1, Math.floor((end.getTime() - startDay.getTime()) / 86400_000) + 1);
    const manual = calcDaysBase === "auto" ? null : Number(calcDaysBase);
    const daysLeft = manual && manual >= 1 && manual <= 31 ? manual : autoDaysLeft;
    const spent = monthTx.filter((t) => t.type === "expense").reduce((a, b) => a + b.amountCents, 0);
    const remaining = limit - spent;
    const perDay = Math.trunc(remaining / daysLeft);
    return { limit, spent, remaining, daysLeft, perDay, asOfDate, daysBase: daysLeft, daysMode: manual ? "manual" : "auto" };
  }, [calcLimitMonth, monthTx, calcDaysBase]);

  useEffect(() => {
    setCalcResult(null);
  }, [calcLimitMonth, monthTx, calcDaysBase]);

  const hasAny = tx90.length > 0;

  function exportSavedAsPdf(item: any) {
    try {
      const title = String(item?.title || "Cálculo salvo");
      const r = item?.resultJson || {};
      const text =
        item?.type === "daily_limit_month"
          ? `Referência: ${formatBRL(r.perDayCents || 0)} por dia\nRestante: ${formatBRL(r.remainingCents || 0)}\nBase: ${Number(r.daysLeft || 0)} dias`
          : "Resultado disponível.";

      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) throw new Error("Janela bloqueada");
      w.document.open();
      w.document.write(`
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:32px;color:#0b1220}
    h1{font-size:20px;margin:0 0 10px}
    .meta{color:#334155;font-size:12px;margin:0 0 18px}
    .box{border:1px solid #e2e8f0;border-radius:14px;padding:14px;white-space:pre-line;font-size:14px;line-height:1.4}
    .note{color:#64748b;font-size:12px;margin-top:14px}
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Exportado em ${new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
  <div class="box">${text}</div>
  <div class="note">Referência de organização. O Growlify não é plataforma bancária e não executa transações.</div>
  <script>setTimeout(()=>{ window.print(); }, 100);</script>
</body>
</html>
      `);
      w.document.close();
    } catch {
      toast({ title: "Cálculos salvos", description: "Não foi possível exportar no momento. Tente novamente." });
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="h1">Diagnóstico</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Leitura automática de padrões, recorrências e variações.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">Carregando…</div>
      ) : !hasAny ? (
        <div className="cardElev">
          <div className="h2">Sem lançamentos suficientes</div>
          <div className="text2" style={{ marginTop: 6 }}>
            Você ainda não tem lançamentos. Adicione o primeiro para ver seu diagnóstico.
          </div>
        </div>
      ) : (
        <>
          <div className="grid2">
            <div className="card">
              <div className="h2">Onde reduzir gastos (Top 5)</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                Categorias com maior volume de saídas no mês.
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {topCut.length === 0 ? (
                  <div className="muted">Nada para exibir.</div>
                ) : (
                  topCut.map((r) => (
                    <div key={r.name} className="row" style={{ justifyContent: "space-between" }}>
                      <div className="text2">{r.name}</div>
                      <div style={{ fontWeight: 800 }}>{formatBRL(r.cents)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="card">
              <div className="h2">Gastos recorrentes</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                Itens com repetição no histórico recente, úteis para revisar hábitos e contratos.
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {recurring.length === 0 ? (
                  <div className="muted">Nenhum padrão recorrente identificado.</div>
                ) : (
                  recurring.map((r) => (
                    <div key={r.desc} className="cardElev" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 800 }}>{r.desc}</div>
                      <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                        {r.count} ocorrências • Total {formatBRL(r.totalCents)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid2" style={{ marginTop: 12 }}>
            <div className="card">
              <div className="h2">Categorias com maior crescimento</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                Comparação do mês atual com o mês anterior.
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {growth.length === 0 ? (
                  <div className="muted">Nada para exibir.</div>
                ) : (
                  growth.map((g) => (
                    <div key={g.name} className="row" style={{ justifyContent: "space-between" }}>
                      <div className="text2">{g.name}</div>
                      <div className="badge badgeWarn">+{Math.round(g.pct)}%</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="card">
              <div className="h2">Padrões detectados</div>
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                Sinais estatísticos e comportamentais para contexto.
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div className="cardElev" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 800 }}>Efeito goteira</div>
                  <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                    {drip.count} despesas de pequeno valor no mês somam {formatBRL(drip.totalCents)}.
                  </div>
                </div>
                {budgetNotes.length > 0 ? (
                  <div className="cardElev" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 800 }}>Orçamentos excedidos</div>
                    <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {budgetNotes.map((b) => `${b.name} (+${formatBRL(b.overCents)})`).join(" • ")}
                    </div>
                  </div>
                ) : null}
                {(summary?.insights || []).length > 0 ? (
                  <div className="cardElev" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 800 }}>Alertas inteligentes</div>
                    <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {(summary.insights || []).slice(0, 2).map((i: any) => i.message).join(" ")}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">Calculadora inteligente</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Ferramentas rápidas para planejar limites e metas. Resultados são referências de organização.
            </div>

            <div className="grid2" style={{ marginTop: 12 }}>
              <div className="cardElev">
                <div className="label">Quanto posso gastar por dia até o fim do mês?</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    value={calcLimitMonth}
                    onChange={(e) => setCalcLimitMonth(e.target.value)}
                    placeholder="Limite de gastos do mês (R$)"
                    inputMode="decimal"
                  />
                  <select className="select" style={{ maxWidth: 170 }} value={calcDaysBase} onChange={(e) => setCalcDaysBase(e.target.value)}>
                    <option value="auto">Dias: automático</option>
                    <option value="28">Dias: 28</option>
                    <option value="29">Dias: 29</option>
                    <option value="30">Dias: 30</option>
                    <option value="31">Dias: 31</option>
                  </select>
                  <button
                    className="btn"
                    type="button"
                    onClick={async () => {
                      try {
                        if (!calc) return;
                        const res = await api.calculator.runAndSave({
                          type: "daily_limit_month",
                          title: "Limite diário até o fim do mês",
                          params: {
                            limitCents: calc.limit,
                            spentCents: calc.spent,
                            asOfDate: (calc as any).asOfDate,
                            daysBase: (calc as any).daysMode === "manual" ? (calc as any).daysBase : undefined
                          }
                        });
                        setCalcResult(res.result);
                        setSaved(res.items || []);
                        toast({ title: "Calculadora", description: "Cálculo salvo com sucesso." });
                      } catch (e: any) {
                        toast({ title: "Calculadora", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
                      }
                    }}
                  >
                    Calcular e salvar
                  </button>
                </div>
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Dias considerados: "Automático" usa os dias restantes do mês (inclui hoje).
                </div>

                {calc ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="text2">Gasto do mês</div>
                      <div style={{ fontWeight: 800 }}>{formatBRL(calcResult?.spentCents ?? calc.spent)}</div>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="text2">Restante estimado</div>
                      <div style={{ fontWeight: 800, color: (calcResult?.remainingCents ?? calc.remaining) < 0 ? "var(--error)" : "var(--text)" }}>
                        {formatBRL(calcResult?.remainingCents ?? calc.remaining)}
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="text2">Referência diária</div>
                      <div className={`badge ${(calcResult?.perDayCents ?? calc.perDay) < 0 ? "badgeErr" : "badgeGreen"}`}>
                        {formatBRL(calcResult?.perDayCents ?? calc.perDay)}
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Base considerada: {(calcResult?.daysLeft ?? calc.daysLeft)} dias ({(calcResult as any)?.daysMode || (calc as any).daysMode}).
                    </div>
                  </div>
                ) : (
                  <div className="muted" style={{ marginTop: 10 }}>
                    Informe um limite mensal para calcular.
                  </div>
                )}
              </div>

              <div className="cardElev">
                <div className="label">Cálculos salvos</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {saved.length === 0 ? (
                    <div className="muted">Nada para exibir.</div>
                  ) : (
                    saved.map((s: any) => (
                      <div key={s.id || s.paramsHash} className="card" style={{ padding: 12 }}>
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: 800 }}>{s.title || "Cálculo salvo"}</div>
                          <div className="row" style={{ gap: 8 }}>
                            <button className="btn" type="button" onClick={() => exportSavedAsPdf(s)}>
                              Exportar PDF
                            </button>
                            <button className="btn btnDanger" type="button" onClick={() => setConfirmDeleteCalc(s)}>
                              Excluir
                            </button>
                          </div>
                        </div>
                        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                          {s.type === "daily_limit_month"
                            ? `Referência: ${formatBRL(s.resultJson?.perDayCents || 0)} por dia • Restante: ${formatBRL(s.resultJson?.remainingCents || 0)} • Base: ${s.resultJson?.daysLeft || 0} dias`
                            : "Resultado disponível."}
                        </div>
                        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                          Salvo em{" "}
                          {new Date(s.updatedAt || s.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDeleteCalc ? (
        <Modal
          title="Excluir cálculo salvo?"
          description="Este cálculo será removido permanentemente da sua lista."
          cancelText="Cancelar"
          confirmText="Excluir"
          onCancel={() => setConfirmDeleteCalc(null)}
          onConfirm={async () => {
            try {
              const id = String(confirmDeleteCalc.id || "");
              if (!id) return setConfirmDeleteCalc(null);
              const res = await api.calculator.removeSaved(id);
              setSaved(res.items || []);
              setConfirmDeleteCalc(null);
              toast({ title: "Cálculos salvos", description: "Cálculo excluído com sucesso." });
            } catch (e: any) {
              toast({ title: "Cálculos salvos", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
            }
          }}
        />
      ) : null}
    </div>
  );
}



