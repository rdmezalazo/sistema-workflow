import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, User, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  tipo_cliente: z.enum(["empresa", "persona_natural"]),
  codigo: z.string().min(8, "El código debe tener al menos 8 caracteres").max(11, "El código no puede tener más de 11 caracteres"),
  razon_social: z.string().optional(),
  nombre_persona_natural: z.string().optional(),
  persona_natural_con_empresa: z.boolean().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contacto_nombre: z.string().optional(),
  contacto_email: z.string().email("Email inválido").optional().or(z.literal("")),
  contacto_telefono: z.string().optional(),
  contacto_nombre2: z.string().optional(),
  contacto_telefono2: z.string().optional(),
  sector: z.string().optional(),
  regimen_tributario: z.string().optional(),
  regimen_laboral: z.string().optional(),
  actividad_economica: z.string().optional(),
  usuario_sunat: z.string().optional(),
  clave_sunat: z.string().optional(),
  nro_trabajadores: z.coerce.number().optional(),
  notas: z.string().optional(),
}).refine((data) => {
  if (data.tipo_cliente === "empresa") {
    return data.razon_social && data.razon_social.length > 0;
  }
  return data.nombre_persona_natural && data.nombre_persona_natural.length > 0;
}, {
  message: "Complete el nombre según el tipo de cliente",
  path: ["razon_social"],
});

type ClientFormData = z.infer<typeof clientSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onSuccess }: CreateClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [datosClienteOpen, setDatosClienteOpen] = useState(true);
  const [contactoOpen, setContactoOpen] = useState(true);
  const [tributarioOpen, setTributarioOpen] = useState(true);
  
  const { opciones: regimenesTributarios } = useConfiguracionOpciones("regimen_tributario");
  const { opciones: regimenesLaborales } = useConfiguracionOpciones("regimen_laboral");

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      tipo_cliente: "empresa",
      codigo: "",
      razon_social: "",
      nombre_persona_natural: "",
      persona_natural_con_empresa: false,
      email: "",
      telefono: "",
      direccion: "",
      contacto_nombre: "",
      contacto_email: "",
      contacto_telefono: "",
      contacto_nombre2: "",
      contacto_telefono2: "",
      sector: "",
      regimen_tributario: "",
      regimen_laboral: "",
      actividad_economica: "",
      usuario_sunat: "",
      clave_sunat: "",
      nro_trabajadores: undefined,
      notas: "",
    },
  });

  const tipoCliente = form.watch("tipo_cliente");

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true);
    try {
      const insertData = {
        tipo_cliente: data.tipo_cliente,
        codigo: data.codigo,
        razon_social: data.tipo_cliente === "empresa" ? data.razon_social! : data.nombre_persona_natural!,
        nombre_persona_natural: data.tipo_cliente === "persona_natural" ? data.nombre_persona_natural : null,
        persona_natural_con_empresa: data.tipo_cliente === "persona_natural" ? (data.persona_natural_con_empresa || false) : false,
        email: data.email || null,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        sector: data.sector || null,
        contacto_nombre: data.contacto_nombre || null,
        contacto_email: data.contacto_email || null,
        contacto_telefono: data.contacto_telefono || null,
        contacto_nombre2: data.contacto_nombre2 || null,
        contacto_telefono2: data.contacto_telefono2 || null,
        regimen_tributario: data.regimen_tributario || null,
        regimen_laboral: data.regimen_laboral || null,
        actividad_economica: data.actividad_economica || null,
        usuario_sunat: data.usuario_sunat || null,
        clave_sunat: data.clave_sunat || null,
        nro_trabajadores: data.nro_trabajadores || null,
        notas: data.notas || null,
      };

      const { error } = await supabase.from("clientes").insert(insertData);

      if (error) throw error;

      toast.success("Cliente creado exitosamente");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Error al crear cliente: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Complete los datos del nuevo cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de Cliente Toggle */}
            <div className="space-y-3">
              <Label>Tipo de Cliente</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => form.setValue("tipo_cliente", "empresa")}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    tipoCliente === "empresa"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${tipoCliente === "empresa" ? "bg-primary/10" : "bg-muted"}`}>
                    <Building2 className={`h-5 w-5 ${tipoCliente === "empresa" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${tipoCliente === "empresa" ? "text-primary" : "text-foreground"}`}>
                      Empresa
                    </p>
                    <p className="text-xs text-muted-foreground">RUC 11 dígitos</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => form.setValue("tipo_cliente", "persona_natural")}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    tipoCliente === "persona_natural"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${tipoCliente === "persona_natural" ? "bg-primary/10" : "bg-muted"}`}>
                    <User className={`h-5 w-5 ${tipoCliente === "persona_natural" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${tipoCliente === "persona_natural" ? "text-primary" : "text-foreground"}`}>
                      Persona Natural
                    </p>
                    <p className="text-xs text-muted-foreground">DNI 8 dígitos</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Sección: Datos del Cliente */}
            <Collapsible open={datosClienteOpen} onOpenChange={setDatosClienteOpen}>
              <SectionHeader 
                title="Datos del Cliente" 
                isOpen={datosClienteOpen} 
                onToggle={() => setDatosClienteOpen(!datosClienteOpen)} 
              />
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Código (RUC/DNI) */}
                <FormField
                  control={form.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {tipoCliente === "empresa" ? "RUC" : "DNI"} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={tipoCliente === "empresa" ? "20123456789" : "12345678"}
                          maxLength={tipoCliente === "empresa" ? 11 : 8}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campos condicionales según tipo */}
                {tipoCliente === "empresa" ? (
                  <FormField
                    control={form.control}
                    name="razon_social"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razón Social *</FormLabel>
                        <FormControl>
                          <Input placeholder="Empresa ABC S.A.C." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="nombre_persona_natural"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan Pérez García" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="persona_natural_con_empresa"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Con Empresa</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              ¿Esta persona natural también tiene empresa?
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="direccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Av. Principal 123, Arequipa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="cliente@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="054-123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Persona de contacto 1 (solo para empresas) */}
                {tipoCliente === "empresa" && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-sm font-medium">Persona de Contacto 1</Label>
                    <FormField
                      control={form.control}
                      name="contacto_nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="María García" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contacto_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contacto@empresa.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contacto_telefono"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input placeholder="951-123456" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Persona de contacto 2 (solo para empresas) */}
                {tipoCliente === "empresa" && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-sm font-medium">Persona de Contacto 2</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contacto_nombre2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contacto_telefono2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input placeholder="951-654321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Sección: Información Tributaria y Legal (solo para empresas) */}
            {tipoCliente === "empresa" && (
              <Collapsible open={tributarioOpen} onOpenChange={setTributarioOpen}>
                <SectionHeader 
                  title="Información Tributaria y Legal" 
                  isOpen={tributarioOpen} 
                  onToggle={() => setTributarioOpen(!tributarioOpen)} 
                />
                <CollapsibleContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sector/Industria</FormLabel>
                        <FormControl>
                          <Input placeholder="Comercio, Servicios, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actividad_economica"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Actividad Económica</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descripción de la actividad económica principal..."
                            className="resize-none"
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="regimen_tributario"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Régimen Tributario</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar régimen" />
                              </SelectTrigger>
                            </FormControl>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="regimen_laboral"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Régimen Laboral</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar régimen" />
                              </SelectTrigger>
                            </FormControl>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="usuario_sunat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuario SUNAT</FormLabel>
                          <FormControl>
                            <Input placeholder="USUARIO123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clave_sunat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clave SUNAT</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nro_trabajadores"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nro. Trabajadores</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="10" 
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cliente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
