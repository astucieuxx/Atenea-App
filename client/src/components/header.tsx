import { Link, useLocation } from "wouter";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import ateneaLogo from "@/assets/atenea-logo.png";

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src={ateneaLogo} 
            alt="Atenea" 
            className="h-9 w-auto object-contain brightness-0 invert"
            data-testid="img-logo-header"
          />
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
              Análisis
            </Button>
          </Link>
          <Link href="/ask">
            <Button
              variant="ghost"
              size="sm"
              className={`text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 ${
                location === "/ask" ? "text-primary-foreground bg-primary-foreground/10" : ""
              }`}
            >
              RAG
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
              Historial
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
