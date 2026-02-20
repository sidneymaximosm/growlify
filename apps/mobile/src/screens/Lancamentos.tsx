import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { formatBRL, formatDateTime, toCentsFromBRL } from "../lib/format";
import { useAuth } from "../state/auth";
import { Button, Card, Field } from "../ui/primitives";
import { colors } from "../theme";

type Category = { id: string; name: string };
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
  return d.toISOString().slice(0, 10);
}

export function LancamentosScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Tx[]>([]);

  const [filterType, setFilterType] = useState<"" | "income" | "expense">("");
  const [q, setQ] = useState<string>("");
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [categoryId, setCategoryId] = useState<string>("");
  const [method, setMethod] = useState<"cash" | "card" | "pix" | "transfer" | "other">("pix");
  const [description, setDescription] = useState<string>("");
  const [tag, setTag] = useState<string>("");

  async function load() {
    try {
      if (!token) return;
      setLoading(true);
      const [cats, txs] = await Promise.all([
        api.categories.list(token),
        api.transactions.list(token, { ...(filterType ? { type: filterType } : {}), ...(q.trim() ? { q: q.trim() } : {}) })
      ]);
      setCategories(cats.items || []);
      setItems(txs.items || []);
    } catch (e: any) {
      Alert.alert("Lançamentos", e?.message || "Serviço indisponível no momento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [filterType, q]);

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
    <SafeAreaView style={styles.bg}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.h1}>Lançamentos</Text>
            <Text style={styles.subtitle}>Entradas e saídas com histórico.</Text>
          </View>
          <Button label="+ Novo" variant="primary" onPress={() => setOpen(true)} />
        </View>

        <Card title="Resumo da lista atual">
          <Text style={styles.muted}>Entradas: {formatBRL(totals.income)} • Saídas: {formatBRL(totals.expense)} • Resultado: {formatBRL(totals.result)}</Text>
        </Card>

        <Card title="Filtros">
          <View style={{ gap: 10 }}>
            <Text style={styles.label}>Tipo</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button label="Todos" variant={filterType === "" ? "primary" : "default"} onPress={() => setFilterType("")} />
              <Button label="Entradas" variant={filterType === "income" ? "primary" : "default"} onPress={() => setFilterType("income")} />
              <Button label="Saídas" variant={filterType === "expense" ? "primary" : "default"} onPress={() => setFilterType("expense")} />
            </View>
            <Field label="Busca (descrição ou tag)" value={q} onChangeText={setQ} placeholder="Ex.: mercado, aluguel, cliente" />
          </View>
          <Text style={styles.note}>Filtros ajudam a organizar a leitura do histórico.</Text>
        </Card>

        <Card title="Histórico">
          {loading ? (
            <Text style={styles.muted}>Carregando…</Text>
          ) : items.length === 0 ? (
            <Text style={styles.muted}>Nenhuma operação registrada.</Text>
          ) : (
            <View style={{ gap: 10, marginTop: 8 }}>
              {items.map((t) => (
                <View key={t.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>
                    {t.type === "income" ? "Entrada" : "Saída"} • {formatBRL(t.amountCents)}
                  </Text>
                  <Text style={styles.rowSub}>
                    {(t.category?.name || "Sem categoria")} • {METHOD_LABEL[t.method] || "Outro"} • {formatDateTime(t.date)}
                  </Text>
                  {t.description ? <Text style={styles.rowDesc}>{t.description}</Text> : null}
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                    <Button
                      label="Excluir"
                      variant="danger"
                      onPress={() => {
                        Alert.alert(
                          "Excluir lançamento?",
                          "Este lançamento será removido permanentemente do seu controle financeiro.",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Excluir",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  if (!token) return;
                                  await api.transactions.remove(token, t.id);
                                  Alert.alert("Lançamentos", "Lançamento excluído com sucesso.");
                                  load();
                                } catch (e: any) {
                                  Alert.alert("Lançamentos", e?.message || "Serviço indisponível no momento. Tente novamente.");
                                }
                              }
                            }
                          ]
                        );
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Novo lançamento</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              <Field label="Valor (R$)" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
              <Text style={styles.label}>Tipo</Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button label="Entrada" variant={type === "income" ? "primary" : "default"} onPress={() => setType("income")} />
                <Button label="Saída" variant={type === "expense" ? "primary" : "default"} onPress={() => setType("expense")} />
              </View>

              <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-01-31" />

              <Text style={styles.label}>Categoria (opcional)</Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button label="Sem categoria" variant={!categoryId ? "primary" : "default"} onPress={() => setCategoryId("")} />
                {categories.slice(0, 6).map((c) => (
                  <Button key={c.id} label={c.name} variant={categoryId === c.id ? "primary" : "default"} onPress={() => setCategoryId(c.id)} />
                ))}
              </View>

              <Text style={styles.label}>Método</Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button label="Dinheiro" variant={method === "cash" ? "primary" : "default"} onPress={() => setMethod("cash")} />
                <Button label="Cartão" variant={method === "card" ? "primary" : "default"} onPress={() => setMethod("card")} />
                <Button label="Pix" variant={method === "pix" ? "primary" : "default"} onPress={() => setMethod("pix")} />
                <Button label="Transferência" variant={method === "transfer" ? "primary" : "default"} onPress={() => setMethod("transfer")} />
                <Button label="Outro" variant={method === "other" ? "primary" : "default"} onPress={() => setMethod("other")} />
              </View>

              <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} placeholder="Opcional" />
              <Field label="Tag (opcional)" value={tag} onChangeText={setTag} placeholder="Opcional" />
            </View>
            <Text style={styles.note}>
              Categorias e orçamentos são configurados no Perfil. Aqui você registra o histórico de lançamentos.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancelar" onPress={() => setOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Salvar"
                  variant="primary"
                  onPress={async () => {
                    try {
                      if (!token) return;
                      const cents = toCentsFromBRL(amount);
                      if (cents === null || cents <= 0) {
                        Alert.alert("Atenção", "Informe um valor maior que zero.");
                        return;
                      }
                      await api.transactions.create(token, {
                        type,
                        amountCents: cents,
                        date: new Date(date).toISOString(),
                        categoryId: categoryId.trim() ? categoryId.trim() : null,
                        description: description.trim() ? description.trim() : null,
                        method,
                        tag: tag.trim() ? tag.trim() : null
                      });
                      setOpen(false);
                      setAmount("");
                      setDescription("");
                      setTag("");
                      await load();
                    } catch (e: any) {
                      Alert.alert("Lançamentos", e?.message || "Serviço indisponível no momento. Tente novamente.");
                    }
                  }}
                />
              </View>
            </View>
            {categories.length > 0 ? (
              <Text style={[styles.muted, { marginTop: 10 }]}>
                Categorias disponíveis: {categories.slice(0, 6).map((c) => c.name).join(", ")}.
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 18, gap: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.text2, marginTop: 4 },
  muted: { color: colors.muted, marginTop: 6 },
  label: { color: colors.muted, fontSize: 12 },
  note: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 16 },
  rowCard: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(15,47,74,0.65)" },
  rowTitle: { color: colors.text, fontWeight: "900" },
  rowSub: { color: colors.muted, marginTop: 6, fontSize: 12 },
  rowDesc: { color: colors.text2, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 18 },
  modalCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "900" }
});
