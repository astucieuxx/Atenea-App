import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Lic. María González",
    role: "Socia, González & Asociados",
    content: "Atenea ha revolucionado la forma en que hacemos investigación. Lo que antes tomaba horas, ahora lo resuelvo en minutos. Imprescindible para cualquier despacho serio.",
    rating: 5
  },
  {
    name: "Mtro. Carlos Ramírez",
    role: "Abogado Litigante",
    content: "La precisión de las búsquedas es impresionante. Encuentra jurisprudencias que jamás hubiera encontrado con métodos tradicionales. Vale cada peso invertido.",
    rating: 5
  },
  {
    name: "Lic. Ana Martínez",
    role: "Directora Legal, Corporativo MX",
    content: "Implementamos Atenea en todo nuestro equipo legal. La productividad aumentó significativamente y la calidad de nuestros argumentos mejoró notablemente.",
    rating: 5
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-silver/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <span className="inline-block text-silver font-semibold text-sm tracking-wider uppercase mb-4">
            Testimonios
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Lo que Dicen
            <span className="text-foreground"> Nuestros Usuarios</span>
          </h2>
          <p className="text-lg text-muted-foreground font-body">
            Miles de profesionales del derecho confían en Atenea cada día.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.name}
              className="relative p-8 rounded-2xl bg-card border border-border hover:border-silver/30 hover:shadow-xl transition-all duration-500"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-silver/20" />

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-silver text-silver" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/80 font-body leading-relaxed mb-8">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-silver flex items-center justify-center text-navy-dark font-bold text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
