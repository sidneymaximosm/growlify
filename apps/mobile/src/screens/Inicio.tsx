import React, { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { formatBRL } from "../lib/format";
import { useAuth } from "../state/auth";
import { Button, Card } from "../ui/primitives";
import { colors } from "../theme";

type Tx = any;

export function InicioScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<any | null>(null);
  const [all, setAll] = useState<Tx[]>([]);

  async function load() {
    try {
      if (!token) return;
      setLoading(true);
      const now = new Date();
      const fromMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const [summary, allTx] = await Promise.all([
        api.reports.summary(token, { from: fromMonth, to: now.toISOString() }),
        api.transactions.list(token, {})
      ]);
      setMonth(summary);
      setAll(allTx.items || []);
    } catch (e: any) {
      Alert.alert("Início", e?.message || "Serviço indisponível no momento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const saldoAtualCents = useMemo(() => {
    let sum = 0;
    for (const t of all) sum += t.type === "income" ? t.amountCents : -t.amountCents;
    return sum;
  }, [all]);

  const hasAny = all.length > 0;

  return (
    <SafeAreaView style={styles.bg}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.h1}>Início</Text>
            <Text style={styles.subtitle}>Visão geral do seu controle financeiro.</Text>
          </View>
          <Button label="Atualizar" onPress={() => load()} />
        </View>

        {!hasAny && !loading ? (
          <Card title="Comece pelo primeiro lançamento" subtitle="Você ainda não tem lançamentos. Adicione o primeiro para ver seu diagnóstico." />
        ) : null}

        <View style={styles.grid}>
          <Card title="Saldo atual" subtitle="Soma histórica de entradas e saídas.">
            <Text style={styles.value}>{formatBRL(saldoAtualCents)}</Text>
          </Card>
          <Card title="Receitas do mês">
            <Text style={styles.value}>{formatBRL(month?.totals?.income_cents || 0)}</Text>
          </Card>
          <Card title="Despesas do mês">
            <Text style={styles.value}>{formatBRL(month?.totals?.expense_cents || 0)}</Text>
          </Card>
          <Card title="Resultado do mês">
            <Text style={styles.value}>{formatBRL(month?.totals?.result_cents || 0)}</Text>
          </Card>
        </View>

        <Card title="Alertas inteligentes" subtitle="Mensagens automáticas para contextualizar variações.">
          {loading ? (
            <Text style={styles.muted}>Carregando…</Text>
          ) : (month?.insights || []).length === 0 ? (
            <Text style={styles.muted}>Nenhum alerta educacional no momento.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {(month.insights || []).map((i: any) => (
                <View key={i.id} style={styles.alert}>
                  <Text style={styles.alertTitle}>{i.title}</Text>
                  <Text style={styles.alertMsg}>{i.message}</Text>
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
  grid: { gap: 12 },
  value: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 6 },
  muted: { color: colors.muted, marginTop: 8 },
  alert: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(15,47,74,0.65)" },
  alertTitle: { color: colors.text, fontWeight: "900" },
  alertMsg: { color: colors.text2, marginTop: 6 }
});

