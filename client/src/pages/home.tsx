import { Link } from "wouter";
import { FileText, Building2, Sparkles } from "lucide-react";
import ateneaLogo from "@/assets/atenea-logo.png";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <img 
              src={ateneaLogo} 
              alt="Atenea" 
              className="h-40 w-auto object-contain"
              data-testid="img-logo"
            />
          </div>
          <div className="space-y-2">
            <p className="text-primary font-medium text-lg">
              El asistente virtual del litigante moderno
            </p>
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Analiza criterios judiciales, evalúa riesgos y construye argumentos jurídicos sólidos en minutos.
          </p>
        </div>

        {/* Botón grande de Comenzar Prueba Gratuita */}
        <div className="flex justify-center">
          <Link href="/ask">
            <Button 
              variant="navy" 
              size="lg" 
              className="text-lg px-12 py-6 gap-3 font-semibold"
              style={{ 
                boxShadow: '0 0 20px rgba(31, 58, 81, 0.4), 0 4px 14px rgba(31, 58, 81, 0.3)'
              }}
            >
              <Sparkles className="h-5 w-5" />
              {t('landing.startFreeTrial')}
            </Button>
          </Link>
        </div>

        <footer className="flex items-center justify-center gap-6 pt-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Jurisprudencia oficial del SCJN</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Análisis fundamentado</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
