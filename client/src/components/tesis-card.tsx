import { Link } from "wouter";
import { ChevronRight, Building2, BookOpen, Gavel } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FuerzaBadge } from "./fuerza-badge";
import type { ScoredTesis } from "@shared/schema";

interface TesisCardProps {
  tesis: ScoredTesis;
  caseId?: string;
  rank?: number;
}

export function TesisCard({ tesis, caseId, rank }: TesisCardProps) {
  const linkPath = caseId 
    ? `/analisis/${caseId}/tesis/${tesis.id}` 
    : `/tesis/${tesis.id}`;

  return (
    <Link href={linkPath}>
      <Card 
        className="group cursor-pointer border-card-border hover-elevate active-elevate-2 transition-colors"
        data-testid={`card-tesis-${tesis.id}`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="flex-1 min-w-0">
            {rank && (
              <span className="text-xs font-medium text-muted-foreground mb-1 block">
                #{rank} Resultado
              </span>
            )}
            <h3 className="font-serif text-base font-medium leading-snug text-foreground line-clamp-2">
              {tesis.title}
            </h3>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal gap-1.5">
              <Gavel className="h-3 w-3" />
              {tesis.tipo}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal gap-1.5">
              <Building2 className="h-3 w-3" />
              {tesis.instancia}
            </Badge>
            <Badge variant="outline" className="text-xs font-normal gap-1.5">
              <BookOpen className="h-3 w-3" />
              {tesis.materias || "General"}
            </Badge>
            <FuerzaBadge fuerza={tesis.fuerza} />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {tesis.abstract || tesis.body?.slice(0, 200)}
            </p>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Por qué aplica:</span>{" "}
              {tesis.por_que_aplica}
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{tesis.organo_jurisdiccional}</span>
            {tesis.epoca && <span className="before:content-['·'] before:mx-2">{tesis.epoca}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
