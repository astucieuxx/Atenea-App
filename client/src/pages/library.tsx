import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { BookOpen, FileText, BookmarkCheck, Trash2, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { getSavedDocuments, removeDocument, type SavedDocument } from "./ask";

export default function Library() {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const saved = getSavedDocuments();
    // Ordenar por fecha de guardado (más recientes primero)
    saved.sort((a, b) => b.savedAt - a.savedAt);
    setDocuments(saved);
  };

  const handleRemove = (id: string, source: "tesis" | "precedente") => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este documento de tu biblioteca?")) {
      if (removeDocument(id, source)) {
        loadDocuments();
        toast({
          title: "Documento eliminado",
          description: "El documento se ha eliminado de tu biblioteca",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el documento",
          variant: "destructive",
        });
      }
    }
  };

  // Filtrar documentos por búsqueda
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.citation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/ask">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground">
                Mi Biblioteca
              </h1>
              <p className="text-muted-foreground font-serif mt-1">
                {documents.length} {documents.length === 1 ? 'documento guardado' : 'documentos guardados'}
              </p>
            </div>
          </div>

          {/* Barra de búsqueda */}
          {documents.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar en tu biblioteca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-serif"
              />
            </div>
          )}
        </div>

        {/* Lista de documentos */}
        {documents.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                Tu biblioteca está vacía
              </h3>
              <p className="text-muted-foreground font-serif mb-6">
                Guarda documentos relevantes desde las búsquedas para acceder a ellos fácilmente.
              </p>
              <Link href="/ask">
                <Button variant="navy" className="gap-2">
                  <Search className="h-4 w-4" />
                  Ir a búsqueda
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredDocuments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-muted-foreground font-serif">
                Intenta con otros términos de búsqueda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={`${doc.source}-${doc.id}`} className="border-border bg-card/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={doc.source === "precedente" ? "default" : "secondary"} className="text-xs font-serif">
                          {doc.source === "precedente" ? "Precedente" : "Tesis"}
                        </Badge>
                        {doc.relevanceScore && (
                          <Badge variant="outline" className="text-xs font-serif">
                            Relevancia: {(doc.relevanceScore * 100).toFixed(1)}%
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-serif">
                          Guardado {new Date(doc.savedAt).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-lg text-foreground leading-snug">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-serif line-clamp-2">
                        {doc.citation}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
                      {doc.source === "precedente" ? (
                        <Link href={`/precedente/${doc.id}`} className="flex-1 sm:flex-none">
                          <Button variant="outline" size="sm" className="gap-2 font-serif w-full sm:w-auto">
                            <FileText className="h-4 w-4" />
                            Ver precedente
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/tesis/${doc.id}`} className="flex-1 sm:flex-none">
                          <Button variant="outline" size="sm" className="gap-2 font-serif w-full sm:w-auto">
                            <FileText className="h-4 w-4" />
                            Ver tesis
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 font-serif text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(doc.id, doc.source)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
