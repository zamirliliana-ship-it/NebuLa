export default function Logo() {
  return (
    <span className="logo">
      <svg
        className="logo-mark"
        viewBox="0 0 40 40"
        width="38"
        height="38"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="13"
          fill="currentColor"
          opacity=".1"
        />

        <path
          d="M10 23a10 10 0 0 1 20 0M8 27h24M12 32h16M20 6v3M8 12l3 3m21-3-3 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </svg>

      <span>Nébula</span>
    </span>
  );
}