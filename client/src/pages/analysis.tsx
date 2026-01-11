import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { FileText, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <AnalysisLoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Nueva consulta
        </Link>

        <Card className="border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <h2 className="font-semibold text-foreground">
                Problema Jurídico Identificado
              </h2>
            </div>
            <p 
              className="text-foreground leading-relaxed"
              data-testid="text-problema-juridico"
            >
              {data.problema_juridico}
            </p>
            <p className="text-sm text-primary">
              <span className="font-medium">Consulta original:</span> {data.descripcion}
            </p>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Jurisprudencia Relevante
            </h2>
            <span className="text-sm text-muted-foreground">
              {data.tesis_relevantes.length} tesis identificadas
            </span>
          </div>

          {data.tesis_relevantes.length === 0 ? (
            <Card className="border-border">
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
            <div className="space-y-3">
              {data.tesis_relevantes.map((tesis) => (
                <TesisCard 
                  key={tesis.id} 
                  tesis={tesis} 
                  caseId={data.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
