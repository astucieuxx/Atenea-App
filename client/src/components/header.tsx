import { Link, useLocation } from "wouter";
import { Scale, History, PlusCircle, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 hover-elevate rounded-lg px-2 py-1.5 -ml-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-foreground" data-testid="text-logo">
              CRITERIO
            </span>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Copiloto de Jurisprudencia
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-nuevo-analisis"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Análisis</span>
            </Button>
          </Link>
          <Link href="/historial">
            <Button
              variant={location === "/historial" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="link-historial"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historial</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
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
