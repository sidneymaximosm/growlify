import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatBRL, toCentsFromBRL } from "../../lib/format";
import { useAuth } from "../../state/auth";
import { useToast } from "../../ui/Toast";

type Category = {
  id: string;
  name: string;
  kind: "domestic" | "commercial";
  priority: "essential" | "important" | "cuttable";
  monthlyBudgetCents?: number | null;
};

const KIND_LABEL: Record<string, string> = { domestic: "Doméstico", commercial: "Comercial" };
const PRIORITY_LABEL: Record<string, string> = { essential: "Essencial", important: "Importante", cuttable: "Cortável" };

function SubscriptionBadge(props: { status: string }) {
  if (props.status === "active") return <span className="badge badgeGreen">Assinatura ativa</span>;
  if (props.status === "past_due") return <span className="badge badgeWarn">Pagamento pendente</span>;
  if (props.status === "canceled") return <span className="badge badgeErr">Cancelada</span>;
  return <span className="badge">Inativa</span>;
}

function CategoryForm(props: { initial?: Partial<Category>; onCancel: () => void; onSave: (c: any) => void }) {
  const [name, setName] = useState(props.initial?.name || "");
  const [kind, setKind] = useState<Category["kind"]>((props.initial?.kind as any) || "domestic");
  const [priority, setPriority] = useState<Category["priority"]>((props.initial?.priority as any) || "essential");
  const [budget, setBudget] = useState<string>(() => {
    const cents = props.initial?.monthlyBudgetCents;
    if (typeof cents === "number" && cents > 0) return (cents / 100).toFixed(2).replace(".", ",");
    return "";
  });

  return (
    <div className="cardElev" style={{ marginTop: 12 }}>
      <div className="grid2">
        <div>
          <div className="label">Nome</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Alimentação" />
        </div>
        <div>
          <div className="label">Tipo</div>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="domestic">Doméstico</option>
            <option value="commercial">Comercial</option>
          </select>
        </div>
        <div>
          <div className="label">Prioridade</div>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="essential">Essencial</option>
            <option value="important">Importante</option>
            <option value="cuttable">Cortável</option>
          </select>
        </div>
        <div>
          <div className="label">Orçamento mensal (opcional)</div>
          <input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="R$ 0,00" inputMode="decimal" />
        </div>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn" type="button" onClick={props.onCancel}>
          Cancelar
        </button>
        <button
          className="btn btnPrimary"
          type="button"
          onClick={() => {
            const monthlyBudgetCents = budget.trim() ? toCentsFromBRL(budget) : null;
            props.onSave({
              name: name.trim(),
              kind,
              priority,
              monthlyBudgetCents: monthlyBudgetCents && monthlyBudgetCents > 0 ? monthlyBudgetCents : null
            });
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export function Perfil() {
  const { me, logout } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);

  async function loadCats() {
    try {
      setLoadingCats(true);
      const res = await api.categories.list();
      setCategories(res.items || []);
    } catch (e: any) {
      toast({ title: "Perfil", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
    } finally {
      setLoadingCats(false);
    }
  }

  useEffect(() => {
    loadCats();
  }, []);

  async function abrirPortalAssinatura() {
    try {
      setBillingBusy(true);
      const res = await api.billing.portalSession();
      window.location.href = res.url;
    } catch (e: any) {
      toast({ title: "Assinatura", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
    } finally {
      setBillingBusy(false);
    }
  }

  const totalsBudget = useMemo(() => {
    const withBudget = categories.filter((c) => !!c.monthlyBudgetCents);
    const sum = withBudget.reduce((a, b) => a + (b.monthlyBudgetCents || 0), 0);
    return { count: withBudget.length, sum };
  }, [categories]);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="h1">Perfil</div>
          <div className="muted" style={{ marginTop: 6 }}>Conta, preferências e categorias.</div>
        </div>
        <button
          className="btn"
          type="button"
          onClick={async () => {
            await logout();
            window.location.href = "/entrar";
          }}
        >
          Sair
        </button>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="h2">Sua conta</div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="label">Nome</div>
              <div className="text2" style={{ marginTop: 6 }}>{me?.name || "-"}</div>
            </div>
            <div>
              <div className="label">Email</div>
              <div className="text2" style={{ marginTop: 6 }}>{me?.email || "-"}</div>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="label">Status da assinatura</div>
                <div style={{ marginTop: 6 }}>
                  <SubscriptionBadge status={me?.subscription_status || "inactive"} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="label">Plano Growlify</div>
                <div className="text2" style={{ marginTop: 6 }}>R$ 27,90 / mês</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Teste gratuito por 7 dias com cartão obrigatório.</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Cancele antes do fim do teste sem cobranças. Sem fidelidade.</div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button className="btn" type="button" disabled={billingBusy} onClick={abrirPortalAssinatura}>
                {billingBusy ? "Aguarde…" : "Gerenciar assinatura"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h2">Categorias & prioridades</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Categorias estruturam lançamentos, orçamento mensal (opcional) e leitura de prioridades.
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              {totalsBudget.count} com orçamento • Total {formatBRL(totalsBudget.sum)}
            </div>
            <button
              className="btn btnPrimary"
              type="button"
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
            >
              + Nova categoria
            </button>
          </div>

          {loadingCats ? (
            <div className="muted" style={{ marginTop: 12 }}>Carregando…</div>
          ) : categories.length === 0 ? (
            <div className="muted" style={{ marginTop: 12 }}>Nenhuma categoria cadastrada.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {categories.map((c) => (
                <div key={c.id} className="cardElev" style={{ padding: 12 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{c.name}</div>
                      <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                        {KIND_LABEL[c.kind]} • {PRIORITY_LABEL[c.priority]}
                        {c.monthlyBudgetCents ? ` • Orçamento ${formatBRL(c.monthlyBudgetCents)}` : ""}
                      </div>
                    </div>
                    <div className="row">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setEditing(c);
                          setOpenForm(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btnDanger"
                        type="button"
                        onClick={async () => {
                          if (!confirm("Excluir categoria? Esta ação remove a categoria, mas não apaga lançamentos existentes.")) return;
                          try {
                            await api.categories.remove(c.id);
                            toast({ title: "Categorias", description: "Categoria excluída com sucesso." });
                            await loadCats();
                          } catch (e: any) {
                            toast({ title: "Categorias", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {openForm ? (
        <CategoryForm
          initial={editing || undefined}
          onCancel={() => setOpenForm(false)}
          onSave={async (body) => {
            try {
              if (!body.name) {
                toast({ title: "Categorias", description: "Informe um nome para a categoria." });
                return;
              }
              if (editing) {
                await api.categories.update(editing.id, body);
                toast({ title: "Categorias", description: "Categoria atualizada com sucesso." });
              } else {
                await api.categories.create(body);
                toast({ title: "Categorias", description: "Categoria criada com sucesso." });
              }
              setOpenForm(false);
              setEditing(null);
              await loadCats();
            } catch (e: any) {
              toast({ title: "Categorias", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
            }
          }}
        />
      ) : null}
    </div>
  );
}
