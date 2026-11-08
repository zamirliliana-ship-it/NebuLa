
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { post, type AccountType, type Session } from "../lib/api";

interface ChooseAccountTypeProps {
  session: Session;
  onComplete: (session: Session) => void;
}

const choices: {
  value: AccountType;
  title: string;
  description: string;
}[] = [
  {
    value: "autistic_person",
    title: "Soy una persona autista",
    description:
      "Quiero crear y gestionar mi propio espacio en Nébula.",
  },
  {
    value: "parent_guardian",
    title: "Soy padre, madre o tutor",
    description:
      "Quiero acompañar a una persona y solicitar una vinculación segura.",
  },
  {
    value: "teacher",
    title: "Soy docente",
    description:
      "Quiero solicitar acceso como profesional de una institución educativa.",
  },
];

export default function ChooseAccountType({
  session,
  onComplete,
}: ChooseAccountTypeProps) {
  const navigate = useNavigate();

  const [selected, setSelected] = useState<AccountType | "">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || !selected) {
      return;
    }

    setError("");
    setBusy(true);

    try {
      const response = await post<{ user: Session["user"] }>(
        "/auth/account-type",
        { accountType: selected },
        session.accessToken
      );

      if (!response.ok) {
        setError(response.message || "No se pudo guardar tu selección.");
        return;
      }

      if (!response.data?.user) {
        setError(
          "El servidor no devolvió los datos actualizados de tu cuenta. Inténtalo nuevamente."
        );
        return;
      }

      const updatedSession: Session = {
        ...session,
        user: response.data.user,
      };

      onComplete(updatedSession);
      navigate("/app", { replace: true });
    } catch {
      setError(
        "Ocurrió un problema inesperado. Comprueba tu conexión e inténtalo nuevamente."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="¿Cómo deseas utilizar Nébula?"
      subtitle="Tu correo ya está verificado. Elige el tipo de cuenta que mejor describe tu participación."
    >
      <form
        onSubmit={handleSubmit}
        className="account-choice-form"
        aria-busy={busy}
      >
        <fieldset
          className="account-choice-fieldset"
          disabled={busy}
          aria-describedby="account-choice-help"
        >
          <legend className="account-choice-legend">
            Selecciona una opción
          </legend>

          {choices.map((choice) => {
            const isSelected = selected === choice.value;

            return (
              <label
                key={choice.value}
                className={`account-choice${isSelected ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={choice.value}
                  checked={isSelected}
                  onChange={() => {
                    setSelected(choice.value);
                    setError("");
                  }}
                  required
                />

                <span className="account-choice-copy">
                  <strong>{choice.title}</strong>
                  <small>{choice.description}</small>
                </span>
              </label>
            );
          })}
        </fieldset>

        <p id="account-choice-help" className="account-choice-note">
          Esta selección inicia la configuración de tu cuenta. No acredita
          edad, parentesco, diagnóstico ni condición profesional. Nébula
          solicitará los datos y verificaciones que correspondan en los
          siguientes pasos.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || !selected}>
          {busy ? "Guardando selección…" : "Continuar"}
        </button>
      </form>
    </AuthShell>
  );
}
