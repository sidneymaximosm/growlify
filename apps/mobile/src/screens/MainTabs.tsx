import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { InicioScreen } from "./Inicio";
import { LancamentosScreen } from "./Lancamentos";
import { DiagnosticoScreen } from "./Diagnostico";
import { RelatoriosScreen } from "./Relatorios";
import { PerfilScreen } from "./Perfil";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted
      }}
    >
      <Tab.Screen name="Início" component={InicioScreen} />
      <Tab.Screen name="Lançamentos" component={LancamentosScreen} />
      <Tab.Screen name="Diagnóstico" component={DiagnosticoScreen} />
      <Tab.Screen name="Relatórios" component={RelatoriosScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}

