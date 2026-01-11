import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check, FileText, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { argumentRequestSchema, type ArgumentRequest, type GeneratedArgument } from "@shared/schema";

interface ArgumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tesisId: string;
  tesisTitle: string;
}

export function ArgumentModal({ open, onOpenChange, tesisId, tesisTitle }: ArgumentModalProps) {
  const { toast } = useToast();
  const [generatedArgument, setGeneratedArgument] = useState<GeneratedArgument | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<ArgumentRequest>({
    resolver: zodResolver(argumentRequestSchema),
    defaultValues: {
      tesis_id: tesisId,
      tipo_escrito: "Demanda",
      rol_procesal: "Actor",
      tono: "Conservador",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ArgumentRequest) => {
      const response = await apiRequest("POST", "/api/arguments", data);
      return response as GeneratedArgument;
    },
    onSuccess: (data) => {
      setGeneratedArgument(data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el argumento. Intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ArgumentRequest) => {
    mutation.mutate({ ...data, tesis_id: tesisId });
  };

  const handleCopy = async () => {
    if (!generatedArgument) return;
    const text = generatedArgument.parrafos.join("\n\n") + "\n\n" + generatedArgument.cita_formal;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copiado",
      description: "El argumento ha sido copiado al portapapeles.",
    });
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setGeneratedArgument(null);
      form.reset();
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Generar Argumento
          </DialogTitle>
          <DialogDescription className="text-sm">
            Basado en: <span className="font-medium text-foreground">{tesisTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {!generatedArgument ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="tipo_escrito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de escrito</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tipo-escrito">
                          <SelectValue placeholder="Seleccione tipo de escrito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Demanda">Demanda</SelectItem>
                        <SelectItem value="Contestación">Contestación</SelectItem>
                        <SelectItem value="Amparo">Amparo</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rol_procesal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol procesal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-rol-procesal">
                          <SelectValue placeholder="Seleccione rol procesal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Actor">Actor</SelectItem>
                        <SelectItem value="Demandado">Demandado</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tono del argumento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tono">
                          <SelectValue placeholder="Seleccione tono" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Conservador">Conservador</SelectItem>
                        <SelectItem value="Técnico">Técnico</SelectItem>
                        <SelectItem value="Contundente">Contundente</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  data-testid="button-generar-argumento"
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar Argumento
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="bg-secondary px-2 py-1 rounded">{generatedArgument.tipo_escrito}</span>
                <span className="bg-secondary px-2 py-1 rounded">{generatedArgument.rol_procesal}</span>
                <span className="bg-secondary px-2 py-1 rounded">{generatedArgument.tono}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
                data-testid="button-copiar-argumento"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              {generatedArgument.parrafos.map((parrafo, index) => (
                <p 
                  key={index} 
                  className="font-serif text-base leading-loose text-foreground"
                  data-testid={`text-argumento-parrafo-${index}`}
                >
                  {parrafo}
                </p>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-medium">
                Cita formal
              </p>
              <p className="text-sm text-foreground font-mono" data-testid="text-cita-formal">
                {generatedArgument.cita_formal}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setGeneratedArgument(null)}>
                Generar otro
              </Button>
              <Button onClick={() => handleClose(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
