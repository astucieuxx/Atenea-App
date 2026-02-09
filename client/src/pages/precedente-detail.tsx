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
  User,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DetailLoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import type { Precedente } from "@shared/schema";

export default function PrecedenteDetail() {
  const [, params] = useRoute("/precedente/:id");
  const precedenteId = params?.id;

  const [copiedText, setCopiedText] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: precedente, isLoading, error } = useQuery<Precedente>({
    queryKey: ["/api/precedente", precedenteId],
    queryFn: async () => {
      const res = await fetch(`/api/precedente/${precedenteId}`);
      if (!res.ok) throw new Error("Precedente no encontrado");
      return res.json();
    },
    enabled: !!precedenteId,
  });

  const handleCopyText = async () => {
    if (!precedente) return;
    await navigator.clipboard.writeText(precedente.texto_publicacion);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    toast({
      title: t('precedente.copied'),
      description: t('precedente.copyText'),
    });
  };

  const handleCopyCitation = async () => {
    if (!precedente) return;
    const parts: string[] = [];
    if (precedente.rubro) parts.push(precedente.rubro.toUpperCase());
    const meta: string[] = [];
    if (precedente.sala) meta.push(precedente.sala);
    if (precedente.tipo_asunto && precedente.tipo_asunto_expediente) {
      meta.push(`${precedente.tipo_asunto}: ${precedente.tipo_asunto_expediente}`);
    } else if (precedente.tipo_asunto) {
      meta.push(precedente.tipo_asunto);
    }
    if (precedente.promovente) meta.push(`Promovente: ${precedente.promovente}`);
    if (precedente.localizacion) meta.push(precedente.localizacion);
    if (precedente.fecha_publicacion) meta.push(`Fecha de publicación: ${precedente.fecha_publicacion}`);
    if (precedente.ius) meta.push(`Registro IUS: ${precedente.ius}`);
    if (meta.length > 0) parts.push(meta.join(". ") + ".");
    const citationText = parts.join("\n");

    await navigator.clipboard.writeText(citationText);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
    toast({
      title: t('precedente.copied'),
      description: t('precedente.copyCitation'),
    });
  };

  // Parse temas and votos from JSON strings
  const parseTemas = (temas: string): string[] => {
    try { return JSON.parse(temas); } catch { return []; }
  };

  const parseVotos = (votos: string): string[] => {
    try { return JSON.parse(votos); } catch { return []; }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DetailLoadingSkeleton />
      </div>
    );
  }

  if (error || !precedente) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('precedente.notFound')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('precedente.notFoundDesc')}
          </p>
          <Link href="/ask">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('precedente.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const temas = parseTemas(precedente.temas);
  const votos = parseVotos(precedente.votos);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/ask">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="default" className="text-xs gap-1.5">
                <Gavel className="h-3 w-3" />
                {t('precedente.badge')}
              </Badge>
              {precedente.tipo_asunto && (
                <Badge variant="outline" className="text-xs gap-1.5">
                  <FileText className="h-3 w-3" />
                  {precedente.tipo_asunto}
                </Badge>
              )}
              {precedente.sala && (
                <Badge variant="outline" className="text-xs gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {precedente.sala}
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-medium leading-tight text-foreground">
              {precedente.rubro}
            </h1>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:items-start">
          {/* Main Content */}
          <div>
            <Tabs defaultValue="texto" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="texto"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  {t('precedente.tabs.text')}
                </TabsTrigger>
                <TabsTrigger
                  value="cita"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  {t('precedente.tabs.citation')}
                </TabsTrigger>
                {votos.length > 0 && (
                  <TabsTrigger
                    value="votos"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                  >
                    {t('precedente.tabs.votes')}
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Texto Tab */}
              <TabsContent value="texto" className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t('precedente.fullText')}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyText}
                    className="gap-2"
                  >
                    {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedText ? t('precedente.copied') : t('precedente.copy')}
                  </Button>
                </div>
                <Card className="border-card-border">
                  <CardContent className="p-6">
                    <p className="font-serif text-base leading-loose text-foreground whitespace-pre-wrap">
                      {precedente.texto_publicacion}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cita Formal Tab */}
              <TabsContent value="cita" className="pt-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {t('precedente.formalCitation')}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCitation}
                        className="gap-2"
                      >
                        {copiedCitation ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedCitation ? t('precedente.copied') : t('precedente.copy')}
                      </Button>
                    </div>
                    <Card className="border-card-border bg-muted/30">
                      <CardContent className="p-6">
                        <div className="font-mono text-sm text-foreground space-y-2">
                          <p className="font-bold">{precedente.rubro?.toUpperCase()}</p>
                          {precedente.sala && <p>{precedente.sala}</p>}
                          {precedente.tipo_asunto && precedente.tipo_asunto_expediente && (
                            <p>{precedente.tipo_asunto}: {precedente.tipo_asunto_expediente}</p>
                          )}
                          {precedente.promovente && <p>Promovente: {precedente.promovente}</p>}
                          {precedente.localizacion && <p>{precedente.localizacion}</p>}
                          {precedente.fecha_publicacion && <p>Fecha de publicación: {precedente.fecha_publicacion}</p>}
                          {precedente.ius && <p>Registro IUS: {precedente.ius}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Votos Tab */}
              {votos.length > 0 && (
                <TabsContent value="votos" className="pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    {t('precedente.votes')}
                  </h3>
                  <Card className="border-card-border">
                    <CardContent className="p-6">
                      <ul className="space-y-2">
                        {votos.map((voto, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                            <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{voto}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:sticky lg:top-8 space-y-6">
            <Card className="border-card-border">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
                  {t('precedente.data')}
                </h3>

                <div className="space-y-3 text-sm">
                  {precedente.sala && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.court')}</p>
                        <p className="text-foreground">{precedente.sala}</p>
                      </div>
                    </div>
                  )}

                  {precedente.tipo_asunto && (
                    <div className="flex items-start gap-3">
                      <Gavel className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.caseType')}</p>
                        <p className="text-foreground">{precedente.tipo_asunto}</p>
                      </div>
                    </div>
                  )}

                  {precedente.tipo_asunto_expediente && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.docket')}</p>
                        <p className="text-foreground">{precedente.tipo_asunto_expediente}</p>
                      </div>
                    </div>
                  )}

                  {precedente.promovente && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.petitioner')}</p>
                        <p className="text-foreground">{precedente.promovente}</p>
                      </div>
                    </div>
                  )}

                  {precedente.localizacion && (
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.location')}</p>
                        <p className="text-foreground">{precedente.localizacion}</p>
                      </div>
                    </div>
                  )}

                  {precedente.fecha_publicacion && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.publishDate')}</p>
                        <p className="text-foreground">{precedente.fecha_publicacion}</p>
                      </div>
                    </div>
                  )}

                  {precedente.ius && (
                    <div className="flex items-start gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('precedente.iusRegistry')}</p>
                        <p className="text-foreground">{precedente.ius}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Temas */}
                {temas.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{t('precedente.topics')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {temas.map((tema, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tema}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {precedente.url_origen && (
                  <a
                    href={precedente.url_origen}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline pt-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('precedente.viewOfficial')}
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
