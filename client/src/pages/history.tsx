import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Scale, 
  FileText, 
  ChevronRight,
  Inbox,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HistoryLoadingSkeleton } from "@/components/loading-skeleton";
import type { CaseHistoryEntry } from "@shared/schema";

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery<CaseHistoryEntry[]>({
    queryKey: ["/api/history"],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Nueva consulta
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            Mis Casos
          </h1>
          <HistoryLoadingSkeleton />
        </div>
      </div>
    );
  }

  const cases = history || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Nueva consulta
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-titulo-historial">
            Mis Casos
          </h1>
          <span className="text-sm text-muted-foreground">
            {cases.length} {cases.length === 1 ? "caso" : "casos"}
          </span>
        </div>

        {cases.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-muted mb-4">
                <Inbox className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground mb-2">
                Sin casos analizados
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Comienza analizando un caso para ver tu historial aquí.
              </p>
              <Link href="/">
                <Button className="gap-2">
                  <Scale className="h-4 w-4" />
                  Analizar primer caso
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cases.map((caseEntry) => (
              <Link key={caseEntry.id} href={`/analisis/${caseEntry.id}`}>
                <button 
                  type="button"
                  className="w-full text-left p-5 rounded-lg border border-border bg-card hover-elevate active-elevate-2 transition-colors"
                  data-testid={`card-historial-${caseEntry.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {caseEntry.titulo || caseEntry.problema_juridico?.slice(0, 80) || "Caso sin título"}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {caseEntry.descripcion?.slice(0, 150)}...
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                        <span>
                          {new Date(caseEntry.created_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        
                        {caseEntry.tesis_usadas.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {caseEntry.tesis_usadas.length} tesis
                            </span>
                          </>
                        )}
                        
                        {caseEntry.argumentos_generados.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {caseEntry.argumentos_generados.length} argumentos
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
