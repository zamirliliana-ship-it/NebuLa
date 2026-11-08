import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Constellation from "./Constellation";
import Logo from "./Logo";

interface Props { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Link to="/" aria-label="Nébula, ir al inicio"><Logo /></Link>
        <Constellation />
        <p className="auth-claim">Tú decides quién te acompaña.</p>
      </aside>
      <main className="auth-main">
        <section className="card">
          <Link to="/" className="card-brand" aria-label="Nébula, ir al inicio"><Logo /></Link>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          {footer && <div className="footer">{footer}</div>}
        </section>
        <Link to="/" className="back">Volver al inicio</Link>
      </main>
    </div>
  );
}
