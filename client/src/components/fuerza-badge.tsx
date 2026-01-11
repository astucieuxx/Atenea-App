import type { FuerzaLevel } from "@shared/schema";

interface FuerzaBadgeProps {
  fuerza: FuerzaLevel;
  className?: string;
}

export function FuerzaBadge({ fuerza, className = "" }: FuerzaBadgeProps) {
  const baseClasses = "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border";
  
  const variants: Record<FuerzaLevel, string> = {
    Alta: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    Media: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    Baja: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  };

  return (
    <span 
      className={`${baseClasses} ${variants[fuerza]} ${className}`} 
      data-testid={`badge-fuerza-${fuerza.toLowerCase()}`}
    >
      Fuerza {fuerza}
    </span>
  );
}
