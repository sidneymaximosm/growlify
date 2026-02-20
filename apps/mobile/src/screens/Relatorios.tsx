import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { formatBRL } from "../lib/format";
import { useAuth } from "../state/auth";
import { Button, Card, Field } from "../ui/primitives";
import { colors } from "../theme";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function RelatoriosScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const n = new Date();
    return isoDay(new Date(n.getFullYear(), n.getMonth(), 1));
  });
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [summary, setSummary] = useState<any | null>(null);

  async function load() {
    try {
      if (!token) return;
      setLoading(true);
      const fromD = new Date(from);
      const toD = new Date(to);
      const data = await api.reports.summary(token, { from: fromD.toISOString(), to: new Date(toD.getTime() + 86400_000).toISOString() });
      setSummary(data);
    } catch (e: any) {
      Alert.alert("Relatórios", e?.message || "Serviço indisponível no momento. Tente novamente.");
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
            <Text style={styles.h1}>Relatórios</Text>
            <Text style={styles.subtitle}>Períodos e comparação do resultado.</Text>
          </View>
          <Button label="Atualizar" onPress={() => load()} />
        </View>

        <Card title="Período">
          <View style={{ gap: 10 }}>
            <Field label="De (AAAA-MM-DD)" value={from} onChangeText={setFrom} placeholder="2026-01-01" />
            <Field label="Até (AAAA-MM-DD)" value={to} onChangeText={setTo} placeholder="2026-01-31" />
          </View>
          <Text style={styles.note}>Use o formato AAAA-MM-DD. No futuro, o seletor de datas ficará integrado ao sistema.</Text>
        </Card>

        <View style={{ gap: 12 }}>
          <Card title="Receitas do período">
            <Text style={styles.value}>{formatBRL(summary?.totals?.income_cents || 0)}</Text>
          </Card>
          <Card title="Despesas do período">
            <Text style={styles.value}>{formatBRL(summary?.totals?.expense_cents || 0)}</Text>
          </Card>
          <Card title="Resultado do período">
            <Text style={styles.value}>{formatBRL(summary?.totals?.result_cents || 0)}</Text>
          </Card>
        </View>

        <Card title="Observações do período" subtitle="Leitura automática para contexto, sem interferir em operações financeiras.">
          {loading ? (
            <Text style={styles.muted}>Carregando…</Text>
          ) : (summary?.insights || []).length === 0 ? (
            <Text style={styles.muted}>Nenhum alerta educacional no momento.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {(summary.insights || []).map((i: any) => (
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
  value: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: 6 },
  muted: { color: colors.muted, marginTop: 8 },
  note: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 16 },
  alert: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 12, backgroundColor: "rgba(15,47,74,0.65)" },
  alertTitle: { color: colors.text, fontWeight: "900" },
  alertMsg: { color: colors.text2, marginTop: 6 }
});

