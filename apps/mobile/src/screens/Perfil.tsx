import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { formatBRL, toCentsFromBRL } from "../lib/format";
import { useAuth } from "../state/auth";
import { Button, Card, Field } from "../ui/primitives";
import { colors } from "../theme";

const KIND_LABEL: Record<string, string> = { domestic: "Doméstico", commercial: "Comercial" };
const PRIORITY_LABEL: Record<string, string> = { essential: "Essencial", important: "Importante", cuttable: "Cortável" };
const SUBSCRIPTION_LABEL: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada"
};

export function PerfilScreen() {
  const { me, token, logout } = useAuth();
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"domestic" | "commercial">("domestic");
  const [priority, setPriority] = useState<"essential" | "important" | "cuttable">("essential");
  const [budget, setBudget] = useState("");

  async function load() {
    try {
      if (!token) return;
      setLoading(true);
      const res = await api.categories.list(token);
      setCats(res.items || []);
    } catch (e: any) {
      Alert.alert("Perfil", e?.message || "Serviço indisponível no momento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  return (
    <SafeAreaView style={styles.bg}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.h1}>Perfil</Text>
            <Text style={styles.subtitle}>Conta, preferências e categorias.</Text>
          </View>
          <Button
            label="Sair"
            onPress={async () => {
              await logout();
            }}
          />
        </View>

        <Card title="Sua conta">
          <Text style={styles.text2}>Nome: {me?.name || "-"}</Text>
          <Text style={[styles.text2, { marginTop: 6 }]}>Email: {me?.email || "-"}</Text>
          <Text style={[styles.text2, { marginTop: 6 }]}>
            Assinatura: {SUBSCRIPTION_LABEL[String(me?.subscription_status || "inactive")] || "Indefinido"}
          </Text>
          <Text style={styles.note}>Plano Growlify — R$ 27,90 / mês. Teste gratuito por 7 dias com cartão obrigatório.</Text>
          <Text style={styles.note}>Cancele antes do fim do teste sem cobranças. Sem fidelidade.</Text>
        </Card>

        <Card title="Criar categoria" subtitle="Categorias ajudam a organizar e priorizar seu controle financeiro.">
          <View style={{ gap: 10 }}>
            <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Alimentação" />
            <Text style={styles.label}>Tipo</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button label="Doméstico" variant={kind === "domestic" ? "primary" : "default"} onPress={() => setKind("domestic")} />
              <Button label="Comercial" variant={kind === "commercial" ? "primary" : "default"} onPress={() => setKind("commercial")} />
            </View>

            <Text style={styles.label}>Prioridade</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button label="Essencial" variant={priority === "essential" ? "primary" : "default"} onPress={() => setPriority("essential")} />
              <Button label="Importante" variant={priority === "important" ? "primary" : "default"} onPress={() => setPriority("important")} />
              <Button label="Cortável" variant={priority === "cuttable" ? "primary" : "default"} onPress={() => setPriority("cuttable")} />
            </View>

            <Field label="Orçamento mensal (R$) (opcional)" value={budget} onChangeText={setBudget} placeholder="0,00" keyboardType="decimal-pad" />
            <Button
              label="Salvar categoria"
              variant="primary"
              onPress={async () => {
                try {
                  if (!token) return;
                  if (name.trim().length < 2) {
                    Alert.alert("Atenção", "Informe um nome para a categoria.");
                    return;
                  }
                  const monthlyBudgetCents = budget.trim() ? toCentsFromBRL(budget) : null;
                  await api.categories.create(token, {
                    name: name.trim(),
                    kind,
                    priority,
                    monthlyBudgetCents: monthlyBudgetCents && monthlyBudgetCents > 0 ? monthlyBudgetCents : null
                  });
                  setName("");
                  setBudget("");
                  await load();
                } catch (e: any) {
                  Alert.alert("Categorias", e?.message || "Serviço indisponível no momento. Tente novamente.");
                }
              }}
            />
          </View>
        </Card>

        <Card title="Categorias cadastradas">
          {loading ? (
            <Text style={styles.muted}>Carregando…</Text>
          ) : cats.length === 0 ? (
            <Text style={styles.muted}>Nenhuma categoria cadastrada.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {cats.map((c) => (
                <View key={c.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowSub}>
                    {KIND_LABEL[String(c.kind)] || "Indefinido"} • {PRIORITY_LABEL[String(c.priority)] || "Indefinido"}
                    {c.monthlyBudgetCents ? ` • Orçamento ${formatBRL(c.monthlyBudgetCents)}` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                    <Button
                      label="Excluir"
                      variant="danger"
                      onPress={() => {
                        Alert.alert(
                          "Excluir categoria?",
                          "Esta ação remove a categoria, mas não apaga lançamentos existentes.",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Excluir",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  if (!token) return;
                                  await api.categories.remove(token, c.id);
                                  load();
                                } catch (e: any) {
                                  Alert.alert("Categorias", e?.message || "Serviço indisponível no momento. Tente novamente.");
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 18, gap: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.text2, marginTop: 4 },
  muted: { color: colors.muted, marginTop: 8 },
  label: { color: colors.muted, fontSize: 12 },
  note: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 16 },
  text2: { color: colors.text2 },
  rowCard: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(15,47,74,0.65)" },
  rowTitle: { color: colors.text, fontWeight: "900" },
  rowSub: { color: colors.muted, marginTop: 6, fontSize: 12 }
});
