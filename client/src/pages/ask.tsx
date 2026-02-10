import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Loader2, FileText, Sparkles, AlertTriangle, BookOpen, Search, Copy, Check, Save, Trash2, X, ChevronRight, Bookmark, BookmarkCheck } from "lucide-react";
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
function FormattedAnswer({ 
  text, 
  tesisUsed, 
  onSuggestionClick,
  onReferenceClick
}: { 
  text: string; 
  tesisUsed: Array<{ id: string; title: string; citation: string }>; 
  onSuggestionClick?: (suggestion: string) => void;
  onReferenceClick?: (index: number) => void;
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
  
  // Ya no parseamos referencias ni sugerencias del texto - las fuentes se muestran en la sección "Tesis & Precedentes Used"
  // Remover cualquier sección SUGERENCIAS: si el LLM la incluye por error
  let mainText = text;
  mainText = mainText.replace(/SUGERENCIAS:.*$/im, '').trim();
  
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
      
      // Detectar puntos principales numerados (1., 2., 3., etc.)
      const mainPointMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (mainPointMatch) {
        const pointNumber = mainPointMatch[1];
        const pointContent = mainPointMatch[2];
        const processedContent = processBoldAndLinks(pointContent);
        currentSection.push(
          <div key={`main-point-${index}`} className="mb-4 sm:mb-5 mt-3 first:mt-0">
            <div className={`${sizeClasses.paragraph} font-serif font-bold text-foreground leading-relaxed mb-2`} style={{ lineHeight: '1.9' }}>
              {pointNumber}. {processedContent}
            </div>
          </div>
        );
        lastWasTitle = false;
        return;
      }
      
      // Detectar listas con viñetas normales (-)
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
      
      // Agregar enlace con scroll suave y highlight
      parts.push(
        <a
          key={`link-${match.tesisIndex}-${match.index}-${idx}`}
          href={`#tesis-${match.tesisIndex}`}
          onClick={(e) => {
            e.preventDefault();
            // Llamar a la función de callback si existe
            if (onReferenceClick) {
              onReferenceClick(match.tesisIndex);
            }
            // Scroll a la ficha en el sidebar
            const element = document.getElementById(`tesis-${match.tesisIndex}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          className="text-primary hover:text-primary/80 underline decoration-muted-foreground/30 hover:decoration-primary/50 transition-colors font-bold cursor-pointer"
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
    </div>
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
  onSuggestionClick,
  onReferenceClick
}: { 
  message: ChatMessage; 
  onSuggestionClick?: (suggestion: string) => void;
  onReferenceClick?: (index: number) => void;
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
              onReferenceClick={onReferenceClick}
            />
          ) : (
            <p className="text-sm sm:text-base font-serif leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
        </div>
        
      </div>
    </div>
  );
}

// Interfaz para documentos guardados
export interface SavedDocument {
  id: string;
  title: string;
  citation: string;
  source: "tesis" | "precedente";
  savedAt: number;
  relevanceScore?: number;
}

// Funciones para manejar documentos guardados (exportadas para uso en otras páginas)
export const SAVED_DOCUMENTS_KEY = 'atenea_saved_documents';

export const getSavedDocuments = (): SavedDocument[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(SAVED_DOCUMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveDocument = (doc: Omit<SavedDocument, 'savedAt'>): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = getSavedDocuments();
    // Verificar si ya está guardado
    if (saved.some(d => d.id === doc.id && d.source === doc.source)) {
      return false; // Ya está guardado
    }
    saved.push({ ...doc, savedAt: Date.now() });
    localStorage.setItem(SAVED_DOCUMENTS_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
};

export const removeDocument = (id: string, source: "tesis" | "precedente"): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = getSavedDocuments();
    const filtered = saved.filter(d => !(d.id === id && d.source === source));
    localStorage.setItem(SAVED_DOCUMENTS_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
};

export const isDocumentSaved = (id: string, source: "tesis" | "precedente"): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = getSavedDocuments();
  return saved.some(d => d.id === id && d.source === source);
};

// Componente para mostrar una tesis usada en la sección de fuentes
function TesisUsedCard({ 
  item, 
  index, 
  t,
  isHighlighted = false
}: { 
  item: { id: string; title: string; citation: string; relevanceScore: number; source?: "tesis" | "precedente" }; 
  index: number; 
  t: (key: string) => string;
  isHighlighted?: boolean;
}) {
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [isSaved, setIsSaved] = useState(() => isDocumentSaved(item.id, item.source || "tesis"));
  const { toast } = useToast();
  const isPrecedente = item.source === "precedente";
  
  // Actualizar estado cuando cambie el item
  useEffect(() => {
    setIsSaved(isDocumentSaved(item.id, item.source || "tesis"));
  }, [item.id, item.source]);
  
  // Truncar título si es muy largo (120 caracteres)
  const MAX_TITLE_LENGTH = 120;
  const shouldTruncate = item.title.length > MAX_TITLE_LENGTH;
  const displayTitle = shouldTruncate && !showFullTitle 
    ? item.title.substring(0, MAX_TITLE_LENGTH) + "..."
    : item.title;
  
  return (
    <Card 
      id={`tesis-${index + 1}`} 
      className={`border-border bg-card/50 transition-all duration-500 ${
        isHighlighted 
          ? 'border-primary border-2 shadow-lg shadow-primary/20 bg-primary/5' 
          : 'border'
      }`}
    >
      <CardContent className="p-2.5 sm:p-3">
        <div className="space-y-2">
          {/* Header con número, tipo y relevancia */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-xs font-serif font-semibold px-2 py-0.5">
              #{index + 1}
            </Badge>
            <Badge variant={isPrecedente ? "default" : "secondary"} className="text-xs font-serif px-2 py-0.5">
              {isPrecedente ? t('search.sourcePrecedente') : t('search.sourceTesis')}
            </Badge>
            <span className="text-xs text-muted-foreground font-serif">
              {(item.relevanceScore * 100).toFixed(1)}%
            </span>
          </div>
          
          {/* Título (truncado si es muy largo) */}
          <div>
            <h4 className="font-bold text-sm text-foreground font-serif break-words leading-snug">
              {displayTitle}
            </h4>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullTitle(!showFullTitle)}
                className="text-xs text-primary hover:underline font-serif mt-0.5"
              >
                {showFullTitle ? 'Menos' : 'Más'}
              </button>
            )}
          </div>
          
          {/* Botones de acción */}
          <div className="pt-1.5 border-t border-border flex gap-2">
            {isPrecedente ? (
              <Link href={`/precedente/${item.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="gap-1.5 font-serif text-xs h-7 px-3 w-full">
                  <FileText className="h-3.5 w-3.5" />
                  {t('search.viewPrecedente')}
                </Button>
              </Link>
            ) : (
              <Link href={`/tesis/${item.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="gap-1.5 font-serif text-xs h-7 px-3 w-full">
                  <FileText className="h-3.5 w-3.5" />
                  {t('search.viewFull')}
                </Button>
              </Link>
            )}
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              className="gap-1.5 font-serif text-xs h-7 px-3"
              onClick={() => {
                const source = item.source || "tesis";
                if (isSaved) {
                  if (removeDocument(item.id, source)) {
                    setIsSaved(false);
                    toast({
                      title: "Documento eliminado",
                      description: "El documento se ha eliminado de tu biblioteca",
                    });
                  }
                } else {
                  if (saveDocument({
                    id: item.id,
                    title: item.title,
                    citation: item.citation,
                    source: source,
                    relevanceScore: item.relevanceScore,
                  })) {
                    setIsSaved(true);
                    toast({
                      title: "Documento guardado",
                      description: "El documento se ha guardado en tu biblioteca",
                    });
                  } else {
                    toast({
                      title: "Error",
                      description: "No se pudo guardar el documento",
                      variant: "destructive",
                    });
                  }
                }
              }}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Guardado
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
  
  // Estado para el sidebar de fuentes (móvil)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado para resaltar una ficha cuando se hace click en una referencia
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Obtener fuentes de la última respuesta de Atenea
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
  const currentSources = lastAssistantMessage?.response?.tesisUsed || [];
  
  // Función para manejar clicks en referencias [1], [2], etc.
  const handleReferenceClick = (index: number) => {
    setHighlightedSourceIndex(index);
    // Remover el highlight después de 3 segundos
    setTimeout(() => {
      setHighlightedSourceIndex(null);
    }, 3000);
  };

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

  // Función para guardar la búsqueda en el historial
  const handleSaveSearch = async () => {
    if (messages.length === 0) {
      toast({
        title: "No hay búsqueda para guardar",
        description: "Realiza una búsqueda primero",
        variant: "default",
      });
      return;
    }

    try {
      // Obtener la primera pregunta del usuario
      const firstUserMessage = messages.find(m => m.role === 'user');
      const firstAssistantMessage = messages.find(m => m.role === 'assistant');
      
      if (!firstUserMessage || !firstAssistantMessage) {
        toast({
          title: "Error",
          description: "No se pudo guardar la búsqueda",
          variant: "destructive",
        });
        return;
      }

      // Guardar en localStorage con un ID único
      const searchId = `search-${Date.now()}`;
      const searchData = {
        id: searchId,
        question: firstUserMessage.content,
        answer: firstAssistantMessage.content,
        messages: messages,
        tesisUsed: firstAssistantMessage.response?.tesisUsed || [],
        timestamp: Date.now(),
      };

      // Obtener búsquedas guardadas existentes
      const savedSearchesKey = "atenea_saved_searches";
      const existingSearches = localStorage.getItem(savedSearchesKey);
      const searches = existingSearches ? JSON.parse(existingSearches) : [];
      searches.push(searchData);
      
      // Guardar solo las últimas 50 búsquedas
      const limitedSearches = searches.slice(-50);
      localStorage.setItem(savedSearchesKey, JSON.stringify(limitedSearches));

      toast({
        title: "Búsqueda guardada",
        description: "La búsqueda se ha guardado en tu historial",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving search:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la búsqueda",
        variant: "destructive",
      });
    }
  };

  // Función para limpiar el chat
  const handleClearChat = () => {
    if (messages.length === 0) {
      return;
    }

    // Confirmar antes de limpiar
    if (window.confirm("¿Estás seguro de que quieres limpiar esta conversación?")) {
      setMessages([]);
      setQuestion("");
      
      // Limpiar localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }

      toast({
        title: "Chat limpiado",
        description: "La conversación ha sido eliminada",
        variant: "default",
      });
    }
  };

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

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Estado inicial - Centrado estilo ChatGPT */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-4">
          <div className="w-full max-w-3xl mx-auto space-y-6">
            {/* Título centrado */}
            <div className="text-center space-y-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                {t('search.title')}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground font-serif max-w-2xl mx-auto">
                {t('search.description2')}
              </p>
            </div>
            
            {/* Barra de búsqueda centrada */}
            <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <Card className="border-border bg-card shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
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
                      className="min-h-[120px] max-h-[300px] resize-none text-base sm:text-lg font-serif leading-relaxed border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus-visible:ring-0"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        type="button"
                        size="lg"
                        variant="navy"
                        className="gap-2 text-base font-serif px-8"
                        disabled={mutation.isPending || question.trim().length < 10}
                        onClick={handleSearch}
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {t('search.generating')}
                          </>
                        ) : (
                          <>
                            <Search className="h-5 w-5" />
                            {t('search.button')}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground font-serif">
                        Presiona Cmd/Ctrl + Enter para enviar
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area - Chat + Sidebar + Input Bar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat + Sidebar Row */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area + Input Bar Container */}
          <div className={`flex flex-col overflow-hidden ${
            currentSources.length > 0 
              ? 'lg:w-[calc(100%-450px)]' // Ancho fijo cuando hay sidebar
              : 'flex-1'
          }`}>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-56">
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
                    onReferenceClick={handleReferenceClick}
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
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-primary/80"></div>
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-primary/40 animate-ping"></div>
                      </div>
                      <span className="text-sm text-muted-foreground font-serif font-mono tabular-nums">
                        {elapsedSeconds < 60
                          ? `${elapsedSeconds.toFixed(1)}s`
                          : `${Math.floor(elapsedSeconds / 60)}m ${(elapsedSeconds % 60).toFixed(1)}s`
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
              </div>
            </div>
            
            {/* Input Bar - Fija siempre visible */}
            <div className={`fixed bottom-0 left-0 border-t border-border bg-background z-20 ${
              currentSources.length > 0 
                ? 'right-[450px] lg:right-[450px]' // Ancho respetando sidebar
                : 'right-0'
            }`}>
              <div className="px-4 sm:px-6 py-4">
                <div className="max-w-4xl mx-auto">
                  {/* Botones de acción - Solo mostrar si hay mensajes */}
                  {messages.length > 0 && (
                    <div className="flex gap-2 mb-3 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs font-serif"
                        onClick={handleSaveSearch}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Guardar búsqueda
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs font-serif text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleClearChat}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Limpiar chat
                      </Button>
                    </div>
                  )}
                  
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
          
          {/* Sidebar de Fuentes - Desktop */}
          {currentSources.length > 0 && (
            <>
              {/* Desktop Sidebar */}
              <aside className="hidden lg:block w-[450px] border-l border-border bg-background overflow-y-auto flex-shrink-0 z-30 relative pb-56">
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      Fuentes
                    </h3>
                    <Badge variant="secondary" className="text-xs font-serif">
                      {currentSources.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {currentSources.map((item, index) => (
                      <TesisUsedCard 
                        key={item.id} 
                        item={item} 
                        index={index} 
                        t={t}
                        isHighlighted={highlightedSourceIndex === index + 1}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </aside>
            
            {/* Mobile Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden fixed bottom-24 right-4 z-40 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors"
              aria-label="Ver fuentes"
            >
              <BookOpen className="h-5 w-5" />
              {currentSources.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {currentSources.length}
                </span>
              )}
            </button>
            
            {/* Mobile Sidebar Drawer */}
            {sidebarOpen && (
              <>
                <div 
                  className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                  onClick={() => setSidebarOpen(false)}
                />
                <aside className="lg:hidden fixed right-0 top-0 h-full w-[450px] bg-background border-l border-border shadow-xl z-50 overflow-y-auto">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        Fuentes
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-serif">
                          {currentSources.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSidebarOpen(false)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentSources.map((item, index) => (
                        <TesisUsedCard 
                          key={item.id} 
                          item={item} 
                          index={index} 
                          t={t}
                          isHighlighted={highlightedSourceIndex === index + 1}
                        />
                      ))}
                    </div>
                  </div>
                </aside>
              </>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
