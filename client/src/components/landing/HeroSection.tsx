import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AteneaLogo } from "@/components/atenea-logo";
import heroBg from "@/assets/hero-bg.jpg";
import { useLanguage } from "@/contexts/language-context";

// FORZAR RECARGA - Botón Ver Demostración ELIMINADO - 2024
export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroBg} 
          alt="" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/90 via-navy/85 to-navy-dark/95" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-silver/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-silver/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo grande con nombre */}
          <div className="mb-16 animate-fade-up flex flex-col items-center gap-0">
            <AteneaLogo 
              variant="svg" 
              size={130} 
              showText={false}
              className="[&_img]:w-auto [&_img]:h-auto"
            />
            <span className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white -mt-3">
              ATENEA
            </span>
            {/* Badge */}
            <p className="text-xs italic text-white/60 mt-2 inline-block">
              {t('landing.poweredBy')}
            </p>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-normal mb-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {t('landing.mainHeading')}
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-white max-w-2xl mx-auto mb-8 font-body animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {t('landing.subtitle')}
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 text-white/80 text-xs font-body mb-8 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-silver-light" />
              {t('landing.trust.resolutions')}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-silver-light" />
              {t('landing.trust.daily')}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-silver-light" />
              {t('landing.trust.accuracy')}
            </span>
          </div>

          {/* CTA Button - SOLO PRUEBA GRATUITA - MÁS GRANDE */}
          <div className="flex justify-center animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/ask">
              <Button 
                variant="navy" 
                size="lg" 
                className="text-lg px-12 py-6 font-semibold text-center"
                style={{ 
                  boxShadow: '0 0 20px rgba(31, 58, 81, 0.4), 0 4px 14px rgba(31, 58, 81, 0.3)'
                }}
              >
                {t('landing.startFreeTrial')}
              </Button>
            </Link>
          </div>
          {/* BOTON VER DEMOSTRACION ELIMINADO - NO EXISTE EN EL CODIGO */}
        </div>
      </div>
    </section>
  );
}
