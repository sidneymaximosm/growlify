import React, { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { formatBRL, formatDateTime, toCentsFromBRL } from "../lib/format";
import { useAuth } from "../state/auth";
import { Button, Card, Field } from "../ui/primitives";
import { colors } from "../theme";

type Tx = any;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function DiagnosticoScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tx90, setTx90] = useState<Tx[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [calcLimitMonth, setCalcLimitMonth] = useState("");
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [saved, setSaved] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (!token) return;
        setLoading(true);
        const now = new Date();
        const from90 = new Date(now.getTime() - 89 * 86400_000).toISOString();
        const [txs, categories] = await Promise.all([
          api.transactions.list(token, { from: from90 }),
          api.categories.list(token)
        ]);
        setTx90(txs.items || []);
        setCats(categories.items || []);
        // "Cálculos salvos" carregam separadamente para não quebrar o Diagnóstico.
      } catch (e: any) {
        Alert.alert("Diagnóstico", e?.message || "Serviço indisponível no momento. Tente novamente.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        if (!token) return;
        const goals = await api.calculator.saved(token);
        setSaved(goals.items || []);
      } catch {
        setSaved([]);
      }
    })();
  }, [token]);

  const monthTx = useMemo(() => {
    const now = new Date();
    const from = startOfMonth(now);
    return tx90.filter((t) => new Date(t.date) >= from);
  }, [tx90]);

  const calc = useMemo(() => {
    const limit = toCentsFromBRL(calcLimitMonth);
    if (limit === null || limit <= 0) return null;
    const now = new Date();
    const asOfDate = now.toISOString().slice(0, 10);
    const startDay = new Date(`${asOfDate}T00:00:00.000Z`);
    const end = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const daysLeft = Math.max(1, Math.floor((end.getTime() - startDay.getTime()) / 86400_000) + 1);
    const spent = monthTx.filter((t) => t.type === "expense").reduce((a, b) => a + b.amountCents, 0);
    const remaining = Math.max(0, limit - spent);
    const perDay = Math.floor(remaining / daysLeft);
    return { limit, spent, remaining, daysLeft, perDay, asOfDate };
  }, [calcLimitMonth, monthTx]);

  useEffect(() => {
    setCalcResult(null);
  }, [calcLimitMonth, monthTx]);

  const topCut = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type !== "expense") continue;
      const name = t.category?.name || "Sem categoria";
      map.set(name, (map.get(name) || 0) + t.amountCents);
    }
    return Array.from(map.entries())
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 5);
  }, [monthTx]);

  const drip = useMemo(() => {
    const small = monthTx.filter((t) => t.type === "expense" && t.amountCents > 0 && t.amountCents <= 2000);
    const total = small.reduce((a, b) => a + b.amountCents, 0);
    return { count: small.length, totalCents: total };
  }, [monthTx]);

  const budgetOvers = useMemo(() => {
    const spentMap = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type !== "expense") continue;
      if (!t.categoryId) continue;
      spentMap.set(t.categoryId, (spentMap.get(t.categoryId) || 0) + t.amountCents);
    }
    const overs: Array<{ name: string; overCents: number }> = [];
    for (const c of cats) {
      if (!c.monthlyBudgetCents) continue;
      const spent = spentMap.get(c.id) || 0;
      if (spent > c.monthlyBudgetCents) overs.push({ name: c.name, overCents: spent - c.monthlyBudgetCents });
    }
    return overs.sort((a, b) => b.overCents - a.overCents).slice(0, 4);
  }, [cats, monthTx]);

  const hasAny = tx90.length > 0;

  return (
    <SafeAreaView style={styles.bg}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.h1}>Diagnóstico</Text>
        <Text style={styles.subtitle}>Leitura automática de padrões, recorrências e variações.</Text>

        {loading ? (
          <Card title="Carregando" subtitle="Aguarde…"></Card>
        ) : !hasAny ? (
          <Card title="Sem lançamentos suficientes" subtitle="Você ainda não tem lançamentos. Adicione o primeiro para ver seu diagnóstico." />
        ) : (
          <>
            <Card title="Onde reduzir gastos (Top 5)" subtitle="Categorias com maior volume de saídas no mês.">
              {topCut.length === 0 ? (
                <Text style={styles.muted}>Nada para exibir.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {topCut.map((t) => (
                    <View key={t.name} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.text2}>{t.name}</Text>
                      <Text style={styles.textStrong}>{formatBRL(t.cents)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <Card title="Padrões detectados" subtitle="Sinais estatísticos e comportamentais para contexto.">
              <Text style={styles.text2}>
                Efeito goteira: {drip.count} despesas de pequeno valor no mês somam {formatBRL(drip.totalCents)}.
              </Text>
              {budgetOvers.length > 0 ? (
                <Text style={[styles.text2, { marginTop: 8 }]}>
                  Orçamentos excedidos: {budgetOvers.map((b) => `${b.name} (+${formatBRL(b.overCents)})`).join(" • ")}.
                </Text>
              ) : null}
            </Card>

            <Card
              title="Calculadora inteligente"
              subtitle="Ferramentas rápidas para planejar limites e metas. Resultados são referências de organização."
            >
              <Field
                label="Quanto posso gastar por dia até o fim do mês?"
                value={calcLimitMonth}
                onChangeText={setCalcLimitMonth}
                placeholder="Limite de gastos do mês (R$)"
                keyboardType="decimal-pad"
              />
              <Button
                label="Calcular e salvar"
                variant="primary"
                disabled={!calc || !token}
                onPress={async () => {
                  try {
                    if (!token || !calc) return;
                    const res = await api.calculator.runAndSave(token, {
                      type: "daily_limit_month",
                      title: "Limite diário até o fim do mês",
                      params: { limitCents: calc.limit, spentCents: calc.spent, asOfDate: (calc as any).asOfDate }
                    });
                    setCalcResult(res.result);
                    setSaved(res.items || []);
                    Alert.alert("Calculadora", "Cálculo salvo com sucesso.");
                  } catch (e: any) {
                    Alert.alert("Calculadora", e?.message || "Serviço indisponível no momento. Tente novamente.");
                  }
                }}
              />

              {calc ? (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.text2}>Gasto do mês</Text>
                    <Text style={styles.textStrong}>{formatBRL(calcResult?.spentCents ?? calc.spent)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.text2}>Restante estimado</Text>
                    <Text style={styles.textStrong}>{formatBRL(calcResult?.remainingCents ?? calc.remaining)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.text2}>Referência diária</Text>
                    <Text style={styles.textStrong}>{formatBRL(calcResult?.perDayCents ?? calc.perDay)}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.muted}>Informe um limite mensal para calcular.</Text>
              )}

              <View style={{ marginTop: 10, gap: 8 }}>
                <Text style={[styles.textStrong, { fontSize: 16 }]}>Cálculos salvos</Text>
                {saved.length === 0 ? (
                  <Text style={styles.muted}>Nada para exibir.</Text>
                ) : (
                  saved.map((s: any) => (
                    <View
                      key={s.id || s.paramsHash}
                      style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12 }}
                    >
                      <Text style={styles.textStrong}>{s.title || "Cálculo salvo"}</Text>
                      <Text style={[styles.text2, { marginTop: 6 }]}>
                        {s.type === "daily_limit_month"
                          ? `${formatBRL(s.resultJson?.perDayCents || 0)} por dia (${s.resultJson?.daysLeft || 0} dias)`
                          : "Resultado disponível."}
                      </Text>
                      <Text style={[styles.muted, { marginTop: 6 }]}>Salvo em {formatDateTime(s.updatedAt || s.createdAt)}</Text>
                    </View>
                  ))
                )}
              </View>
            </Card>
          </>
        )}
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
  text2: { color: colors.text2 },
  textStrong: { color: colors.text, fontWeight: "900" }
});
