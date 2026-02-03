import React from "react";

interface AteneaLogoProps {
  className?: string;
  size?: number;
  variant?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8" | "v9" | "v10" | "v11" | "v12" | "v13" | "v14" | "owl1" | "owl2" | "owl3" | "owl4" | "owl5" | "arrow1" | "arrow2" | "arrow3" | "arrow4" | "arrow5" | "arrow6";
  showText?: boolean;
}

// Variante 1: A minimalista con balanza integrada (RECOMENDADA - Serio, elegante)
function LogoV1({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 6 L14 38 L18 38 L20 30 L28 30 L30 38 L34 38 L24 6 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="24"
        x2="28"
        y2="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M18 38 L18 42 M30 38 L30 42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="42"
        x2="30"
        y2="42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 2: A geométrica con balanza sutil
function LogoV2({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 8 L16 36 L20 36 L22 28 L26 28 L28 36 L32 36 L24 8 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <rect x="20" y="24" width="8" height="2.5" fill="white" />
      <circle cx="20" cy="40" r="2" fill="currentColor" fillOpacity="0.6" />
      <circle cx="28" cy="40" r="2" fill="currentColor" fillOpacity="0.6" />
      <line
        x1="20"
        y1="40"
        x2="28"
        y2="40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

// Variante 3: A clásica tradicional
function LogoV3({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 6 L14 38 L18 38 L20 30 L28 30 L30 38 L34 38 L24 6 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="24"
        x2="28"
        y2="24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 38 L24 40 M18 40 L30 40 M18 40 L18 42 M30 40 L30 42 M18 42 L22 42 M26 42 L30 42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Variante 4: A minimalista pura (ULTRA LIMPIO)
function LogoV4({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 8 L16 36 L20 36 L22 28 L26 28 L28 36 L32 36 L24 8 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="24"
        x2="28"
        y2="24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 5: A con escudo
function LogoV5({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 4 L12 8 L12 20 C12 28 18 34 24 38 C30 34 36 28 36 20 L36 8 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M24 12 L18 28 L20 28 L22 22 L26 22 L28 28 L30 28 L24 12 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="20"
        x2="28"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="28"
        x2="20"
        y2="32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="28"
        x2="28"
        y2="32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="32"
        x2="28"
        y2="32"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 6: A con libro
function LogoV6({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M24 6 L16 34 L20 34 L22 26 L26 26 L28 34 L32 34 L24 6 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="22"
        x2="28"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M18 34 L18 38 L24 38 L24 34 M24 34 L24 38 L30 38 L30 34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="24"
        y1="34"
        x2="24"
        y2="38"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 7: A con escudo griego prominente (égida)
function LogoV7({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Escudo griego (égida) */}
      <path
        d="M24 2 L8 6 L8 18 C8 28 16 36 24 40 C32 36 40 28 40 18 L40 6 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.4"
      />
      {/* A dentro del escudo */}
      <path
        d="M24 10 L18 30 L20 30 L22 24 L26 24 L28 30 L30 30 L24 10 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="22"
        x2="28"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Balanza en la base */}
      <circle cx="20" cy="34" r="2.5" fill="currentColor" fillOpacity="0.7" />
      <circle cx="28" cy="34" r="2.5" fill="currentColor" fillOpacity="0.7" />
      <line
        x1="20"
        y1="34"
        x2="28"
        y2="34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 8: A con búho (sabiduría)
function LogoV8({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A */}
      <path
        d="M24 6 L16 32 L20 32 L22 26 L26 26 L28 32 L32 32 L24 6 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="24"
        x2="28"
        y2="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Búho estilizado en la base */}
      <circle cx="20" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="28" cy="36" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="36" r="1" fill="currentColor" />
      <circle cx="28" cy="36" r="1" fill="currentColor" />
      <path
        d="M18 40 Q20 42 22 40 Q24 42 26 40 Q28 42 30 40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Variante 9: A con casco de Atenea
function LogoV9({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Casco de Atenea sobre la A */}
      <path
        d="M24 2 L18 4 L18 8 L24 6 L30 8 L30 4 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M18 8 Q18 6 20 6 L28 6 Q30 6 30 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* A */}
      <path
        d="M24 8 L16 36 L20 36 L22 28 L26 28 L28 36 L32 36 L24 8 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="24"
        x2="28"
        y2="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Balanza */}
      <line
        x1="20"
        y1="36"
        x2="20"
        y2="40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="36"
        x2="28"
        y2="40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="40"
        x2="28"
        y2="40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 10: A con olivo (paz y sabiduría)
function LogoV10({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A */}
      <path
        d="M24 6 L16 34 L20 34 L22 26 L26 26 L28 34 L32 34 L24 6 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="22"
        x2="28"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Rama de olivo a los lados */}
      <path
        d="M14 30 Q12 28 10 30 Q12 32 14 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M34 30 Q36 28 38 30 Q36 32 34 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Hojas de olivo */}
      <ellipse cx="12" cy="28" rx="1.5" ry="2.5" fill="currentColor" fillOpacity="0.6" />
      <ellipse cx="36" cy="28" rx="1.5" ry="2.5" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}

// Variante 11: A dentro de escudo circular con patrón griego
function LogoV11({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Círculo exterior */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />
      {/* Patrón griego (meandros) */}
      <path
        d="M12 24 L14 22 L16 24 L18 22 L20 24"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M28 24 L30 22 L32 24 L34 22 L36 24"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      {/* A central */}
      <path
        d="M24 10 L18 30 L20 30 L22 24 L26 24 L28 30 L30 30 L24 10 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="22"
        x2="28"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 12: A con escudo y búho combinados
function LogoV12({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Escudo */}
      <path
        d="M24 4 L10 8 L10 20 C10 28 16 36 24 40 C32 36 38 28 38 20 L38 8 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.25"
      />
      {/* A */}
      <path
        d="M24 8 L18 28 L20 28 L22 22 L26 22 L28 28 L30 28 L24 8 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="20"
        x2="28"
        y2="20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Búho en la base del escudo */}
      <circle cx="22" cy="32" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="26" cy="32" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="22" cy="32" r="1" fill="currentColor" opacity="0.8" />
      <circle cx="26" cy="32" r="1" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

// Variante 13: A con escudo hexagonal moderno
function LogoV13({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexágono (escudo moderno) */}
      <path
        d="M24 4 L32 8 L36 16 L36 24 L32 32 L24 36 L16 32 L12 24 L12 16 L16 8 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
      {/* A */}
      <path
        d="M24 10 L18 30 L20 30 L22 24 L26 24 L28 30 L30 30 L24 10 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="22"
        x2="28"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Balanza moderna */}
      <line
        x1="20"
        y1="30"
        x2="20"
        y2="34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="30"
        x2="28"
        y2="34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="34"
        x2="28"
        y2="34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante 14: A con corona de olivo y escudo
function LogoV14({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Corona de olivo arriba */}
      <path
        d="M18 4 Q20 6 22 4 Q24 6 26 4 Q28 6 30 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <ellipse cx="20" cy="4" rx="1" ry="1.5" fill="currentColor" fillOpacity="0.5" />
      <ellipse cx="24" cy="4" rx="1" ry="1.5" fill="currentColor" fillOpacity="0.5" />
      <ellipse cx="28" cy="4" rx="1" ry="1.5" fill="currentColor" fillOpacity="0.5" />
      {/* Escudo */}
      <path
        d="M24 6 L14 10 L14 20 C14 28 18 34 24 38 C30 34 34 28 34 20 L34 10 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
      {/* A */}
      <path
        d="M24 10 L18 30 L20 30 L22 24 L26 24 L28 30 L30 30 L24 10 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="20"
        y1="22"
        x2="28"
        y2="22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Balanza */}
      <circle cx="20" cy="34" r="2" fill="currentColor" fillOpacity="0.7" />
      <circle cx="28" cy="34" r="2" fill="currentColor" fillOpacity="0.7" />
      <line
        x1="20"
        y1="34"
        x2="28"
        y2="34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante OWL1: Búho minimalista estilo imagen (líneas gruesas, navy)
function LogoOwl1({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Contorno del búho (forma de escudo/invertido) */}
      <path
        d="M24 4 Q16 6 12 12 Q10 18 12 24 Q14 30 20 34 Q22 36 24 38 Q26 36 28 34 Q34 30 36 24 Q38 18 36 12 Q32 6 24 4 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cejas/Forehead arqueadas */}
      <path
        d="M16 14 Q20 12 24 14 Q28 12 32 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ojos - círculos concéntricos */}
      <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
      <circle cx="28" cy="20" r="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="28" cy="20" r="2" fill="currentColor" />
      {/* Pico (V invertida) */}
      <path
        d="M22 24 L24 28 L26 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Patrón de plumas en el pecho (V central y líneas) */}
      <path
        d="M20 28 L24 32 L28 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M18 30 L18 32 M22 30 L22 32 M26 30 L26 32 M30 30 L30 32"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Variante OWL2: Búho más geométrico y moderno
function LogoOwl2({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Contorno más angular */}
      <path
        d="M24 4 L14 10 L10 20 L12 28 L18 34 L24 38 L30 34 L36 28 L38 20 L34 10 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cejas más pronunciadas */}
      <path
        d="M16 14 L20 12 L24 14 L28 12 L32 14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ojos más grandes */}
      <circle cx="20" cy="22" r="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="22" r="2.5" fill="currentColor" />
      <circle cx="28" cy="22" r="5" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="28" cy="22" r="2.5" fill="currentColor" />
      {/* Pico más definido */}
      <path
        d="M22 26 L24 30 L26 26"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Patrón de plumas más geométrico */}
      <path
        d="M18 30 L24 34 L30 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="20" y1="32" x2="20" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="32" x2="24" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="32" x2="28" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Variante OWL3: Búho con A integrada (búho + letra A)
function LogoOwl3({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Contorno del búho */}
      <path
        d="M24 4 Q16 6 12 12 Q10 18 12 24 Q14 30 20 34 Q22 36 24 38 Q26 36 28 34 Q34 30 36 24 Q38 18 36 12 Q32 6 24 4 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.4"
      />
      {/* Cejas */}
      <path
        d="M16 14 Q20 12 24 14 Q28 12 32 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ojos */}
      <circle cx="20" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      <circle cx="28" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="28" cy="20" r="1.5" fill="currentColor" />
      {/* A integrada en el centro */}
      <path
        d="M24 10 L20 26 L22 26 L24 22 L24 22 L26 26 L28 26 L24 10 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="22"
        y1="20"
        x2="26"
        y2="20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Pico */}
      <path
        d="M22 26 L24 30 L26 26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Variante OWL4: Búho con escudo (búho dentro de escudo)
function LogoOwl4({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Escudo exterior */}
      <path
        d="M24 2 L10 6 L10 18 C10 26 16 34 24 40 C32 34 38 26 38 18 L38 6 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
      {/* Búho dentro del escudo */}
      <path
        d="M24 8 Q18 10 14 14 Q12 18 14 22 Q16 26 20 28 Q22 30 24 32 Q26 30 28 28 Q32 26 34 22 Q36 18 34 14 Q30 10 24 8 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cejas */}
      <path
        d="M18 16 Q20 14 24 16 Q28 14 30 16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ojos */}
      <circle cx="21" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="21" cy="20" r="1.5" fill="currentColor" />
      <circle cx="27" cy="20" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="27" cy="20" r="1.5" fill="currentColor" />
      {/* Pico */}
      <path
        d="M22 24 L24 27 L26 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Patrón de plumas */}
      <path
        d="M20 26 L24 29 L28 26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Variante OWL5: Búho ultra minimalista (solo líneas esenciales)
function LogoOwl5({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Contorno simple */}
      <path
        d="M24 6 Q14 8 10 16 Q8 22 10 28 Q12 32 18 34 Q20 36 24 38 Q28 36 34 34 Q38 32 38 28 Q40 22 38 16 Q34 8 24 6 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cejas simples */}
      <path
        d="M18 16 Q24 14 30 16"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ojos grandes y simples */}
      <circle cx="20" cy="22" r="4.5" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="20" cy="22" r="2" fill="currentColor" />
      <circle cx="28" cy="22" r="4.5" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="28" cy="22" r="2" fill="currentColor" />
      {/* Pico simple */}
      <path
        d="M22 28 L24 32 L26 28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Línea de pecho simple */}
      <line x1="20" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Variante ARROW1: A estilizada doble capa (estilo imagen - navy/silver)
function LogoArrow1({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Capa exterior (silver/gold) */}
      <path
        d="M24 4 L12 40 L24 36 L36 40 Z"
        fill="hsl(var(--silver))"
      />
      {/* Capa interior (navy) */}
      <path
        d="M24 8 L16 36 L24 32 L32 36 Z"
        fill="hsl(var(--navy))"
      />
    </svg>
  );
}

// Variante ARROW2: A doble capa con base cerrada
function LogoArrow2({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Capa exterior con base */}
      <path
        d="M24 4 L12 40 L12 42 L36 42 L36 40 Z"
        fill="hsl(var(--silver))"
      />
      {/* Capa interior con base abierta */}
      <path
        d="M24 8 L16 36 L16 38 L32 38 L32 36 Z"
        fill="hsl(var(--navy))"
      />
      {/* Base visible de la capa exterior */}
      <rect x="12" y="40" width="24" height="2" fill="hsl(var(--silver))" />
    </svg>
  );
}

// Variante ARROW3: A doble capa más angular y moderna
function LogoArrow3({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Capa exterior más ancha */}
      <path
        d="M24 2 L10 42 L24 38 L38 42 Z"
        fill="hsl(var(--silver))"
      />
      {/* Capa interior más estrecha */}
      <path
        d="M24 6 L18 38 L24 34 L30 38 Z"
        fill="hsl(var(--navy))"
      />
    </svg>
  );
}

// Variante ARROW4: A con gradiente silver en exterior
function LogoArrow4({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--silver-light))" />
          <stop offset="100%" stopColor="hsl(var(--silver))" />
        </linearGradient>
      </defs>
      {/* Capa exterior con gradiente */}
      <path
        d="M24 4 L12 40 L24 36 L36 40 Z"
        fill="url(#silverGrad)"
      />
      {/* Capa interior navy sólido */}
      <path
        d="M24 8 L16 36 L24 32 L32 36 Z"
        fill="hsl(var(--navy))"
      />
    </svg>
  );
}

// Variante ARROW5: A doble capa invertida (navy exterior, silver interior)
function LogoArrow5({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Capa exterior navy */}
      <path
        d="M24 4 L12 40 L24 36 L36 40 Z"
        fill="hsl(var(--navy))"
      />
      {/* Capa interior silver */}
      <path
        d="M24 8 L16 36 L24 32 L32 36 Z"
        fill="hsl(var(--silver))"
      />
    </svg>
  );
}

// Variante ARROW6: A doble capa con sombra/efecto 3D
function LogoArrow6({ size = 40 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sombra/efecto 3D */}
      <path
        d="M24 4 L12 40 L24 36 L36 40 Z"
        fill="hsl(var(--navy-dark))"
        opacity="0.3"
        transform="translate(1, 1)"
      />
      {/* Capa exterior */}
      <path
        d="M24 4 L12 40 L24 36 L36 40 Z"
        fill="hsl(var(--silver))"
      />
      {/* Capa interior */}
      <path
        d="M24 8 L16 36 L24 32 L32 36 Z"
        fill="hsl(var(--navy))"
      />
    </svg>
  );
}

export function AteneaLogo({ 
  className = "", 
  size = 40, 
  variant = "v1",
  showText = true 
}: AteneaLogoProps) {
  const LogoComponent = {
    v1: LogoV1,
    v2: LogoV2,
    v3: LogoV3,
    v4: LogoV4,
    v5: LogoV5,
    v6: LogoV6,
    v7: LogoV7,
    v8: LogoV8,
    v9: LogoV9,
    v10: LogoV10,
    v11: LogoV11,
    v12: LogoV12,
    v13: LogoV13,
    v14: LogoV14,
    owl1: LogoOwl1,
    owl2: LogoOwl2,
    owl3: LogoOwl3,
    owl4: LogoOwl4,
    owl5: LogoOwl5,
    arrow1: LogoArrow1,
    arrow2: LogoArrow2,
    arrow3: LogoArrow3,
    arrow4: LogoArrow4,
    arrow5: LogoArrow5,
    arrow6: LogoArrow6,
  }[variant] || LogoV1;

  if (!showText) {
    return (
      <div className={className}>
        <LogoComponent size={size} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-shrink-0">
        <LogoComponent size={size} />
      </div>
      <span className="font-display text-xl font-semibold text-foreground">
        Atenea
      </span>
    </div>
  );
}
