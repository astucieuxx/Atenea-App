import { Link, useLocation } from "wouter";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import { LanguageToggle } from "./language-toggle";
import { AteneaLogo } from "./atenea-logo";
import { useState } from "react";
import { useLanguage } from "@/contexts/language-context";

export function Header() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-border/50 bg-background backdrop-blur-lg">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-14 sm:h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 relative z-[100]" style={{ zIndex: 100 }}>
            <div 
              className="w-10 h-10 flex items-center justify-center relative z-[100]" 
              style={{ 
                zIndex: 100, 
                position: 'relative',
                display: 'flex',
                visibility: 'visible',
                opacity: 1,
                width: '2.5rem',
                height: '2.5rem'
              }}
            >
              <AteneaLogo 
                variant="svg" 
                size={40}
                showText={false}
                className="[&_img]:w-full [&_img]:h-full"
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
            <LanguageToggle />
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  location === "/" ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                {t('nav.home')}
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
                {t('nav.search')}
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
                {t('nav.history')}
              </Button>
            </Link>
            <Link href="/biblioteca">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  location === "/biblioteca" ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                Biblioteca
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
            aria-label={t('header.menu')}
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
                  {t('nav.home')}
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
                  {t('nav.search')}
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
                  {t('nav.history')}
                </Button>
              </Link>
              <Link href="/biblioteca">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start ${
                    location === "/biblioteca" ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Biblioteca
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start"
                  onClick={toggleTheme}
                >
                {theme === "light" ? (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    {t('header.darkMode')}
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    {t('header.lightMode')}
                  </>
                )}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
