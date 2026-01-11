import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  History as HistoryIcon, 
  Scale, 
  FileText, 
  ChevronRight,
  Inbox,
  ArrowRight
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
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <HistoryIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              Historial de Casos
            </h1>
          </div>
          <HistoryLoadingSkeleton />
        </div>
      </div>
    );
  }

  const cases = history || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HistoryIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-titulo-historial">
              Historial de Casos
            </h1>
          </div>
          <Link href="/">
            <Button className="gap-2" data-testid="button-nuevo-caso">
              Nuevo análisis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {cases.length === 0 ? (
          <Card className="border-card-border">
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Sin casos analizados
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                Comienza analizando un caso para ver tu historial de consultas jurídicas aquí.
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
          <div className="space-y-4">
            {cases.map((caseEntry) => (
              <Link key={caseEntry.id} href={`/analisis/${caseEntry.id}`}>
                <Card 
                  className="group border-card-border hover-elevate active-elevate-2 cursor-pointer transition-colors"
                  data-testid={`card-historial-${caseEntry.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {caseEntry.titulo || caseEntry.problema_juridico?.slice(0, 80) || "Caso sin título"}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {caseEntry.descripcion?.slice(0, 150)}...
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-muted-foreground">
                            {new Date(caseEntry.created_at).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          
                          {caseEntry.tesis_usadas.length > 0 && (
                            <Badge variant="secondary" className="gap-1.5">
                              <Scale className="h-3 w-3" />
                              {caseEntry.tesis_usadas.length} tesis
                            </Badge>
                          )}
                          
                          {caseEntry.argumentos_generados.length > 0 && (
                            <Badge variant="secondary" className="gap-1.5">
                              <FileText className="h-3 w-3" />
                              {caseEntry.argumentos_generados.length} argumentos
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {cases.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pt-4">
            {cases.length} {cases.length === 1 ? "caso analizado" : "casos analizados"}
          </p>
        )}
      </div>
    </div>
  );
}
