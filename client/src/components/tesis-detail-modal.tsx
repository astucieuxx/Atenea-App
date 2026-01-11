import { useState } from "react";
import { X, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArgumentModal } from "./argument-modal";
import type { ScoredTesis } from "@shared/schema";

interface TesisDetailModalProps {
  tesis: ScoredTesis;
  caseId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TesisDetailModal({ tesis, caseId, isOpen, onClose }: TesisDetailModalProps) {
  const [showArgumentModal, setShowArgumentModal] = useState(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {tesis.tipo}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Registro: {tesis.id}
              </span>
            </div>
            <DialogTitle className="text-base font-semibold uppercase leading-snug pr-8">
              {tesis.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {tesis.instancia || tesis.organo_jurisdiccional} • {tesis.epoca}
            </p>
          </DialogHeader>

          <Tabs defaultValue="resumen" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
              <TabsTrigger 
                value="resumen" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Resumen Ejecutivo
              </TabsTrigger>
              <TabsTrigger 
                value="texto" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Texto Oficial
              </TabsTrigger>
              <TabsTrigger 
                value="uso" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                Cómo Usarla
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="resumen" className="mt-0 h-full">
                <p className="text-sm leading-relaxed text-foreground">
                  {tesis.abstract || tesis.body}
                </p>
              </TabsContent>

              <TabsContent value="texto" className="mt-0 h-full">
                <div className="font-serif text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {tesis.body_full || tesis.body}
                </div>
              </TabsContent>

              <TabsContent value="uso" className="mt-0 h-full space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-sm text-foreground">
                    Aplicación en el caso concreto
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {tesis.por_que_aplica || "Esta tesis resulta aplicable cuando:"}
                  </p>
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
                    <p><span className="font-medium">Fuente:</span> {tesis.fuente}</p>
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
            </div>
          </Tabs>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button onClick={() => setShowArgumentModal(true)} className="gap-2">
              <FileEdit className="h-4 w-4" />
              Usar esta tesis en mi escrito
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
