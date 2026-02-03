import { AteneaLogo } from "@/components/atenea-logo";

export default function LogoPreview() {
  const variants = [
    { id: "v1", name: "Variant 1: A minimalista con balanza", desc: "Serio, elegante, recomendado" },
    { id: "v2", name: "Variant 2: A geométrica tech", desc: "Moderno, tecnológico" },
    { id: "v3", name: "Variant 3: A clásica tradicional", desc: "Tradicional, confiable" },
    { id: "v4", name: "Variant 4: A minimalista pura", desc: "Ultra limpio, profesional" },
    { id: "v5", name: "Variant 5: A con escudo", desc: "Autoridad, protección" },
    { id: "v6", name: "Variant 6: A con libro", desc: "Sabiduría, justicia" },
    { id: "v7", name: "Variant 7: A con escudo griego (égida)", desc: "Mitológico, poderoso" },
    { id: "v8", name: "Variant 8: A con búho", desc: "Sabiduría, inteligencia" },
    { id: "v9", name: "Variant 9: A con casco de Atenea", desc: "Guerra estratégica, protección" },
    { id: "v10", name: "Variant 10: A con olivo", desc: "Paz, sabiduría, victoria" },
    { id: "v11", name: "Variant 11: A en escudo circular griego", desc: "Clásico, elegante" },
    { id: "v12", name: "Variant 12: A con escudo y búho", desc: "Sabiduría + protección" },
    { id: "v13", name: "Variant 13: A con escudo hexagonal", desc: "Moderno, tech, protección" },
    { id: "v14", name: "Variant 14: A con corona de olivo y escudo", desc: "Victoria, sabiduría, autoridad" },
    { id: "owl1", name: "🦉 Owl 1: Búho minimalista (estilo imagen)", desc: "Líneas gruesas, navy, similar a referencia" },
    { id: "owl2", name: "🦉 Owl 2: Búho geométrico moderno", desc: "Más angular, tech, profesional" },
    { id: "owl3", name: "🦉 Owl 3: Búho con A integrada", desc: "Búho + letra A, simbólico" },
    { id: "owl4", name: "🦉 Owl 4: Búho en escudo", desc: "Protección + sabiduría, elegante" },
    { id: "owl5", name: "🦉 Owl 5: Búho ultra minimalista", desc: "Solo líneas esenciales, limpio" },
    { id: "arrow1", name: "⬆️ Arrow 1: A doble capa (estilo imagen)", desc: "Silver exterior, navy interior, base abierta" },
    { id: "arrow2", name: "⬆️ Arrow 2: A doble capa con base", desc: "Base cerrada, más definida" },
    { id: "arrow3", name: "⬆️ Arrow 3: A angular moderna", desc: "Más ancha, más angular, tech" },
    { id: "arrow4", name: "⬆️ Arrow 4: A con gradiente", desc: "Gradiente silver, elegante" },
    { id: "arrow5", name: "⬆️ Arrow 5: A invertida", desc: "Navy exterior, silver interior" },
    { id: "arrow6", name: "⬆️ Arrow 6: A con efecto 3D", desc: "Sombra, profundidad, moderno" },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-display font-bold mb-2">Propuestas de Logo Atenea</h1>
        <p className="text-muted-foreground mb-12">
          Selecciona la variante que mejor represente la seriedad y profesionalismo de Atenea
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="p-8 rounded-2xl bg-card border border-border hover:border-silver/30 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col items-center gap-6 mb-4">
                {/* Logo en diferentes tamaños */}
                <div className="flex flex-col items-center gap-4">
                  <AteneaLogo 
                    variant={variant.id as any} 
                    size={80} 
                    showText={false}
                    className="text-navy-dark"
                  />
                  <AteneaLogo 
                    variant={variant.id as any} 
                    size={40} 
                    showText={true}
                    className="text-foreground"
                  />
                </div>
                
                <div className="text-center">
                  <h3 className="font-display text-lg font-semibold mb-2">{variant.name}</h3>
                  <p className="text-sm text-muted-foreground">{variant.desc}</p>
                </div>
              </div>

              {/* Preview en diferentes contextos */}
              <div className="space-y-3 mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <AteneaLogo 
                    variant={variant.id as any} 
                    size={24} 
                    showText={true}
                    className="text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">Header pequeño</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gradient-silver rounded-lg">
                  <AteneaLogo 
                    variant={variant.id as any} 
                    size={32} 
                    showText={true}
                    className="text-navy-dark"
                  />
                  <span className="text-xs text-navy-dark/70">Sobre gradiente</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-2xl bg-muted/30 border border-border">
          <h2 className="text-2xl font-display font-bold mb-4">Recomendaciones por Estilo</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">🏛️ Clásico y Serio</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">V7</strong>: Escudo griego (égida) - Mitológico y poderoso</li>
                <li><strong className="text-foreground">V11</strong>: Escudo circular con patrón griego - Elegante</li>
                <li><strong className="text-foreground">V14</strong>: Corona de olivo + escudo - Victoria y autoridad</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">🦉 Sabiduría e Inteligencia</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">V8</strong>: Búho - Símbolo clásico de sabiduría</li>
                <li><strong className="text-foreground">V12</strong>: Escudo + búho - Protección y sabiduría</li>
                <li><strong className="text-foreground">V10</strong>: Olivo - Paz y sabiduría</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">⚔️ Protección y Autoridad</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">V5</strong>: Escudo básico - Autoridad</li>
                <li><strong className="text-foreground">V9</strong>: Casco de Atenea - Guerra estratégica</li>
                <li><strong className="text-foreground">V13</strong>: Escudo hexagonal - Moderno y tech</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">✨ Minimalista y Moderno</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">V1</strong>: A con balanza - Balance perfecto</li>
                <li><strong className="text-foreground">V4</strong>: A pura - Ultra limpio</li>
                <li><strong className="text-foreground">V2</strong>: A geométrica - Tech moderno</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-2">⬆️ A Doble Capa (Estilo Imagen)</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Arrow1</strong>: Estilo imagen - Silver/navy, base abierta</li>
                <li><strong className="text-foreground">Arrow2</strong>: Con base cerrada - Más definida</li>
                <li><strong className="text-foreground">Arrow3</strong>: Angular moderna - Más tech</li>
                <li><strong className="text-foreground">Arrow4</strong>: Con gradiente - Elegante</li>
                <li><strong className="text-foreground">Arrow6</strong>: Efecto 3D - Profundidad</li>
              </ul>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Para cambiar el logo, edita el componente <code className="bg-muted px-2 py-1 rounded">Header.tsx</code> y cambia la prop <code className="bg-muted px-2 py-1 rounded">variant</code> en <code className="bg-muted px-2 py-1 rounded">AteneaLogo</code>
          </p>
        </div>
      </div>
    </div>
  );
}
