import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import OtpField from "../components/OtpField";
import { post } from "../lib/api";

export default function ResetPassword() {
  const nav = useNavigate();
  const initial = (useLocation().state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(initial);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    const res = await post("/auth/reset-password", { email, code, newPassword: password });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    nav("/login", { state: { notice: "Contraseña actualizada. Inicia sesión con la nueva." } });
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Escribe el código que te enviamos y elige una contraseña nueva."
      footer={<Link to="/forgot-password">Pedir otro código</Link>}
    >
      <form onSubmit={submit}>
        {!initial && (
          <label className="field"><span>Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        )}
        <OtpField value={code} onChange={setCode} />
        <label className="field"><span>Contraseña nueva (mínimo 10 caracteres)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={10} maxLength={72} required /></label>
        <label className="field"><span>Repite la contraseña</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy || code.length !== 6}>{busy ? "Guardando…" : "Cambiar contraseña"}</button>
      </form>
    </AuthShell>
  );
}
