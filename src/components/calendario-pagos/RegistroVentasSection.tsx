import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Printer,
  Download,
  Filter,
  Search,
  ChevronDown,
  CalendarDays,
  FileSpreadsheet,
  Building2,
  X,
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
import { supabase } from "@/integrations/supabase/client";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { cn } from "@/lib/utils";

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

interface RegistroVentasSectionProps {
  payments: any[];
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

export function RegistroVentasSection({ payments }: RegistroVentasSectionProps) {
  const { formatCurrency, config } = useSystemConfig();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Account and glosa editing state
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [accountValues, setAccountValues] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  // Fetch sales records from paid payments
  useEffect(() => {
    fetchSalesRecords();
  }, [selectedMonth, selectedYear, dateRange, filterMode]);

  const fetchSalesRecords = async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;
      let periodoMes: number;
      let periodoAnio: number;

      if (filterMode === "month") {
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = endOfMonth(monthStart);
        startDate = format(monthStart, "yyyy-MM-dd");
        endDate = format(monthEnd, "yyyy-MM-dd");
        periodoMes = selectedMonth + 1;
        periodoAnio = selectedYear;
      } else {
        startDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : format(startOfMonth(new Date()), "yyyy-MM-dd");
        endDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(endOfMonth(new Date()), "yyyy-MM-dd");
        periodoMes = dateRange.from ? dateRange.from.getMonth() + 1 : new Date().getMonth() + 1;
        periodoAnio = dateRange.from ? dateRange.from.getFullYear() : new Date().getFullYear();
      }

      // First, fetch existing records from registro_ventas table
      const { data: existingRecords, error: existingError } = await supabase
        .from("registro_ventas")
        .select("*")
        .gte("fecha_emision", startDate)
        .lte("fecha_emision", endDate)
        .order("fecha_emision", { ascending: true });

      if (existingError) throw existingError;

      // Create a map of pago_id to existing records
      const existingByPagoId = new Map(
        (existingRecords || []).map((r: any) => [r.pago_id, r])
      );

      // Fetch paid payments that might not be in registro_ventas yet
      const { data: pagosData, error: pagosError } = await supabase
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
        .gte("fecha_emision", startDate)
        .lte("fecha_emision", endDate)
        .order("fecha_emision", { ascending: true });

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
      const periodoMes = filterMode === "month" ? selectedMonth + 1 : (dateRange.from ? dateRange.from.getMonth() + 1 : new Date().getMonth() + 1);
      const periodoAnio = filterMode === "month" ? selectedYear : (dateRange.from ? dateRange.from.getFullYear() : new Date().getFullYear());

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
      
      // Show success message
      const { toast } = await import("sonner");
      toast.success("Registro de ventas guardado correctamente");
    } catch (error) {
      console.error("Error saving sales records:", error);
      const { toast } = await import("sonner");
      toast.error("Error al guardar el registro de ventas");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const periodLabel = filterMode === "month"
      ? `${MONTHS[selectedMonth]} ${selectedYear}`
      : `${dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : ""} - ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : ""}`;

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
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              font-size: 9pt; 
              color: #1a1a1a;
              padding: 15mm;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #A34139;
              padding-bottom: 15px;
            }
            .header h1 { 
              font-size: 16pt; 
              color: #A34139;
              margin-bottom: 5px;
            }
            .header .period { 
              font-size: 11pt;
              color: #666;
              margin-top: 5px;
            }
            .header .company {
              font-size: 10pt;
              color: #333;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
              font-size: 8pt;
            }
            th { 
              background: #A34139; 
              color: white; 
              padding: 8px 4px; 
              text-align: left;
              font-weight: 600;
              white-space: nowrap;
            }
            td { 
              padding: 6px 4px; 
              border-bottom: 1px solid #e0e0e0;
              vertical-align: middle;
            }
            tr:nth-child(even) { background: #f8f8f8; }
            tr:hover { background: #fff3f3; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-row { 
              background: #fef3f3 !important; 
              font-weight: bold;
              border-top: 2px solid #A34139;
            }
            .totals-row td { 
              padding: 10px 4px;
              color: #A34139;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 8pt;
              color: #666;
              border-top: 1px solid #e0e0e0;
              padding-top: 15px;
            }
            .summary-box {
              display: flex;
              justify-content: flex-end;
              gap: 20px;
              margin-top: 20px;
              padding: 15px;
              background: #f8f8f8;
              border-radius: 8px;
            }
            .summary-item {
              text-align: right;
            }
            .summary-label {
              font-size: 8pt;
              color: #666;
            }
            .summary-value {
              font-size: 12pt;
              font-weight: bold;
              color: #A34139;
            }
            @media print {
              body { padding: 10mm; }
              @page { 
                size: landscape; 
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>REGISTRO DE VENTAS</h1>
            <p class="company">Sistema de Gestión Contable</p>
            <p class="period">Período: ${periodLabel}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha Emisión</th>
                <th>Tipo Doc.</th>
                <th>Serie</th>
                <th>Número</th>
                <th>RUC Cliente</th>
                <th>Razón Social</th>
                <th>Glosa</th>
                <th class="text-right">Base Imp.</th>
                <th class="text-right">IGV</th>
                <th class="text-right">Total</th>
                <th>Cta Ingreso</th>
                <th>Cta IGV</th>
                <th>Cta O.Trib.</th>
                <th>Cta x Cobrar</th>
                <th>C.Costo</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="totals-row">
                <td colspan="8" class="text-right">TOTALES:</td>
                <td class="text-right">${formatNumber(totals.base_imponible)}</td>
                <td class="text-right">${formatNumber(totals.igv)}</td>
                <td class="text-right">${formatNumber(totals.total)}</td>
                <td colspan="5"></td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">Base Imponible</div>
              <div class="summary-value">S/ ${formatNumber(totals.base_imponible)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">IGV (${config?.igv_percentage || 18}%)</div>
              <div class="summary-value">S/ ${formatNumber(totals.igv)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Ventas</div>
              <div class="summary-value">S/ ${formatNumber(totals.total)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Generado el ${format(new Date(), "dd/MM/yyyy HH:mm:ss")} | Total de registros: ${filteredRecords.length}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

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

  const AccountCombobox = ({ 
    recordId, 
    field, 
    value, 
    suggestions,
    placeholder = "Seleccionar..."
  }: { 
    recordId: string; 
    field: string; 
    value: string; 
    suggestions: { codigo: string; descripcion: string }[];
    placeholder?: string;
  }) => {
    const [open, setOpen] = useState(false);
    const isEditing = editingCell?.id === recordId && editingCell?.field === field;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 justify-start text-xs font-mono hover:bg-muted/80",
              !value && "text-muted-foreground"
            )}
            onClick={() => setOpen(true)}
          >
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cuenta..." className="h-9" />
            <CommandList>
              <CommandEmpty>No se encontró cuenta.</CommandEmpty>
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.codigo}
                    value={`${suggestion.codigo} ${suggestion.descripcion}`}
                    onSelect={() => {
                      handleAccountChange(recordId, field, suggestion.codigo);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-medium">{suggestion.codigo}</span>
                      <span className="text-muted-foreground text-[10px]">{suggestion.descripcion}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Registro de Ventas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Libro de ventas según normativa SUNAT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSaveAll}
              disabled={saving || salesRecords.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Registro
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/30 rounded-lg border">
          {/* Filter Mode Toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Filtrar por</Label>
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "month" | "range")}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="range">Rango de fechas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterMode === "month" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mes</Label>
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Año</Label>
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] h-9 justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] h-9 justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <Separator orientation="vertical" className="h-9" />

          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="RUC, razón social, comprobante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Registros</p>
                  <p className="text-2xl font-bold text-blue-700">{filteredRecords.length}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Base Imponible</p>
                  <p className="text-lg font-bold text-slate-700">S/ {formatNumber(totals.base_imponible)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 font-medium">IGV ({config?.igv_percentage || 18}%)</p>
                  <p className="text-lg font-bold text-amber-700">S/ {formatNumber(totals.igv)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Total Ventas</p>
                  <p className="text-lg font-bold text-green-700">S/ {formatNumber(totals.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div ref={printRef} className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px] text-center font-semibold">N°</TableHead>
                  <TableHead className="w-[90px] font-semibold">Fecha Em.</TableHead>
                  <TableHead className="w-[60px] font-semibold">Tipo</TableHead>
                  <TableHead className="w-[70px] font-semibold">Serie</TableHead>
                  <TableHead className="w-[80px] font-semibold">Número</TableHead>
                  <TableHead className="w-[100px] font-semibold">RUC</TableHead>
                  <TableHead className="min-w-[150px] font-semibold">Razón Social</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Glosa</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold">Base Imp.</TableHead>
                  <TableHead className="w-[80px] text-right font-semibold">IGV</TableHead>
                  <TableHead className="w-[100px] text-right font-semibold">Total</TableHead>
                  <TableHead className="w-[80px] font-semibold">Cta Ingreso</TableHead>
                  <TableHead className="w-[70px] font-semibold">Cta IGV</TableHead>
                  <TableHead className="w-[70px] font-semibold">Cta O.Trib.</TableHead>
                  <TableHead className="w-[80px] font-semibold">Cta x Cobrar</TableHead>
                  <TableHead className="w-[70px] font-semibold">C.Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                        Cargando registros...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileSpreadsheet className="h-10 w-10 opacity-30" />
                        <p>No hay registros de ventas para el período seleccionado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredRecords.map((record, index) => (
                      <TableRow key={record.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.fecha_emision 
                            ? format(parseISO(record.fecha_emision), "dd/MM/yyyy") 
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">
                            {getComprobanteLabel(record.tipo_comprobante)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.serie_comprobante || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{record.numero_comprobante || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{record.cliente_ruc}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm" title={record.cliente_razon_social}>
                          {record.cliente_razon_social}
                        </TableCell>
                        <TableCell className="p-1 min-w-[180px]">
                          <Input
                            value={record.glosa || ""}
                            onChange={(e) => handleFieldChange(record.id, "glosa", e.target.value)}
                            placeholder="Descripción del servicio..."
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(record.base_imponible)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(record.igv)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-sm">
                          {formatNumber(record.total)}
                        </TableCell>
                        <TableCell className="p-1">
                          <AccountCombobox
                            recordId={record.id}
                            field="cta_ingreso"
                            value={accountValues[record.id]?.cta_ingreso || record.cta_ingreso}
                            suggestions={CUENTA_INGRESO_SUGERENCIAS}
                            placeholder="7041"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <AccountCombobox
                            recordId={record.id}
                            field="cta_igv"
                            value={accountValues[record.id]?.cta_igv || record.cta_igv}
                            suggestions={CUENTA_IGV_SUGERENCIAS}
                            placeholder="40111"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <AccountCombobox
                            recordId={record.id}
                            field="cta_otros_tributos"
                            value={accountValues[record.id]?.cta_otros_tributos || record.cta_otros_tributos}
                            suggestions={CUENTA_OTROS_TRIBUTOS_SUGERENCIAS}
                            placeholder="-"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <AccountCombobox
                            recordId={record.id}
                            field="cta_por_cobrar"
                            value={accountValues[record.id]?.cta_por_cobrar || record.cta_por_cobrar}
                            suggestions={CUENTA_POR_COBRAR_SUGERENCIAS}
                            placeholder="1212"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <AccountCombobox
                            recordId={record.id}
                            field="centro_costo"
                            value={accountValues[record.id]?.centro_costo || record.centro_costo}
                            suggestions={CENTRO_COSTO_SUGERENCIAS}
                            placeholder="CC001"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-primary/5 border-t-2 border-primary/20 font-semibold">
                      <TableCell colSpan={8} className="text-right text-sm">
                        TOTALES:
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(totals.base_imponible)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(totals.igv)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-primary">
                        {formatNumber(totals.total)}
                      </TableCell>
                      <TableCell colSpan={5}></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            Mostrando {filteredRecords.length} registro{filteredRecords.length !== 1 ? "s" : ""} 
            {filterMode === "month" 
              ? ` de ${MONTHS[selectedMonth]} ${selectedYear}`
              : dateRange.from && dateRange.to 
                ? ` del ${format(dateRange.from, "dd/MM/yyyy")} al ${format(dateRange.to, "dd/MM/yyyy")}`
                : ""}
          </span>
          <span>
            Última actualización: {format(new Date(), "dd/MM/yyyy HH:mm")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
