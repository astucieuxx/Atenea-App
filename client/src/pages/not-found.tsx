import { Link } from "wouter";
import { Scale, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-2">
          <Scale className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">
            Página no encontrada
          </p>
        </div>
        
        <p className="text-muted-foreground">
          La página que buscas no existe o ha sido movida. 
          Verifica la URL o regresa al inicio.
        </p>
        
        <Link href="/">
          <Button className="gap-2" data-testid="button-volver-inicio">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
