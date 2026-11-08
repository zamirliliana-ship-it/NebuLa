export default function Logo() {
  return (
    <span className="logo">
      <svg className="logo-mark" viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M13.5 21.5c-3 4-6.5 5-6.5 9 0 2.2 1.6 3.5 3.4 2.7 2.2-1 2.2-4.1 4.7-4.1" />
          <path d="M17 25c-1 4-2.2 7.2-.2 9 1.8 1.6 4.2.3 4.2-2.1 0-1.4-.2-2.5.5-3.8" />
          <path d="M23 24.5c1.2 3.4 3.3 5.4 5.6 4.5 2.1-.8 1.5-3.5.4-5.3" />
          <path d="M27 20.5c3.6 2.1 7.2 1.6 7.6-1 .4-2.5-2.4-3.4-5-3.2" />
        </g>
        <path d="M10.5 17.8c0-6.2 4.2-10.4 9.6-10.4s9.4 4.2 9.4 10.4c0 5.4-4 9.2-9.5 9.2s-9.5-3.8-9.5-9.2Z" fill="var(--violet)" />
        <circle cx="17" cy="17" r="1.25" fill="white" />
        <circle cx="23" cy="17" r="1.25" fill="white" />
        <path d="M18 21c1.2 1 2.8 1 4 0" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span>Nébula</span>
    </span>
  );
}
