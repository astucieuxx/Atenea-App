import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, FileText, Sparkles, AlertTriangle, CheckCircle2, BookOpen, Search } from "lucide-react";
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

const STORAGE_KEY = "atenea_rag_search";

export default function Ask() {
  // Restaurar estado desde localStorage al montar
  const [question, setQuestion] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.question || "";
        } catch {
          return "";
        }
      }
    }
    return "";
  });
  
  // Estado para guardar el resultado restaurado
  const [savedResult, setSavedResult] = useState<AskResponse | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Solo restaurar si tiene menos de 1 hora de antigüedad
          const oneHour = 60 * 60 * 1000;
          if (parsed.timestamp && Date.now() - parsed.timestamp < oneHour && parsed.result) {
            return parsed.result;
          }
        } catch {
          // Ignorar errores
        }
      }
    }
    return null;
  });
  
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { question: string }) => {
      const response = await apiRequest("POST", "/api/ask", data);
      return response as AskResponse;
    },
    onSuccess: (data, variables) => {
      // Guardar pregunta y resultado en localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          question: variables.question,
          result: data,
          timestamp: Date.now(),
        }));
      }
      // Actualizar el estado guardado
      setSavedResult(data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudo procesar la pregunta. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Limpiar resultado guardado si la pregunta cambia y no coincide con la guardada
  useEffect(() => {
    if (question.trim() && savedResult) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Si la pregunta actual no coincide con la guardada, limpiar resultado
          if (parsed.question && parsed.question.trim() !== question.trim()) {
            setSavedResult(null);
          }
        } catch {
          // Ignorar errores
        }
      } else {
        // Si no hay datos guardados, limpiar resultado
        setSavedResult(null);
      }
    } else if (!question.trim() && savedResult) {
      // Si la pregunta está vacía, mantener el resultado (puede ser que el usuario solo esté editando)
      // No hacer nada
    }
  }, [question]);

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

  // Usar resultado de la mutación o del localStorage
  const result = mutation.data || savedResult;
  // Solo mostrar ejemplos si NO hay resultado exitoso (verificando que exista answer)
  // Ocultar completamente cuando hay resultado, cuando se está procesando, o cuando hay error
  const hasResult = result && result.answer && result.answer.trim().length > 0;
  const showExamples = !hasResult && !mutation.isPending && !mutation.isError;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Title and Instructions */}
          <div className="space-y-3 sm:space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Búsqueda
            </h1>
            <div className="space-y-2 sm:space-y-3 text-muted-foreground font-body">
              <p className="text-sm sm:text-base">
                Realiza consultas jurídicas y recibe respuestas fundamentadas con jurisprudencia mexicana verificada.
              </p>
              <p className="text-xs sm:text-sm">
                Esta herramienta utiliza <strong className="text-foreground">Inteligencia Artificial (AI)</strong> y tecnología <strong className="text-foreground">RAG (Retrieval-Augmented Generation)</strong> para buscar y analizar automáticamente miles de tesis y precedentes, proporcionándote respuestas precisas y fundamentadas.
              </p>
              <p className="text-xs sm:text-sm">
                Escribe tu pregunta jurídica en lenguaje natural. Sé específico para obtener mejores resultados.
              </p>
            </div>
          </div>

          {/* Search Form */}
          <Card className="border-border shadow-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label htmlFor="question-input" className="text-sm font-semibold text-foreground">
                    Tu pregunta jurídica
                  </label>
                  <Textarea
                    id="question-input"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ejemplo: ¿Cuándo procede el amparo directo? ¿Qué requisitos debe cumplir?"
                    className="min-h-[120px] sm:min-h-[140px] resize-none text-sm sm:text-base border-border focus:border-primary"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 text-sm sm:text-base"
                  disabled={mutation.isPending || question.trim().length < 10}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando respuesta...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Buscar y generar respuesta
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Example Questions - Solo mostrar si NO hay resultado */}
              {showExamples && (
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border animate-fade-up" style={{ animationDelay: '0.5s' }}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3 sm:mb-4">
                    Ejemplos de preguntas
                  </p>
                  <div className="grid gap-2 sm:gap-3">
                    {EXAMPLE_QUESTIONS.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleExampleClick(example)}
                        className="w-full text-left p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-xs sm:text-sm font-body"
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
            <Card className="border-destructive shadow-lg animate-fade-up" style={{ animationDelay: '0.4s' }}>
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

          {hasResult && (
            <div className="space-y-4 sm:space-y-6">
              {/* Answer */}
              <Card className="border-border shadow-lg animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Respuesta
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
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
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap font-body">
                      {result.answer}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Tesis Used */}
              {result.tesisUsed.length > 0 && (
                <Card className="border-border shadow-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-foreground text-lg sm:text-xl">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Tesis que respaldan la respuesta
                      <Badge variant="secondary" className="text-xs">{result.tesisUsed.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-3 sm:space-y-4">
                      {result.tesisUsed.map((tesis, index) => (
                        <Card key={tesis.id} className="border-border bg-card">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    #{index + 1}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Relevancia: {(tesis.relevanceScore * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <h4 className="font-semibold text-sm sm:text-base text-foreground mb-2 font-display break-words">
                                  {tesis.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-muted-foreground font-body">
                                  {tesis.citation}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border">
                              <Link href={`/tesis/${tesis.id}`}>
                                <Button variant="outline" size="sm" className="gap-2">
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
                <Card className="border-yellow-500/50 bg-yellow-500/5 shadow-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          Evidencia limitada
                        </h3>
                        <p className="text-sm text-muted-foreground font-body">
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
          <div className="text-center pt-4">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowRight className="h-4 w-4 rotate-180" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
