import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "../theme";

export function Card(props: { title?: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {props.title ? <Text style={styles.h2}>{props.title}</Text> : null}
      {props.subtitle ? <Text style={styles.muted}>{props.subtitle}</Text> : null}
      {props.children}
    </View>
  );
}

export function Button(props: { label: string; onPress: () => void; variant?: "primary" | "default" | "danger"; disabled?: boolean }) {
  const variant = props.variant || "default";
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" ? styles.btnPrimary : null,
        variant === "danger" ? styles.btnDanger : null,
        props.disabled ? styles.btnDisabled : null,
        pressed && !props.disabled ? { opacity: 0.9, transform: [{ translateY: 1 }] } : null
      ]}
    >
      <Text style={[styles.btnText, variant === "primary" ? styles.btnTextPrimary : null]}>{props.label}</Text>
    </Pressable>
  );
}

export function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: any }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10
  },
  h2: { color: colors.text, fontSize: 20, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 13, marginTop: 4 },
  label: { color: colors.muted, fontSize: 12 },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: "rgba(10,37,64,0.35)"
  },
  btn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(19,58,90,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  btnPrimary: {
    borderColor: "rgba(34,197,94,0.35)",
    backgroundColor: colors.primary
  },
  btnDanger: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.14)"
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.text, fontWeight: "700" },
  btnTextPrimary: { color: "#071A2B" }
});

