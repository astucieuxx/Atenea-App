import { Search, Brain, FileCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Describe tu Caso",
    description: "Escribe en lenguaje natural qué tipo de precedente necesitas. No necesitas conocer términos técnicos específicos."
  },
  {
    icon: Brain,
    step: "02",
    title: "IA Analiza",
    description: "Nuestro motor RAG procesa tu consulta y busca entre miles de documentos para encontrar los más relevantes."
  },
  {
    icon: FileCheck,
    step: "03",
    title: "Resultados Precisos",
    description: "Obtén jurisprudencias ordenadas por relevancia con extractos clave y citas listas para usar en tus escritos."
  }
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-secondary/30 relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <span className="inline-block text-silver font-semibold text-sm tracking-wider uppercase mb-4">
            Proceso Simple
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Cómo <span className="text-foreground">Funciona</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body">
            Tres pasos simples para transformar tu investigación legal.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-silver/20 via-silver to-silver/20" />

          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {/* Step Number */}
              <div className="relative inline-block mb-8 pt-3 pr-3">
                <div className="w-20 h-20 rounded-2xl bg-card border-2 border-silver/30 flex items-center justify-center shadow-lg relative z-10">
                  <step.icon className="w-8 h-8 text-silver" />
                </div>
                <span className="absolute top-0 right-0 w-9 h-9 rounded-full bg-gradient-silver text-navy-dark font-bold text-sm flex items-center justify-center shadow-silver z-20">
                  {step.step}
                </span>
              </div>

              <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                {step.title}
              </h3>
              <p className="text-muted-foreground font-body leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>

              {/* Arrow (Mobile) */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-6">
                  <ArrowRight className="w-6 h-6 text-silver rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
