import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

const principles = [
  {
    number: "01",
    title: "Tú tienes el control",
    description: "Decides quién puede acompañarte y qué información puede consultar.",
    icon: "◉",
  },
  {
    number: "02",
    title: "Permisos claros",
    description: "Las autorizaciones tienen un propósito definido y puedes retirarlas.",
    icon: "⌁",
  },
  {
    number: "03",
    title: "Privacidad primero",
    description: "Tus datos personales no son una ventana abierta: tú eliges qué compartir.",
    icon: "✳",
  },
];

const steps = [
  ["Crea tu espacio", "Regístrate con tu correo y verifica que eres tú."],
  ["Conecta con confianza", "Invita a las personas que quieres tener cerca."],
  ["Decide qué compartir", "Administra los permisos y mantén el control."],
];

export default function Landing({ signedIn }: { signedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site landing-page">
      <header className="topbar">
        <Link to="/" aria-label="Nébula, inicio" onClick={closeMenu}>
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

        <nav id="main-navigation" className={`topnav ${menuOpen ? "is-open" : ""}`} aria-label="Navegación principal">
          <a href="#como-funciona" onClick={closeMenu}>Cómo funciona</a>
          <a href="#principios" onClick={closeMenu}>Nuestra esencia</a>
          <a href="#preguntas" onClick={closeMenu}>Preguntas</a>
          {signedIn ? (
            <Link to="/app" className="btn btn-primary btn-sm" onClick={closeMenu}>Ir a mi espacio <span aria-hidden="true">↗</span></Link>
          ) : (
            <>
              <Link to="/login" className="nav-login" onClick={closeMenu}>Iniciar sesión</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>Crear mi cuenta <span aria-hidden="true">↗</span></Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Un espacio para crecer acompañado</div>
            <h1>Tu mundo.<br /><em>Tus decisiones.</em><br />Tu red de apoyo.</h1>
            <p className="lead">
              Nébula conecta a jóvenes con las personas que los acompañan.
              Con confianza, respeto y el control siempre en tus manos.
            </p>
            <div className="cta-row">
              <Link to={signedIn ? "/app" : "/register"} className="btn btn-primary btn-large">
                {signedIn ? "Entrar a mi espacio" : "Comenzar en Nébula"} <span aria-hidden="true">↗</span>
              </Link>
              <a href="#como-funciona" className="btn btn-ghost btn-large">
                Descubrir cómo funciona <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="hero-note">
              <span className="note-mark">✳</span>
              <span>Tu privacidad no es negociable. <strong>Tú decides qué compartir.</strong></span>
            </div>
          </div>

          <div className="hero-art octopus-stage" aria-label="Pulpo minimalista, símbolo de Nébula">
            <div className="octopus-halo" aria-hidden="true" />
            <div className="octopus-caption caption-top"><span className="caption-dot" /> Cercanía y confianza</div>
            <svg className="hero-octopus" viewBox="0 0 520 500" role="img" aria-labelledby="octopus-title octopus-desc">
              <title id="octopus-title">El pulpo de Nébula</title>
              <desc id="octopus-desc">Un pulpo minimalista de líneas violetas, con una expresión amable y tentáculos curvos.</desc>
              <defs>
                <linearGradient id="octopusHead" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8063f4" />
                  <stop offset="1" stopColor="#6243df" />
                </linearGradient>
              </defs>
              <g className="octopus-tentacles" fill="none" stroke="#6d4bea" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                <path d="M190 282 C150 300 116 325 104 367 C95 398 111 419 139 408 C157 401 163 383 166 369" />
                <path d="M211 300 C186 337 177 373 190 414 C200 445 229 448 241 423 C248 408 242 392 238 379" />
                <path d="M238 307 C228 353 236 393 262 426 C281 450 309 439 310 413 C311 396 300 383 289 371" />
                <path d="M268 300 C281 337 306 363 342 376 C371 387 390 366 377 342 C369 327 352 324 337 323" />
                <path d="M294 278 C333 288 372 282 400 255 C422 234 408 207 382 212 C365 215 357 231 350 244" />
                <path d="M308 250 C347 234 372 205 377 169 C381 140 354 128 337 148 C326 161 330 179 334 194" />
                <path d="M280 228 C302 190 303 151 283 119 C267 94 239 104 239 131 C239 148 251 160 261 171" />
                <path d="M235 226 C217 187 185 163 148 162 C119 161 109 188 132 205 C146 215 164 209 178 203" />
              </g>
              <path d="M172 237 C172 166 210 119 263 119 C316 119 352 166 352 237 C352 286 315 318 262 318 C209 318 172 286 172 237Z" fill="url(#octopusHead)" />
              <ellipse cx="229" cy="235" rx="10" ry="13" fill="#fff" />
              <ellipse cx="296" cy="235" rx="10" ry="13" fill="#fff" />
              <path d="M244 268 C255 280 270 280 281 268" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
              <circle cx="201" cy="260" r="8" fill="#f6a18b" opacity=".9" />
              <circle cx="324" cy="260" r="8" fill="#f6a18b" opacity=".9" />
            </svg>
            <div className="octopus-caption caption-bottom"><span className="caption-lock">✳</span> Siempre bajo tu control</div>
            <span className="octopus-spark spark-one" aria-hidden="true">✳</span>
            <span className="octopus-spark spark-two" aria-hidden="true">✦</span>
          </div>
        </section>

        <section className="trust-strip" aria-label="Principios de Nébula">
          <div><span className="trust-icon">◎</span><span>Consentimiento primero</span></div>
          <div><span className="trust-icon">⌁</span><span>Conexiones responsables</span></div>
          <div><span className="trust-icon">✳</span><span>Privacidad por diseño</span></div>
        </section>

        <section className="section principles-section" id="principios">
          <div className="section-heading">
            <span className="section-kicker">La esencia de Nébula</span>
            <h2>Acompañar también es <em>respetar.</em></h2>
            <p>Creemos que una buena red de apoyo empieza escuchando y continúa respetando los límites de cada persona.</p>
          </div>
          <div className="principle-grid">
            {principles.map((item) => (
              <article className="principle-card" key={item.number}>
                <div className="principle-top"><span>{item.number}</span><span className="principle-icon" aria-hidden="true">{item.icon}</span></div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="card-decoration" aria-hidden="true">✳</span>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="como-funciona">
          <div className="how-inner">
            <div className="how-copy">
              <span className="section-kicker">Simple, desde el primer paso</span>
              <h2>Una red que crece <em>a tu ritmo.</em></h2>
              <p>Empieza con lo esencial. Nébula te ayuda a organizar tus conexiones y a decidir cómo quieres recibir acompañamiento.</p>
              <Link to={signedIn ? "/app" : "/register"} className="text-link">
                {signedIn ? "Volver a mi espacio" : "Crear mi espacio"} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="steps-list">
              {steps.map(([title, description], index) => (
                <article className="step-item" key={title}>
                  <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
                  <div><h3>{title}</h3><p>{description}</p></div>
                  <span className="step-arrow" aria-hidden="true">↗</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing-cta">
          <div className="closing-spark">✳</div>
          <span className="section-kicker">Tu espacio te espera</span>
          <h2>Crecer acompañado.<br /><em>Sin dejar de ser tú.</em></h2>
          <p>Construye una red de confianza en la que tus decisiones siempre cuentan.</p>
          <Link to={signedIn ? "/app" : "/register"} className="btn btn-light btn-large">
            {signedIn ? "Ir a mi espacio" : "Conocer Nébula"} <span aria-hidden="true">↗</span>
          </Link>
        </section>

        <section className="faq-section" id="preguntas">
          <div className="faq-heading">
            <span className="section-kicker">Antes de comenzar</span>
            <h2>Preguntas <em>frecuentes.</em></h2>
          </div>
          <div className="faq-list">
            <details>
              <summary>¿Quién puede formar parte de Nébula?<span aria-hidden="true">+</span></summary>
              <p>Jóvenes, sus tutores o familiares y docentes autorizados. Cada perfil tiene un espacio y unas funciones según su rol.</p>
            </details>
            <details>
              <summary>¿Un tutor o docente puede ver toda mi información?<span aria-hidden="true">+</span></summary>
              <p>No. El acceso depende de los permisos y autorizaciones correspondientes. Nébula está diseñado para que el joven conserve el control de lo que comparte.</p>
            </details>
            <details>
              <summary>¿Puedo cambiar o retirar una autorización?<span aria-hidden="true">+</span></summary>
              <p>Sí. Las conexiones y permisos deben ser claros y gestionables; puedes revisar y retirar autorizaciones según las reglas de cada vínculo.</p>
            </details>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <Link to="/" aria-label="Nébula, inicio"><Logo /></Link>
        <span>Un espacio para acompañar con confianza.</span>
        <span>© {new Date().getFullYear()} Nébula</span>
      </footer>
    </div>
  );
}
