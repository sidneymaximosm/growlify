import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../state/auth";
import { ToastProvider, ToastView } from "../ui/Toast";
import { AppShell } from "./Shell";
import { LoginPage } from "../screens/auth/Login";
import { RegisterPage } from "../screens/auth/Register";
import { ForgotPasswordPage } from "../screens/auth/ForgotPassword";
import { ResetPasswordPage } from "../screens/auth/ResetPassword";
import { TermsPage } from "../screens/legal/Terms";
import { Paywall } from "../screens/paywall/Paywall";
import { Inicio } from "../screens/inicio/Inicio";
import { Lancamentos } from "../screens/lancamentos/Lancamentos";
import { Diagnostico } from "../screens/diagnostico/Diagnostico";
import { Relatorios } from "../screens/relatorios/Relatorios";
import { Perfil } from "../screens/perfil/Perfil";

function Protected({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, hasActiveSubscription } = useAuth();
  const loc = useLocation() as any;

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/entrar" replace state={{ next: loc.pathname }} />;
  if (!hasActiveSubscription) return <Paywall />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/criar-conta" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/" element={<Navigate to="/inicio" replace />} />

          <Route
            path="/"
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route path="inicio" element={<Inicio />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="diagnostico" element={<Diagnostico />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>

          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
        <ToastView />
      </ToastProvider>
    </AuthProvider>
  );
}
