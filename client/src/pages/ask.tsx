import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, FileText, Sparkles, AlertTriangle, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AskResponse } from "@shared/schema";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

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
            <div key={`section-${sectionKey++}`} className="mb-3 sm:mb-4">
              {currentSection}
            </div>
          );
          currentSection = [];
        }
        // Línea separadora elegante con diseño decorativo
        elements.push(
          <div key={`divider-${index}`} className="my-3 sm:my-4 relative">
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
          <div key={`title-wrapper-${index}`} className="mb-2 sm:mb-2.5 mt-2 sm:mt-3 first:mt-0">
            <h3 className={`${sizeClasses.title} font-serif font-bold text-foreground mb-0 tracking-tight`}>
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
          <div key={`list-${index}`} className={`mb-2 sm:mb-2.5 ${sizeClasses.list} text-foreground font-serif leading-relaxed flex items-start gap-2.5 pl-2`}>
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
        const marginTop = lastWasTitle ? 'mt-0.5' : '';
        currentSection.push(
          <p key={`para-${index}`} className={`mb-1.5 sm:mb-2 ${sizeClasses.paragraph} text-foreground font-serif leading-relaxed ${marginTop}`} style={{ lineHeight: '1.9' }}>
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
        <div key={`section-${sectionKey++}`} className="mb-3 sm:mb-4">
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
          className="text-primary hover:text-primary/80 underline decoration-muted-foreground/30 hover:decoration-primary/50 transition-colors font-bold"
        >
          [{match.tesisIndex}]
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
  
  // Estado para controlar si ya se ejecutó la búsqueda automática
  const [autoSearchExecuted, setAutoSearchExecuted] = useState(false);
  
  // Estados para el contador de tiempo
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { t } = useLanguage();

  const mutation = useMutation({
    mutationFn: async (data: { question: string }) => {
      const start = Date.now();
      setStartTime(start);
      setElapsedSeconds(0);
      setTotalTimeSeconds(null);
      
      const response = await apiRequest("POST", "/api/ask", data);
      
      // Log para debug
      console.log("[Ask Page] Response received:", response);
      console.log("[Ask Page] Token usage:", (response as AskResponse).tokenUsage);
      
      const end = Date.now();
      const totalSeconds = ((end - start) / 1000);
      setTotalTimeSeconds(totalSeconds);
      setElapsedSeconds(0);
      setStartTime(null);
      
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
      // Resetear contador en caso de error
      setElapsedSeconds(0);
      setTotalTimeSeconds(null);
      setStartTime(null);
      
      toast({
        title: t('search.error'),
        description: error?.message || t('search.errorDesc'),
        variant: "destructive",
      });
    },
  });

  // Contador de tiempo mientras se genera la respuesta
  useEffect(() => {
    if (!mutation.isPending || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 100); // Actualizar cada 100ms para suavidad

    return () => clearInterval(interval);
  }, [mutation.isPending, startTime]);

  // Ejecutar búsqueda automática si hay una pregunta nueva desde la landing page
  useEffect(() => {
    // Solo ejecutar si hay una pregunta válida, no se ha ejecutado antes, y no hay resultado guardado
    if (question.trim().length >= 10 && !autoSearchExecuted && !savedResult && !mutation.isPending && !mutation.data) {
      // Verificar si la pregunta es nueva (no tiene resultado guardado)
      const saved = localStorage.getItem(STORAGE_KEY);
      let isNewQuestion = true;
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Si la pregunta coincide con la guardada y hay resultado, no ejecutar
          if (parsed.question && parsed.question.trim() === question.trim() && parsed.result) {
            isNewQuestion = false;
          }
        } catch {
          // Ignorar errores
        }
      }
      
      // Si es una pregunta nueva, ejecutar búsqueda automáticamente
      if (isNewQuestion) {
        setAutoSearchExecuted(true);
        // Resetear contador antes de iniciar búsqueda automática
        setElapsedSeconds(0);
        setTotalTimeSeconds(null);
        setStartTime(null);
        mutation.mutate({ question: question.trim() });
      }
    }
  }, [question, autoSearchExecuted, savedResult, mutation.isPending, mutation.data]);

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
            setAutoSearchExecuted(false); // Permitir nueva búsqueda automática
          }
        } catch {
          // Ignorar errores
        }
      } else {
        // Si no hay datos guardados, limpiar resultado
        setSavedResult(null);
        setAutoSearchExecuted(false);
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
        title: t('search.questionTooShort'),
        description: t('search.questionTooShortDesc'),
        variant: "destructive",
      });
      return;
    }
    // Resetear contador antes de iniciar nueva búsqueda
    setElapsedSeconds(0);
    setTotalTimeSeconds(null);
    setStartTime(null);
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
      <div className="container mx-auto px-4 sm:px-6 pt-2 sm:pt-3 pb-4 sm:pb-6">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
          {/* Title and Instructions */}
          <div className="space-y-1.5 sm:space-y-2 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground leading-tight">
              {t('search.title')}
            </h1>
            <div className="space-y-3 sm:space-y-4 text-muted-foreground font-serif">
              <p className="text-sm sm:text-base leading-relaxed">
                {t('search.description1').split('Inteligencia Artificial (AI)').map((part, i, arr) => 
                  i === arr.length - 1 ? part : (
                    <React.Fragment key={i}>
                      {part}
                      <strong className="text-foreground font-semibold">Inteligencia Artificial (AI)</strong>
                    </React.Fragment>
                  )
                )}
              </p>
              <p className="text-sm sm:text-base leading-relaxed">
                {t('search.description2')}
              </p>
            </div>
          </div>

          {/* Search Form */}
          <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-3">
                  <label htmlFor="question-input" className="text-base sm:text-lg font-serif font-semibold text-foreground">
                    {t('search.questionLabel')}
                  </label>
                  <Textarea
                    id="question-input"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t('search.questionPlaceholder')}
                    className="min-h-[140px] sm:min-h-[160px] resize-none text-base sm:text-lg font-serif leading-relaxed border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus-visible:ring-0"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Contador de tiempo mientras se genera */}
                  {mutation.isPending && (
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-2 h-2 rounded-full bg-primary/80"></div>
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary/40 animate-ping"></div>
                        </div>
                        <span className="text-xs font-mono font-medium text-foreground/80 tabular-nums tracking-wider">
                          {elapsedSeconds < 60 
                            ? `${elapsedSeconds.toFixed(1)}s` 
                            : `${Math.floor(elapsedSeconds / 60)}m ${(elapsedSeconds % 60).toFixed(1)}s`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end w-full sm:w-auto">
                    <Button
                      type="submit"
                      size="default"
                      variant="navy"
                      className="gap-2 text-sm font-serif px-6"
                      disabled={mutation.isPending || question.trim().length < 10}
                    >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('search.generating')}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        {t('search.button')}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Example Questions - Solo mostrar si NO hay resultado */}
              {showExamples && (
                <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-border animate-fade-up" style={{ animationDelay: '0.5s' }}>
                  <p className="text-sm sm:text-base text-muted-foreground uppercase tracking-wider font-serif font-semibold mb-4 sm:mb-5">
                    {t('search.examples')}
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
                    <h3 className="font-semibold text-foreground mb-2 font-serif text-lg">{t('search.error')}</h3>
                    <p className="text-base text-muted-foreground font-serif leading-relaxed">
                      {t('search.errorDesc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasResult && (
            <div className="space-y-3 sm:space-y-4">
              {/* Answer */}
              <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="p-6 sm:p-8 pb-0.5 sm:pb-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="flex items-center gap-3 text-foreground text-xl sm:text-2xl font-serif font-semibold">
                        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        {t('search.answer')}
                      </CardTitle>
                      {/* Tiempo total de generación y tokens usados */}
                      <div className="flex flex-col gap-0.5 ml-8 mt-1">
                        {totalTimeSeconds !== null && (
                          <p className="text-[10px] text-muted-foreground/60 font-serif tracking-wide">
                            {totalTimeSeconds < 60 
                              ? `Generada en ${totalTimeSeconds.toFixed(1)} segundos`
                              : `Generada en ${Math.floor(totalTimeSeconds / 60)} minuto${Math.floor(totalTimeSeconds / 60) > 1 ? 's' : ''} ${(totalTimeSeconds % 60).toFixed(1)} segundo${(totalTimeSeconds % 60).toFixed(1) !== '1.0' ? 's' : ''}`
                            }
                          </p>
                        )}
                        {result.tokenUsage ? (
                          result.tokenUsage.totalTokens > 0 ? (
                            <p className="text-[10px] text-muted-foreground/60 font-serif tracking-wide">
                              Tokens: {result.tokenUsage.totalTokens.toLocaleString()} 
                              {' '}(prompt: {result.tokenUsage.promptTokens.toLocaleString()}, 
                              {' '}completion: {result.tokenUsage.completionTokens.toLocaleString()})
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/40 font-serif tracking-wide italic">
                              (Tokens: 0 - La API no devolvió información de uso)
                            </p>
                          )
                        ) : (
                          <p className="text-[10px] text-muted-foreground/40 font-serif tracking-wide italic">
                            (Información de tokens no disponible)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 pt-0">
                  <div className="prose prose-lg max-w-none">
                    <FormattedAnswer text={result.answer} tesisUsed={result.tesisUsed} />
                  </div>
                </CardContent>
              </Card>

              {/* Tesis & Precedentes Used */}
              {result.tesisUsed.length > 0 && (
                <Card className="border-border bg-card shadow-sm animate-fade-up" style={{ animationDelay: '0.2s' }}>
                  <CardHeader className="p-6 sm:p-8 pb-3 sm:pb-4">
                    <CardTitle className="flex flex-wrap items-center gap-3 text-foreground text-xl sm:text-2xl font-serif font-semibold">
                      <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      {t('search.tesisSupport')}
                      <Badge variant="secondary" className="text-sm font-serif">{result.tesisUsed.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 sm:p-8 pt-0">
                    <div className="space-y-3 sm:space-y-4">
                      {result.tesisUsed.map((item, index) => {
                        const isPrecedente = item.source === "precedente";
                        return (
                        <Card key={item.id} id={`tesis-${index + 1}`} className="border-border bg-secondary/30 scroll-mt-20">
                          <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col gap-4">
                              {/* Header con número, tipo y relevancia */}
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="outline" className="text-sm font-serif font-semibold">
                                  #{index + 1}
                                </Badge>
                                <Badge variant={isPrecedente ? "default" : "secondary"} className="text-xs font-serif">
                                  {isPrecedente ? t('search.sourcePrecedente') : t('search.sourceTesis')}
                                </Badge>
                                <span className="text-sm text-muted-foreground font-serif">
                                  {t('search.relevance')}: {(item.relevanceScore * 100).toFixed(1)}%
                                </span>
                              </div>

                              {/* Rubro */}
                              <h4 className="font-semibold text-base sm:text-lg text-foreground font-serif break-words leading-relaxed">
                                {item.title}
                              </h4>

                              {/* Cita */}
                              {item.citation && (
                                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                                  {item.citation}
                                </p>
                              )}

                              {/* Botón para ver detalle */}
                              <div className="mt-4 pt-4 border-t border-border">
                                {isPrecedente ? (
                                  <Button variant="outline" size="sm" className="gap-2 font-serif" disabled>
                                    <FileText className="h-4 w-4" />
                                    {t('search.viewPrecedente')}
                                  </Button>
                                ) : (
                                  <Link href={`/tesis/${item.id}`}>
                                    <Button variant="outline" size="sm" className="gap-2 font-serif">
                                      <FileText className="h-4 w-4" />
                                      {t('search.viewFull')}
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!result.hasEvidence && (
                <Card className="border-yellow-500/50 bg-yellow-500/5 shadow-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">
                          {t('search.limitedEvidence')}
                        </h3>
                        <p className="text-sm text-muted-foreground font-body">
                          {t('search.limitedEvidenceDesc')}
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
                {t('search.backHome')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
