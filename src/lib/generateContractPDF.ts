import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Helper function to load image as base64
async function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

interface ServiceProjection {
  descripcion: string;
  fechaInicio?: string;
  fechaTermino?: string;
  nroCuotas: number;
  pago: number;
  total: number;
}

interface PaymentScheduleItem {
  cuota: number;
  fecha: string;
  servicio: string;
  monto: number;
}

interface ContractData {
  numero: string;
  descripcion: string;
  tipo_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_mensual: number | null;
  monto_total: number | null;
  moneda: string;
  status: string;
  notas: string | null;
  numero_cuotas: number | null;
  dia_vencimiento: number | null;
  created_at: string;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion?: string | null;
    email?: string | null;
    telefono?: string | null;
  } | null;
  proforma?: {
    numero: string;
  } | null;
  projections?: ServiceProjection[];
  paymentSchedule?: PaymentScheduleItem[];
}

// Company info
const COMPANY_INFO = {
  name: "C&A CONTADORES & AUDITORES",
  slogan: "Soluciones Contables y Empresariales",
  address: "Calle Santo Domingo N.º 103, Of. 303 y 304 – Arequipa",
  phone: "(+51) 982 307 213",
  email: "rmarquez@contadoresyauditoresarequipa.com",
};

const COLORS = {
  primary: [202, 147, 72] as [number, number, number],
  primaryDark: [180, 125, 50] as [number, number, number],
  accent: [217, 26, 34] as [number, number, number],
  textDark: [50, 50, 50] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  border: [180, 180, 180] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  background: [250, 250, 250] as [number, number, number],
};

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  en_gestion: "En Gestión",
  aprobado: "Aprobado",
  anulado: "Anulado",
  activo: "Vigente",
  pausado: "Pausado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const SERVICE_TYPES: Record<string, string> = {
  contabilidad: "Contabilidad",
  tramites: "Trámites",
  auditoria: "Auditoría",
};

function formatCurrency(amount: number, currency: string = "PEN"): string {
  const symbol = currency === "PEN" ? "S/" : "$";
  return `${symbol} ${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  try {
    // Parse date manually to avoid timezone issues
    const parts = dateStr.split('T')[0].split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return format(date, "dd 'de' MMMM, yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

export async function generateContractPDF(data: ContractData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 0;

  // ========== HEADER SECTION ==========
  const headerHeight = 35;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Load and add logo
  try {
    const logoImg = await loadImage("/images/logo-ca.png");
    doc.addImage(logoImg, "PNG", margin, 4, 28, 28);
  } catch (error) {
    console.error("Error loading logo:", error);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 4, 28, 28, 2, 2, "F");
  }

  // Company name and info
  const textStartX = margin + 33;
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, textStartX, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(COMPANY_INFO.slogan, textStartX, 17);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Tel: ${COMPANY_INFO.phone} | Email: ${COMPANY_INFO.email}`, textStartX, 23);
  doc.text(COMPANY_INFO.address, textStartX, 27);

  // Right side - CONTRACT title
  const rightTextX = pageWidth - margin;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO", rightTextX, 12, { align: "right" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(SERVICE_TYPES[data.tipo_servicio] || data.tipo_servicio, rightTextX, 18, { align: "right" });

  // Number badge
  const numberText = `N° ${data.numero}`;
  const numberWidth = 52;
  doc.setFillColor(...COLORS.primaryDark);
  doc.roundedRect(pageWidth - margin - numberWidth, 22, numberWidth, 9, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(numberText, pageWidth - margin - numberWidth / 2, 28, { align: "center" });

  yPos = headerHeight + 8;

  // ========== STATUS BADGE ==========
  const statusLabel = STATUS_LABELS[data.status] || data.status;
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos, 40, 8, 2, 2, "F");
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, 40, 8, 2, 2, "S");
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel, margin + 20, yPos + 5.5, { align: "center" });

  yPos += 14;

  // ========== CLIENT & CONTRACT INFO ==========
  const clientSectionHeight = 50;
  const clientColWidth = (pageWidth - margin * 2) * 0.55;
  const middleX = margin + clientColWidth;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - margin * 2, clientSectionHeight);
  doc.line(middleX, yPos, middleX, yPos + clientSectionHeight);

  // Client info badge
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin + 8, yPos + 5, 48, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", margin + 32, yPos + 10, { align: "center" });

  // Client details
  if (data.cliente) {
    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const razonLines = doc.splitTextToSize(data.cliente.razon_social.toUpperCase(), clientColWidth - 16);
    doc.text(razonLines.slice(0, 2).join("\n"), margin + 8, yPos + 20);

    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`RUC/DNI: ${data.cliente.codigo}`, margin + 8, yPos + 32);

    if (data.cliente.direccion) {
      const dirLines = doc.splitTextToSize(`Dir: ${data.cliente.direccion}`, clientColWidth - 16);
      doc.text(dirLines[0], margin + 8, yPos + 40);
    }
  }

  // Contract details badge
  const rightColX = middleX + 8;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(rightColX, yPos + 5, 55, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLES DEL CONTRATO", rightColX + 27.5, yPos + 10, { align: "center" });

  // Contract info
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Fecha Inicio:", rightColX, yPos + 20);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_inicio), rightColX + 25, yPos + 20);

  if (data.fecha_fin) {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Fecha Fin:", rightColX, yPos + 28);
    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(formatDate(data.fecha_fin), rightColX + 25, yPos + 28);
  }

  if (data.numero_cuotas) {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("N° Cuotas:", rightColX, yPos + 36);
    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.numero_cuotas} cuotas`, rightColX + 25, yPos + 36);
  }

  if (data.proforma?.numero) {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Proforma:", rightColX, yPos + 44);
    doc.setTextColor(...COLORS.accent);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(data.proforma.numero, rightColX + 25, yPos + 44);
  }

  yPos += clientSectionHeight + 10;

  // ========== DESCRIPTION ==========
  if (data.descripcion) {
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 50, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPCIÓN", margin + 25, yPos + 5, { align: "center" });

    yPos += 12;
    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(data.descripcion, pageWidth - margin * 2);
    doc.text(descLines.slice(0, 3), margin, yPos);
    yPos += Math.min(descLines.length, 3) * 5 + 8;
  }

  // ========== FINANCIAL SUMMARY ==========
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, 55, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN FINANCIERO", margin + 27.5, yPos + 5, { align: "center" });

  yPos += 12;

  // Financial box
  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 2, 2, "FD");

  const colWidth = (pageWidth - margin * 2) / 3;

  // Monto Mensual
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CUOTA MENSUAL", margin + colWidth / 2, yPos + 8, { align: "center" });
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    data.monto_mensual ? formatCurrency(data.monto_mensual, data.moneda) : "-",
    margin + colWidth / 2,
    yPos + 18,
    { align: "center" }
  );

  // N° Cuotas
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("N° CUOTAS", margin + colWidth + colWidth / 2, yPos + 8, { align: "center" });
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    data.numero_cuotas ? `${data.numero_cuotas}` : "-",
    margin + colWidth + colWidth / 2,
    yPos + 18,
    { align: "center" }
  );

  // Total
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MONTO TOTAL", margin + colWidth * 2 + colWidth / 2, yPos + 8, { align: "center" });
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    data.monto_total ? formatCurrency(data.monto_total, data.moneda) : "-",
    margin + colWidth * 2 + colWidth / 2,
    yPos + 18,
    { align: "center" }
  );

  yPos += 32;

  // ========== SERVICES TABLE ==========
  if (data.projections && data.projections.length > 0) {
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 55, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICIOS CONTRATADOS", margin + 27.5, yPos + 5, { align: "center" });

    yPos += 12;

    const tableData = data.projections.map((proj, idx) => [
      (idx + 1).toString(),
      proj.descripcion,
      proj.nroCuotas.toString(),
      formatCurrency(proj.pago, data.moneda),
      formatCurrency(proj.total, data.moneda),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Servicio", "Cuotas", "Cuota", "Total"]],
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: COLORS.textDark,
        lineColor: COLORS.border,
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "left" },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "right", cellWidth: 30 },
        4: { halign: "right", cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== PAYMENT SCHEDULE ==========
  if (data.paymentSchedule && data.paymentSchedule.length > 0 && yPos < pageHeight - 60) {
    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 55, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CRONOGRAMA DE PAGOS", margin + 27.5, yPos + 5, { align: "center" });

    yPos += 12;

    const scheduleData = data.paymentSchedule.slice(0, 12).map((item) => [
      item.cuota.toString(),
      format(new Date(item.fecha), "dd/MM/yyyy"),
      item.servicio,
      formatCurrency(item.monto, data.moneda),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Cuota", "Fecha Pago", "Servicio", "Monto"]],
      body: scheduleData,
      theme: "plain",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: COLORS.textDark,
        lineColor: COLORS.border,
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 18 },
        1: { halign: "center", cellWidth: 30 },
        2: { halign: "left" },
        3: { halign: "right", cellWidth: 35 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ========== NOTES ==========
  if (data.notas && yPos < pageHeight - 40) {
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 30, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NOTAS", margin + 15, yPos + 5, { align: "center" });

    yPos += 12;
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notaLines = doc.splitTextToSize(data.notas, pageWidth - margin * 2);
    doc.text(notaLines.slice(0, 4), margin, yPos);
  }

  // ========== FOOTER ==========
  const footerY = pageHeight - 20;
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, footerY - 3, pageWidth, 3, "F");

  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, pageWidth / 2, footerY + 5, { align: "center" });

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY_INFO.address} | ${COMPANY_INFO.phone}`, pageWidth / 2, footerY + 10, { align: "center" });

  // Generation date
  doc.setFontSize(7);
  doc.text(
    `Documento generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageWidth / 2,
    footerY + 15,
    { align: "center" }
  );

  return doc.output("blob");
}
