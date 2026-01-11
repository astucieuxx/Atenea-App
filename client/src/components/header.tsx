import { Link, useLocation } from "wouter";
import { Scale, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10">
            <Scale className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight" data-testid="text-logo">
              Atenea
            </span>
            <span className="text-[10px] text-primary-foreground/70 uppercase tracking-wider hidden sm:block">
              Copiloto Jurídico
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className={`text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 ${
                location === "/" ? "text-primary-foreground bg-primary-foreground/10" : ""
              }`}
              data-testid="link-inicio"
            >
              Inicio
            </Button>
          </Link>
          <Link href="/historial">
            <Button
              variant="ghost"
              size="sm"
              className={`text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 ${
                location === "/historial" ? "text-primary-foreground bg-primary-foreground/10" : ""
              }`}
              data-testid="link-mis-casos"
            >
              Mis Casos
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            data-testid="button-toggle-theme"
            aria-label="Cambiar tema"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
