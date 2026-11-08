
import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import type { Session } from "./lib/api";

import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ChooseAccountType from "./pages/ChooseAccountType";

export default function App() {
  // La sesión permanece en memoria.
  // No se guarda el access token en localStorage.
  const [session, setSession] = useState<Session | null>(null);

  function handleLogin(newSession: Session) {
    setSession(newSession);
  }

  function handleLogout() {
    setSession(null);
  }

  function handleAccountTypeComplete(updatedSession: Session) {
    setSession(updatedSession);
  }

  const isAuthenticated = session !== null;
  const hasAccountType = Boolean(session?.user.accountType);

  return (
    <Routes>
      {/* Página pública */}
      <Route
        path="/"
        element={<Landing signedIn={isAuthenticated} />}
      />

      {/* Inicio de sesión */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate
              to={hasAccountType ? "/app" : "/choose-account"}
              replace
            />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      {/* Registro */}
      <Route
        path="/register"
        element={<Register />}
      />

      {/* Verificación de correo */}
      <Route
        path="/verify-email"
        element={<VerifyEmail />}
      />

      {/* Recuperación de contraseña */}
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* Restablecimiento de contraseña */}
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Selección del tipo de cuenta */}
      <Route
        path="/choose-account"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : hasAccountType ? (
            <Navigate to="/app" replace />
          ) : (
            <ChooseAccountType
              session={session}
              onComplete={handleAccountTypeComplete}
            />
          )
        }
      />

      {/* Área privada */}
      <Route
        path="/app"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : !hasAccountType ? (
            <Navigate to="/choose-account" replace />
          ) : (
            <Home
              session={session}
              onLogout={handleLogout}
            />
          )
        }
      />

      {/* Ruta no encontrada */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
