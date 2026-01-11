import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Scale, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AnalysisResult } from "@shared/schema";

const EXAMPLE_PROMPTS = [
  {
    text: "Despido de trabajador de organismo público descentralizado",
    description: "Derecho laboral y administrativo",
  },
  {
    text: "Amparo contra multa administrativa sin audiencia previa",
    description: "Amparo y garantías",
  },
  {
    text: "Cláusula penal excesiva en contrato civil",
    description: "Derecho civil contractual",
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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground" data-testid="text-titulo-principal">
            CRITERIO
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tu copiloto de jurisprudencia mexicana. Analiza casos, identifica tesis relevantes y genera argumentos legales.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="caso" className="block text-sm font-medium text-foreground">
              Describe el caso o problema jurídico
            </label>
            <Textarea
              id="caso"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Un trabajador fue despedido de un organismo público descentralizado sin procedimiento previo. El empleador argumenta que no aplica la legislación laboral federal sino la ley del servicio civil local..."
              className="min-h-[160px] resize-none text-base leading-relaxed font-sans"
              data-testid="textarea-caso"
            />
            <p className="text-xs text-muted-foreground">
              Sea lo más específico posible sobre los hechos y el problema legal que enfrenta.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2 text-base"
            disabled={mutation.isPending || descripcion.trim().length < 10}
            data-testid="button-analizar"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analizando caso...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Analizar caso
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            O prueba con un ejemplo:
          </p>
          <div className="grid gap-3">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <Card
                key={index}
                className="p-4 cursor-pointer border-card-border hover-elevate active-elevate-2 transition-colors"
                onClick={() => handleExampleClick(prompt.text)}
                data-testid={`card-ejemplo-${index}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {prompt.text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {prompt.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            CRITERIO utiliza razonamiento basado en reglas sobre jurisprudencia oficial mexicana. 
            Los resultados son orientativos y deben ser verificados por un profesional del derecho.
          </p>
        </div>
      </div>
    </div>
  );
}
