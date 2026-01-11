import { useState } from "react";
import { FileEdit, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArgumentModal } from "./argument-modal";
import type { ScoredTesis, RiskFlag } from "@shared/schema";

interface TesisDetailModalProps {
  tesis: ScoredTesis;
  caseId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const RISK_LABELS: Record<RiskFlag, { label: string; description: string }> = {
  tesis_aislada: { 
    label: "Tesis Aislada", 
    description: "No es de observancia obligatoria. El juzgador puede apartarse de este criterio."
  },
  epoca_antigua: { 
    label: "Época Anterior", 
    description: "Criterio de época anterior que podría no reflejar la interpretación judicial vigente."
  },
  criterio_no_reiterado: { 
    label: "No Reiterado", 
    description: "Este criterio no ha sido reiterado, lo que debilita su fuerza persuasiva."
  },
  autoridad_limitada: { 
    label: "Autoridad Limitada", 
    description: "Emitido por órgano de menor jerarquía. Busque criterios de la SCJN si existen."
  },
  materia_parcial: { 
    label: "Match Parcial", 
    description: "Solo existe coincidencia parcial en la materia del caso."
  }
};

function AutoridadBadge({ autoridad }: { autoridad: string }) {
  const variants: Record<string, string> = {
    Alta: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    Media: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    Baja: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  };
  
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border ${variants[autoridad] || variants.Media}`}>
      Autoridad {autoridad}
    </span>
  );
}

function PertinenciaBadge({ pertinencia }: { pertinencia: string }) {
  const variants: Record<string, string> = {
    Alta: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
    Media: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
  };
  
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border ${variants[pertinencia] || variants.Media}`}>
      Pertinencia {pertinencia}
    </span>
  );
}

export function TesisDetailModal({ tesis, caseId, isOpen, onClose }: TesisDetailModalProps) {
  const [showArgumentModal, setShowArgumentModal] = useState(false);
  const hasRisks = tesis.riesgos && tesis.riesgos.length > 0;
  const insight = tesis.insight;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {tesis.tipo}
              </Badge>
              <PertinenciaBadge pertinencia={tesis.pertinencia || "Media"} />
              <AutoridadBadge autoridad={tesis.autoridad || "Media"} />
            </div>
            <DialogTitle className="text-base font-semibold uppercase leading-snug pr-8">
              {tesis.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {tesis.instancia || tesis.organo_jurisdiccional} • {tesis.epoca} • Registro: {tesis.id}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="resumen" className="flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto -mx-1 px-1 border-b">
              <TabsList className="w-max min-w-full justify-start bg-transparent rounded-none h-auto p-0 gap-0">
                <TabsTrigger 
                  value="resumen" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm whitespace-nowrap"
                >
                  Resumen
                </TabsTrigger>
                <TabsTrigger 
                  value="texto" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm whitespace-nowrap"
                >
                  Texto Oficial
                </TabsTrigger>
                <TabsTrigger 
                  value="uso" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm whitespace-nowrap"
                >
                  Cómo Usarla
                </TabsTrigger>
                {hasRisks && (
                  <TabsTrigger 
                    value="riesgos" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm whitespace-nowrap gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Riesgos
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="resumen" className="mt-0 space-y-4">
                {insight ? (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Qué dice la tesis
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground">
                        {insight.what_it_says}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cuándo aplica
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground">
                        {insight.when_it_applies}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <h4 className="text-xs font-medium uppercase tracking-wide text-foreground">
                          Recomendación
                        </h4>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {insight.recommendation}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground">
                    {tesis.abstract || tesis.body}
                  </p>
                )}
                
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Por qué aplica: </span>
                    {tesis.por_que_aplica}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="texto" className="mt-0 h-full">
                <div className="font-serif text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {tesis.body_full || tesis.body}
                </div>
              </TabsContent>

              <TabsContent value="uso" className="mt-0 space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-sm text-foreground">
                    Aplicación en el caso concreto
                  </h4>
                  <ul className="text-sm text-foreground space-y-2 list-decimal list-inside">
                    <li>Se presentan hechos similares a los descritos en el criterio.</li>
                    <li>La materia del caso corresponde a: {tesis.materias || "General"}.</li>
                    <li>El órgano jurisdiccional competente reconoce este criterio.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">
                    Estrategia de argumentación
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tesis.razon_fuerza}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">
                    Datos de localización
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium">Fuente:</span> {tesis.fuente || "N/A"}</p>
                    {tesis.localizacion_libro && (
                      <p><span className="font-medium">Libro:</span> {tesis.localizacion_libro}</p>
                    )}
                    {tesis.localizacion_tomo && (
                      <p><span className="font-medium">Tomo:</span> {tesis.localizacion_tomo}</p>
                    )}
                    {tesis.localizacion_pagina && (
                      <p><span className="font-medium">Página:</span> {tesis.localizacion_pagina}</p>
                    )}
                    {tesis.tesis_numero && (
                      <p><span className="font-medium">Número de tesis:</span> {tesis.tesis_numero}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {hasRisks && (
                <TabsContent value="riesgos" className="mt-0 space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                          Advertencias a considerar
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Esta tesis presenta {tesis.riesgos.length} {tesis.riesgos.length === 1 ? "aspecto" : "aspectos"} que 
                          deben considerarse al momento de citarla.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {tesis.riesgos.map((risk) => (
                      <div key={risk} className="p-4 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">
                            {RISK_LABELS[risk]?.label || risk}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {RISK_LABELS[risk]?.description || "Considere este aspecto al citar la tesis."}
                        </p>
                      </div>
                    ))}
                  </div>

                  {insight?.main_risk && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-sm text-foreground mb-2">
                        Principal consideración
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {insight.main_risk}
                      </p>
                    </div>
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cerrar
            </Button>
            <Button onClick={() => setShowArgumentModal(true)} className="gap-2 w-full sm:w-auto">
              <FileEdit className="h-4 w-4" />
              <span className="sm:inline">Usar esta tesis en mi escrito</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ArgumentModal
        tesis={tesis}
        isOpen={showArgumentModal}
        onClose={() => setShowArgumentModal(false)}
      />
    </>
  );
}
