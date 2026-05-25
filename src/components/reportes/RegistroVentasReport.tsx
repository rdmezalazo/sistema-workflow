import { useState, useEffect, useRef, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Printer,
  Download,
  Search,
  CalendarDays,
  FileSpreadsheet,
  Building2,
  Receipt,
  Save,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ExportExcelButton } from "@/components/ui/ExportExcelButton";

// Peruvian accounting standard accounts suggestions
const CUENTA_INGRESO_SUGERENCIAS = [
  { codigo: "7011", descripcion: "Mercaderías manufacturadas" },
  { codigo: "7021", descripcion: "Productos terminados" },
  { codigo: "7031", descripcion: "Subproductos y desechos" },
  { codigo: "7041", descripcion: "Servicios de contabilidad" },
  { codigo: "7042", descripcion: "Servicios de asesoría tributaria" },
  { codigo: "7043", descripcion: "Servicios de consultoría" },
  { codigo: "7044", descripcion: "Servicios de auditoría" },
  { codigo: "7051", descripcion: "Alquileres" },
  { codigo: "7591", descripcion: "Otros ingresos de gestión" },
];

const CUENTA_IGV_SUGERENCIAS = [
  { codigo: "40111", descripcion: "IGV - Cuenta propia" },
  { codigo: "40112", descripcion: "IGV - Servicios prestados por no domiciliados" },
  { codigo: "40113", descripcion: "IGV - Régimen de percepciones" },
  { codigo: "40114", descripcion: "IGV - Régimen de retenciones" },
];

const CUENTA_OTROS_TRIBUTOS_SUGERENCIAS = [
  { codigo: "40171", descripcion: "Renta de tercera categoría" },
  { codigo: "40172", descripcion: "Renta de cuarta categoría" },
  { codigo: "40173", descripcion: "Renta de quinta categoría" },
  { codigo: "40181", descripcion: "ESSALUD" },
  { codigo: "40182", descripcion: "ONP" },
  { codigo: "40183", descripcion: "AFP" },
];

const CUENTA_POR_COBRAR_SUGERENCIAS = [
  { codigo: "1212", descripcion: "Emitidas en cartera" },
  { codigo: "1213", descripcion: "En cobranza" },
  { codigo: "1214", descripcion: "En descuento" },
  { codigo: "1311", descripcion: "Préstamos" },
  { codigo: "1411", descripcion: "Personal" },
  { codigo: "1611", descripcion: "Depósitos en garantía" },
];

const CENTRO_COSTO_SUGERENCIAS = [
  { codigo: "CC001", descripcion: "Administración" },
  { codigo: "CC002", descripcion: "Contabilidad" },
  { codigo: "CC003", descripcion: "Recursos Humanos" },
  { codigo: "CC004", descripcion: "Tributario" },
  { codigo: "CC005", descripcion: "Ventas" },
  { codigo: "CC006", descripcion: "Operaciones" },
];

type DateFilterType = "Hoy" | "Semana Actual" | "Mes Actual" | "Mes" | "Fecha" | "Año" | "Todo";

interface SalesRecord {
  id: string;
  pago_id: string | null;
  fecha_emision: string;
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  cliente_razon_social: string;
  cliente_ruc: string;
  base_imponible: number;
  igv: number;
  total: number;
  moneda: string;
  glosa: string;
  cta_ingreso: string;
  cta_igv: string;
  cta_otros_tributos: string;
  cta_por_cobrar: string;
  centro_costo: string;
  estado: string;
  isFromDB: boolean;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const CURRENT_YEAR = new Date().getFullYear();

export function RegistroVentasReport() {
  const { formatCurrency, config } = useSystemConfig();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("Hoy");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Account and glosa editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [accountValues, setAccountValues] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const getDateRange = (filter: DateFilterType): { start: Date; end: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    switch (filter) {
      case "Hoy":
        return { start: today, end: endOfToday };
      case "Semana Actual":
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case "Mes Actual":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "Mes":
        const monthDate = new Date(selectedYear, selectedMonth, 1);
        return { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
      case "Fecha":
        if (selectedDate) {
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);
          return { start: startOfDay, end: endOfDay };
        }
        return null;
      case "Año":
        const yearDate = new Date(selectedYear, 0, 1);
        return { start: startOfYear(yearDate), end: endOfYear(yearDate) };
      case "Todo":
        return null;
      default:
        return null;
    }
  };

  const dateRange = useMemo(() => getDateRange(dateFilter), [dateFilter, selectedMonth, selectedYear, selectedDate]);

  // Fetch sales records from paid payments
  useEffect(() => {
    fetchSalesRecords();
  }, [dateRange]);

  const fetchSalesRecords = async () => {
    setLoading(true);
    try {
      let startDate: string | null = null;
      let endDate: string | null = null;

      if (dateRange) {
        startDate = format(dateRange.start, "yyyy-MM-dd");
        endDate = format(dateRange.end, "yyyy-MM-dd");
      }

      // First, fetch existing records from registro_ventas table
      let existingQuery = supabase
        .from("registro_ventas")
        .select("*")
        .order("fecha_emision", { ascending: true });

      if (startDate && endDate) {
        existingQuery = existingQuery.gte("fecha_emision", startDate).lte("fecha_emision", endDate);
      }

      const { data: existingRecords, error: existingError } = await existingQuery;

      if (existingError) throw existingError;

      // Create a map of pago_id to existing records
      const existingByPagoId = new Map(
        (existingRecords || []).map((r: any) => [r.pago_id, r])
      );

      // Fetch paid payments that might not be in registro_ventas yet
      let pagosQuery = supabase
        .from("pagos")
        .select(`
          id,
          fecha_emision,
          fecha_pago,
          tipo_comprobante,
          serie_comprobante,
          numero_comprobante,
          subtotal,
          igv,
          monto,
          observaciones_contables,
          status,
          contrato:contratos(
            descripcion,
            moneda,
            cliente:clientes(
              razon_social,
              codigo
            )
          )
        `)
        .eq("status", "pagado")
        .order("fecha_emision", { ascending: true });

      if (startDate && endDate) {
        pagosQuery = pagosQuery.gte("fecha_emision", startDate).lte("fecha_emision", endDate);
      }

      const { data: pagosData, error: pagosError } = await pagosQuery;

      if (pagosError) throw pagosError;

      const records: SalesRecord[] = [];

      // Process each pago
      for (const pago of pagosData || []) {
        const existing = existingByPagoId.get(pago.id);
        
        if (existing) {
          // Use the saved registro_ventas record
          records.push({
            id: existing.id,
            pago_id: existing.pago_id,
            fecha_emision: existing.fecha_emision,
            tipo_comprobante: existing.tipo_comprobante,
            serie_comprobante: existing.serie_comprobante || "",
            numero_comprobante: existing.numero_comprobante || "",
            cliente_razon_social: existing.cliente_razon_social,
            cliente_ruc: existing.cliente_ruc,
            base_imponible: Number(existing.base_imponible),
            igv: Number(existing.igv),
            total: Number(existing.total),
            moneda: existing.moneda,
            glosa: existing.glosa || "",
            cta_ingreso: existing.cta_ingreso || "7041",
            cta_igv: existing.cta_igv || "40111",
            cta_otros_tributos: existing.cta_otros_tributos || "",
            cta_por_cobrar: existing.cta_por_cobrar || "1212",
            centro_costo: existing.centro_costo || "CC001",
            estado: existing.estado,
            isFromDB: true,
          });
          existingByPagoId.delete(pago.id);
        } else {
          // Create a new record from pago data
          const baseImponible = Number(pago.subtotal) || Number(pago.monto) / (1 + (config?.igv_percentage || 18) / 100);
          const igvAmount = Number(pago.igv) || Number(pago.monto) * ((config?.igv_percentage || 18) / 100) / (1 + (config?.igv_percentage || 18) / 100);
          
          records.push({
            id: pago.id, // Use pago.id temporarily
            pago_id: pago.id,
            fecha_emision: pago.fecha_emision || pago.fecha_pago,
            tipo_comprobante: pago.tipo_comprobante || "factura",
            serie_comprobante: pago.serie_comprobante || "",
            numero_comprobante: pago.numero_comprobante || "",
            cliente_razon_social: pago.contrato?.cliente?.razon_social || "",
            cliente_ruc: pago.contrato?.cliente?.codigo || "",
            base_imponible: baseImponible,
            igv: igvAmount,
            total: Number(pago.monto),
            moneda: pago.contrato?.moneda || "PEN",
            glosa: pago.observaciones_contables || pago.contrato?.descripcion || "",
            cta_ingreso: "7041",
            cta_igv: "40111",
            cta_otros_tributos: "",
            cta_por_cobrar: "1212",
            centro_costo: "CC001",
            estado: "pendiente",
            isFromDB: false,
          });
        }
      }

      // Add any remaining existing records (orphaned - no matching pago)
      for (const [, existing] of existingByPagoId) {
        records.push({
          id: existing.id,
          pago_id: existing.pago_id,
          fecha_emision: existing.fecha_emision,
          tipo_comprobante: existing.tipo_comprobante,
          serie_comprobante: existing.serie_comprobante || "",
          numero_comprobante: existing.numero_comprobante || "",
          cliente_razon_social: existing.cliente_razon_social,
          cliente_ruc: existing.cliente_ruc,
          base_imponible: Number(existing.base_imponible),
          igv: Number(existing.igv),
          total: Number(existing.total),
          moneda: existing.moneda,
          glosa: existing.glosa || "",
          cta_ingreso: existing.cta_ingreso || "7041",
          cta_igv: existing.cta_igv || "40111",
          cta_otros_tributos: existing.cta_otros_tributos || "",
          cta_por_cobrar: existing.cta_por_cobrar || "1212",
          centro_costo: existing.centro_costo || "CC001",
          estado: existing.estado,
          isFromDB: true,
        });
      }

      // Sort by date
      records.sort((a, b) => new Date(a.fecha_emision).getTime() - new Date(b.fecha_emision).getTime());

      setSalesRecords(records);
    } catch (error) {
      console.error("Error fetching sales records:", error);
      toast.error("Error al cargar el registro de ventas");
    } finally {
      setLoading(false);
    }
  };

  // Filter records by search
  const filteredRecords = salesRecords.filter(record => {
    const searchLower = search.toLowerCase();
    return (
      record.cliente_razon_social.toLowerCase().includes(searchLower) ||
      record.cliente_ruc.includes(search) ||
      record.numero_comprobante.includes(search) ||
      record.serie_comprobante.includes(search) ||
      (record.glosa && record.glosa.toLowerCase().includes(searchLower))
    );
  });

  // Calculate totals
  const totals = filteredRecords.reduce(
    (acc, record) => ({
      base_imponible: acc.base_imponible + record.base_imponible,
      igv: acc.igv + record.igv,
      total: acc.total + record.total,
    }),
    { base_imponible: 0, igv: 0, total: 0 }
  );

  // Update record field (for glosa and accounts)
  const handleFieldChange = (recordId: string, field: string, value: string) => {
    setSalesRecords(prev => prev.map(record => 
      record.id === recordId ? { ...record, [field]: value } : record
    ));
  };

  const handleAccountChange = (recordId: string, field: string, value: string) => {
    setAccountValues(prev => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [field]: value,
      },
    }));
    // Also update the record directly
    handleFieldChange(recordId, field, value);
    setEditingCell(null);
  };

  // Save all records to database
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const periodoMes = dateFilter === "Mes" ? selectedMonth + 1 : new Date().getMonth() + 1;
      const periodoAnio = (dateFilter === "Mes" || dateFilter === "Año") ? selectedYear : new Date().getFullYear();

      for (const record of salesRecords) {
        const recordData = {
          pago_id: record.pago_id,
          fecha_emision: record.fecha_emision,
          tipo_comprobante: record.tipo_comprobante,
          serie_comprobante: record.serie_comprobante || null,
          numero_comprobante: record.numero_comprobante || null,
          cliente_ruc: record.cliente_ruc,
          cliente_razon_social: record.cliente_razon_social,
          base_imponible: record.base_imponible,
          igv: record.igv,
          total: record.total,
          moneda: record.moneda,
          glosa: record.glosa || null,
          cta_ingreso: accountValues[record.id]?.cta_ingreso || record.cta_ingreso,
          cta_igv: accountValues[record.id]?.cta_igv || record.cta_igv,
          cta_otros_tributos: accountValues[record.id]?.cta_otros_tributos || record.cta_otros_tributos || null,
          cta_por_cobrar: accountValues[record.id]?.cta_por_cobrar || record.cta_por_cobrar,
          centro_costo: accountValues[record.id]?.centro_costo || record.centro_costo,
          periodo_mes: periodoMes,
          periodo_anio: periodoAnio,
          estado: "registrado",
        };

        if (record.isFromDB) {
          // Update existing record
          const { error } = await supabase
            .from("registro_ventas")
            .update(recordData)
            .eq("id", record.id);
          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from("registro_ventas")
            .insert(recordData);
          if (error) throw error;
        }
      }

      // Refetch to get updated data
      await fetchSalesRecords();
      toast.success("Registro de ventas guardado correctamente");
    } catch (error) {
      console.error("Error saving sales records:", error);
      toast.error("Error al guardar el registro de ventas");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const periodLabel = (() => {
      switch (dateFilter) {
        case "Hoy":
          return format(new Date(), "dd/MM/yyyy");
        case "Semana Actual":
          return `Semana del ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), "dd/MM/yyyy")} al ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), "dd/MM/yyyy")}`;
        case "Mes Actual":
          return format(new Date(), "MMMM yyyy", { locale: es });
        case "Mes":
          return `${MONTHS[selectedMonth]} ${selectedYear}`;
        case "Fecha":
          return selectedDate ? format(selectedDate, "dd/MM/yyyy") : "";
        case "Año":
          return `Año ${selectedYear}`;
        case "Todo":
          return "Todos los periodos";
        default:
          return "";
      }
    })();

    const formatNumber = (num: number) => {
      return num.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getComprobanteLabel = (tipo: string) => {
      const labels: Record<string, string> = {
        factura: "FAC",
        boleta: "BOL",
        recibo_interno: "R.I.",
        nota_credito: "N/C",
        nota_debito: "N/D",
      };
      return labels[tipo] || tipo?.toUpperCase()?.substring(0, 3) || "-";
    };

    // Generate table rows
    const tableRows = filteredRecords.map((record, index) => {
      const fechaEmision = record.fecha_emision 
        ? format(parseISO(record.fecha_emision), "dd/MM/yyyy") 
        : "-";
      
      return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${fechaEmision}</td>
          <td>${getComprobanteLabel(record.tipo_comprobante)}</td>
          <td>${record.serie_comprobante || "-"}</td>
          <td>${record.numero_comprobante || "-"}</td>
          <td>${record.cliente_ruc || "-"}</td>
          <td>${record.cliente_razon_social || "-"}</td>
          <td>${record.glosa || "-"}</td>
          <td class="text-right">${formatNumber(record.base_imponible)}</td>
          <td class="text-right">${formatNumber(record.igv)}</td>
          <td class="text-right">${formatNumber(record.total)}</td>
          <td>${record.cta_ingreso || "-"}</td>
          <td>${record.cta_igv || "-"}</td>
          <td>${record.cta_otros_tributos || "-"}</td>
          <td>${record.cta_por_cobrar || "-"}</td>
          <td>${record.centro_costo || "-"}</td>
        </tr>
      `;
    }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Registro de Ventas - ${periodLabel}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 15px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #A34139; }
          .header h1 { color: #A34139; font-size: 18px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 12px; }
          .period { background: #f5f5f5; padding: 8px 15px; margin-bottom: 15px; border-radius: 4px; display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background: #A34139; color: white; padding: 8px 4px; text-align: left; font-size: 9px; }
          td { padding: 6px 4px; border-bottom: 1px solid #ddd; font-size: 9px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals { background: #A34139 !important; color: white !important; font-weight: bold; }
          .totals td { border-bottom: none; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; }
          .footer-left { color: #666; font-size: 9px; }
          .footer-right { color: #666; font-size: 9px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REGISTRO DE VENTAS</h1>
          <p>C&A Contadores y Auditores</p>
        </div>
        
        <div class="period">
          <strong>Período:</strong> ${periodLabel}
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="text-center">#</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Serie</th>
              <th>Número</th>
              <th>RUC</th>
              <th>Razón Social</th>
              <th>Glosa</th>
              <th class="text-right">Base Imp.</th>
              <th class="text-right">IGV</th>
              <th class="text-right">Total</th>
              <th>Cta Ing.</th>
              <th>Cta IGV</th>
              <th>Cta O.Trib.</th>
              <th>Cta x Cob.</th>
              <th>C.Costo</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="totals">
              <td colspan="8" class="text-right"><strong>TOTALES:</strong></td>
              <td class="text-right"><strong>${formatNumber(totals.base_imponible)}</strong></td>
              <td class="text-right"><strong>${formatNumber(totals.igv)}</strong></td>
              <td class="text-right"><strong>${formatNumber(totals.total)}</strong></td>
              <td colspan="5"></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div class="footer-left">
            Total de registros: ${filteredRecords.length}
          </div>
          <div class="footer-right">
            Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const getComprobanteLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      factura: "Factura",
      boleta: "Boleta",
      recibo_interno: "R. Interno",
      nota_credito: "N. Crédito",
      nota_debito: "N. Débito",
    };
    return labels[tipo] || tipo || "-";
  };

  const AccountCombobox = ({ 
    recordId, 
    field, 
    value, 
    suggestions,
    placeholder 
  }: { 
    recordId: string; 
    field: string; 
    value: string; 
    suggestions: { codigo: string; descripcion: string }[];
    placeholder: string;
  }) => {
    const isEditing = editingCell?.id === recordId && editingCell?.field === field;
    
    if (!isEditing) {
      return (
        <button
          className="text-left w-full hover:bg-muted/50 px-1 py-0.5 rounded text-xs"
          onClick={() => setEditingCell({ id: recordId, field })}
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      );
    }

    return (
      <Popover open={isEditing} onOpenChange={(open) => !open && setEditingCell(null)}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-start">
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cuenta..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No se encontró.</CommandEmpty>
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.codigo}
                    value={suggestion.codigo}
                    onSelect={() => handleAccountChange(recordId, field, suggestion.codigo)}
                    className="text-xs"
                  >
                    <span className="font-medium">{suggestion.codigo}</span>
                    <span className="text-muted-foreground ml-2">{suggestion.descripcion}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={dateFilter} onValueChange={(v) => v && setDateFilter(v as DateFilterType)}>
          <ToggleGroupItem value="Hoy" aria-label="Hoy" className="text-xs">
            Hoy
          </ToggleGroupItem>
          <ToggleGroupItem value="Semana Actual" aria-label="Semana Actual" className="text-xs">
            Semana Actual
          </ToggleGroupItem>
          <ToggleGroupItem value="Mes Actual" aria-label="Mes Actual" className="text-xs">
            Mes Actual
          </ToggleGroupItem>
          <ToggleGroupItem value="Mes" aria-label="Mes" className="text-xs">
            Mes
          </ToggleGroupItem>
          <ToggleGroupItem value="Fecha" aria-label="Fecha" className="text-xs">
            Fecha
          </ToggleGroupItem>
          <ToggleGroupItem value="Año" aria-label="Año" className="text-xs">
            Año
          </ToggleGroupItem>
          <ToggleGroupItem value="Todo" aria-label="Todo" className="text-xs">
            Todo
          </ToggleGroupItem>
        </ToggleGroup>

        {dateFilter === "Mes" && (
          <div className="flex items-center gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {format(new Date(2024, i, 1), "MMMM", { locale: es })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {dateFilter === "Fecha" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
                <CalendarDays className="h-3 w-3" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}

        {dateFilter === "Año" && (
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        <Badge variant="secondary" className="ml-2">
          {filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Base Imponible</p>
                <p className="text-2xl font-bold">S/ {totals.base_imponible.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IGV Total</p>
                <p className="text-2xl font-bold text-amber-600">S/ {totals.igv.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold text-green-600">S/ {totals.total.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por RUC, razón social, comprobante o glosa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <ExportExcelButton
                allRows={salesRecords}
                filteredRows={filteredRecords}
                fileName="registro_ventas"
                sheetName="Registro Ventas"
                size="sm"
                columns={[
                  { header: "Fecha Emisión", accessor: (r: any) => r.fecha_emision },
                  { header: "Tipo Comprobante", accessor: (r: any) => r.tipo_comprobante },
                  { header: "Serie", accessor: (r: any) => r.serie_comprobante },
                  { header: "Número", accessor: (r: any) => r.numero_comprobante },
                  { header: "RUC", accessor: (r: any) => r.cliente_ruc },
                  { header: "Razón Social", accessor: (r: any) => r.cliente_razon_social },
                  { header: "Moneda", accessor: (r: any) => r.moneda },
                  { header: "Base Imponible", accessor: (r: any) => Number(r.base_imponible) },
                  { header: "IGV", accessor: (r: any) => Number(r.igv) },
                  { header: "Total", accessor: (r: any) => Number(r.total) },
                  { header: "Cta. por Cobrar", accessor: (r: any) => r.cta_por_cobrar },
                  { header: "Cta. IGV", accessor: (r: any) => r.cta_igv },
                  { header: "Cta. Ingreso", accessor: (r: any) => r.cta_ingreso },
                  { header: "Centro Costo", accessor: (r: any) => r.centro_costo },
                  { header: "Glosa", accessor: (r: any) => r.glosa },
                  { header: "Estado", accessor: (r: any) => r.estado },
                ]}
              />
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Registro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Register Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registro de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="w-[90px]">Fecha</TableHead>
                  <TableHead className="w-[80px]">Tipo</TableHead>
                  <TableHead className="w-[60px]">Serie</TableHead>
                  <TableHead className="w-[80px]">Número</TableHead>
                  <TableHead className="w-[100px]">RUC</TableHead>
                  <TableHead className="min-w-[150px]">Razón Social</TableHead>
                  <TableHead className="min-w-[150px]">Glosa</TableHead>
                  <TableHead className="w-[100px] text-right">Base Imp.</TableHead>
                  <TableHead className="w-[80px] text-right">IGV</TableHead>
                  <TableHead className="w-[100px] text-right">Total</TableHead>
                  <TableHead className="w-[70px]">Cta Ing.</TableHead>
                  <TableHead className="w-[70px]">Cta IGV</TableHead>
                  <TableHead className="w-[70px]">Cta O.Trib.</TableHead>
                  <TableHead className="w-[70px]">Cta x Cob.</TableHead>
                  <TableHead className="w-[70px]">C.Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros de ventas para el período seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center text-xs">{index + 1}</TableCell>
                      <TableCell className="text-xs">
                        {record.fecha_emision ? format(parseISO(record.fecha_emision), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {getComprobanteLabel(record.tipo_comprobante)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{record.serie_comprobante || "-"}</TableCell>
                      <TableCell className="text-xs">{record.numero_comprobante || "-"}</TableCell>
                      <TableCell className="text-xs font-mono">{record.cliente_ruc || "-"}</TableCell>
                      <TableCell className="text-xs">{record.cliente_razon_social || "-"}</TableCell>
                      <TableCell>
                        <Input
                          value={record.glosa}
                          onChange={(e) => handleFieldChange(record.id, "glosa", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="Descripción..."
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        S/ {record.base_imponible.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        S/ {record.igv.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        S/ {record.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <AccountCombobox
                          recordId={record.id}
                          field="cta_ingreso"
                          value={record.cta_ingreso}
                          suggestions={CUENTA_INGRESO_SUGERENCIAS}
                          placeholder="Cta"
                        />
                      </TableCell>
                      <TableCell>
                        <AccountCombobox
                          recordId={record.id}
                          field="cta_igv"
                          value={record.cta_igv}
                          suggestions={CUENTA_IGV_SUGERENCIAS}
                          placeholder="Cta"
                        />
                      </TableCell>
                      <TableCell>
                        <AccountCombobox
                          recordId={record.id}
                          field="cta_otros_tributos"
                          value={record.cta_otros_tributos}
                          suggestions={CUENTA_OTROS_TRIBUTOS_SUGERENCIAS}
                          placeholder="-"
                        />
                      </TableCell>
                      <TableCell>
                        <AccountCombobox
                          recordId={record.id}
                          field="cta_por_cobrar"
                          value={record.cta_por_cobrar}
                          suggestions={CUENTA_POR_COBRAR_SUGERENCIAS}
                          placeholder="Cta"
                        />
                      </TableCell>
                      <TableCell>
                        <AccountCombobox
                          recordId={record.id}
                          field="centro_costo"
                          value={record.centro_costo}
                          suggestions={CENTRO_COSTO_SUGERENCIAS}
                          placeholder="CC"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {filteredRecords.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={8} className="text-right text-sm">TOTALES:</TableCell>
                    <TableCell className="text-right text-sm">S/ {totals.base_imponible.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm">S/ {totals.igv.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm">S/ {totals.total.toFixed(2)}</TableCell>
                    <TableCell colSpan={5}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
