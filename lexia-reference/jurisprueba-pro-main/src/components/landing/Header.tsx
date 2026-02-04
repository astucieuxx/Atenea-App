import { Button } from "@/components/ui/button";
import { Scale, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-silver flex items-center justify-center shadow-silver">
              <Scale className="w-5 h-5 text-navy-dark" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">
              LexIA
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Características
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Cómo Funciona
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Precios
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              Testimonios
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Iniciar Sesión
            </Button>
            <Button variant="silver" size="default">
              Prueba Gratis
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-foreground font-medium py-2">Características</a>
              <a href="#how-it-works" className="text-foreground font-medium py-2">Cómo Funciona</a>
              <a href="#pricing" className="text-foreground font-medium py-2">Precios</a>
              <a href="#testimonials" className="text-foreground font-medium py-2">Testimonios</a>
              <div className="flex flex-col gap-3 pt-4">
                <Button variant="outline" className="w-full">Iniciar Sesión</Button>
                <Button variant="silver" className="w-full">Prueba Gratis</Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
