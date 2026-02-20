import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { formatBRL, toCentsFromBRL } from "../../lib/format";
import { Dialog } from "../../ui/Dialog";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";

type Category = { id: string; name: string; kind: string; priority: string; monthlyBudgetCents?: number | null };
type Tx = any;

const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  card: "Cartão",
  pix: "Pix",
  transfer: "Transferência",
  other: "Outro"
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthStartISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function dateToISODateUTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoDateToIsoString(isoDate: string) {
  // yyyy-mm-dd -> ISO datetime (UTC noon) para evitar shift de fuso (ex.: 01/01 virar 31/12 21:00)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate))) return null;
  return `${isoDate}T12:00:00.000Z`;
}

function TitleRow(props: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div>
        <div className="h1">{props.title}</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {props.subtitle}
        </div>
      </div>
      {props.right}
    </div>
  );
}

function TxForm(props: {
  categories: Category[];
  initial?: Partial<Tx>;
  onCancel: () => void;
  onSubmit: (data: {
    type: "income" | "expense";
    amountCents: number;
    date: string;
    categoryId: string | null;
    description: string | null;
    method: "cash" | "card" | "pix" | "transfer" | "other";
    tag: string | null;
  }) => void;
  submitting?: boolean;
}) {
  const [type, setType] = useState<"income" | "expense">((props.initial?.type as any) || "expense");
  const [amount, setAmount] = useState<string>(() => {
    const cents = props.initial?.amountCents;
    if (typeof cents === "number") return (cents / 100).toFixed(2).replace(".", ",");
    return "";
  });
  const [date, setDate] = useState<string>(() => {
    if (!props.initial?.date) return todayISO();
    const d = new Date(props.initial.date);
    if (Number.isNaN(d.getTime())) return todayISO();
    return dateToISODateUTC(d);
  });
  const [categoryId, setCategoryId] = useState<string>(() => props.initial?.categoryId || "");
  const [description, setDescription] = useState<string>(() => props.initial?.description || "");
  const [method, setMethod] = useState<"cash" | "card" | "pix" | "transfer" | "other">((props.initial?.method as any) || "pix");
  const [tag, setTag] = useState<string>(() => props.initial?.tag || "");
  const [touched, setTouched] = useState(false);

  return (
    <div>
      <div className="grid2">
        <div>
          <div className="label">Valor (R$)</div>
          <input
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            onBlur={() => setTouched(true)}
          />
          {touched && (toCentsFromBRL(amount) ?? 0) <= 0 ? (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Informe um valor maior que zero.
            </div>
          ) : null}
        </div>
        <div>
          <div className="label">Tipo</div>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="income">Entrada</option>
            <option value="expense">Saída</option>
          </select>
        </div>
        <div>
          <div className="label">Categoria</div>
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {props.categories.length === 0 ? (
              <option value="" disabled>
                Nenhuma categoria cadastrada
              </option>
            ) : (
              props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <div className="label">Data</div>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <div className="label">Método</div>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value as any)}>
            {Object.entries(METHOD_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="label">Tag</div>
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Opcional" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="label">Descrição</div>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
        </div>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn" type="button" onClick={props.onCancel}>
          Cancelar
        </button>
        <button
          className="btn btnPrimary"
          type="button"
          disabled={props.submitting}
          onClick={() => {
            const cents = toCentsFromBRL(amount);
            if (cents === null || cents <= 0) {
              setTouched(true);
              return;
            }
            props.onSubmit({
              type,
              amountCents: cents,
              date: isoDateToIsoString(date) || new Date().toISOString(),
              categoryId: categoryId ? categoryId : null,
              description: description.trim() ? description.trim() : null,
              method,
              tag: tag.trim() ? tag.trim() : null
            });
          }}
        >
          {props.submitting ? "Salvando…" : "Salvar"}
        </button>
      </div>
      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Valores e datas são registrados para fins de controle. O Growlify não executa operações financeiras.
      </div>
    </div>
  );
}

export function Lancamentos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Tx[]>([]);

  const [type, setType] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tx | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const fromIso = from ? `${from}T00:00:00.000Z` : undefined;
      // Para incluir o dia final, avança 1 dia (se "to" informado)
      const toIso = to ? `${to}T23:59:59.999Z` : undefined;
      const [cats, txs] = await Promise.all([
        api.categories.list(),
        api.transactions.list({
          ...(type ? { type } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
          ...(fromIso ? { from: fromIso } : {}),
          ...(toIso ? { to: toIso } : {})
        } as any)
      ]);
      setCategories(cats.items || []);
      setItems(txs.items || []);
    } catch (e: any) {
      toast({ title: "Lançamentos", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => load(), 200);
    return () => window.clearTimeout(t);
  }, [type, categoryId, q, from, to]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of items) {
      if (t.type === "income") income += t.amountCents;
      else expense += t.amountCents;
    }
    return { income, expense, result: income - expense };
  }, [items]);

  return (
    <div>
      <TitleRow
        title="Lançamentos"
        subtitle="Entradas e saídas com filtros e edição."
        right={
          <button
            className="btn btnPrimary"
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Novo lançamento
          </button>
        }
      />

      <div className="grid4">
        <div className="card">
          <div className="label">Entradas (lista atual)</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{formatBRL(totals.income)}</div>
        </div>
        <div className="card">
          <div className="label">Saídas (lista atual)</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{formatBRL(totals.expense)}</div>
        </div>
        <div className="card">
          <div className="label">Resultado (lista atual)</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{formatBRL(totals.result)}</div>
        </div>
        <div className="card">
          <div className="label">Quantidade</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 6 }}>{items.length}</div>
        </div>
      </div>

      <div className="cardElev" style={{ marginTop: 12 }}>
        <div className="grid2">
          <div>
            <div className="label">Buscar por descrição ou tag</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: mercado, aluguel, cliente…" />
          </div>
          <div className="grid2">
            <div>
              <div className="label">Tipo</div>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todos</option>
                <option value="income">Entrada</option>
                <option value="expense">Saída</option>
              </select>
            </div>
            <div>
              <div className="label">Categoria</div>
              <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <div className="label">De</div>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div className="label">Até</div>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="muted" style={{ fontSize: 12 }}>
            {from || to ? "Filtros de período aplicados." : "Dica: use o período para comparar meses e semanas."}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" type="button" onClick={() => { setFrom(monthStartISO()); setTo(todayISO()); }}>
              Mês atual
            </button>
            <button className="btn" type="button" onClick={() => { setFrom(""); setTo(""); setType(""); setCategoryId(""); setQ(""); }}>
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="h2">Histórico</div>
        <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          Você pode editar e excluir lançamentos. Exclusões são permanentes no seu histórico.
        </div>

        {loading ? (
          <div className="muted" style={{ marginTop: 12 }}>
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            Nenhuma operação registrada.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {items.map((t) => (
              <div key={t.id} className="cardElev" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {t.type === "income" ? "Entrada" : "Saída"} • {formatBRL(t.amountCents)}
                    </div>
                    <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {t.category?.name || "Sem categoria"} • {METHOD_LABEL[t.method] || "Outro"} •{" "}
                      {new Date(t.date).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit"
                      })}
                    </div>
                    {t.description ? <div className="text2" style={{ marginTop: 8 }}>{t.description}</div> : null}
                    {t.tag ? <div style={{ marginTop: 8 }} className="badge">{t.tag}</div> : null}
                  </div>
                  <div className="row">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </button>
                    <button className="btn btnDanger" type="button" onClick={() => setConfirmDelete(t)}>
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen ? (
        <Dialog
          title={editing ? "Editar lançamento" : "Novo lançamento"}
          description="Registro manual para fins de organização. Não executa operações financeiras."
          onClose={() => {
            if (submitting) return;
            setFormOpen(false);
          }}
          footer={null}
        >
          <TxForm
            categories={categories}
            initial={editing || undefined}
            submitting={submitting}
            onCancel={() => setFormOpen(false)}
            onSubmit={async (data) => {
              try {
                setSubmitting(true);
                if (editing) {
                  await api.transactions.update(editing.id, data);
                  toast({ title: "Lançamentos", description: "Lançamento atualizado com sucesso." });
                } else {
                  await api.transactions.create(data);
                  toast({ title: "Lançamentos", description: "Lançamento criado com sucesso." });
                }
                setFormOpen(false);
                setEditing(null);
                await load();
              } catch (e: any) {
                toast({ title: "Lançamentos", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </Dialog>
      ) : null}

      {confirmDelete ? (
        <Modal
          title="Excluir lançamento?"
          description="Este lançamento será removido permanentemente do seu controle financeiro."
          cancelText="Cancelar"
          confirmText="Excluir"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await api.transactions.remove(confirmDelete.id);
              setConfirmDelete(null);
              toast({ title: "Lançamentos", description: "Lançamento excluído com sucesso." });
              await load();
            } catch (e: any) {
              toast({ title: "Lançamentos", description: e?.message || "Serviço indisponível no momento. Tente novamente." });
            }
          }}
        />
      ) : null}
    </div>
  );
}
