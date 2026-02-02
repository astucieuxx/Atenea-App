import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, FileText, Building2, Sparkles } from "lucide-react";
import ateneaLogo from "@/assets/atenea-logo.png";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AnalysisResult } from "@shared/schema";

const EXAMPLE_PROMPTS = [
  {
    text: "Tercero perjudicado no emplazado en juicio de amparo. ¿Procede la queja o el amparo?",
  },
  {
    text: "Suplencia de la queja deficiente en materia agraria. ¿Cuál es su alcance en el amparo?",
  },
  {
    text: "Suspensión del procedimiento en juicio de amparo. ¿Cuándo procede y quién puede solicitarla?",
  },
];

export default function Home() {
  const [descripcion, setDescripcion] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { descripcion: string }) => {
      const response = await apiRequest("POST", "/api/analyze", data);
      return response as AnalysisResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      setLocation(`/analisis/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo analizar el caso. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (descripcion.trim().length < 10) {
      toast({
        title: "Descripción muy corta",
        description: "Por favor proporcione una descripción más detallada del caso.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ descripcion });
  };

  const handleExampleClick = (text: string) => {
    setDescripcion(text);
  };

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el caso o problema jurídico que necesitas analizar..."
            className="min-h-[120px] resize-none text-base bg-card border-border"
            data-testid="textarea-caso"
          />

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={mutation.isPending || descripcion.trim().length < 10}
            data-testid="button-analizar"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                Analizar caso
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="space-y-4 pt-4">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wider font-medium">
            Ejemplos de consulta
          </p>
          <div className="space-y-2">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleExampleClick(prompt.text)}
                className="w-full text-left p-4 rounded-lg border border-border bg-card hover-elevate active-elevate-2 transition-colors flex items-start gap-3"
                data-testid={`card-ejemplo-${index}`}
              >
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-sm text-foreground leading-relaxed">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              O prueba la búsqueda RAG
            </p>
            <Link href="/ask">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Búsqueda con IA y respuestas generadas
              </Button>
            </Link>
          </div>
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
