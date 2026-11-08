import { useId, useState } from "react";

interface Props {
  label: string; value: string; onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password"; minLength?: number; maxLength?: number;
}

export default function PasswordField({ label, value, onChange, autoComplete, minLength, maxLength }: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input
          id={id} type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required
        />
        <button type="button" className="toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}
