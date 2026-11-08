interface Props { value: string; onChange: (v: string) => void }

export default function OtpField({ value, onChange }: Props) {
  return (
    <label className="field">
      <span>Código de 6 dígitos</span>
      <input
        className="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        required
      />
    </label>
  );
}