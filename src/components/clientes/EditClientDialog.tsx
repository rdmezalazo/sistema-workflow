import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfiguracionOpciones } from "@/hooks/useConfiguracionOpciones";

const clientSchema = z.object({
  tipo_cliente: z.string(),
  codigo: z.string().min(8, "El RUC/DNI debe tener al menos 8 caracteres"),
  razon_social: z.string().min(2, "La razón social es requerida"),
  nombre_persona_natural: z.string().optional(),
  persona_natural_con_empresa: z.boolean().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  contacto_nombre: z.string().optional(),
  contacto_telefono: z.string().optional(),
  contacto_email: z.string().email("Email inválido").optional().or(z.literal("")),
  contacto_nombre2: z.string().optional(),
  contacto_telefono2: z.string().optional(),
  sector: z.string().optional(),
  notas: z.string().optional(),
  regimen_tributario: z.string().optional(),
  regimen_laboral: z.string().optional(),
  actividad_economica: z.string().optional(),
  usuario_sunat: z.string().optional(),
  clave_sunat: z.string().optional(),
  nro_trabajadores: z.coerce.number().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface Client {
  id: string;
  tipo_cliente: string;
  codigo: string;
  razon_social: string;
  nombre_persona_natural: string | null;
  persona_natural_con_empresa: boolean | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_email: string | null;
  contacto_nombre2: string | null;
  contacto_telefono2: string | null;
  sector: string | null;
  notas: string | null;
  regimen_tributario: string | null;
  regimen_laboral: string | null;
  actividad_economica: string | null;
  usuario_sunat: string | null;
  clave_sunat: string | null;
  nro_trabajadores: number | null;
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

export function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: EditClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [datosClienteOpen, setDatosClienteOpen] = useState(true);
  const [contactoOpen, setContactoOpen] = useState(true);
  const [tributarioOpen, setTributarioOpen] = useState(true);
  
  const { opciones: regimenesTributarios } = useConfiguracionOpciones("regimen_tributario");
  const { opciones: regimenesLaborales } = useConfiguracionOpciones("regimen_laboral");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const tipoCliente = watch("tipo_cliente");

  useEffect(() => {
    if (client && open) {
      reset({
        tipo_cliente: client.tipo_cliente,
        codigo: client.codigo,
        razon_social: client.razon_social,
        nombre_persona_natural: client.nombre_persona_natural || "",
        persona_natural_con_empresa: client.persona_natural_con_empresa || false,
        direccion: client.direccion || "",
        telefono: client.telefono || "",
        email: client.email || "",
        contacto_nombre: client.contacto_nombre || "",
        contacto_telefono: client.contacto_telefono || "",
        contacto_email: client.contacto_email || "",
        contacto_nombre2: client.contacto_nombre2 || "",
        contacto_telefono2: client.contacto_telefono2 || "",
        sector: client.sector || "",
        notas: client.notas || "",
        regimen_tributario: client.regimen_tributario || "",
        regimen_laboral: client.regimen_laboral || "",
        actividad_economica: client.actividad_economica || "",
        usuario_sunat: client.usuario_sunat || "",
        clave_sunat: client.clave_sunat || "",
        nro_trabajadores: client.nro_trabajadores || undefined,
      });
    }
  }, [client, open, reset]);

  const onSubmit = async (data: ClientFormData) => {
    if (!client) return;
    
    setLoading(true);
    try {
      const updateData = {
        ...data,
        nombre_persona_natural: data.nombre_persona_natural || null,
        persona_natural_con_empresa: data.persona_natural_con_empresa || false,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        email: data.email || null,
        contacto_nombre: data.contacto_nombre || null,
        contacto_telefono: data.contacto_telefono || null,
        contacto_email: data.contacto_email || null,
        contacto_nombre2: data.contacto_nombre2 || null,
        contacto_telefono2: data.contacto_telefono2 || null,
        sector: data.sector || null,
        notas: data.notas || null,
        regimen_tributario: data.regimen_tributario || null,
        regimen_laboral: data.regimen_laboral || null,
        actividad_economica: data.actividad_economica || null,
        usuario_sunat: data.usuario_sunat || null,
        clave_sunat: data.clave_sunat || null,
        nro_trabajadores: data.nro_trabajadores || null,
      };

      const { error } = await supabase
        .from("clientes")
        .update(updateData)
        .eq("id", client.id);

      if (error) throw error;

      toast.success("Cliente actualizado exitosamente");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error("Error al actualizar cliente: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ 
    title, 
    isOpen, 
    onToggle 
  }: { 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void;
  }) => (
    <CollapsibleTrigger 
      onClick={onToggle}
      className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
    >
      <span className="font-medium text-sm">{title}</span>
      {isOpen ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </CollapsibleTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifica los datos del cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de Cliente */}
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <Select
              value={tipoCliente}
              onValueChange={(value) => setValue("tipo_cliente", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empresa">Empresa</SelectItem>
                <SelectItem value="persona_natural">Persona Natural</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sección: Datos del Cliente */}
          <Collapsible open={datosClienteOpen} onOpenChange={setDatosClienteOpen}>
            <SectionHeader 
              title="Datos del Cliente" 
              isOpen={datosClienteOpen} 
              onToggle={() => setDatosClienteOpen(!datosClienteOpen)} 
            />
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">
                    {tipoCliente === "empresa" ? "RUC" : "DNI"} *
                  </Label>
                  <Input
                    id="codigo"
                    {...register("codigo")}
                    maxLength={tipoCliente === "empresa" ? 11 : 8}
                  />
                  {errors.codigo && (
                    <p className="text-sm text-destructive">{errors.codigo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razon_social">
                    {tipoCliente === "empresa" ? "Razón Social" : "Nombre Completo"} *
                  </Label>
                  <Input id="razon_social" {...register("razon_social")} />
                  {errors.razon_social && (
                    <p className="text-sm text-destructive">{errors.razon_social.message}</p>
                  )}
                </div>

                {tipoCliente === "persona_natural" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="nombre_persona_natural">Nombre de Persona Natural</Label>
                      <Input id="nombre_persona_natural" {...register("nombre_persona_natural")} />
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm md:col-span-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="persona_natural_con_empresa">Con Empresa</Label>
                        <p className="text-xs text-muted-foreground">
                          ¿Esta persona natural también tiene empresa?
                        </p>
                      </div>
                      <Switch
                        id="persona_natural_con_empresa"
                        checked={watch("persona_natural_con_empresa") || false}
                        onCheckedChange={(checked) => setValue("persona_natural_con_empresa", checked)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" {...register("direccion")} />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Sección: Contacto */}
          <Collapsible open={contactoOpen} onOpenChange={setContactoOpen}>
            <SectionHeader 
              title="Contacto" 
              isOpen={contactoOpen} 
              onToggle={() => setContactoOpen(!contactoOpen)} 
            />
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" {...register("telefono")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              {tipoCliente === "empresa" && (
                <>
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-sm font-medium">Persona de Contacto 1</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contacto_nombre">Nombre</Label>
                        <Input id="contacto_nombre" {...register("contacto_nombre")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contacto_telefono">Teléfono</Label>
                        <Input id="contacto_telefono" {...register("contacto_telefono")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contacto_email">Email</Label>
                        <Input id="contacto_email" type="email" {...register("contacto_email")} />
                        {errors.contacto_email && (
                          <p className="text-sm text-destructive">{errors.contacto_email.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-sm font-medium">Persona de Contacto 2</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contacto_nombre2">Nombre</Label>
                        <Input id="contacto_nombre2" {...register("contacto_nombre2")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contacto_telefono2">Teléfono</Label>
                        <Input id="contacto_telefono2" {...register("contacto_telefono2")} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Sección: Información Tributaria y Legal (solo empresa) */}
          {tipoCliente === "empresa" && (
            <Collapsible open={tributarioOpen} onOpenChange={setTributarioOpen}>
              <SectionHeader 
                title="Información Tributaria y Legal" 
                isOpen={tributarioOpen} 
                onToggle={() => setTributarioOpen(!tributarioOpen)} 
              />
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector/Industria</Label>
                  <Input id="sector" {...register("sector")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actividad_economica">Actividad Económica</Label>
                  <Textarea 
                    id="actividad_economica" 
                    {...register("actividad_economica")} 
                    rows={2}
                    placeholder="Descripción de la actividad económica principal..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="regimen_tributario">Régimen Tributario</Label>
                    <Select
                      value={watch("regimen_tributario") || ""}
                      onValueChange={(value) => setValue("regimen_tributario", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar régimen" />
                      </SelectTrigger>
                      <SelectContent>
                        {regimenesTributarios
                          .filter((r) => r.activo)
                          .map((regimen) => (
                            <SelectItem key={regimen.id} value={regimen.nombre}>
                              {regimen.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regimen_laboral">Régimen Laboral</Label>
                    <Select
                      value={watch("regimen_laboral") || ""}
                      onValueChange={(value) => setValue("regimen_laboral", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar régimen" />
                      </SelectTrigger>
                      <SelectContent>
                        {regimenesLaborales
                          .filter((r) => r.activo)
                          .map((regimen) => (
                            <SelectItem key={regimen.id} value={regimen.nombre}>
                              {regimen.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="usuario_sunat">Usuario SUNAT</Label>
                    <Input id="usuario_sunat" {...register("usuario_sunat")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clave_sunat">Clave SUNAT</Label>
                    <Input id="clave_sunat" type="password" {...register("clave_sunat")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nro_trabajadores">Nro. Trabajadores</Label>
                    <Input
                      id="nro_trabajadores"
                      type="number"
                      {...register("nro_trabajadores")}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" {...register("notas")} rows={3} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
