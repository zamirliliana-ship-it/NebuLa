import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import OtpField from "../components/OtpField";
import { post } from "../lib/api";

export default function VerifyEmail() {
  const nav = useNavigate();
  const initial = (useLocation().state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(initial);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setInfo(""); setBusy(true);
    const res = await post("/auth/verify-email", { email, code });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    nav("/login", { state: { notice: "Correo verificado. Ya puedes iniciar sesión." } });
  }

  async function resend() {
    setError(""); setInfo("");
    const res = await post("/auth/resend-verification", { email });
    if (!res.ok) return setError(res.message);
    setInfo("Si el correo es válido, enviamos un código nuevo.");
    setCooldown(60);
  }

  return (
    <AuthShell
      title="Verifica tu correo"
      subtitle="Escribe el código que enviamos a tu bandeja de entrada. Vence en 10 minutos."
      footer={<Link to="/login">Volver a iniciar sesión</Link>}
    >
      <form onSubmit={submit}>
        {!initial && (
          <label className="field"><span>Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        )}
        <OtpField value={code} onChange={setCode} />
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="ok" role="status">{info}</p>}
        <button disabled={busy || code.length !== 6}>{busy ? "Verificando…" : "Verificar correo"}</button>
        <button type="button" className="link" onClick={resend} disabled={cooldown > 0 || !email}>
          {cooldown > 0 ? `Reenviar código en ${cooldown} s` : "Reenviar código"}
        </button>
      </form>
    </AuthShell>
  );
}
