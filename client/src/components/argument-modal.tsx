import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { argumentRequestSchema, type ArgumentRequest, type GeneratedArgument, type ScoredTesis } from "@shared/schema";

interface ArgumentModalProps {
  tesis: ScoredTesis;
  isOpen: boolean;
  onClose: () => void;
}

export function ArgumentModal({ tesis, isOpen, onClose }: ArgumentModalProps) {
  const { toast } = useToast();
  const [generatedArgument, setGeneratedArgument] = useState<GeneratedArgument | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<ArgumentRequest>({
    resolver: zodResolver(argumentRequestSchema),
    defaultValues: {
      tesis_id: tesis.id,
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
    mutation.mutate({ ...data, tesis_id: tesis.id });
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

  const handleClose = () => {
    setGeneratedArgument(null);
    form.reset();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Generar Argumento</SheetTitle>
          <SheetDescription>
            Configura el contexto de tu escrito
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <SelectItem value="Contestación de Demanda">Contestación de Demanda</SelectItem>
                        <SelectItem value="Amparo Directo">Amparo Directo</SelectItem>
                        <SelectItem value="Amparo Indirecto">Amparo Indirecto</SelectItem>
                        <SelectItem value="Recurso de Revisión">Recurso de Revisión</SelectItem>
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
                        <SelectItem value="Tercero Interesado">Tercero Interesado</SelectItem>
                        <SelectItem value="Quejoso">Quejoso</SelectItem>
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
                        <SelectItem value="Persuasivo">Persuasivo</SelectItem>
                        <SelectItem value="Técnico">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {!generatedArgument && (
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={mutation.isPending}
                  data-testid="button-generar-argumento"
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generar Argumento
                </Button>
              )}
            </form>
          </Form>

          {generatedArgument && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Argumento generado</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2 text-xs"
                  data-testid="button-copiar-argumento"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                {generatedArgument.parrafos.map((parrafo, index) => (
                  <p 
                    key={index} 
                    className="text-sm leading-relaxed text-foreground"
                    data-testid={`text-argumento-parrafo-${index}`}
                  >
                    {parrafo}
                  </p>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => setGeneratedArgument(null)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleClose}
                >
                  Usar argumento
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
