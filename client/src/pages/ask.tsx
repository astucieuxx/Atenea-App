import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, FileText, Sparkles, AlertTriangle, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AskResponse } from "@shared/schema";
import { Link } from "wouter";

const EXAMPLE_QUESTIONS = [
  "¿Qué es el amparo directo?",
  "¿Cuándo procede la suspensión en juicio de amparo?",
  "¿Qué es el interés jurídico en amparo?",
];

export default function Ask() {
  const [question, setQuestion] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { question: string }) => {
      const response = await apiRequest("POST", "/api/ask", data);
      return response as AskResponse;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudo procesar la pregunta. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10) {
      toast({
        title: "Pregunta muy corta",
        description: "Por favor proporcione una pregunta más detallada.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ question: question.trim() });
  };

  const handleExampleClick = (text: string) => {
    setQuestion(text);
  };

  const result = mutation.data;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              Búsqueda RAG - Asistente Jurídico
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Haz preguntas jurídicas y recibe respuestas fundamentadas con jurisprudencia
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ejemplo: ¿Cuándo procede el amparo directo? ¿Qué requisitos debe cumplir?"
                className="min-h-[120px] resize-none text-base"
              />
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={mutation.isPending || question.trim().length < 10}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando respuesta...
                  </>
                ) : (
                  <>
                    Buscar y generar respuesta
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Example Questions - Solo mostrar si no hay resultado */}
            {!result && (
              <div className="mt-6 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Ejemplos de preguntas
                </p>
                <div className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleExampleClick(example)}
                      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {mutation.isError && (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-destructive mb-1">Error al procesar</h3>
                  <p className="text-sm text-muted-foreground">
                    No se pudo generar la respuesta. Verifica tu conexión e intenta de nuevo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            {/* Answer */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Respuesta
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        result.confidence === "high"
                          ? "default"
                          : result.confidence === "medium"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      Confianza: {result.confidence === "high" ? "Alta" : result.confidence === "medium" ? "Media" : "Baja"}
                    </Badge>
                    {result.hasEvidence ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Con evidencia
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Sin evidencia suficiente
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {result.answer}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tesis Used */}
            {result.tesisUsed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Tesis que respaldan la respuesta
                    <Badge variant="secondary">{result.tesisUsed.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.tesisUsed.map((tesis, index) => (
                      <Card key={tesis.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  #{index + 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Relevancia: {(tesis.relevanceScore * 100).toFixed(1)}%
                                </span>
                              </div>
                              <h4 className="font-semibold text-foreground mb-2">
                                {tesis.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {tesis.citation}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-border">
                            <Link href={`/tesis/${tesis.id}`}>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Ver tesis completa
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!result.hasEvidence && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        Evidencia limitada
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        No se encontró jurisprudencia directamente aplicable a esta pregunta.
                        Se recomienda reformular la consulta con términos jurídicos más específicos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Back to home */}
        <div className="text-center">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Volver al análisis tradicional
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
