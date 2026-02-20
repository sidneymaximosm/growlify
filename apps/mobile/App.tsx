import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/state/auth";
import { AuthScreen } from "./src/screens/Auth";
import { PaywallScreen } from "./src/screens/Paywall";
import { MainTabs } from "./src/screens/MainTabs";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { loading, isAuthenticated, hasActiveSubscription } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <AuthScreen />;
  if (!hasActiveSubscription) return <PaywallScreen />;
  return <MainTabs />;
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary
  }
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Root" component={RootNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

