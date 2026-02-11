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
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FuerzaBadge } from "@/components/fuerza-badge";
import { ArgumentModal } from "@/components/argument-modal";
import { DetailLoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import type { ScoredTesis } from "@shared/schema";

export default function TesisDetail() {
  // Ruta para tesis desde RAG
  const [, params] = useRoute("/tesis/:id");
  
  const tesisId = params?.id;
  
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedArgument, setCopiedArgument] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

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
      title: t('tesis.copied'),
      description: t('tesis.copyText'),
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
            {t('tesis.notFound')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('tesis.notFoundDesc')}
          </p>
          <Link href="/ask">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('tesis.back')}
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
                  {t('tesis.tabs.executive')}
                </TabsTrigger>
                <TabsTrigger
                  value="texto"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-texto"
                >
                  {t('tesis.tabs.text')}
                </TabsTrigger>
                <TabsTrigger
                  value="uso"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-uso"
                >
                  {t('tesis.tabs.usage')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resumen" className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                      {t('tesis.whatItSays')}
                    </h3>
                    <p className="text-base leading-relaxed text-foreground" data-testid="text-que-dice">
                      {tesis.abstract || tesis.body?.slice(0, 500)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-2 rounded-lg bg-primary/10">
                        <Gavel className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {t('tesis.relevance')}: {tesis.relevanceScore ? `${(tesis.relevanceScore * 100).toFixed(1)}%` : tesis.score ? `${tesis.score.toFixed(1)}%` : 'N/A'}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t('tesis.fullText')}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyText}
                    className="gap-2"
                    data-testid="button-copiar-texto"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? t('tesis.copied') : t('tesis.copy')}
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

              <TabsContent value="uso" className="pt-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {t('tesis.conservativeArgument')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const argumentText = `"Conforme al criterio sostenido por ${tesis.organo_jurisdiccional} en la tesis identificada con el rubro "${tesis.title.slice(0, 60)}...", resulta aplicable al caso que nos ocupa el principio jurídico que establece que..."`;
                          await navigator.clipboard.writeText(argumentText);
                          setCopiedArgument(true);
                          setTimeout(() => setCopiedArgument(false), 2000);
                          toast({
                            title: t('tesis.copied'),
                            description: t('tesis.copyArgument'),
                          });
                        }}
                        className="gap-2"
                      >
                        {copiedArgument ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedArgument ? t('tesis.copied') : t('tesis.copy')}
                      </Button>
                    </div>
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
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {t('tesis.formalCitation')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const citationText = `${tesis.title}. ${tesis.tipo}. ${tesis.organo_jurisdiccional}. ${tesis.epoca}.${tesis.fuente ? ` ${tesis.fuente}.` : ''}${tesis.localizacion_pagina ? ` Página ${tesis.localizacion_pagina}.` : ''}`;
                          await navigator.clipboard.writeText(citationText);
                          setCopiedCitation(true);
                          setTimeout(() => setCopiedCitation(false), 2000);
                          toast({
                            title: t('tesis.copied'),
                            description: t('tesis.copyCitation'),
                          });
                        }}
                        className="gap-2"
                      >
                        {copiedCitation ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedCitation ? t('tesis.copied') : t('tesis.copy')}
                      </Button>
                    </div>
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
                    {t('tesis.useInDocument')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
                  {t('tesis.data')}
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('tesis.organ')}</p>
                      <p className="text-foreground">{tesis.organo_jurisdiccional}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('tesis.matter')}</p>
                      <p className="text-foreground">{tesis.materias || t('tesis.general')}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('tesis.epoch')}</p>
                      <p className="text-foreground">{tesis.epoca}</p>
                    </div>
                  </div>

                  {tesis.fuente && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('tesis.source')}</p>
                        <p className="text-foreground">{tesis.fuente}</p>
                      </div>
                    </div>
                  )}

                  {tesis.localizacion_anio && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('tesis.year')}</p>
                        <p className="text-foreground">{tesis.localizacion_anio}</p>
                      </div>
                    </div>
                  )}

                  {tesis.id && (
                    <div className="flex items-start gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Registro Digital</p>
                        <p className="text-foreground font-mono">{tesis.id}</p>
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
                    {t('tesis.viewOfficial')}
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
