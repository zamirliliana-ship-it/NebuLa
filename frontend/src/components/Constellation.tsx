/** El joven (centro, en color cálido) y las personas que él autoriza. */
export default function Constellation() {
  return (
    <svg
      className="constellation"
      viewBox="0 0 480 420"
      role="img"
      aria-label="Un joven en el centro, conectado con su tutor y su docente; el docente conectado con su institución."
    >
      <g fill="var(--violet)" opacity=".35">
        <circle cx="40" cy="60" r="2" /><circle cx="440" cy="210" r="2" /><circle cx="180" cy="380" r="2" />
        <circle cx="300" cy="30" r="2" /><circle cx="60" cy="290" r="2" /><circle cx="450" cy="60" r="2" />
      </g>
      <g className="c-lines" stroke="var(--violet)" strokeWidth="1.5" opacity=".55">
        <line pathLength="1" x1="240" y1="215" x2="96" y2="110" />
        <line pathLength="1" x1="240" y1="215" x2="392" y2="96" />
        <line pathLength="1" x1="392" y1="96" x2="372" y2="336" />
      </g>
      <circle cx="240" cy="215" r="34" fill="none" stroke="var(--ember)" strokeWidth="1.5" opacity=".4" />
      <circle cx="240" cy="215" r="15" fill="var(--ember)" />
      <g fill="var(--surface)" stroke="var(--violet)" strokeWidth="2">
        <circle cx="96" cy="110" r="11" />
        <circle cx="392" cy="96" r="11" />
        <circle cx="372" cy="336" r="11" />
      </g>
      <g className="c-label" textAnchor="middle">
        <text x="240" y="268">Tú</text>
        <text x="96" y="146">Tutor</text>
        <text x="392" y="132">Docente</text>
        <text x="372" y="372">Institución</text>
      </g>
    </svg>
  );
}