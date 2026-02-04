import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
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
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-silver-light" />
            <span className="text-sm font-medium text-primary-foreground/90">
              Potenciado por Inteligencia Artificial
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground leading-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Encuentra Jurisprudencia
            <span className="block text-gradient-silver mt-2">
              en Segundos
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 font-body animate-fade-up" style={{ animationDelay: '0.2s' }}>
            La plataforma de búsqueda inteligente que transforma la manera en que 
            los abogados mexicanos investigan precedentes legales.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-silver rounded-2xl opacity-30 blur group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative flex items-center bg-primary-foreground/10 backdrop-blur-lg border border-primary-foreground/20 rounded-xl p-2">
                <Search className="w-5 h-5 text-primary-foreground/50 ml-4" />
                <input 
                  type="text" 
                  placeholder="Buscar jurisprudencias, tesis, precedentes..."
                  className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-primary-foreground placeholder:text-primary-foreground/40 font-body"
                />
                <Button variant="silver" size="lg" className="shrink-0">
                  Buscar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-primary-foreground/50 text-sm font-body animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-silver-light" />
              +500,000 resoluciones
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-silver-light" />
              Actualización diaria
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-silver-light" />
              99.9% de precisión
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <Button variant="silver" size="xl">
              Comenzar Prueba Gratuita
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Ver Demostración
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
