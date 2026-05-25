import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Loader2, Save, Download, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { generateProformaPDF, downloadPDF } from "@/lib/generateProformaPDF";
import { getPDFStylesForType } from "@/hooks/usePDFStyles";

interface ProformaItem {
  id?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Proforma {
  id: string;
  numero: string;
  tipo: string;
  subtotal: number;
  igv: number;
  total: number;
  status: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  notas: string | null;
  moneda: string;
  cliente_id?: string;
  cliente?: {
    razon_social: string;
    codigo: string;
    direccion?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
  campos_personalizados?: Record<string, any> | null;
  incluir_proyeccion_pdf?: boolean;
}

interface EditProformaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proforma: Proforma | null;
  items: ProformaItem[];
  onSuccess: () => void;
}

export function EditProformaDialog({
  open,
  onOpenChange,
  proforma,
  items: initialItems,
  onSuccess,
}: EditProformaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProformaItem[]>([]);
  const [notas, setNotas] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [status, setStatus] = useState<string>("borrador");
  const [openServiceIndex, setOpenServiceIndex] = useState<number | null>(null);
  const [serviceSearches, setServiceSearches] = useState<{ [key: number]: string }>({});
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch services for autocomplete
  const { data: servicios = [] } = useQuery({
    queryKey: ["servicios-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .eq("activo", true)
        .order("servicio");
      if (error) throw error;
      return data;
    },
  });

  // Fetch dynamic statuses
  const { data: estados = [] } = useQuery({
    queryKey: ["proforma-estados-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proforma_estados")
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (proforma && open) {
      setItems(initialItems.length > 0 ? initialItems : [{ descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
      setNotas(proforma.notas || "");
      setFechaVencimiento(proforma.fecha_vencimiento);
      setStatus(proforma.status);
      setServiceSearches({});
    }
  }, [proforma, initialItems, open]);

  const getFilteredServices = (index: number) => {
    const search = serviceSearches[index] || items[index]?.descripcion || "";
    if (!search) return servicios;
    const searchLower = search.toLowerCase();
    return servicios.filter((s) => 
      s.servicio.toLowerCase().includes(searchLower) ||
      s.grupo_servicio?.toLowerCase().includes(searchLower) ||
      s.regimen_tributario?.toLowerCase().includes(searchLower) ||
      s.entidad?.toLowerCase().includes(searchLower)
    );
  };

  const handleServiceSelect = (index: number, servicio: typeof servicios[0]) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      descripcion: servicio.servicio,
      precio_unitario: servicio.precio_servicio,
      subtotal: Number(newItems[index].cantidad) * servicio.precio_servicio,
    };
    setItems(newItems);
    setOpenServiceIndex(null);
    setServiceSearches((prev) => ({ ...prev, [index]: "" }));
  };

  const handleItemChange = (
    index: number,
    field: keyof ProformaItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "cantidad" || field === "precio_unitario") {
      newItems[index].subtotal =
        Number(newItems[index].cantidad) * Number(newItems[index].precio_unitario);
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { descripcion: "", cantidad: 1, precio_unitario: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      setServiceSearches((prev) => {
        const newSearches = { ...prev };
        delete newSearches[index];
        return newSearches;
      });
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return { subtotal, igv, total };
  };

  const handleDownloadPDF = async () => {
    if (!proforma?.cliente) {
      toast.error("No hay datos del cliente para generar el PDF");
      return;
    }

    const validItems = items.filter((item) => item.descripcion.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Agregue al menos un servicio");
      return;
    }

    setGeneratingPDF(true);
    
    try {
      const pdfStyles = await getPDFStylesForType(proforma.tipo);
      const { subtotal, igv, total } = calculateTotals();
      
      // Prepare calendar projection data if enabled
      let calendarProjectionData: { numero: number; fecha_pago: string; servicio: string; monto: number }[] | undefined;
      
      if (proforma.incluir_proyeccion_pdf && proforma.campos_personalizados?.payment_schedule) {
        const schedule = proforma.campos_personalizados.payment_schedule as any[];
        calendarProjectionData = schedule.map((s: any) => ({
          numero: s.cuota,
          fecha_pago: typeof s.fecha === 'string' ? s.fecha : new Date(s.fecha).toISOString(),
          servicio: s.servicio,
          monto: s.monto,
        }));
      }
      
      const pdfBlob = await generateProformaPDF({
        numero: proforma.numero,
        tipo: proforma.tipo,
        fecha_emision: proforma.fecha_emision,
        fecha_vencimiento: fechaVencimiento,
        cliente: {
          razon_social: proforma.cliente.razon_social,
          codigo: proforma.cliente.codigo,
          direccion: proforma.cliente.direccion,
          email: proforma.cliente.email,
          telefono: proforma.cliente.telefono,
        },
        items: validItems.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        subtotal: subtotal,
        igv: igv,
        total: total,
        notas: notas,
        moneda: proforma.moneda,
        calendarProjection: calendarProjectionData,
      }, pdfStyles);

      downloadPDF(pdfBlob, `Proforma_${proforma.numero}.pdf`);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    if (!proforma?.cliente) {
      toast.error("No hay datos del cliente para generar el PDF");
      return;
    }

    const validItems = items.filter((item) => item.descripcion.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Agregue al menos un servicio");
      return;
    }

    setGeneratingPDF(true);
    
    try {
      const pdfStyles = await getPDFStylesForType(proforma.tipo);
      const { subtotal, igv, total } = calculateTotals();
      
      // Prepare calendar projection data if enabled
      let calendarProjectionData: { numero: number; fecha_pago: string; servicio: string; monto: number }[] | undefined;
      
      if (proforma.incluir_proyeccion_pdf && proforma.campos_personalizados?.payment_schedule) {
        const schedule = proforma.campos_personalizados.payment_schedule as any[];
        calendarProjectionData = schedule.map((s: any) => ({
          numero: s.cuota,
          fecha_pago: typeof s.fecha === 'string' ? s.fecha : new Date(s.fecha).toISOString(),
          servicio: s.servicio,
          monto: s.monto,
        }));
      }
      
      const pdfBlob = await generateProformaPDF({
        numero: proforma.numero,
        tipo: proforma.tipo,
        fecha_emision: proforma.fecha_emision,
        fecha_vencimiento: fechaVencimiento,
        cliente: {
          razon_social: proforma.cliente.razon_social,
          codigo: proforma.cliente.codigo,
          direccion: proforma.cliente.direccion,
          email: proforma.cliente.email,
          telefono: proforma.cliente.telefono,
        },
        items: validItems.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
        subtotal: subtotal,
        igv: igv,
        total: total,
        notas: notas,
        moneda: proforma.moneda,
        calendarProjection: calendarProjectionData,
      }, pdfStyles);

      // Open in new window for printing
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
      toast.success("Abriendo ventana de impresión");
    } catch (error) {
      console.error("Error generating PDF for print:", error);
      toast.error("Error al generar el PDF para imprimir");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSubmit = async () => {
    if (!proforma) return;

    const validItems = items.filter((item) => item.descripcion.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Agregue al menos un item");
      return;
    }

    setLoading(true);
    const { subtotal, igv, total } = calculateTotals();

    try {
      // Update proforma
      const { error: proformaError } = await supabase
        .from("proformas")
        .update({
          fecha_vencimiento: fechaVencimiento,
          subtotal,
          igv,
          total,
          notas,
          status: status as "borrador" | "enviada" | "aprobada" | "rechazada" | "facturada",
          updated_at: new Date().toISOString(),
        })
        .eq("id", proforma.id);

      if (proformaError) throw proformaError;

      // Delete existing items
      await supabase.from("proforma_items").delete().eq("proforma_id", proforma.id);

      // Insert new items
      const proformaItems = validItems.map((item) => ({
        proforma_id: proforma.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from("proforma_items")
        .insert(proformaItems);

      if (itemsError) throw itemsError;

      toast.success("Proforma actualizada correctamente");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating proforma:", error);
      toast.error("Error al actualizar la proforma");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, igv, total } = calculateTotals();

  if (!proforma) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Editar Proforma {proforma.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((estado) => (
                    <SelectItem key={estado.id} value={estado.nombre}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: estado.color }}
                        />
                        {estado.nombre_display}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <Input
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Servicios</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Popover 
                      open={openServiceIndex === index} 
                      onOpenChange={(open) => setOpenServiceIndex(open ? index : null)}
                    >
                      <PopoverTrigger asChild>
                        <Input
                          placeholder="Descripción del servicio"
                          value={item.descripcion}
                          onChange={(e) => {
                            handleItemChange(index, "descripcion", e.target.value);
                            setServiceSearches((prev) => ({ ...prev, [index]: e.target.value }));
                            setOpenServiceIndex(index);
                          }}
                          onClick={() => setOpenServiceIndex(index)}
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar servicio..." 
                            value={serviceSearches[index] || ""}
                            onValueChange={(value) => setServiceSearches((prev) => ({ ...prev, [index]: value }))}
                          />
                          <CommandList>
                            <CommandEmpty>No se encontraron servicios</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                              {getFilteredServices(index).map((servicio) => (
                                <CommandItem
                                  key={servicio.id}
                                  value={servicio.servicio}
                                  onSelect={() => handleServiceSelect(index, servicio)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{servicio.servicio}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {servicio.grupo_servicio} {servicio.regimen_tributario && `• ${servicio.regimen_tributario}`} • S/ {servicio.precio_servicio.toFixed(2)}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(index, "cantidad", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio"
                      value={item.precio_unitario}
                      onChange={(e) => handleItemChange(index, "precio_unitario", Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 text-right font-medium text-sm py-2">
                    S/ {item.subtotal.toFixed(2)}
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="h-9 w-9 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IGV (18%):</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span className="text-primary">S/ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              rows={3}
              placeholder="Notas adicionales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF} 
              disabled={loading || generatingPDF}
              className="gap-2"
            >
              {generatingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              disabled={loading || generatingPDF}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="btn-gradient gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
