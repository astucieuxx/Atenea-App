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

// Componente para formatear la respuesta con estilo profesional
function FormattedAnswer({ text, tesisUsed }: { text: string; tesisUsed: Array<{ id: string; title: string; citation: string }> }) {
  // Tamaño de fuente fijo: pequeño
  const sizeClasses = {
    title: "text-xl sm:text-2xl",
    paragraph: "text-sm sm:text-base",
    list: "text-sm sm:text-base",
  };
  
  // Crear un mapa de tesis por ID para buscar referencias [ID: xxx]
  const tesisMapById = new Map(tesisUsed.map((t, idx) => [t.id, { ...t, index: idx + 1 }]));
  
  // Crear un mapa de tesis por título para buscar referencias por título
  const tesisMapByTitle = new Map(tesisUsed.map((t, idx) => [t.title.toLowerCase(), { ...t, index: idx + 1 }]));
  
  // Función para procesar el texto y convertirlo en elementos React
  const formatText = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentSection: JSX.Element[] = [];
    let sectionKey = 0;
    let lastWasTitle = false;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Detectar separadores (---)
      if (trimmedLine === '---' || trimmedLine.startsWith('---')) {
        if (currentSection.length > 0) {
          elements.push(
            <div key={`section-${sectionKey++}`} className="mb-8 sm:mb-10">
              {currentSection}
            </div>
          );
          currentSection = [];
        }
        // Línea separadora elegante con diseño decorativo
        elements.push(
          <div key={`divider-${index}`} className="my-8 sm:my-10 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-card px-4">
                <div className="w-2 h-2 rounded-full bg-muted-foreground opacity-40"></div>
              </div>
            </div>
          </div>
        );
        lastWasTitle = false;
        return;
      }
      
      // Detectar títulos (líneas que empiezan con ** y terminan con **)
      const titleMatch = trimmedLine.match(/^\*\*(.+?)\*\*$/);
      if (titleMatch) {
        if (currentSection.length > 0) {
          elements.push(
            <div key={`section-${sectionKey++}`} className="mb-8 sm:mb-10">
              {currentSection}
            </div>
          );
          currentSection = [];
        }
        // Título elegante con estilo formal
        const titleText = titleMatch[1];
        elements.push(
          <div key={`title-wrapper-${index}`} className="mb-6 sm:mb-8 mt-8 sm:mt-10 first:mt-0">
            <h3 className={`${sizeClasses.title} font-serif font-bold text-foreground mb-2 tracking-tight`}>
              {titleText}
            </h3>
          </div>
        );
        lastWasTitle = true;
        return;
      }
      
      // Detectar listas con viñetas
      if (trimmedLine.startsWith('- ')) {
        const content = trimmedLine.substring(2);
        // Procesar negritas dentro de la lista
        const processedContent = processBoldAndLinks(content);
        currentSection.push(
          <div key={`list-${index}`} className={`mb-4 sm:mb-5 ${sizeClasses.list} text-foreground font-serif leading-relaxed flex items-start gap-4 pl-2`}>
            <span className="text-muted-foreground mt-2 shrink-0 font-bold text-lg">▪</span>
            <span className="flex-1" style={{ lineHeight: '1.9' }}>{processedContent}</span>
          </div>
        );
        lastWasTitle = false;
        return;
      }
      
      // Párrafo normal
      if (trimmedLine.length > 0) {
        const processedContent = processBoldAndLinks(trimmedLine);
        // Si viene después de un título, agregar más espacio
        const marginTop = lastWasTitle ? 'mt-4' : '';
        currentSection.push(
          <p key={`para-${index}`} className={`mb-4 sm:mb-5 ${sizeClasses.paragraph} text-foreground font-serif leading-relaxed ${marginTop}`} style={{ lineHeight: '1.9' }}>
            {processedContent}
          </p>
        );
        lastWasTitle = false;
      } else if (currentSection.length > 0) {
        // Línea vacía - agregar espacio
        currentSection.push(<div key={`space-${index}`} className="mb-3"></div>);
      }
    });
    
    // Agregar última sección
    if (currentSection.length > 0) {
      elements.push(
        <div key={`section-${sectionKey++}`} className="mb-8 sm:mb-10">
          {currentSection}
        </div>
      );
    }
    
    return elements;
  };
  
  // Función para procesar negritas y enlaces a tesis
  const processBoldAndLinks = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    
    // Primero procesar referencias [ID: xxx] y convertirlas a [#número]
    const idRegex = /\[ID:\s*(\d+)\]/gi;
    let processedText = text;
    const idMatches: Array<{ id: string; index: number; original: string }> = [];
    
    let idMatch;
    while ((idMatch = idRegex.exec(text)) !== null) {
      const tesisId = idMatch[1];
      const tesis = tesisMapById.get(tesisId);
      if (tesis) {
        idMatches.push({
          id: tesisId,
          index: tesis.index,
          original: idMatch[0]
        });
      }
    }
    
    // Reemplazar [ID: xxx] con [#número]
    idMatches.forEach(({ id, index, original }) => {
      processedText = processedText.replace(original, `[#${index}]`);
    });
    
    // Buscar negritas **texto**
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(processedText)) !== null) {
      // Agregar texto antes de la negrita
      if (match.index > lastIndex) {
        const beforeText = processedText.substring(lastIndex, match.index);
        parts.push(...processTesisLinks(beforeText));
      }
      
      // Agregar texto en negrita con estilo elegante
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-foreground font-serif">
          {match[1]}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Agregar texto restante
    if (lastIndex < processedText.length) {
      const remainingText = processedText.substring(lastIndex);
      parts.push(...processTesisLinks(remainingText));
    }
    
    return parts.length > 0 ? parts : [processedText];
  };
  
  // Función para convertir referencias [#número] a enlaces
  const processTesisLinks = (text: string) => {
    if (tesisMapById.size === 0) return [text];
    
    const parts: (string | JSX.Element)[] = [];
    // Buscar referencias [#número]
    const numberRefRegex = /\[#(\d+)\]/g;
    const matches: Array<{ index: number; length: number; tesisIndex: number; tesisId: string }> = [];
    
    let match;
    while ((match = numberRefRegex.exec(text)) !== null) {
      const tesisIndex = parseInt(match[1], 10);
      const tesis = Array.from(tesisMapById.values()).find(t => t.index === tesisIndex);
      if (tesis) {
        matches.push({
          index: match.index,
          length: match[0].length,
          tesisIndex: tesisIndex,
          tesisId: tesis.id
        });
      }
    }
    
    // Construir el resultado
    let lastIndex = 0;
    matches.forEach((match, idx) => {
      // Agregar texto antes del enlace
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Agregar enlace con scroll suave
      parts.push(
        <a
          key={`link-${match.tesisIndex}-${match.index}-${idx}`}
          href={`#tesis-${match.tesisIndex}`}
          onClick={(e) => {
            e.preventDefault();
            const element = document.getElementById(`tesis-${match.tesisIndex}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="text-primary hover:text-primary/80 underline decoration-muted-foreground/30 hover:decoration-primary/50 transition-colors font-semibold"
        >
          {match.tesisIndex > 0 ? `[#${match.tesisIndex}]` : match.tesisIndex}
        </a>
      );
      
      lastIndex = match.index + match.length;
    });
    
    // Agregar texto restante
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };
  
  return (
    <div className="formatted-answer">
      {formatText(text)}
    </div>
  );
}

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
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
          {/* Title and Instructions */}
          <div className="space-y-4 sm:space-y-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground leading-tight">
              Búsqueda
            </h1>
            <div className="space-y-3 sm:space-y-4 text-muted-foreground font-serif">
              <p className="text-sm sm:text-base leading-relaxed">
                Esta herramienta utiliza <strong className="text-foreground font-semibold">Inteligencia Artificial (AI)</strong> y tecnología <strong className="text-foreground font-semibold">RAG (Retrieval-Augmented Generation)</strong> para buscar y analizar automáticamente miles de tesis y precedentes, proporcionándote respuestas precisas y fundamentadas.
              </p>
              <p className="text-sm sm:text-base leading-relaxed">
                Escribe tu pregunta jurídica en lenguaje natural. Sé específico para obtener mejores resultados.
              </p>
            </div>
          </div>

          {/* Search Form */}
          <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <div className="space-y-3">
                  <label htmlFor="question-input" className="text-base sm:text-lg font-serif font-semibold text-foreground">
                    Tu pregunta jurídica
                  </label>
                  <Textarea
                    id="question-input"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ejemplo: ¿Cuándo procede el amparo directo? ¿Qué requisitos debe cumplir?"
                    className="min-h-[140px] sm:min-h-[160px] resize-none text-base sm:text-lg font-serif leading-relaxed border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus-visible:ring-0"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 text-base sm:text-lg font-serif"
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
                <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-border animate-fade-up" style={{ animationDelay: '0.5s' }}>
                  <p className="text-sm sm:text-base text-muted-foreground uppercase tracking-wider font-serif font-semibold mb-4 sm:mb-5">
                    Ejemplos de preguntas
                  </p>
                  <div className="grid gap-3 sm:gap-4">
                    {EXAMPLE_QUESTIONS.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleExampleClick(example)}
                        className="w-full text-left p-4 sm:p-5 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-border transition-all text-sm sm:text-base font-serif text-foreground leading-relaxed"
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
            <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 font-serif text-lg">Error al procesar</h3>
                    <p className="text-base text-muted-foreground font-serif leading-relaxed">
                      No se pudo generar la respuesta. Verifica tu conexión e intenta de nuevo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasResult && (
            <div className="space-y-6 sm:space-y-8">
              {/* Answer */}
              <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                    <CardTitle className="flex items-center gap-3 text-foreground text-xl sm:text-2xl font-serif font-semibold">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
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
                        className="font-serif"
                      >
                        Confianza: {result.confidence === "high" ? "Alta" : result.confidence === "medium" ? "Media" : "Baja"}
                      </Badge>
                      {result.hasEvidence ? (
                        <Badge variant="default" className="gap-1 font-serif">
                          <CheckCircle2 className="h-3 w-3" />
                          Con evidencia
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 font-serif">
                          <AlertTriangle className="h-3 w-3" />
                          Sin evidencia suficiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-0">
                  <div className="prose prose-lg max-w-none">
                    <FormattedAnswer text={result.answer} tesisUsed={result.tesisUsed} />
                  </div>
                </CardContent>
              </Card>

              {/* Tesis Used */}
              {result.tesisUsed.length > 0 && (
                <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
                    <CardTitle className="flex flex-wrap items-center gap-3 text-foreground text-xl sm:text-2xl font-serif font-semibold">
                      <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      Tesis que respaldan la respuesta
                      <Badge variant="secondary" className="text-sm font-serif">{result.tesisUsed.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 pt-0">
                    <div className="space-y-5 sm:space-y-6">
                      {result.tesisUsed.map((tesis, index) => (
                        <Card key={tesis.id} id={`tesis-${index + 1}`} className="border-border bg-secondary/30 scroll-mt-20">
                          <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col gap-4">
                              {/* Header con número y relevancia */}
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="outline" className="text-sm font-serif font-semibold">
                                  #{index + 1}
                                </Badge>
                                <span className="text-sm text-muted-foreground font-serif">
                                  Relevancia: {(tesis.relevanceScore * 100).toFixed(1)}%
                                </span>
                              </div>
                              
                              {/* Rubro de la tesis (solo una vez) */}
                              <h4 className="font-semibold text-base sm:text-lg text-foreground font-serif break-words leading-relaxed">
                                {tesis.title}
                              </h4>
                              
                              {/* Metadata de la tesis */}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-serif">
                                {tesis.citation && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-foreground/70">Cita:</span>
                                    <span>{tesis.citation}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Botón para ver tesis completa */}
                              <div className="mt-4 pt-4 border-t border-border">
                                <Link href={`/tesis/${tesis.id}`}>
                                  <Button variant="outline" size="sm" className="gap-2 font-serif">
                                    <FileText className="h-4 w-4" />
                                    Ver tesis completa
                                  </Button>
                                </Link>
                              </div>
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
