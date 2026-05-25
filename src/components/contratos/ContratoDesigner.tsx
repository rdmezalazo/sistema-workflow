import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, GripVertical, FileText, Users, ListOrdered, Paperclip, Settings, ChevronDown, ChevronUp, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos de contrato disponibles
const TIPOS_CONTRATO = [
  { value: "servicios", label: "Servicios Profesionales" },
  { value: "laboral", label: "Laboral" },
  { value: "arrendamiento", label: "Arrendamiento" },
  { value: "compraventa", label: "Compraventa" },
  { value: "confidencialidad", label: "Confidencialidad (NDA)" },
  { value: "sociedad", label: "Sociedad" },
  { value: "prestamo", label: "Préstamo" },
];

// Cláusulas sugeridas por tipo de contrato
const CLAUSULAS_SUGERIDAS: Record<string, { titulo: string; contenido: string }[]> = {
  servicios: [
    { titulo: "OBJETO DEL CONTRATO", contenido: "Por el presente contrato, EL PRESTADOR se obliga a prestar a EL CLIENTE los servicios profesionales de [DESCRIPCIÓN DEL SERVICIO], conforme a los términos y condiciones establecidos en este documento." },
    { titulo: "PLAZO DE EJECUCIÓN", contenido: "El presente contrato tendrá una duración de [PLAZO] contados a partir de la fecha de su suscripción, pudiendo ser renovado de mutuo acuerdo por las partes." },
    { titulo: "CONTRAPRESTACIÓN", contenido: "Como contraprestación por los servicios prestados, EL CLIENTE se obliga a pagar a EL PRESTADOR la suma de [MONTO] ([MONTO EN LETRAS]), en la forma y oportunidad que se establece en la cláusula siguiente." },
    { titulo: "FORMA DE PAGO", contenido: "El pago se realizará mediante [MÉTODO DE PAGO], dentro de los [DÍAS] días siguientes a la presentación de la factura correspondiente." },
    { titulo: "OBLIGACIONES DEL PRESTADOR", contenido: "Son obligaciones de EL PRESTADOR: a) Ejecutar los servicios con la diligencia y profesionalismo requeridos; b) Guardar confidencialidad sobre la información recibida; c) Entregar informes periódicos sobre el avance de los servicios." },
    { titulo: "OBLIGACIONES DEL CLIENTE", contenido: "Son obligaciones de EL CLIENTE: a) Proporcionar la información necesaria para la ejecución de los servicios; b) Realizar los pagos en los plazos acordados; c) Facilitar el acceso a sus instalaciones cuando sea necesario." },
    { titulo: "CONFIDENCIALIDAD", contenido: "Las partes se obligan a mantener en estricta confidencialidad toda la información que reciban de la otra parte, así como los términos del presente contrato." },
    { titulo: "RESOLUCIÓN DEL CONTRATO", contenido: "El presente contrato podrá ser resuelto por cualquiera de las partes mediante comunicación escrita con [DÍAS] días de anticipación, sin perjuicio de cumplir con las obligaciones pendientes." },
    { titulo: "PENALIDADES", contenido: "El incumplimiento de las obligaciones establecidas en el presente contrato dará lugar a una penalidad equivalente al [PORCENTAJE]% del monto total del contrato." },
    { titulo: "SOLUCIÓN DE CONTROVERSIAS", contenido: "Las partes acuerdan someter cualquier controversia derivada del presente contrato a la jurisdicción de los tribunales de [CIUDAD], renunciando a cualquier otro fuero que pudiera corresponderles." },
  ],
  laboral: [
    { titulo: "OBJETO DEL CONTRATO", contenido: "Por el presente contrato, EL TRABAJADOR se compromete a prestar sus servicios personales a EL EMPLEADOR, desempeñando el cargo de [CARGO], con las funciones inherentes a dicho puesto." },
    { titulo: "PERÍODO DE PRUEBA", contenido: "Se establece un período de prueba de [DÍAS] días, durante el cual cualquiera de las partes podrá dar por terminado el contrato sin expresión de causa." },
    { titulo: "JORNADA DE TRABAJO", contenido: "La jornada de trabajo será de [HORAS] horas semanales, distribuidas de [DÍA] a [DÍA], en el horario de [HORA INICIO] a [HORA FIN]." },
    { titulo: "REMUNERACIÓN", contenido: "EL EMPLEADOR se obliga a pagar a EL TRABAJADOR una remuneración mensual de [MONTO], la cual será abonada en forma [QUINCENAL/MENSUAL]." },
    { titulo: "BENEFICIOS SOCIALES", contenido: "EL TRABAJADOR gozará de todos los beneficios sociales establecidos por ley, incluyendo gratificaciones, vacaciones, CTS y seguro social." },
    { titulo: "OBLIGACIONES DEL TRABAJADOR", contenido: "Son obligaciones de EL TRABAJADOR: a) Cumplir con las funciones asignadas; b) Acatar las normas internas; c) Guardar confidencialidad sobre información de la empresa." },
    { titulo: "CAUSALES DE DESPIDO", contenido: "Constituyen causales de despido justificado las previstas en la legislación laboral vigente, así como el incumplimiento grave de las obligaciones contractuales." },
  ],
  confidencialidad: [
    { titulo: "DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL", contenido: "Se considera información confidencial toda aquella información técnica, comercial, financiera, operativa o de cualquier otra naturaleza que sea revelada por LA PARTE REVELADORA a LA PARTE RECEPTORA." },
    { titulo: "OBLIGACIÓN DE CONFIDENCIALIDAD", contenido: "LA PARTE RECEPTORA se obliga a mantener en estricta confidencialidad toda la información recibida, no pudiendo divulgarla a terceros sin autorización previa y por escrito." },
    { titulo: "USO DE LA INFORMACIÓN", contenido: "La información confidencial solo podrá ser utilizada para los fines específicos del proyecto o relación comercial entre las partes." },
    { titulo: "DURACIÓN DE LA OBLIGACIÓN", contenido: "La obligación de confidencialidad se mantendrá vigente durante [AÑOS] años contados a partir de la terminación del presente acuerdo." },
    { titulo: "EXCEPCIONES", contenido: "No se considerará información confidencial aquella que: a) Sea de dominio público; b) Haya sido obtenida legalmente de un tercero; c) Deba ser revelada por mandato legal." },
    { titulo: "DEVOLUCIÓN DE INFORMACIÓN", contenido: "Al término de la relación, LA PARTE RECEPTORA deberá devolver o destruir toda la información confidencial en su poder, según lo requiera LA PARTE REVELADORA." },
  ],
  arrendamiento: [
    { titulo: "OBJETO DEL CONTRATO", contenido: "EL ARRENDADOR cede en arrendamiento a EL ARRENDATARIO el inmueble ubicado en [DIRECCIÓN], para uso exclusivo de [USO]." },
    { titulo: "PLAZO DEL ARRENDAMIENTO", contenido: "El plazo del arrendamiento es de [MESES/AÑOS], iniciando el [FECHA INICIO] y terminando el [FECHA FIN]." },
    { titulo: "RENTA MENSUAL", contenido: "La renta mensual pactada es de [MONTO], pagadera dentro de los primeros [DÍAS] días de cada mes." },
    { titulo: "GARANTÍA", contenido: "EL ARRENDATARIO entrega como garantía la suma equivalente a [MESES] meses de renta, la cual será devuelta al término del contrato." },
    { titulo: "OBLIGACIONES DEL ARRENDADOR", contenido: "Son obligaciones de EL ARRENDADOR: a) Entregar el inmueble en buen estado; b) Garantizar el uso pacífico; c) Realizar reparaciones mayores." },
    { titulo: "OBLIGACIONES DEL ARRENDATARIO", contenido: "Son obligaciones de EL ARRENDATARIO: a) Pagar la renta puntualmente; b) Mantener el inmueble en buen estado; c) No subarrendar sin autorización." },
  ],
  compraventa: [
    { titulo: "OBJETO DEL CONTRATO", contenido: "Por el presente contrato, EL VENDEDOR transfiere a EL COMPRADOR la propiedad de [DESCRIPCIÓN DEL BIEN], y este se obliga a pagar el precio convenido." },
    { titulo: "PRECIO", contenido: "El precio de venta es de [MONTO] ([MONTO EN LETRAS]), que EL COMPRADOR se obliga a pagar en la forma establecida en la cláusula siguiente." },
    { titulo: "FORMA DE PAGO", contenido: "El pago se realizará de la siguiente manera: [DETALLE DE FORMA DE PAGO]." },
    { titulo: "TRANSFERENCIA DE PROPIEDAD", contenido: "La propiedad del bien se transferirá a EL COMPRADOR una vez completado el pago total del precio pactado." },
    { titulo: "SANEAMIENTO", contenido: "EL VENDEDOR garantiza que el bien se encuentra libre de cargas, gravámenes y cualquier limitación de dominio." },
  ],
  sociedad: [],
  prestamo: [],
};

// Campos por defecto para partes contratantes
const CAMPOS_PARTE_JURIDICA = [
  { id: "razon_social", label: "Razón Social", tipo: "text", requerido: true },
  { id: "ruc", label: "RUC", tipo: "text", requerido: true },
  { id: "domicilio", label: "Domicilio", tipo: "text", requerido: true },
  { id: "representante_nombre", label: "Nombre del Representante Legal", tipo: "text", requerido: true },
  { id: "representante_dni", label: "DNI del Representante", tipo: "text", requerido: true },
  { id: "representante_poder", label: "Poder/Partida Registral", tipo: "text", requerido: false },
];

const CAMPOS_PARTE_NATURAL = [
  { id: "nombres", label: "Nombres Completos", tipo: "text", requerido: true },
  { id: "dni", label: "DNI/CE", tipo: "text", requerido: true },
  { id: "domicilio", label: "Domicilio", tipo: "text", requerido: true },
  { id: "estado_civil", label: "Estado Civil", tipo: "text", requerido: false },
  { id: "ocupacion", label: "Ocupación", tipo: "text", requerido: false },
];

interface Plantilla {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  jurisdiccion: string;
  lenguaje_formal: boolean;
  activa: boolean;
}

interface Parte {
  id: string;
  plantilla_id: string;
  orden: number;
  denominacion: string;
  tipo_persona: "natural" | "juridica";
  es_obligatoria: boolean;
  campos: { id: string; label: string; tipo: string; requerido: boolean }[];
}

interface Clausula {
  id: string;
  plantilla_id: string;
  numero: number;
  titulo: string;
  contenido: string;
  es_obligatoria: boolean;
  es_editable: boolean;
  variantes: { id: string; contenido: string }[];
  orden: number;
}

interface Anexo {
  id: string;
  plantilla_id: string;
  nombre: string;
  descripcion: string | null;
  es_obligatorio: boolean;
  orden: number;
}

export function ContratoDesigner() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [partes, setPartes] = useState<Parte[]>([]);
  const [clausulas, setClausulas] = useState<Clausula[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para crear nueva plantilla
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlantilla, setNewPlantilla] = useState({
    nombre: "",
    tipo: "servicios",
    descripcion: "",
    jurisdiccion: "Perú",
    lenguaje_formal: true,
  });

  // Estado para editar cláusula
  const [editClausulaDialog, setEditClausulaDialog] = useState(false);
  const [editingClausula, setEditingClausula] = useState<Clausula | null>(null);

  // Estado para agregar cláusula
  const [addClausulaDialog, setAddClausulaDialog] = useState(false);
  const [newClausula, setNewClausula] = useState({ titulo: "", contenido: "", es_obligatoria: false });

  // Estado para editar parte
  const [editParteDialog, setEditParteDialog] = useState(false);
  const [editingParte, setEditingParte] = useState<Parte | null>(null);

  // Estado para previsualización
  const [previewDialog, setPreviewDialog] = useState(false);

  useEffect(() => {
    fetchPlantillas();
  }, []);

  useEffect(() => {
    if (selectedPlantilla) {
      fetchPlantillaDetails(selectedPlantilla.id);
    }
  }, [selectedPlantilla?.id]);

  const fetchPlantillas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contrato_plantillas")
      .select("*")
      .order("nombre");

    if (error) {
      toast.error("Error al cargar plantillas");
      console.error(error);
    } else {
      setPlantillas(data || []);
    }
    setLoading(false);
  };

  const fetchPlantillaDetails = async (plantillaId: string) => {
    const [partesRes, clausulasRes, anexosRes] = await Promise.all([
      supabase.from("contrato_plantilla_partes").select("*").eq("plantilla_id", plantillaId).order("orden"),
      supabase.from("contrato_plantilla_clausulas").select("*").eq("plantilla_id", plantillaId).order("orden"),
      supabase.from("contrato_plantilla_anexos").select("*").eq("plantilla_id", plantillaId).order("orden"),
    ]);

    if (partesRes.data) {
      setPartes(partesRes.data.map(p => ({
        ...p,
        tipo_persona: p.tipo_persona as "natural" | "juridica",
        campos: Array.isArray(p.campos) ? p.campos as Parte["campos"] : [],
      })));
    }
    if (clausulasRes.data) {
      setClausulas(clausulasRes.data.map(c => ({
        ...c,
        variantes: Array.isArray(c.variantes) ? c.variantes as Clausula["variantes"] : [],
      })));
    }
    if (anexosRes.data) {
      setAnexos(anexosRes.data);
    }
  };

  const handleCreatePlantilla = async () => {
    if (!newPlantilla.nombre.trim()) {
      toast.error("Ingrese un nombre para la plantilla");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("contrato_plantillas")
      .insert({
        nombre: newPlantilla.nombre.trim(),
        tipo: newPlantilla.tipo,
        descripcion: newPlantilla.descripcion.trim() || null,
        jurisdiccion: newPlantilla.jurisdiccion,
        lenguaje_formal: newPlantilla.lenguaje_formal,
        activa: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al crear plantilla");
      console.error(error);
    } else {
      // Crear partes por defecto
      await supabase.from("contrato_plantilla_partes").insert([
        {
          plantilla_id: data.id,
          orden: 1,
          denominacion: "LA PRIMERA PARTE",
          tipo_persona: "juridica",
          es_obligatoria: true,
          campos: CAMPOS_PARTE_JURIDICA,
        },
        {
          plantilla_id: data.id,
          orden: 2,
          denominacion: "LA SEGUNDA PARTE",
          tipo_persona: "juridica",
          es_obligatoria: true,
          campos: CAMPOS_PARTE_JURIDICA,
        },
      ]);

      // Agregar cláusulas sugeridas automáticamente
      const clausulasSugeridas = CLAUSULAS_SUGERIDAS[newPlantilla.tipo] || [];
      if (clausulasSugeridas.length > 0) {
        await supabase.from("contrato_plantilla_clausulas").insert(
          clausulasSugeridas.map((c, idx) => ({
            plantilla_id: data.id,
            numero: idx + 1,
            titulo: c.titulo,
            contenido: c.contenido,
            es_obligatoria: idx < 3, // Las primeras 3 son obligatorias
            es_editable: true,
            variantes: [],
            orden: idx,
          }))
        );
      }

      toast.success("Plantilla creada con cláusulas sugeridas");
      setCreateDialogOpen(false);
      setNewPlantilla({ nombre: "", tipo: "servicios", descripcion: "", jurisdiccion: "Perú", lenguaje_formal: true });
      fetchPlantillas();
      setSelectedPlantilla(data);
    }
    setSaving(false);
  };

  const handleDeletePlantilla = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta plantilla?")) return;

    const { error } = await supabase.from("contrato_plantillas").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar plantilla");
    } else {
      toast.success("Plantilla eliminada");
      if (selectedPlantilla?.id === id) {
        setSelectedPlantilla(null);
        setPartes([]);
        setClausulas([]);
        setAnexos([]);
      }
      fetchPlantillas();
    }
  };

  const handleAddClausula = async () => {
    if (!selectedPlantilla || !newClausula.titulo.trim() || !newClausula.contenido.trim()) {
      toast.error("Complete todos los campos");
      return;
    }

    const nuevoNumero = clausulas.length + 1;
    const { error } = await supabase.from("contrato_plantilla_clausulas").insert({
      plantilla_id: selectedPlantilla.id,
      numero: nuevoNumero,
      titulo: newClausula.titulo.trim(),
      contenido: newClausula.contenido.trim(),
      es_obligatoria: newClausula.es_obligatoria,
      es_editable: true,
      variantes: [],
      orden: clausulas.length,
    });

    if (error) {
      toast.error("Error al agregar cláusula");
    } else {
      toast.success("Cláusula agregada");
      setAddClausulaDialog(false);
      setNewClausula({ titulo: "", contenido: "", es_obligatoria: false });
      fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleUpdateClausula = async () => {
    if (!editingClausula) return;

    const { error } = await supabase
      .from("contrato_plantilla_clausulas")
      .update({
        titulo: editingClausula.titulo,
        contenido: editingClausula.contenido,
        es_obligatoria: editingClausula.es_obligatoria,
        es_editable: editingClausula.es_editable,
      })
      .eq("id", editingClausula.id);

    if (error) {
      toast.error("Error al actualizar cláusula");
    } else {
      toast.success("Cláusula actualizada");
      setEditClausulaDialog(false);
      setEditingClausula(null);
      if (selectedPlantilla) fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleDeleteClausula = async (id: string) => {
    if (!confirm("¿Eliminar esta cláusula?")) return;

    const { error } = await supabase.from("contrato_plantilla_clausulas").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar cláusula");
    } else {
      toast.success("Cláusula eliminada");
      if (selectedPlantilla) fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleUpdateParte = async () => {
    if (!editingParte) return;

    const { error } = await supabase
      .from("contrato_plantilla_partes")
      .update({
        denominacion: editingParte.denominacion,
        tipo_persona: editingParte.tipo_persona,
        es_obligatoria: editingParte.es_obligatoria,
        campos: editingParte.campos,
      })
      .eq("id", editingParte.id);

    if (error) {
      toast.error("Error al actualizar parte");
    } else {
      toast.success("Parte actualizada");
      setEditParteDialog(false);
      setEditingParte(null);
      if (selectedPlantilla) fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleAddParte = async () => {
    if (!selectedPlantilla) return;

    const nuevoOrden = partes.length + 1;
    const denominaciones = ["LA TERCERA PARTE", "LA CUARTA PARTE", "LA QUINTA PARTE"];
    const denominacion = denominaciones[nuevoOrden - 3] || `LA PARTE ${nuevoOrden}`;

    const { error } = await supabase.from("contrato_plantilla_partes").insert({
      plantilla_id: selectedPlantilla.id,
      orden: nuevoOrden,
      denominacion,
      tipo_persona: "juridica",
      es_obligatoria: false,
      campos: CAMPOS_PARTE_JURIDICA,
    });

    if (error) {
      toast.error("Error al agregar parte");
    } else {
      toast.success("Parte agregada");
      fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleDeleteParte = async (id: string) => {
    if (partes.length <= 2) {
      toast.error("El contrato debe tener al menos 2 partes");
      return;
    }
    if (!confirm("¿Eliminar esta parte contratante?")) return;

    const { error } = await supabase.from("contrato_plantilla_partes").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar parte");
    } else {
      toast.success("Parte eliminada");
      if (selectedPlantilla) fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleAddAnexo = async () => {
    if (!selectedPlantilla) return;

    const { error } = await supabase.from("contrato_plantilla_anexos").insert({
      plantilla_id: selectedPlantilla.id,
      nombre: `Anexo ${anexos.length + 1}`,
      descripcion: "",
      es_obligatorio: false,
      orden: anexos.length,
    });

    if (error) {
      toast.error("Error al agregar anexo");
    } else {
      toast.success("Anexo agregado");
      fetchPlantillaDetails(selectedPlantilla.id);
    }
  };

  const handleMoveClausula = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= clausulas.length) return;

    const newClausulas = [...clausulas];
    [newClausulas[index], newClausulas[newIndex]] = [newClausulas[newIndex], newClausulas[index]];

    // Actualizar orden en BD
    await Promise.all(
      newClausulas.map((c, idx) =>
        supabase.from("contrato_plantilla_clausulas").update({ orden: idx, numero: idx + 1 }).eq("id", c.id)
      )
    );

    setClausulas(newClausulas.map((c, idx) => ({ ...c, orden: idx, numero: idx + 1 })));
  };

  const addSuggestedClausula = (titulo: string, contenido: string) => {
    setNewClausula({ titulo, contenido, es_obligatoria: false });
    setAddClausulaDialog(true);
  };

  const renderPreview = () => {
    if (!selectedPlantilla) return null;

    return (
      <div className="p-8 bg-white text-black font-serif text-sm leading-relaxed">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold uppercase">
            CONTRATO DE {selectedPlantilla.tipo.toUpperCase()}
          </h1>
          <p className="text-muted-foreground mt-2">{selectedPlantilla.nombre}</p>
        </div>

        <p className="mb-6 text-justify">
          Conste por el presente documento, el contrato que celebran de una parte:
        </p>

        {partes.map((parte, idx) => (
          <div key={parte.id} className="mb-4">
            <p className="font-bold">{parte.denominacion}:</p>
            <p className="text-muted-foreground italic">
              [{parte.tipo_persona === "juridica" ? "Persona Jurídica" : "Persona Natural"} - Datos a completar]
            </p>
          </div>
        ))}

        <p className="my-6 text-justify">
          Las partes acuerdan celebrar el presente contrato bajo los términos y condiciones siguientes:
        </p>

        <div className="space-y-6">
          {clausulas.map((clausula) => (
            <div key={clausula.id}>
              <p className="font-bold">
                CLÁUSULA {clausula.numero.toString().padStart(2, "0")}: {clausula.titulo}
              </p>
              <p className="text-justify mt-2 whitespace-pre-wrap">{clausula.contenido}</p>
            </div>
          ))}
        </div>

        {anexos.length > 0 && (
          <div className="mt-8">
            <p className="font-bold">ANEXOS:</p>
            <ul className="list-disc pl-6 mt-2">
              {anexos.map((anexo) => (
                <li key={anexo.id}>{anexo.nombre}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 grid grid-cols-2 gap-8">
          {partes.map((parte) => (
            <div key={parte.id} className="text-center">
              <div className="border-t border-black w-48 mx-auto pt-2">
                <p className="font-bold">{parte.denominacion}</p>
                <p className="text-sm text-muted-foreground">Firma</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Diseñador de Plantillas de Contrato
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crea y gestiona plantillas de contratos profesionales
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Plantilla de Contrato</DialogTitle>
              <DialogDescription>
                Configure los datos básicos de la plantilla
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre de la Plantilla</Label>
                <Input
                  id="nombre"
                  value={newPlantilla.nombre}
                  onChange={(e) => setNewPlantilla({ ...newPlantilla, nombre: e.target.value })}
                  placeholder="Ej: Contrato de Servicios Contables"
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Contrato</Label>
                <Select
                  value={newPlantilla.tipo}
                  onValueChange={(value) => setNewPlantilla({ ...newPlantilla, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTRATO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={newPlantilla.descripcion}
                  onChange={(e) => setNewPlantilla({ ...newPlantilla, descripcion: e.target.value })}
                  placeholder="Descripción opcional..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="jurisdiccion">Jurisdicción</Label>
                <Input
                  id="jurisdiccion"
                  value={newPlantilla.jurisdiccion}
                  onChange={(e) => setNewPlantilla({ ...newPlantilla, jurisdiccion: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="formal">Lenguaje Formal</Label>
                <Switch
                  id="formal"
                  checked={newPlantilla.lenguaje_formal}
                  onCheckedChange={(checked) => setNewPlantilla({ ...newPlantilla, lenguaje_formal: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePlantilla} disabled={saving}>
                {saving ? "Creando..." : "Crear Plantilla"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Lista de plantillas */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plantillas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-2">
                  {plantillas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay plantillas creadas
                    </p>
                  ) : (
                    plantillas.map((plantilla) => (
                      <div
                        key={plantilla.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedPlantilla?.id === plantilla.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedPlantilla(plantilla)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{plantilla.nombre}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {TIPOS_CONTRATO.find((t) => t.value === plantilla.tipo)?.label || plantilla.tipo}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlantilla(plantilla.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Editor de plantilla */}
        <div className="lg:col-span-9">
          {selectedPlantilla ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedPlantilla.nombre}</CardTitle>
                    <CardDescription>
                      {TIPOS_CONTRATO.find((t) => t.value === selectedPlantilla.tipo)?.label} • {selectedPlantilla.jurisdiccion}
                    </CardDescription>
                  </div>
                  <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Vista Previa
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Vista Previa del Contrato</DialogTitle>
                      </DialogHeader>
                      <div className="border rounded-lg overflow-hidden">
                        {renderPreview()}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="partes">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="partes" className="gap-1">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Partes</span>
                    </TabsTrigger>
                    <TabsTrigger value="clausulas" className="gap-1">
                      <ListOrdered className="h-4 w-4" />
                      <span className="hidden sm:inline">Cláusulas</span>
                    </TabsTrigger>
                    <TabsTrigger value="anexos" className="gap-1">
                      <Paperclip className="h-4 w-4" />
                      <span className="hidden sm:inline">Anexos</span>
                    </TabsTrigger>
                    <TabsTrigger value="config" className="gap-1">
                      <Settings className="h-4 w-4" />
                      <span className="hidden sm:inline">Config</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab: Partes Contratantes */}
                  <TabsContent value="partes" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Define las partes contratantes y sus datos requeridos
                      </p>
                      <Button variant="outline" size="sm" onClick={handleAddParte}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Parte
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {partes.map((parte) => (
                        <Card key={parte.id}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{parte.orden}</Badge>
                                <span className="font-medium">{parte.denominacion}</span>
                                <Badge variant="outline">
                                  {parte.tipo_persona === "juridica" ? "Persona Jurídica" : "Persona Natural"}
                                </Badge>
                                {parte.es_obligatoria && (
                                  <Badge className="bg-primary/10 text-primary">Obligatoria</Badge>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingParte(parte);
                                    setEditParteDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteParte(parte.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2">
                              {parte.campos.map((campo) => (
                                <Badge key={campo.id} variant="outline" className="text-xs">
                                  {campo.label}
                                  {campo.requerido && <span className="text-destructive ml-1">*</span>}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Tab: Cláusulas */}
                  <TabsContent value="clausulas" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {clausulas.length} cláusulas en esta plantilla
                      </p>
                      <div className="flex gap-2">
                        <Dialog open={addClausulaDialog} onOpenChange={setAddClausulaDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Nueva Cláusula
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Agregar Cláusula</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Sugerencias */}
                              {CLAUSULAS_SUGERIDAS[selectedPlantilla.tipo]?.length > 0 && (
                                <div>
                                  <Label className="text-sm">Cláusulas Sugeridas</Label>
                                  <ScrollArea className="h-32 mt-2">
                                    <div className="flex flex-wrap gap-2">
                                      {CLAUSULAS_SUGERIDAS[selectedPlantilla.tipo]
                                        .filter((s) => !clausulas.some((c) => c.titulo === s.titulo))
                                        .map((sugerida, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary/10"
                                            onClick={() => addSuggestedClausula(sugerida.titulo, sugerida.contenido)}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            {sugerida.titulo}
                                          </Badge>
                                        ))}
                                    </div>
                                  </ScrollArea>
                                  <Separator className="my-4" />
                                </div>
                              )}
                              <div>
                                <Label htmlFor="titulo-clausula">Título</Label>
                                <Input
                                  id="titulo-clausula"
                                  value={newClausula.titulo}
                                  onChange={(e) => setNewClausula({ ...newClausula, titulo: e.target.value })}
                                  placeholder="OBJETO DEL CONTRATO"
                                />
                              </div>
                              <div>
                                <Label htmlFor="contenido-clausula">Contenido</Label>
                                <Textarea
                                  id="contenido-clausula"
                                  value={newClausula.contenido}
                                  onChange={(e) => setNewClausula({ ...newClausula, contenido: e.target.value })}
                                  placeholder="Redacte el contenido de la cláusula..."
                                  rows={6}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newClausula.es_obligatoria}
                                  onCheckedChange={(checked) =>
                                    setNewClausula({ ...newClausula, es_obligatoria: checked })
                                  }
                                />
                                <Label>Cláusula obligatoria</Label>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setAddClausulaDialog(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleAddClausula}>Agregar Cláusula</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <ScrollArea className="h-[400px]">
                      <Accordion type="multiple" className="space-y-2">
                        {clausulas.map((clausula, index) => (
                          <AccordionItem
                            key={clausula.id}
                            value={clausula.id}
                            className="border rounded-lg px-4"
                          >
                            <div className="flex items-center gap-2 py-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={index === 0}
                                  onClick={() => handleMoveClausula(index, "up")}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  disabled={index === clausulas.length - 1}
                                  onClick={() => handleMoveClausula(index, "down")}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {clausula.numero.toString().padStart(2, "0")}
                              </Badge>
                              <AccordionTrigger className="flex-1 hover:no-underline py-0">
                                <div className="flex items-center gap-2 text-left">
                                  <span className="font-medium">{clausula.titulo}</span>
                                  {clausula.es_obligatoria && (
                                    <Badge className="bg-primary/10 text-primary text-xs">Obligatoria</Badge>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <div className="flex gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClausula(clausula);
                                    setEditClausulaDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClausula(clausula.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <AccordionContent className="pb-4">
                              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                                {clausula.contenido}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </TabsContent>

                  {/* Tab: Anexos */}
                  <TabsContent value="anexos" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Documentos complementarios del contrato
                      </p>
                      <Button variant="outline" size="sm" onClick={handleAddAnexo}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Anexo
                      </Button>
                    </div>

                    {anexos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No hay anexos configurados</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {anexos.map((anexo) => (
                          <Card key={anexo.id}>
                            <CardContent className="py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{anexo.nombre}</p>
                                  {anexo.descripcion && (
                                    <p className="text-sm text-muted-foreground">{anexo.descripcion}</p>
                                  )}
                                </div>
                                {anexo.es_obligatorio && (
                                  <Badge className="bg-primary/10 text-primary">Obligatorio</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  supabase.from("contrato_plantilla_anexos").delete().eq("id", anexo.id).then(() => {
                                    toast.success("Anexo eliminado");
                                    fetchPlantillaDetails(selectedPlantilla.id);
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Configuración */}
                  <TabsContent value="config" className="space-y-4 mt-4">
                    <div className="grid gap-4 max-w-md">
                      <div>
                        <Label>Jurisdicción</Label>
                        <Input defaultValue={selectedPlantilla.jurisdiccion} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Lenguaje Formal</Label>
                        <Switch checked={selectedPlantilla.lenguaje_formal} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Plantilla Activa</Label>
                        <Switch checked={selectedPlantilla.activa} disabled />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona una plantilla para editarla</p>
                <p className="text-sm">o crea una nueva plantilla</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Editar Cláusula */}
      <Dialog open={editClausulaDialog} onOpenChange={setEditClausulaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cláusula</DialogTitle>
          </DialogHeader>
          {editingClausula && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editingClausula.titulo}
                  onChange={(e) => setEditingClausula({ ...editingClausula, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label>Contenido</Label>
                <Textarea
                  value={editingClausula.contenido}
                  onChange={(e) => setEditingClausula({ ...editingClausula, contenido: e.target.value })}
                  rows={8}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingClausula.es_obligatoria}
                    onCheckedChange={(checked) =>
                      setEditingClausula({ ...editingClausula, es_obligatoria: checked })
                    }
                  />
                  <Label>Obligatoria</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingClausula.es_editable}
                    onCheckedChange={(checked) =>
                      setEditingClausula({ ...editingClausula, es_editable: checked })
                    }
                  />
                  <Label>Editable al generar</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClausulaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateClausula}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Parte */}
      <Dialog open={editParteDialog} onOpenChange={setEditParteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Parte Contratante</DialogTitle>
          </DialogHeader>
          {editingParte && (
            <div className="space-y-4">
              <div>
                <Label>Denominación</Label>
                <Input
                  value={editingParte.denominacion}
                  onChange={(e) => setEditingParte({ ...editingParte, denominacion: e.target.value })}
                  placeholder="LA PRIMERA PARTE"
                />
              </div>
              <div>
                <Label>Tipo de Persona</Label>
                <Select
                  value={editingParte.tipo_persona}
                  onValueChange={(value: "natural" | "juridica") => {
                    setEditingParte({
                      ...editingParte,
                      tipo_persona: value,
                      campos: value === "juridica" ? CAMPOS_PARTE_JURIDICA : CAMPOS_PARTE_NATURAL,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="juridica">Persona Jurídica</SelectItem>
                    <SelectItem value="natural">Persona Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingParte.es_obligatoria}
                  onCheckedChange={(checked) => setEditingParte({ ...editingParte, es_obligatoria: checked })}
                />
                <Label>Parte obligatoria</Label>
              </div>
              <div>
                <Label>Campos requeridos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingParte.campos.map((campo) => (
                    <Badge key={campo.id} variant="outline">
                      {campo.label}
                      {campo.requerido && <span className="text-destructive ml-1">*</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditParteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateParte}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
