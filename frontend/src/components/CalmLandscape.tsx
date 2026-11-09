export default function CalmLandscape() {
  return (
    <svg
      className="calm-landscape"
      viewBox="0 0 480 360"
      role="img"
      aria-labelledby="landscape-title"
    >
      <title id="landscape-title">
        Un camino entre colinas suaves bajo la luz del amanecer
      </title>

      <rect
        x="1"
        y="1"
        width="478"
        height="358"
        rx="36"
        fill="#edf4ef"
      />

      <circle cx="333" cy="108" r="53" fill="#f5d99e" />

      <path
        d="M65 92h75m-48 17h69M235 65h59"
        stroke="#fff"
        strokeWidth="10"
        strokeLinecap="round"
      />

      <path
        d="M0 230Q100 115 235 227T480 190V360H0Z"
        fill="#b9d4c6"
      />

      <path
        d="M0 280Q130 194 271 268T480 237V360H0Z"
        fill="#7fa995"
      />

      <path
        d="M270 247Q194 277 238 306T210 360H322Q355 309 278 288T284 247Z"
        fill="#faf0d9"
      />

      <g
        stroke="#426b59"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      >
        <path
          d="M84 293v-76m0 45-22-17m22 4 24-21M402 307v-49m0 29-16-11m16 0 17-11"
        />
      </g>

      <g fill="#4e7b65">
        <ellipse cx="83" cy="207" rx="27" ry="38" />
        <ellipse cx="402" cy="247" rx="20" ry="28" />
      </g>

      <g fill="#e9cb8e">
        <circle cx="134" cy="316" r="4" />
        <circle cx="149" cy="302" r="3" />
        <circle cx="363" cy="328" r="4" />
      </g>
    </svg>
  );
}