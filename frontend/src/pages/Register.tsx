import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { post } from "../lib/api";

export default function Register() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim() || fullName.trim().length < 2) return setError("Escribe tu nombre completo.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    if (password.length < 10) return setError("La contraseña debe tener al menos 10 caracteres.");
    setBusy(true);
    const res = await post("/auth/register", { fullName: fullName.trim(), email: normalizedEmail, password });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    nav("/verify-email", { state: { email: normalizedEmail } });
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Te enviaremos un código para confirmar tu correo."
      footer={<>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></>}
    >
      <form onSubmit={submit}>
        <label className="field"><span>Nombre completo</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required /></label>
        <label className="field"><span>Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="field"><span>Contraseña (mínimo 10 caracteres)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} maxLength={72} required /></label>
        <label className="field"><span>Repite la contraseña</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Enviando código…" : "Crear cuenta"}</button>
      </form>
    </AuthShell>
  );
}
