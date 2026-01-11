import type { FuerzaLevel } from "@shared/schema";

interface FuerzaBadgeProps {
  fuerza: FuerzaLevel;
  className?: string;
}

export function FuerzaBadge({ fuerza, className = "" }: FuerzaBadgeProps) {
  const baseClasses = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
  
  const variants: Record<FuerzaLevel, string> = {
    Alta: "bg-[hsl(var(--fuerza-alta)/0.15)] text-[hsl(var(--fuerza-alta))] dark:text-[hsl(var(--fuerza-alta-foreground))]",
    Media: "bg-[hsl(var(--fuerza-media)/0.15)] text-[hsl(var(--fuerza-media))] dark:text-[hsl(var(--fuerza-media-foreground))]",
    Baja: "bg-[hsl(var(--fuerza-baja)/0.15)] text-[hsl(var(--fuerza-baja))] dark:text-[hsl(var(--fuerza-baja-foreground))]",
  };

  const icons: Record<FuerzaLevel, React.ReactNode> = {
    Alta: (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="2.5" fill="currentColor" />
      </svg>
    ),
    Media: (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 3.5V6L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    Baja: (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      </svg>
    ),
  };

  return (
    <span className={`${baseClasses} ${variants[fuerza]} ${className}`} data-testid={`badge-fuerza-${fuerza.toLowerCase()}`}>
      {icons[fuerza]}
      Fuerza {fuerza}
    </span>
  );
}
