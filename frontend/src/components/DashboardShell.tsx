import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import type { AccountType } from "../lib/api";
import Logo from "./Logo";
import CalmLandscape from "./CalmLandscape";

type Section = "overview" | "profile" | "network";

type Props = {
  name: string;
  role: AccountType | null;
  section: Section;
  onSection: (section: Section) => void;
  onLogout: () => void;
  children: ReactNode;
};

const copy = {
  autistic_person: {
    label: "Espacio personal",
    title: "Tu espacio, a tu ritmo.",
    text: "Elige qué quieres hacer hoy.",
  },
  parent_guardian: {
    label: "Espacio familiar",
    title: "Acompañar, paso a paso.",
    text: "Consulta los apoyos que te han compartido.",
  },
  teacher: {
    label: "Espacio docente",
    title: "Aprender con apoyo.",
    text: "Consulta apoyos y registra observaciones.",
  },
  admin: {
    label: "Administración",
    title: "Una red que cuida.",
    text: "Revisa la actividad y los permisos.",
  },
};

export default function DashboardShell({
  name,
  role,
  section,
  onSection,
  onLogout,
  children,
}: Props) {
  const [quiet, setQuiet] = useState(false);
  const [symbols, setSymbols] = useState(true);

  const content = copy[role ?? "autistic_person"];

  const links: {
    id: Section;
    label: string;
    icon: string;
  }[] = [
    {
      id: "overview",
      label: role === "autistic_person" ? "Mi bienestar" : "Resumen",
      icon: "🌿",
    },
    {
      id: "profile",
      label: "Mi perfil",
      icon: "👤",
    },
    {
      id: "network",
      label: "Mi red de apoyo",
      icon: "🤝",
    },
  ];

  const shellClass = [
    "dashboard-shell",
    quiet ? "is-quiet" : "",
    symbols ? "" : "without-symbols",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <a className="skip-link" href="#dashboard-content">
        Saltar al contenido
      </a>

      <aside className="dashboard-sidebar">
        <Link
          className="dashboard-brand"
          to="/"
          aria-label="Nébula, inicio"
        >
          <Logo />
        </Link>

        <p className="dashboard-role">{content.label}</p>

        <nav aria-label="Secciones de mi espacio">
          {links
            .filter(
              (link) => role !== "admin" || link.id === "overview"
            )
            .map((link) => (
              <button
                key={link.id}
                type="button"
                aria-current={
                  section === link.id ? "page" : undefined
                }
                onClick={() => onSection(link.id)}
              >
                <span className="visual-symbol" aria-hidden="true">
                  {link.icon}
                </span>
                {link.label}
              </button>
            ))}
        </nav>

        <div className="sidebar-note">
          <span aria-hidden="true">✓</span>
          <strong>A tu ritmo</strong>
          <p>Puedes hacer una pausa.</p>
        </div>

        <button
          className="dashboard-logout"
          type="button"
          onClick={onLogout}
        >
          Cerrar sesión
        </button>
      </aside>

      <main
        className="dashboard-main"
        id="dashboard-content"
        tabIndex={-1}
      >
        <header className="dashboard-topline">
          <p>
            Hola, <strong>{name}</strong>
          </p>

          <div className="view-controls">
            <button
              className="quiet-toggle"
              type="button"
              aria-pressed={quiet}
              onClick={() => setQuiet((value) => !value)}
            >
              Vista sencilla: {quiet ? "activada" : "desactivada"}
            </button>

            <button
              className="quiet-toggle"
              type="button"
              aria-pressed={symbols}
              onClick={() => setSymbols((value) => !value)}
            >
              Emojis: {symbols ? "activados" : "desactivados"}
            </button>
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="profile-kicker">
              {content.label} · Nébula
            </span>

            <h1>{content.title}</h1>
            <p>{content.text}</p>

            <span className="welcome-note">
              Sin prisa. Un paso a la vez.
            </span>
          </div>

          <CalmLandscape />
        </section>

        <div className="dashboard-content" key={role}>
          {children}
        </div>
      </main>
    </div>
  );
}