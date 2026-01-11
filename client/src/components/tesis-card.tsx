import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FuerzaBadge } from "./fuerza-badge";
import { TesisDetailModal } from "./tesis-detail-modal";
import type { ScoredTesis } from "@shared/schema";

interface TesisCardProps {
  tesis: ScoredTesis;
  caseId?: string;
  rank?: number;
}

export function TesisCard({ tesis, caseId }: TesisCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              {tesis.id && (
                <>
                  <span className="mx-1">•</span>
                  <span>Registro: {tesis.id}</span>
                </>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {tesis.abstract || tesis.body?.slice(0, 250)}...
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
