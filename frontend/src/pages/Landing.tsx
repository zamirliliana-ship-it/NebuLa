import { useState } from "react";
import { Link } from "react-router-dom";

import Logo from "../components/Logo";
import CalmLandscape from "../components/CalmLandscape";

const principles = [
  {
    number: "01",
    title: "Tú tienes el control",
    description: "Elige quién te acompaña.",
    icon: "🧭",
  },
  {
    number: "02",
    title: "Permisos claros",
    description: "Elige qué compartir. Puedes cambiarlo.",
    icon: "🤝",
  },
  {
    number: "03",
    title: "Privacidad primero",
    description: "Comparte solo lo que autorices.",
    icon: "🔒",
  },
];

const steps = [
  ["Crea tu espacio", "Regístrate con tu correo y verifica que eres tú."],
  ["Conecta con confianza", "Invita a las personas que quieres tener cerca."],
  ["Decide qué compartir", "Administra los permisos y mantén el control."],
];

export default function Landing({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site landing-page">
      <header className="topbar">
        <Link
          to="/"
          aria-label="Nébula, inicio"
          onClick={closeMenu}
        >
          <Logo />
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <nav
          id="main-navigation"
          className={`topnav ${menuOpen ? "is-open" : ""}`}
          aria-label="Navegación principal"
        >
          <a href="#como-funciona" onClick={closeMenu}>
            Cómo funciona
          </a>
          <a href="#principios" onClick={closeMenu}>
            Nuestra esencia
          </a>
          <a href="#preguntas" onClick={closeMenu}>
            Preguntas
          </a>

          {signedIn ? (
            <Link
              to="/app"
              className="btn btn-primary btn-sm"
              onClick={closeMenu}
            >
              Ir a mi espacio <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="nav-login"
                onClick={closeMenu}
              >
                Iniciar sesión
              </Link>

              <Link
                to="/register"
                className="btn btn-primary btn-sm"
                onClick={closeMenu}
              >
                Crear mi cuenta <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Un espacio para crecer acompañado
            </div>

            <h1>
              Tu mundo.
              <br />
              <em>Tus decisiones.</em>
              <br />
              Tu red de apoyo.
            </h1>

            <p className="lead">
              Un espacio para ti y tu red de apoyo.
            </p>

            <div className="cta-row">
              <Link
                to={signedIn ? "/app" : "/register"}
                className="btn btn-primary btn-large"
              >
                {signedIn
                  ? "Entrar a mi espacio"
                  : "Comenzar en Nébula"}
                <span aria-hidden="true">↗</span>
              </Link>

              <a
                href="#como-funciona"
                className="btn btn-ghost btn-large"
              >
                Descubrir cómo funciona
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className="hero-note">
              <span className="note-mark">✳</span>
              <span>
                Tu privacidad no es negociable.{" "}
                <strong>Tú decides qué compartir.</strong>
              </span>
            </div>
          </div>

          <div className="landscape-stage">
            <CalmLandscape />
            <p className="landscape-caption">
              Tu espacio. Tu ritmo. Tus decisiones.
            </p>
          </div>
        </section>

        <section
          className="trust-strip"
          aria-label="Principios de Nébula"
        >
          <div>
            <span
              className="trust-icon visual-symbol"
              aria-hidden="true"
            >
              🧭
            </span>
            <span>Consentimiento primero</span>
          </div>

          <div>
            <span
              className="trust-icon visual-symbol"
              aria-hidden="true"
            >
              🤝
            </span>
            <span>Conexiones responsables</span>
          </div>

          <div>
            <span
              className="trust-icon visual-symbol"
              aria-hidden="true"
            >
              🔒
            </span>
            <span>Privacidad por diseño</span>
          </div>
        </section>

        <section
          className="section principles-section"
          id="principios"
        >
          <div className="section-heading">
            <span className="section-kicker">
              La esencia de Nébula
            </span>
            <h2>
              Acompañar también es <em>respetar.</em>
            </h2>
            <p>Tus decisiones cuentan.</p>
          </div>

          <div className="principle-grid">
            {principles.map((item) => (
              <article
                className="principle-card"
                key={item.number}
              >
                <div className="principle-top">
                  <span>{item.number}</span>
                  <span
                    className="principle-icon visual-symbol"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                </div>

                <h3>{item.title}</h3>
                <p>{item.description}</p>

                <span className="card-decoration" aria-hidden="true">
                  ✳
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="como-funciona">
          <div className="how-inner">
            <div className="how-copy">
              <span className="section-kicker">
                Simple, desde el primer paso
              </span>
              <h2>
                Una red que crece <em>a tu ritmo.</em>
              </h2>
              <p>Tres pasos. A tu ritmo.</p>

              <Link
                to={signedIn ? "/app" : "/register"}
                className="text-link"
              >
                {signedIn
                  ? "Volver a mi espacio"
                  : "Crear mi espacio"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="steps-list">
              {steps.map(([title, description], index) => (
                <article className="step-item" key={title}>
                  <div className="step-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>

                  <span className="step-arrow" aria-hidden="true">
                    ↗
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-cta">
          <div className="closing-spark">✳</div>
          <span className="section-kicker">
            Tu espacio te espera
          </span>

          <h2>
            Crecer acompañado.
            <br />
            <em>Sin dejar de ser tú.</em>
          </h2>

          <p>
            Construye una red de confianza en la que tus decisiones
            siempre cuentan.
          </p>

          <Link
            to={signedIn ? "/app" : "/register"}
            className="btn btn-light btn-large"
          >
            {signedIn ? "Ir a mi espacio" : "Conocer Nébula"}
            <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="faq-section" id="preguntas">
          <div className="faq-heading">
            <span className="section-kicker">
              Antes de comenzar
            </span>
            <h2>
              Preguntas <em>frecuentes.</em>
            </h2>
          </div>

          <div className="faq-list">
            <details>
              <summary>
                ¿Quién puede formar parte de Nébula?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Jóvenes, sus tutores o familiares y docentes
                autorizados. Cada perfil tiene un espacio y unas
                funciones según su rol.
              </p>
            </details>

            <details>
              <summary>
                ¿Un tutor o docente puede ver toda mi información?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                No. El acceso depende de los permisos y
                autorizaciones correspondientes. Nébula está
                diseñado para que el joven conserve el control
                de lo que comparte.
              </p>
            </details>

            <details>
              <summary>
                ¿Puedo cambiar o retirar una autorización?
                <span aria-hidden="true">+</span>
              </summary>
              <p>
                Sí. Las conexiones y permisos deben ser claros y
                gestionables; puedes revisar y retirar
                autorizaciones según las reglas de cada vínculo.
              </p>
            </details>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <Link to="/" aria-label="Nébula, inicio">
          <Logo />
        </Link>
        <span>Un espacio para acompañar con confianza.</span>
        <span>© {new Date().getFullYear()} Nébula</span>
      </footer>
    </div>
  );
}