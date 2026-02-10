import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, FileText, Sparkles, AlertTriangle, BookOpen, Search, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AskResponse } from "@shared/schema";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/language-context";

// Interfaz para referencias parseadas
interface ParsedReference {
  number: number;
  tipo: string;
  tesis: string;
  rubro: string;
  registro: string;
  epoca: string;
  materia: string;
  instancia: string;
}

// Componente para formatear la respuesta con estilo profesional
function FormattedAnswer({ 
  text, 
  tesisUsed, 
  onSuggestionClick 
}: { 
  text: string; 
  tesisUsed: Array<{ id: string; title: string; citation: string }>; 
  onSuggestionClick?: (suggestion: string) => void;
}) {
  // Tamaño de fuente fijo: pequeño
  const sizeClasses = {
    title: "text-xl sm:text-2xl",
    paragraph: "text-sm sm:text-base",
    list: "text-sm sm:text-base",
  };
  
  // Crear un mapa de tesis por ID para buscar referencias [ID: xxx] (compatibilidad)
  const tesisMapById = new Map(tesisUsed.map((t, idx) => [t.id, { ...t, index: idx + 1 }]));
  
  // Crear un mapa de tesis por título para buscar referencias por título
  const tesisMapByTitle = new Map(tesisUsed.map((t, idx) => [t.title.toLowerCase(), { ...t, index: idx + 1 }]));
  
  // Parsear secciones REFERENCIAS: y SUGERENCIAS: (SUGERENCIAS puede venir antes o después)
  const suggestionsMatch = text.match(/SUGERENCIAS:\s*\n(.+?)(?:\n\n|\nREFERENCIAS:|$)/is);
  const referencesMatch = text.match(/REFERENCIAS:\s*\n((?:\[.*?\]\s*\|.*?\n?)+)/is);
  
  // Extraer referencias parseadas
  const parsedReferences: ParsedReference[] = [];
  if (referencesMatch) {
    const referencesText = referencesMatch[1];
    const referenceLines = referencesText.split('\n').filter(line => line.trim().startsWith('['));
    
    referenceLines.forEach(line => {
      const match = line.match(/\[(\d+)\]\s*\|\s*tipo:\s*([^|]+)\s*\|\s*tesis:\s*([^|]+)\s*\|\s*rubro:\s*([^|]+)\s*\|\s*registro:\s*([^|]+)\s*\|\s*epoca:\s*([^|]+)\s*\|\s*materia:\s*([^|]+)\s*\|\s*instancia:\s*(.+?)(?:\s*\|.*)?$/);
      if (match) {
        parsedReferences.push({
          number: parseInt(match[1], 10),
          tipo: match[2].trim(),
          tesis: match[3].trim(),
          rubro: match[4].trim(),
          registro: match[5].trim(),
          epoca: match[6].trim(),
          materia: match[7].trim(),
          instancia: match[8].trim(),
        });
      }
    });
  }
  
  // Extraer sugerencias
  const suggestions: string[] = [];
  if (suggestionsMatch) {
    const suggestionsText = suggestionsMatch[1].trim();
    suggestions.push(...suggestionsText.split('|').map(s => s.trim()).filter(s => s.length > 0));
  }
  
  // Remover secciones REFERENCIAS: y SUGERENCIAS: del texto principal
  let mainText = text;
  if (referencesMatch) {
    mainText = mainText.replace(/REFERENCIAS:.*$/is, '').trim();
  }
  if (suggestionsMatch) {
    mainText = mainText.replace(/SUGERENCIAS:.*$/is, '').trim();
  }
  
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
    
    // Procesar referencias [1], [2], [3], etc. (nuevo formato) y [ID: xxx] (formato antiguo para compatibilidad)
    let processedText = text;
    
    // Primero procesar referencias numeradas [1], [2], etc.
    const numberRefRegex = /\[(\d+)\]/g;
    processedText = processedText.replace(numberRefRegex, (match, num) => {
      // Convertir [1] a [#1] para que el procesador de enlaces lo maneje
      return `[#${num}]`;
    });
    
    // También procesar referencias [ID: xxx] para compatibilidad
    const idRegex = /\[(?:Precedente\s+)?ID:\s*([^\]]+)\]/gi;
    const idMatches: Array<{ id: string; index: number; original: string }> = [];

    let idMatch;
    while ((idMatch = idRegex.exec(text)) !== null) {
      const docId = idMatch[1].trim();
      const doc = tesisMapById.get(docId);
      if (doc) {
        idMatches.push({
          id: docId,
          index: doc.index,
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
      {formatText(mainText)}
      
      {/* Sección de Referencias */}
      {parsedReferences.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-serif font-bold text-foreground mb-4">Referencias</h3>
          <div className="space-y-4">
            {parsedReferences.map((ref) => (
              <ReferenceCard key={ref.number} reference={ref} />
            ))}
          </div>
        </div>
      )}
      
      {/* Sección de Sugerencias */}
      {suggestions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-lg font-serif font-bold text-foreground mb-4">Preguntas de seguimiento</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <SuggestionButton key={idx} suggestion={suggestion} onClick={onSuggestionClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar una referencia
function ReferenceCard({ reference }: { reference: ParsedReference }) {
  const [copied, setCopied] = useState(false);
  const sjfUrl = `https://sjf2.scjn.gob.mx/detalle/tesis/${reference.registro}`;
  
  const citationText = `Tesis ${reference.tesis} | ${reference.rubro} | Registro: ${reference.registro} | Época: ${reference.epoca} | Materia: ${reference.materia} | Instancia: ${reference.instancia}`;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="border-border bg-secondary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm font-serif font-semibold">
                [{reference.number}]
              </Badge>
              <Badge variant={reference.tipo === 'jurisprudencia' ? 'default' : 'secondary'} className="text-xs">
                {reference.tipo === 'jurisprudencia' ? 'Jurisprudencia' : 'Tesis Aislada'}
              </Badge>
            </div>
            <h4 className="font-semibold text-base text-foreground font-serif leading-snug">
              {reference.rubro}
            </h4>
            <div className="text-sm text-muted-foreground font-serif space-y-1">
              <p><span className="font-medium">Número de tesis:</span> {reference.tesis}</p>
              <p><span className="font-medium">Registro digital:</span> {reference.registro}</p>
              <p><span className="font-medium">Época:</span> {reference.epoca}</p>
              <p><span className="font-medium">Materia:</span> {reference.materia}</p>
              <p><span className="font-medium">Instancia:</span> {reference.instancia}</p>
            </div>
            <a
              href={sjfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-serif"
            >
              Ver en Semanario Judicial de la Federación
              <FileText className="h-3 w-3" />
            </a>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2 font-serif shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para mostrar una sugerencia como botón
function SuggestionButton({ 
  suggestion, 
  onClick 
}: { 
  suggestion: string; 
  onClick?: (suggestion: string) => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="font-serif text-sm"
      onClick={() => {
        if (onClick) {
          onClick(suggestion);
        }
      }}
    >
      {suggestion}
    </Button>
  );
}

// Componente para mensaje del usuario
function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-none p-4 shadow-sm">
          <p className="text-sm sm:text-base font-serif leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente para mensaje de Atenea
function AssistantMessage({ 
  message, 
  onSuggestionClick 
}: { 
  message: ChatMessage; 
  onSuggestionClick?: (suggestion: string) => void;
}) {
  const response = message.response;
  const { t } = useLanguage();
  
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] sm:max-w-[75%] w-full space-y-3">
        <div className="bg-card border border-border rounded-lg rounded-tl-none p-4 sm:p-6 shadow-sm">
          {response ? (
            <FormattedAnswer 
              text={message.content} 
              tesisUsed={response.tesisUsed}
              onSuggestionClick={onSuggestionClick}
            />
          ) : (
            <p className="text-sm sm:text-base font-serif leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
        </div>
        
        {/* Tesis & Precedentes Used */}
        {response && response.tesisUsed.length > 0 && (
          <Card className="border-border bg-secondary/30 shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="flex flex-wrap items-center gap-3 text-foreground text-lg sm:text-xl font-serif font-semibold">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                {t('search.tesisSupport')}
                <Badge variant="secondary" className="text-xs font-serif">{response.tesisUsed.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                {response.tesisUsed.map((item, index) => {
                  const isPrecedente = item.source === "precedente";
                  return (
                    <Card key={item.id} id={`tesis-${index + 1}`} className="border-border bg-card/50">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs font-serif font-semibold">
                              #{index + 1}
                            </Badge>
                            <Badge variant={isPrecedente ? "default" : "secondary"} className="text-xs font-serif">
                              {isPrecedente ? t('search.sourcePrecedente') : t('search.sourceTesis')}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-serif">
                              {t('search.relevance')}: {(item.relevanceScore * 100).toFixed(1)}%
                            </span>
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-foreground font-serif break-words leading-snug">
                            {item.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.citation && (
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-muted-foreground font-serif hover:text-foreground transition-colors list-none">
                                  <span className="inline-flex items-center gap-1 underline">
                                    Ver cita completa
                                  </span>
                                </summary>
                                <div className="mt-2 p-3 bg-muted/50 rounded-md border border-border">
                                  <p className="text-xs text-foreground font-serif leading-relaxed whitespace-pre-wrap">
                                    {item.citation}
                                  </p>
                                </div>
                              </details>
                            )}
                            {isPrecedente ? (
                              <Link href={`/precedente/${item.id}`}>
                                <Button variant="outline" size="sm" className="gap-1.5 font-serif text-xs h-7">
                                  <FileText className="h-3 w-3" />
                                  {t('search.viewPrecedente')}
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/tesis/${item.id}`}>
                                <Button variant="outline" size="sm" className="gap-1.5 font-serif text-xs h-7">
                                  <FileText className="h-3 w-3" />
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
      </div>
    </div>
  );
}

// Componente de botón para copiar cita formal
function CopyCitationButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2 font-serif" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

const EXAMPLE_QUESTIONS = [
  "¿Qué es el amparo directo?",
  "¿Cuándo procede la suspensión en juicio de amparo?",
  "¿Qué es el interés jurídico en amparo?",
];

const STORAGE_KEY = "atenea_rag_search";

// Interfaz para mensajes del chat
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: AskResponse;
  timestamp: number;
}

export default function Ask() {
  // Estado para el historial de conversación
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Estado para la pregunta actual en el input
  const [question, setQuestion] = useState("");
  
  // Referencia para scroll automático
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
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
      // Agregar respuesta de Atenea al historial
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.answer,
        response: data,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Guardar en localStorage
      if (typeof window !== "undefined") {
        const chatHistory = [...messages, {
          id: `msg-${Date.now()}-user`,
          role: 'user' as const,
          content: variables.question,
          timestamp: Date.now(),
        }, assistantMessage];
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          messages: chatHistory,
          timestamp: Date.now(),
        }));
      }
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

  // Cargar historial desde localStorage al montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.messages && Array.isArray(parsed.messages)) {
            setMessages(parsed.messages);
          }
        } catch {
          // Ignorar errores
        }
      }
    }
  }, []);

  const handleSearch = () => {
    console.log("[Ask] handleSearch called explicitly by user action");
    if (question.trim().length < 10) {
      toast({
        title: t('search.questionTooShort'),
        description: t('search.questionTooShortDesc'),
        variant: "destructive",
      });
      return;
    }
    
    // Agregar mensaje del usuario al historial
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: question.trim(),
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Resetear contador antes de iniciar nueva búsqueda
    setElapsedSeconds(0);
    setTotalTimeSeconds(null);
    setStartTime(null);
    
    // Limpiar input
    setQuestion("");
    
    // Hacer la petición
    mutation.mutate({ question: userMessage.content });
  };
  
  // Scroll automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mutation.isPending]);

  const handleExampleClick = (text: string) => {
    setQuestion(text);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
  };
  
  const showExamples = messages.length === 0 && !mutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - Solo mostrar si no hay mensajes */}
      {messages.length === 0 && (
        <div className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
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
          </div>
        </div>
      )}
      
      {/* Chat Area */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                {message.role === 'user' ? (
                  <UserMessage message={message} />
                ) : (
                  <AssistantMessage 
                    message={message} 
                    onSuggestionClick={handleSuggestionClick}
                  />
                )}
              </React.Fragment>
            ))}
            
            {/* Loading indicator */}
            {mutation.isPending && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div className="bg-card border border-border rounded-lg rounded-tl-none p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-serif">
                        {elapsedSeconds < 60
                          ? `Generando respuesta... ${elapsedSeconds.toFixed(1)}s`
                          : `Generando respuesta... ${Math.floor(elapsedSeconds / 60)}m ${(elapsedSeconds % 60).toFixed(1)}s`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error message */}
            {mutation.isError && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg rounded-tl-none p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-1 font-serif text-sm">
                          {t('search.error')}
                        </h3>
                        <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                          {t('search.errorDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Example Questions - Solo mostrar si no hay mensajes */}
          {showExamples && (
            <div className="mt-8 pt-6 border-t border-border animate-fade-up" style={{ animationDelay: '0.5s' }}>
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
        </div>
      </div>
      
      {/* Input Bar - Fixed at bottom */}
      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Textarea
                  id="question-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder={t('search.questionPlaceholder')}
                  className="min-h-[60px] max-h-[200px] resize-none text-sm sm:text-base font-serif leading-relaxed border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus-visible:ring-0"
                />
              </div>
              <Button
                type="button"
                size="default"
                variant="navy"
                className="gap-2 text-sm font-serif px-6 shrink-0"
                disabled={mutation.isPending || question.trim().length < 10}
                onClick={handleSearch}
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
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-serif">
              Presiona Cmd/Ctrl + Enter para enviar
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
