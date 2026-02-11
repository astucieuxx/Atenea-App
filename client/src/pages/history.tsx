import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  Scale, 
  FileText, 
  ChevronRight,
  Inbox,
  ArrowLeft,
  Clock,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HistoryLoadingSkeleton } from "@/components/loading-skeleton";
import type { CaseHistoryEntry } from "@shared/schema";

// Interfaz para búsquedas guardadas desde localStorage
interface SavedSearch {
  id: string;
  question: string;
  answer: string;
  messages: any[];
  tesisUsed: any[];
  timestamp: number;
}

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery<CaseHistoryEntry[]>({
    queryKey: ["/api/history"],
  });
  
  // Leer búsquedas guardadas desde localStorage
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("atenea_saved_searches");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSavedSearches(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error("Error reading saved searches:", error);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <section className="relative py-12 lg:py-16 border-b border-border/50">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Mis Casos
              </h1>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-6 py-8 lg:py-12">
          <div className="max-w-4xl mx-auto">
            <HistoryLoadingSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Combinar historial del servidor con búsquedas guardadas
  const serverCases = history || [];
  
  // Convertir búsquedas guardadas al formato esperado
  const savedSearchCases: CaseHistoryEntry[] = savedSearches.map((search) => ({
    id: search.id,
    titulo: search.question.slice(0, 80),
    problema_juridico: search.question,
    descripcion: search.answer.slice(0, 200),
    created_at: new Date(search.timestamp).toISOString(),
    tesis_usadas: search.tesisUsed.map(t => t.id),
    argumentos_generados: [],
    rol_procesal: undefined,
    riesgo: undefined,
    recomendaciones: [],
  }));
  
  // Combinar y ordenar por fecha (más recientes primero)
  const allCases = [...serverCases, ...savedSearchCases].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });
  
  const cases = allCases;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 lg:py-16 border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-3 sm:space-y-4">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '0.1s' }}>
              Mis Casos
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground font-body max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
              Historial de todas tus búsquedas y consultas jurídicas
            </p>
            {cases.length > 0 && (
              <div className="pt-2 animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <Badge variant="secondary" className="text-sm">
                  {cases.length} {cases.length === 1 ? "caso" : "casos"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {cases.length === 0 ? (
            <Card className="border-border shadow-lg animate-fade-up" style={{ animationDelay: '0.4s' }}>
              <CardContent className="py-12 sm:py-16 px-4 sm:px-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted mb-4 sm:mb-6">
                  <Inbox className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2 font-display">
                  Sin búsquedas realizadas
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-6 sm:mb-8 font-body">
                  Comienza realizando una búsqueda para ver tu historial aquí.
                </p>
                <Link href="/ask">
                  <Button className="gap-2">
                    <Scale className="h-4 w-4" />
                    Realizar primera búsqueda
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cases.map((caseEntry, index) => (
                <Card
                  key={caseEntry.id} 
                  className="border-border animate-fade-up"
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  data-testid={`card-historial-${caseEntry.id}`}
                >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                          <h3 className="font-display text-base sm:text-lg font-semibold text-foreground line-clamp-2 break-words">
                            {caseEntry.titulo || caseEntry.problema_juridico?.slice(0, 80) || "Caso sin título"}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 font-body">
                            {caseEntry.descripcion?.slice(0, 150)}...
                          </p>

                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground pt-2">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {new Date(caseEntry.created_at).toLocaleDateString("es-MX", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            
                            {caseEntry.tesis_usadas.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                  <Scale className="h-3.5 w-3.5" />
                                  <span>{caseEntry.tesis_usadas.length} tesis</span>
                                </div>
                              </>
                            )}
                            
                            {caseEntry.argumentos_generados.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>{caseEntry.argumentos_generados.length} argumentos</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              ))}
            </div>
          )}

          {/* Back to home */}
          <div className="text-center pt-4 animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/ask">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Nueva búsqueda
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
