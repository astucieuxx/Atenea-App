import { useState } from "react";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FuerzaBadge } from "./fuerza-badge";
import { TesisDetailModal } from "./tesis-detail-modal";
import type { ScoredTesis } from "@shared/schema";

interface TesisCardProps {
  tesis: ScoredTesis;
  caseId?: string;
  rank?: number;
}

const RISK_LABELS: Record<string, string> = {
  tesis_aislada: "No obligatoria",
  epoca_antigua: "Época anterior",
  criterio_no_reiterado: "No reiterado",
  autoridad_limitada: "Autoridad limitada",
  materia_parcial: "Match parcial"
};

export function TesisCard({ tesis, caseId }: TesisCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasRisks = tesis.riesgos && tesis.riesgos.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full text-left p-5 rounded-lg border border-border bg-card hover-elevate active-elevate-2 transition-colors"
        data-testid={`card-tesis-${tesis.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {tesis.tipo}
              </Badge>
              <FuerzaBadge fuerza={tesis.fuerza} />
              {tesis.pertinencia === "Alta" && (
                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400">
                  Pertinencia Alta
                </Badge>
              )}
              {hasRisks && (
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {tesis.riesgos.length} {tesis.riesgos.length === 1 ? "riesgo" : "riesgos"}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-sm leading-snug text-foreground uppercase">
              {tesis.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>{tesis.instancia || tesis.organo_jurisdiccional}</span>
              {tesis.epoca && (
                <>
                  <span className="mx-1">•</span>
                  <span>{tesis.epoca}</span>
                </>
              )}
              {tesis.autoridad && (
                <>
                  <span className="mx-1">•</span>
                  <span>Autoridad: {tesis.autoridad}</span>
                </>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {tesis.por_que_aplica}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </button>

      <TesisDetailModal
        tesis={tesis}
        caseId={caseId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
