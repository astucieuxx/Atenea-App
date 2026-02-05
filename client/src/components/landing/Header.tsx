import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AteneaLogo } from "@/components/atenea-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-background backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 relative z-[100]" style={{ zIndex: 100 }}>
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
            <span className="font-display text-xl font-bold text-foreground relative z-[100] uppercase">
              ATENEA
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              {t('nav.features')}
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              {t('nav.howItWorks')}
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              {t('nav.pricing')}
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
              {t('nav.testimonials')}
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageToggle />
            <Button variant="ghost" size="sm">
              {t('header.login')}
            </Button>
            <Button variant="navy" size="default">
              {t('header.tryFree')}
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
              <a href="#features" className="text-foreground font-medium py-2">{t('nav.features')}</a>
              <a href="#how-it-works" className="text-foreground font-medium py-2">{t('nav.howItWorks')}</a>
              <a href="#pricing" className="text-foreground font-medium py-2">{t('nav.pricing')}</a>
              <a href="#testimonials" className="text-foreground font-medium py-2">{t('nav.testimonials')}</a>
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center gap-2">
                  <LanguageToggle />
                </div>
                <Button variant="outline" className="w-full">{t('header.login')}</Button>
                <Button variant="navy" className="w-full">{t('header.tryFree')}</Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
