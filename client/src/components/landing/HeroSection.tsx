import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";
import { AteneaLogo } from "@/components/atenea-logo";
import heroBg from "@/assets/hero-bg.jpg";

// FORZAR RECARGA - Botón Ver Demostración ELIMINADO - 2024
export default function HeroSection() {
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
          <div className="mb-6 animate-fade-up flex flex-col items-center gap-1">
            <AteneaLogo 
              variant="arrow1" 
              size={80} 
              showText={false}
              className="[&_svg]:w-auto [&_svg]:h-auto"
            />
            <span className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white">
              ATENEA
            </span>
          </div>

          {/* Badge */}
          <p className="text-xs italic text-white/60 mb-16 inline-block" style={{ animationDelay: '0.1s' }}>
            Potenciado por Inteligencia Artificial
          </p>

          {/* Main Heading */}
          <h1 className="font-display text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-normal mb-3 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Información Jurídica en Segundos
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-white max-w-2xl mx-auto mb-8 font-body animate-fade-up" style={{ animationDelay: '0.3s' }}>
            La plataforma de búsqueda inteligente que transforma la manera en que 
            los abogados mexicanos investigan precedentes legales.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative">
              <div className="relative flex items-center bg-white backdrop-blur-lg border border-white/20 rounded-xl p-1.5" style={{ backgroundColor: '#ffffff' }}>
                <Search className="w-4 h-4 text-foreground/80 ml-3" style={{ color: '#1a1a1a' }} />
                <input 
                  type="text" 
                  placeholder="Buscar jurisprudencias, tesis, precedentes..."
                  className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-foreground placeholder:text-foreground/70 font-body text-sm"
                  style={{ color: '#1a1a1a' }}
                />
                <Link href="/ask">
                  <Button variant="silver" size="sm" className="shrink-0 py-1.5">
                    Buscar
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 text-white/80 text-xs font-body mb-4 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-silver-light" />
              +500,000 resoluciones
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-silver-light" />
              Actualización diaria
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-silver-light" />
              99.9% de precisión
            </span>
          </div>

          {/* CTA Button - SOLO PRUEBA GRATUITA */}
          <div className="flex justify-center animate-fade-up" style={{ animationDelay: '0.6s' }}>
            <Link href="/ask">
              <Button 
                variant="silver" 
                size="sm" 
                className="text-sm px-6 py-2"
                style={{ display: 'block' }}
              >
                Comenzar Prueba Gratuita
              </Button>
            </Link>
          </div>
          {/* BOTON VER DEMOSTRACION ELIMINADO - NO EXISTE EN EL CODIGO */}
        </div>
      </div>
    </section>
  );
}
