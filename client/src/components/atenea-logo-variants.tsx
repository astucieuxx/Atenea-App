import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

// Propuesta 1: A minimalista con balanza integrada (serio, elegante)
export function LogoVariant1({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A estilizada con líneas limpias */}
      <path
        d="M24 6 L14 38 L18 38 L20 30 L28 30 L30 38 L34 38 L24 6 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Barra horizontal de la A */}
      <line
        x1="20"
        y1="24"
        x2="28"
        y2="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Balanza integrada en la base */}
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

// Propuesta 2: A geométrica con balanza sutil (moderno, tech)
export function LogoVariant2({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A geométrica */}
      <path
        d="M24 8 L16 36 L20 36 L22 28 L26 28 L28 36 L32 36 L24 8 Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Barra horizontal */}
      <rect x="20" y="24" width="8" height="2.5" fill="white" />
      {/* Balanza sutil en la base */}
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

// Propuesta 3: A con balanza clásica (tradicional, confiable)
export function LogoVariant3({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A clásica */}
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
      {/* Balanza clásica debajo */}
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

// Propuesta 4: A minimalista pura (ultra limpio, profesional)
export function LogoVariant4({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A minimalista con líneas gruesas */}
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

// Propuesta 5: A con escudo/balanza (autoridad, protección)
export function LogoVariant5({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Escudo de fondo */}
      <path
        d="M24 4 L12 8 L12 20 C12 28 18 34 24 38 C30 34 36 28 36 20 L36 8 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
      {/* A dentro del escudo */}
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
      {/* Balanza en la base */}
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

// Propuesta 6: A con libro/balanza (sabiduría, justicia)
export function LogoVariant6({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A principal */}
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
      {/* Libro abierto en la base */}
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

// Componente para mostrar todas las variantes
export function LogoShowcase() {
  const variants = [
    { name: "Variant 1: A minimalista con balanza", Component: LogoVariant1 },
    { name: "Variant 2: A geométrica tech", Component: LogoVariant2 },
    { name: "Variant 3: A clásica tradicional", Component: LogoVariant3 },
    { name: "Variant 4: A minimalista pura", Component: LogoVariant4 },
    { name: "Variant 5: A con escudo", Component: LogoVariant5 },
    { name: "Variant 6: A con libro", Component: LogoVariant6 },
  ];

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold mb-6">Propuestas de Logo Atenea</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {variants.map((variant, index) => (
          <div key={index} className="flex flex-col items-center gap-4 p-6 border rounded-lg">
            <variant.Component size={80} className="text-navy-dark" />
            <p className="text-sm text-center text-muted-foreground">{variant.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
