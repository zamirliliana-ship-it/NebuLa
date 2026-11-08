import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { post } from "../lib/api";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    const res = await post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    nav("/reset-password", { state: { email: email.trim().toLowerCase() } });
  }

  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle="Escribe tu correo y te enviaremos un código."
      footer={<Link to="/login">Volver a iniciar sesión</Link>}
    >
      <form onSubmit={submit}>
        <label className="field"><span>Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Enviando…" : "Enviar código"}</button>
      </form>
    </AuthShell>
  );
}
