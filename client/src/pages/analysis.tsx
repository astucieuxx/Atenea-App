import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Scale, Lightbulb, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TesisCard } from "@/components/tesis-card";
import { AnalysisLoadingSkeleton } from "@/components/loading-skeleton";
import type { AnalysisResult } from "@shared/schema";

export default function Analysis() {
  const [, params] = useRoute("/analisis/:id");
  const analysisId = params?.id;

  const { data, isLoading, error } = useQuery<AnalysisResult>({
    queryKey: ["/api/analysis", analysisId],
    enabled: !!analysisId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <AnalysisLoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No se pudo cargar el análisis
          </h2>
          <p className="text-muted-foreground mb-6">
            El análisis solicitado no existe o ha expirado.
          </p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Análisis de caso</p>
            <p className="text-xs text-muted-foreground">
              {new Date(data.created_at).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Scale className="h-5 w-5" />
              <CardTitle className="text-sm font-medium uppercase tracking-wide">
                Problema Jurídico Identificado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p 
              className="font-serif text-lg leading-relaxed text-foreground"
              data-testid="text-problema-juridico"
            >
              {data.problema_juridico}
            </p>
            <div className="mt-4 pt-4 border-t border-primary/10">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Caso original:</span> {data.descripcion}
              </p>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Jurisprudencia Relevante
            </h2>
            <span className="text-sm text-muted-foreground">
              {data.tesis_relevantes.length} resultados
            </span>
          </div>

          {data.tesis_relevantes.length === 0 ? (
            <Card className="border-card-border">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No se encontró jurisprudencia relevante para este caso.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Intente reformular la descripción del problema jurídico.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.tesis_relevantes.map((tesis, index) => (
                <TesisCard 
                  key={tesis.id} 
                  tesis={tesis} 
                  caseId={data.id}
                  rank={index + 1} 
                />
              ))}
            </div>
          )}
        </section>

        {data.insight_juridico && (
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-foreground">
                <Lightbulb className="h-5 w-5 text-chart-4" />
                <CardTitle className="text-sm font-medium uppercase tracking-wide">
                  Insight Jurídico
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p 
                className="text-sm leading-relaxed text-muted-foreground"
                data-testid="text-insight-juridico"
              >
                {data.insight_juridico}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
