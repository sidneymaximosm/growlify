import React, { useState } from "react";
import { Alert, Linking, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../state/auth";
import { Button, Card } from "../ui/primitives";
import { colors } from "../theme";

export function PaywallScreen() {
  const { token, refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <SafeAreaView style={styles.bg}>
      <View style={styles.wrap}>
        <Card title="Assinatura necessária" subtitle="Para usar o Growlify, assine o Plano Growlify por R$ 27,90/mês.">
          <Button
            label={busy ? "Aguarde…" : "Assinar por R$ 27,90/mês"}
            variant="primary"
            disabled={busy}
            onPress={async () => {
              try {
                if (!token) return;
                setBusy(true);
                const { url } = await api.billing.checkoutSession(token);
                await Linking.openURL(url);
              } catch (e: any) {
                Alert.alert("Assinatura", e?.message || "Serviço indisponível no momento. Tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Text style={styles.note}>Teste gratuito por 7 dias. Cartão obrigatório. Cancele antes do fim do teste sem cobranças.</Text>
          <Text style={styles.note}>Cancele quando quiser. Sem fidelidade.</Text>

          <Button
            label="Verificar status da assinatura"
            onPress={async () => {
              try {
                setBusy(true);
                await refresh();
              } catch (e: any) {
                Alert.alert("Assinatura", e?.message || "Serviço indisponível no momento. Tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          />

          <Button
            label="Gerenciar assinatura"
            onPress={async () => {
              try {
                if (!token) return;
                setBusy(true);
                const { url } = await api.billing.portalSession(token);
                await Linking.openURL(url);
              } catch (e: any) {
                Alert.alert("Assinatura", e?.message || "Serviço indisponível no momento. Tente novamente.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 18 },
  note: { color: colors.muted, fontSize: 12, marginTop: 10 }
});
