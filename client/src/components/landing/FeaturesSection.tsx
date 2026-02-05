import { Search, Zap, Shield, Brain, FileText, Clock } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Búsqueda Semántica RAG",
    description: "Encuentra precedentes relevantes usando lenguaje natural. Nuestra IA comprende el contexto legal de tu consulta."
  },
  {
    icon: Zap,
    title: "Resultados Instantáneos",
    description: "Obtén respuestas en milisegundos. Sin esperas, sin frustraciones. Investigación legal a la velocidad del pensamiento."
  },
  {
    icon: FileText,
    title: "Base de Datos Completa",
    description: "Acceso a jurisprudencias de la SCJN, Tribunales Colegiados, y más. Todo el universo legal mexicano en un solo lugar."
  },
  {
    icon: Shield,
    title: "Información Verificada",
    description: "Cada resultado está respaldado por fuentes oficiales. Citas precisas y enlaces directos a los documentos originales."
  },
  {
    icon: Search,
    title: "Filtros Avanzados",
    description: "Refina por época, instancia, materia o fecha. Encuentra exactamente lo que necesitas con precisión quirúrgica."
  },
  {
    icon: Clock,
    title: "Historial y Favoritos",
    description: "Guarda tus búsquedas y organiza precedentes importantes. Tu biblioteca legal personal siempre disponible."
  }
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-background relative" style={{ backgroundColor: '#ffffff' }}>
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-silver/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <span className="inline-block text-silver font-semibold text-sm tracking-wider uppercase mb-4">
            Características
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6" style={{ color: '#1a1a1a' }}>
            Tecnología Legal de
            <span style={{ color: '#1a1a1a' }}> Vanguardia</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body">
            Herramientas diseñadas por abogados, para abogados. 
            Cada función pensada para maximizar tu productividad.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group p-8 rounded-2xl bg-gradient-card border border-border hover:border-silver/30 hover:shadow-xl transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-silver flex items-center justify-center shadow-silver mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-7 h-7 text-navy-dark" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3" style={{ color: '#1a1a1a' }}>
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-body leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
