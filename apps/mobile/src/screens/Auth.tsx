import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../state/auth";
import { Button, Card, Field } from "../ui/primitives";
import { colors } from "../theme";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    if (!isValidEmail(email)) return false;
    if (password.trim().length < 6) return false;
    if (tab === "criar" && name.trim().length < 2) return false;
    return true;
  }, [tab, name, email, password]);

  return (
    <SafeAreaView style={styles.bg}>
      <View style={styles.wrap}>
        <Text style={styles.h1}>Growlify</Text>
        <Text style={styles.subtitle}>Seu Administrador Financeiro Inteligente</Text>

        <View style={styles.tabs}>
          <Button label="Entrar" variant={tab === "entrar" ? "primary" : "default"} onPress={() => setTab("entrar")} />
          <Button label="Criar conta" variant={tab === "criar" ? "primary" : "default"} onPress={() => setTab("criar")} />
        </View>

        <Card
          title={tab === "entrar" ? "Entrar" : "Criar conta"}
          subtitle="Acesse seu controle financeiro. Sem integrações bancárias e sem processamento de pagamentos."
        >
          {tab === "criar" ? (
            <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          ) : null}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="seuemail@exemplo.com" keyboardType="email-address" />
          <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />

          <Button
            label={busy ? "Aguarde…" : tab === "entrar" ? "Entrar" : "Criar conta"}
            variant="primary"
            disabled={!canSubmit || busy}
            onPress={async () => {
              try {
                setBusy(true);
                if (!isValidEmail(email)) {
                  Alert.alert("Atenção", "Informe um email válido.");
                  return;
                }
                if (password.trim().length < 6) {
                  Alert.alert("Atenção", "A senha deve ter no mínimo 6 caracteres.");
                  return;
                }
                if (tab === "criar") {
                  if (name.trim().length < 2) {
                    Alert.alert("Atenção", "Informe seu nome.");
                    return;
                  }
                  await register(name.trim(), email.trim(), password);
                } else {
                  await login(email.trim(), password);
                }
              } catch (e: any) {
                Alert.alert("Autenticação", e?.message || "Serviço indisponível no momento. Tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          />

          <Text style={styles.note}>
            O Growlify é uma ferramenta de organização e diagnóstico. Ele não é banco, não conecta contas e não processa pagamentos.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 18, gap: 12 },
  h1: { color: colors.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.text2, marginTop: -6 },
  tabs: { flexDirection: "row", gap: 10, marginTop: 8 },
  note: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 16 }
});

