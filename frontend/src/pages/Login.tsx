import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";
import { post, type Session } from "../lib/api";

export default function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const nav = useNavigate();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    const res = await post<Session>("/auth/login", { email: normalizedEmail, password });
    setBusy(false);
    if (res.ok) { onLogin(res.data); return nav(res.data.user.accountType ? "/app" : "/choose-account", { replace: true }); }
    if (res.code === "EMAIL_NOT_VERIFIED") {
      const resend = await post("/auth/resend-verification", { email: normalizedEmail });
      if (!resend.ok && resend.code !== "OTP_COOLDOWN") return setError(resend.message);
      return nav("/verify-email", { state: { email: normalizedEmail } });
    }
    setError(res.message);
  }

  return (
    <AuthShell
      title="Inicia sesión"
      subtitle="Entra con tu correo y tu contraseña."
      footer={<>¿Sin cuenta? <Link to="/register">Crea una</Link></>}
    >
      {notice && <p className="ok" role="status">{notice}</p>}
      <form onSubmit={submit}>
        <label className="field"><span>Correo</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" maxLength={72} />
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        <Link className="link" to="/forgot-password">Olvidé mi contraseña</Link>
      </form>
    </AuthShell>
  );
}
