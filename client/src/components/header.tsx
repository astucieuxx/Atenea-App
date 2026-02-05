import { Link, useLocation } from "wouter";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import { AteneaLogo } from "./atenea-logo";
import { useState } from "react";

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-14 sm:h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 relative z-[100]" style={{ zIndex: 100 }}>
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center relative z-[100]" 
              style={{ 
                zIndex: 100, 
                position: 'relative',
                display: 'flex',
                visibility: 'visible',
                opacity: 1,
                width: '2rem',
                height: '2rem'
              }}
            >
              <AteneaLogo 
                variant="svg" 
                size={32}
                showText={false}
                className="[&_img]:w-8 [&_img]:h-8 sm:[&_img]:w-10 sm:[&_img]:h-10"
                style={{ 
                  zIndex: 1000, 
                  position: 'relative',
                  display: 'block',
                  visibility: 'visible',
                  opacity: 1
                }}
              />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold text-foreground relative z-[100] uppercase">
              ATENEA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  location === "/" ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                Home
              </Button>
            </Link>
            <Link href="/ask">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  location === "/ask" ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                Búsqueda
              </Button>
            </Link>
            <Link href="/historial">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  location === "/historial" ? "bg-accent text-accent-foreground" : ""
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
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menú"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start ${
                    location === "/" ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Button>
              </Link>
              <Link href="/ask">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start ${
                    location === "/ask" ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Búsqueda
                </Button>
              </Link>
              <Link href="/historial">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start ${
                    location === "/historial" ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Historial
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={toggleTheme}
              >
                {theme === "light" ? (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Modo Oscuro
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Modo Claro
                  </>
                )}
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
