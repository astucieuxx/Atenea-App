const stats = [
  { value: "500K+", label: "Resoluciones Indexadas" },
  { value: "10K+", label: "Abogados Activos" },
  { value: "99.9%", label: "Precisión de Búsqueda" },
  { value: "24/7", label: "Disponibilidad" },
];

export default function StatsSection() {
  return (
    <section className="py-20 bg-gradient-hero relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-silver/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-silver/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gradient-silver mb-2">
                {stat.value}
              </div>
              <p className="text-white/90 font-body text-sm md:text-base">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
