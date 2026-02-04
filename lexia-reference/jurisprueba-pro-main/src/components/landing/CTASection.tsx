import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const benefits = [
  "14 días de prueba gratis",
  "Sin tarjeta de crédito",
  "Cancela cuando quieras"
];

const CTASection = () => {
  return (
    <section className="py-24 lg:py-32 bg-gradient-hero relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-silver/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Comienza a Investigar
            <span className="block text-gradient-silver mt-2">Más Inteligentemente</span>
          </h2>
          
          <p className="text-lg text-primary-foreground/70 font-body mb-8 max-w-xl mx-auto">
            Únete a miles de abogados que ya transformaron su práctica legal con LexIA.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-primary-foreground/80">
                <CheckCircle className="w-5 h-5 text-silver-light" />
                <span className="font-body text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="silver" size="xl">
              Comenzar Prueba Gratuita
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              Agendar Demo
            </Button>
          </div>

          {/* Trust Badge */}
          <p className="mt-8 text-sm text-primary-foreground/50 font-body">
            Conforme a la Ley Federal de Protección de Datos Personales
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
