import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  BookOpen,
  Calendar,
  Gavel,
  FileText,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FuerzaBadge } from "@/components/fuerza-badge";
import { ArgumentModal } from "@/components/argument-modal";
import { DetailLoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import type { ScoredTesis } from "@shared/schema";

export default function TesisDetail() {
  // Ruta para tesis desde RAG
  const [, params] = useRoute("/tesis/:id");
  
  const tesisId = params?.id;
  
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: tesis, isLoading, error } = useQuery<ScoredTesis>({
    queryKey: ["/api/tesis", tesisId],
    enabled: !!tesisId,
  });

  const handleCopyText = async () => {
    if (!tesis) return;
    await navigator.clipboard.writeText(tesis.body_full || tesis.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copiado",
      description: "El texto de la tesis ha sido copiado.",
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DetailLoadingSkeleton />
      </div>
    );
  }

  if (error || !tesis) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Tesis no encontrada
          </h2>
          <p className="text-muted-foreground mb-6">
            La tesis solicitada no existe o no está disponible.
          </p>
          <Link href="/ask">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const backPath = "/ask";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <Link href={backPath}>
            <Button variant="ghost" size="icon" data-testid="button-volver-detalle">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs gap-1.5">
                <Gavel className="h-3 w-3" />
                {tesis.tipo}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1.5">
                <Building2 className="h-3 w-3" />
                {tesis.instancia}
              </Badge>
              <FuerzaBadge fuerza={tesis.fuerza} />
            </div>
            <h1 
              className="font-serif text-xl sm:text-2xl font-medium leading-tight text-foreground"
              data-testid="text-tesis-titulo"
            >
              {tesis.title}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:items-start">
          <div>
            <Tabs defaultValue="resumen" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="resumen"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-resumen"
                >
                  Resumen Ejecutivo
                </TabsTrigger>
                <TabsTrigger
                  value="texto"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-texto"
                >
                  Texto Oficial
                </TabsTrigger>
                <TabsTrigger
                  value="uso"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-uso"
                >
                  Cómo Usarla
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Qué dice la tesis
                    </h3>
                    <p className="text-base leading-relaxed text-foreground" data-testid="text-que-dice">
                      {tesis.abstract || tesis.body?.slice(0, 500)}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Cuándo aplica
                    </h3>
                    <p className="text-base leading-relaxed text-foreground" data-testid="text-cuando-aplica">
                      {tesis.por_que_aplica}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Cuándo NO aplica
                    </h3>
                    <p className="text-base leading-relaxed text-foreground" data-testid="text-cuando-no-aplica">
                      Esta tesis puede no aplicar cuando los hechos difieren sustancialmente del supuesto normativo, 
                      cuando existe jurisprudencia más reciente que la contradice, o cuando la materia específica 
                      del caso no corresponde exactamente con el criterio establecido.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-2 rounded-lg bg-primary/10">
                        <Gavel className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Fuerza: {tesis.fuerza}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-razon-fuerza">
                          {tesis.razon_fuerza}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="texto" className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Texto íntegro
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyText}
                    className="gap-2"
                    data-testid="button-copiar-texto"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <Card className="border-card-border">
                  <CardContent className="p-6">
                    <p 
                      className="font-serif text-base leading-loose text-foreground whitespace-pre-wrap"
                      data-testid="text-texto-oficial"
                    >
                      {tesis.body_full || tesis.body}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="uso" className="pt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Ejemplo de argumento conservador
                  </h3>
                  <Card className="border-card-border">
                    <CardContent className="p-6">
                      <p className="font-serif text-base leading-loose text-foreground italic">
                        "Conforme al criterio sostenido por {tesis.organo_jurisdiccional} en la tesis 
                        identificada con el rubro "{tesis.title.slice(0, 60)}...", resulta aplicable 
                        al caso que nos ocupa el principio jurídico que establece que..."
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Cita formal
                  </h3>
                  <Card className="border-card-border bg-muted/30">
                    <CardContent className="p-4">
                      <p className="font-mono text-sm text-foreground" data-testid="text-cita-formal-detalle">
                        {tesis.title}. {tesis.tipo}. {tesis.organo_jurisdiccional}. {tesis.epoca}. 
                        {tesis.fuente && ` ${tesis.fuente}.`}
                        {tesis.localizacion_pagina && ` Página ${tesis.localizacion_pagina}.`}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={() => setModalOpen(true)}
                  data-testid="button-usar-tesis"
                >
                  <FileText className="h-5 w-5" />
                  Usar esta tesis en mi escrito
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
                  Datos de la tesis
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Órgano</p>
                      <p className="text-foreground">{tesis.organo_jurisdiccional}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Materia</p>
                      <p className="text-foreground">{tesis.materias || "General"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Época</p>
                      <p className="text-foreground">{tesis.epoca}</p>
                    </div>
                  </div>

                  {tesis.fuente && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Fuente</p>
                        <p className="text-foreground">{tesis.fuente}</p>
                      </div>
                    </div>
                  )}

                  {tesis.localizacion_anio && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Año</p>
                        <p className="text-foreground">{tesis.localizacion_anio}</p>
                      </div>
                    </div>
                  )}
                </div>

                {tesis.url && (
                  <a
                    href={tesis.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline pt-2"
                    data-testid="link-fuente-oficial"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver en fuente oficial
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ArgumentModal
        tesis={tesis}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
