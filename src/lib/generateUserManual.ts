import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Color palette
const COLORS = {
  primary: [30, 64, 120] as [number, number, number],
  primaryLight: [59, 130, 246] as [number, number, number],
  secondary: [15, 118, 110] as [number, number, number],
  accent: [245, 158, 11] as [number, number, number],
  dark: [17, 24, 39] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 20;
const MARGIN_R = 20;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

interface TOCEntry {
  title: string;
  page: number;
  level: number;
}

export async function generateUserManual(): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const tocEntries: TOCEntry[] = [];
  let currentPage = 1;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addPage = () => {
    doc.addPage();
    currentPage++;
    addPageFooter();
  };

  const addPageFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("AccountEase Suite — Manual de Usuario", MARGIN_L, PAGE_H - 4.5);
    doc.text(`Página ${pageNum}`, PAGE_W - MARGIN_R, PAGE_H - 4.5, { align: "right" });
    doc.text("Versión 1.0 | 2024", PAGE_W / 2, PAGE_H - 4.5, { align: "center" });
  };

  const registerTOC = (title: string, level: number = 1) => {
    tocEntries.push({ title, page: doc.getNumberOfPages(), level });
  };

  const sectionTitle = (text: string, level: number = 1) => {
    registerTOC(text, level);

    if (level === 1) {
      const curY = getCursorY();
      if (curY > PAGE_H - 50) { addPage(); }
      const startY = getCursorY() + 6;
      doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.roundedRect(MARGIN_L, startY, CONTENT_W, 10, 2, 2, "F");
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(text, MARGIN_L + 4, startY + 7);
      setCursorY(startY + 16);
    } else if (level === 2) {
      const curY = getCursorY();
      if (curY > PAGE_H - 40) { addPage(); }
      const startY = getCursorY() + 4;
      doc.setDrawColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
      doc.setLineWidth(0.8);
      doc.line(MARGIN_L, startY + 7, MARGIN_L + 6, startY + 7);
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(text, MARGIN_L + 8, startY + 7);
      doc.setDrawColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
      doc.line(MARGIN_L, startY + 9, MARGIN_L + CONTENT_W, startY + 9);
      setCursorY(startY + 14);
    } else {
      const curY = getCursorY();
      if (curY > PAGE_H - 30) { addPage(); }
      const startY = getCursorY() + 3;
      doc.setTextColor(...COLORS.secondary);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`▸ ${text}`, MARGIN_L + 4, startY + 5);
    setCursorY(startY + 9);
    }
  };

  let _cursorY = 30;
  const getCursorY = () => _cursorY;
  const setCursorY = (y: number) => { _cursorY = y; };

  const para = (text: string, indent: number = 0) => {
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const maxW = CONTENT_W - indent;
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = 5.5;
    if (getCursorY() + lines.length * lineH > PAGE_H - 20) {
      addPage();
      setCursorY(25);
    }
    doc.text(lines, MARGIN_L + indent, getCursorY());
    setCursorY(getCursorY() + lines.length * lineH + 2);
  };

  const bullet = (items: string[], indent: number = 4) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    items.forEach((item) => {
      if (getCursorY() > PAGE_H - 20) { addPage(); setCursorY(25); }
      doc.setTextColor(...COLORS.primaryLight);
      doc.text("•", MARGIN_L + indent, getCursorY());
      doc.setTextColor(...COLORS.dark);
      const lines = doc.splitTextToSize(item, CONTENT_W - indent - 5);
      doc.text(lines, MARGIN_L + indent + 5, getCursorY());
      setCursorY(getCursorY() + lines.length * 5.2 + 1.5);
    });
    setCursorY(getCursorY() + 2);
  };

  const numberedList = (items: string[], indent: number = 4) => {
    doc.setFontSize(9);
    items.forEach((item, i) => {
      if (getCursorY() > PAGE_H - 20) { addPage(); setCursorY(25); }
      doc.setTextColor(...COLORS.accent);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, MARGIN_L + indent, getCursorY());
      doc.setTextColor(...COLORS.dark);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(item, CONTENT_W - indent - 8);
      doc.text(lines, MARGIN_L + indent + 8, getCursorY());
      setCursorY(getCursorY() + lines.length * 5.2 + 1.5);
    });
    setCursorY(getCursorY() + 2);
  };

  const noteBox = (text: string, type: "info" | "warning" | "danger" = "info") => {
    if (getCursorY() > PAGE_H - 35) { addPage(); setCursorY(25); }
    const color = type === "danger" ? COLORS.danger : type === "warning" ? COLORS.warning : COLORS.primaryLight;
    const bgColor: [number, number, number] = type === "danger" ? [254, 242, 242] : type === "warning" ? [255, 251, 235] : [239, 246, 255];
    const lines = doc.splitTextToSize(text, CONTENT_W - 12);
    const h = lines.length * 5 + 8;
    doc.setFillColor(...bgColor);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN_L, getCursorY(), CONTENT_W, h, 2, 2, "FD");
    doc.setFillColor(...color);
    doc.rect(MARGIN_L, getCursorY(), 2.5, h, "F");
    doc.setTextColor(...color);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const label = type === "danger" ? "⚠ ADVERTENCIA" : type === "warning" ? "📌 NOTA" : "ℹ INFORMACIÓN";
    doc.text(label, MARGIN_L + 5, getCursorY() + 5);
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "normal");
    doc.text(lines, MARGIN_L + 5, getCursorY() + 10);
    setCursorY(getCursorY() + h + 5);
  };

  const space = (mm: number = 5) => {
    if (getCursorY() + mm > PAGE_H - 20) { addPage(); setCursorY(25); }
    else { setCursorY(getCursorY() + mm); }
  };

  // ── PORTADA ─────────────────────────────────────────────────────────────────
  // Fondo degradado superior
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 100, "F");

  // Patrón decorativo
  doc.setFillColor(255, 255, 255, 0.05);
  for (let i = 0; i < 8; i++) {
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.15);
    doc.circle(PAGE_W - 30 + i * 5, 20 + i * 8, 15 + i * 3);
  }

  // Título principal
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("MANUAL DE USUARIO", PAGE_W / 2, 40, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("AccountEase Suite", PAGE_W / 2, 55, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(180, 210, 255);
  doc.text("Sistema de Gestión Contable y Administrativa", PAGE_W / 2, 65, { align: "center" });

  // Línea divisora
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_L + 20, 72, PAGE_W - MARGIN_R - 20, 72);

  // Recuadro inferior de portada
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(0, 100, PAGE_W, PAGE_H - 100, "F");

  // Info cards
  const infoCards = [
    { label: "Versión", value: "1.0" },
    { label: "Fecha", value: "2024" },
    { label: "Idioma", value: "Español" },
  ];
  infoCards.forEach((card, i) => {
    const x = MARGIN_L + i * 58;
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.primaryLight);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, 115, 52, 22, 3, 3, "FD");
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + 26, 122, { align: "center" });
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, x + 26, 130, { align: "center" });
  });

  // Descripción en portada
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const desc = "Este documento provee la guía completa de uso del sistema AccountEase Suite, cubriendo todos los módulos, funcionalidades y flujos operativos disponibles para los usuarios del sistema.";
  const descLines = doc.splitTextToSize(desc, CONTENT_W - 20);
  doc.text(descLines, PAGE_W / 2, 155, { align: "center" });

  // Módulos en portada
  const modulos = ["Dashboard", "Clientes", "Proformas", "Contratos", "Carteras", "WorkFlow", "Calendario de Pagos", "Reportes", "Usuarios", "Configuración"];
  const cols = 2;
  const colW = (CONTENT_W - 10) / cols;
  modulos.forEach((mod, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN_L + col * (colW + 10);
    const y = 175 + row * 12;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(x, y, colW, 9, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(mod, x + colW / 2, y + 6, { align: "center" });
  });

  // Footer portada
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, PAGE_H - 15, PAGE_W, 15, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("© 2024 AccountEase Suite — Todos los derechos reservados", PAGE_W / 2, PAGE_H - 6, { align: "center" });

  // ── TABLA DE CONTENIDO ──────────────────────────────────────────────────────
  // (Se generará al final, por ahora reservamos páginas)
  addPage();
  const tocPageStart = doc.getNumberOfPages();
  setCursorY(20);

  // Placeholder TOC - se llenará luego
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(MARGIN_L, 15, CONTENT_W, 12, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TABLA DE CONTENIDO", MARGIN_L + CONTENT_W / 2, 23, { align: "center" });
  setCursorY(35);

  // Dejar páginas para el TOC (se rellenará al final)
  addPage();
  addPage();
  const contentStartPage = doc.getNumberOfPages() + 1;

  // ── SECCIÓN 1: INFORMACIÓN GENERAL ──────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("1. INFORMACIÓN GENERAL");
  space(3);

  sectionTitle("1.1 Nombre del Sistema", 2);
  para("AccountEase Suite — Sistema de Gestión Contable y Administrativa");
  space(2);

  sectionTitle("1.2 Versión y Fecha", 2);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Campo", "Valor"]],
    body: [
      ["Versión del Sistema", "1.0"],
      ["Fecha de Elaboración", "2024"],
      ["Última Actualización", "2024"],
      ["Estado", "Producción"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("1.3 Descripción General del Sistema", 2);
  para("AccountEase Suite es una plataforma web de gestión integral diseñada específicamente para estudios contables y de auditoría. El sistema centraliza y automatiza los procesos operativos, administrativos y financieros, permitiendo gestionar clientes, contratos, proformas de servicios, pagos, flujos de trabajo y reportes en un entorno seguro, escalable y de fácil uso.");
  space(2);
  para("La plataforma está diseñada bajo una arquitectura modular que permite a los equipos de trabajo colaborar eficientemente, con controles de acceso por roles que garantizan la seguridad e integridad de la información.");
  space(3);

  sectionTitle("1.4 Objetivo del Manual", 2);
  para("Este manual tiene como objetivo proporcionar una guía completa y detallada para el uso correcto del sistema AccountEase Suite, describiendo cada uno de sus módulos, funcionalidades, flujos de trabajo y mejores prácticas, de manera que los usuarios puedan operar el sistema de forma autónoma y eficiente.");
  space(3);

  sectionTitle("1.5 Público Objetivo", 2);
  bullet([
    "Administradores del sistema: responsables de la configuración y gestión de usuarios",
    "Gerentes y supervisores: usuarios con acceso a reportes, carteras y supervisión de actividades",
    "Asesores y contadores: usuarios que gestionan clientes, proformas y contratos",
    "Asistentes y auxiliares: personal de apoyo en tareas operativas y de seguimiento",
    "Personal de TI: responsables del mantenimiento técnico del sistema",
  ]);

  sectionTitle("1.6 Alcance", 2);
  para("Este manual cubre la totalidad de los módulos y funcionalidades disponibles en AccountEase Suite, incluyendo:");
  bullet([
    "Gestión de clientes (personas naturales y empresas)",
    "Proformas de servicios con generación de PDF",
    "Contratos con plantillas personalizables",
    "Calendario de pagos y registro de cobros",
    "Sistema de WorkFlow jerárquico por carteras",
    "Gestión de usuarios y roles de acceso",
    "Reportes y exportaciones",
    "Configuración avanzada del sistema",
  ]);

  // ── SECCIÓN 2: REQUISITOS DEL SISTEMA ───────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("2. REQUISITOS DEL SISTEMA");
  space(3);

  sectionTitle("2.1 Requisitos Técnicos", 2);
  sectionTitle("Hardware mínimo recomendado", 3);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Componente", "Requerimiento Mínimo", "Recomendado"]],
    body: [
      ["Procesador", "Intel Core i3 / equivalente", "Intel Core i5 o superior"],
      ["Memoria RAM", "4 GB", "8 GB o más"],
      ["Espacio en disco", "Sin instalación local", "Sin instalación local"],
      ["Conexión a internet", "5 Mbps", "20 Mbps o más"],
      ["Resolución de pantalla", "1280 x 720 px", "1920 x 1080 px"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.secondary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("Navegadores compatibles", 3);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Navegador", "Versión mínima", "Estado"]],
    body: [
      ["Google Chrome", "v90 o superior", "✓ Recomendado"],
      ["Mozilla Firefox", "v88 o superior", "✓ Compatible"],
      ["Microsoft Edge", "v90 o superior", "✓ Compatible"],
      ["Safari", "v14 o superior", "✓ Compatible"],
      ["Internet Explorer", "Cualquier versión", "✗ No compatible"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.secondary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 2: { fontStyle: "bold" } },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("2.2 Accesos y Permisos", 2);
  para("Para acceder al sistema se requiere:");
  bullet([
    "Credenciales de acceso (correo electrónico y contraseña) proporcionadas por el administrador",
    "Rol de usuario asignado acorde a las funciones a desempeñar",
    "Conexión activa a internet durante toda la sesión de trabajo",
    "Navegador web actualizado a la versión mínima requerida",
  ]);
  space(2);
  noteBox("El sistema utiliza autenticación segura. Las contraseñas son encriptadas y nunca se almacenan en texto plano. Nunca comparta sus credenciales de acceso.", "warning");

  sectionTitle("2.3 Recomendaciones de Uso", 2);
  bullet([
    "Utilice siempre la versión más reciente de su navegador web",
    "Mantenga una conexión a internet estable para evitar pérdida de datos",
    "Cierre sesión al terminar de trabajar, especialmente en equipos compartidos",
    "Realice cambios importantes durante horarios de baja concurrencia",
    "Mantenga actualizados sus datos de perfil y contraseña",
    "Ante cualquier incidencia, contacte inmediatamente al administrador del sistema",
  ]);

  // ── SECCIÓN 3: ACCESO AL SISTEMA ────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("3. ACCESO AL SISTEMA");
  space(3);

  sectionTitle("3.1 URL de Acceso", 2);
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(MARGIN_L, getCursorY(), CONTENT_W, 12, 2, 2, "F");
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("https://account-ease-suite.lovable.app", PAGE_W / 2, getCursorY() + 8, { align: "center" });
  setCursorY(getCursorY() + 17);
  space(2);

  sectionTitle("3.2 Proceso de Inicio de Sesión", 2);
  numberedList([
    'Abra su navegador web y acceda a la URL del sistema indicada en la sección 3.1.',
    'Se mostrará la pantalla de inicio de sesión con los campos "Correo electrónico" y "Contraseña".',
    'Ingrese su correo electrónico institucional en el campo correspondiente.',
    'Ingrese su contraseña (distingue entre mayúsculas y minúsculas).',
    'Haga clic en el botón "Iniciar Sesión".',
    'Si las credenciales son correctas, será redirigido al panel principal (Dashboard).',
    'Si las credenciales son incorrectas, el sistema mostrará un mensaje de error.',
  ]);
  noteBox("Tras 5 intentos fallidos de inicio de sesión, se recomienda contactar al administrador para restablecer su contraseña.", "warning");

  sectionTitle("3.3 Recuperación de Contraseña", 2);
  numberedList([
    'En la pantalla de inicio de sesión, haga clic en "¿Olvidaste tu contraseña?".',
    'Ingrese su correo electrónico institucional registrado en el sistema.',
    'Haga clic en "Enviar instrucciones de recuperación".',
    'Revise su bandeja de entrada (incluyendo la carpeta de spam).',
    'Siga el enlace del correo recibido para crear una nueva contraseña.',
    'La nueva contraseña debe tener al menos 8 caracteres.',
    'Una vez creada, inicie sesión con sus nuevas credenciales.',
  ]);

  sectionTitle("3.4 Cierre de Sesión", 2);
  para('Para cerrar sesión de forma segura, haga clic en su nombre o avatar en la esquina superior derecha del sistema, y seleccione la opción "Cerrar sesión". El sistema lo redirigirá a la pantalla de inicio de sesión.');
  noteBox("Siempre cierre sesión antes de abandonar su equipo de trabajo, especialmente si es un equipo compartido.", "danger");

  sectionTitle("3.5 Gestión de Perfil de Usuario", 2);
  para("Cada usuario puede gestionar su perfil personal desde el menú de usuario. Las opciones disponibles incluyen:");
  bullet([
    "Actualizar nombre completo",
    "Cambiar número de teléfono y DNI",
    "Actualizar cargo/puesto dentro de la organización",
    "Cambiar contraseña de acceso",
    "Subir foto de perfil (avatar)",
  ]);
  noteBox("El correo electrónico de acceso no puede ser modificado directamente por el usuario. Contacte al administrador para este cambio.", "info");

  // ── SECCIÓN 4: ESTRUCTURA GENERAL ───────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("4. ESTRUCTURA GENERAL DEL SISTEMA");
  space(3);

  sectionTitle("4.1 Menú Principal (Barra Lateral)", 2);
  para("El sistema cuenta con una barra lateral de navegación (sidebar) que presenta los módulos principales del sistema. Esta barra puede expandirse o contraerse según las necesidades del usuario.");
  space(2);

  autoTable(doc, {
    startY: getCursorY(),
    head: [["Ícono/Módulo", "Función Principal", "Acceso por Rol"]],
    body: [
      ["Dashboard", "Panel de indicadores y métricas generales", "Todos los roles"],
      ["Clientes", "Gestión del directorio de clientes", "Todos los roles"],
      ["Proformas", "Creación y gestión de propuestas comerciales", "Asesores, Gerentes, Admin"],
      ["Contratos", "Administración de contratos de servicios", "Asesores, Gerentes, Admin"],
      ["Carteras", "Gestión de carteras de clientes por equipo", "Todos los roles"],
      ["WorkFlow", "Seguimiento de actividades por contrato", "Todos los roles"],
      ["Cal. de Pagos", "Calendario y registro de cobros", "Gerentes, Admin, Asesores"],
      ["Asignaciones", "Gestión de tareas y asignaciones", "Todos los roles"],
      ["Reportes", "Generación de informes y exportaciones", "Gerentes, Admin"],
      ["Usuarios", "Administración de usuarios del sistema", "Solo Administrador"],
      ["Configuración", "Parámetros y ajustes del sistema", "Solo Administrador"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("4.2 Panel de Control (Dashboard)", 2);
  para("El Dashboard es la pantalla de bienvenida que muestra un resumen ejecutivo del estado actual del estudio contable. Presenta:");
  bullet([
    "Tarjetas de resumen: clientes activos, contratos vigentes, proformas pendientes, pagos del mes",
    "Gráfico de ingresos: evolución mensual de cobros",
    "Gráfico de contratos: distribución por estado",
    "Pagos próximos a vencer: alertas de cobros pendientes",
    "Rendimiento del equipo: métricas por asesor",
    "Acciones rápidas: accesos directos a las funciones más utilizadas",
  ]);

  sectionTitle("4.3 Convenciones Visuales", 2);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Elemento", "Significado"]],
    body: [
      ["Botón azul primario", "Acción principal (guardar, crear, confirmar)"],
      ["Botón rojo/destructivo", "Eliminar o cancelar (requiere confirmación)"],
      ["Botón gris/secundario", "Acción secundaria (cancelar, volver)"],
      ["Ícono lápiz (✏)", "Editar registro"],
      ["Ícono basura (🗑)", "Eliminar registro"],
      ["Ícono ojo (👁)", "Ver detalle del registro"],
      ["Badge verde", "Estado activo o completado"],
      ["Badge rojo", "Estado vencido, anulado o con error"],
      ["Badge amarillo/naranja", "Estado pendiente o en proceso"],
      ["Badge azul", "Estado en gestión o enviado"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  // ── SECCIÓN 5: MÓDULOS ───────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("5. DESCRIPCIÓN DETALLADA POR MÓDULO");
  space(3);

  // 5.1 CLIENTES
  sectionTitle("5.1 Módulo: Clientes", 2);
  para("Objetivo: Gestionar el directorio completo de clientes del estudio contable, tanto personas naturales como empresas (personas jurídicas).");
  space(2);
  sectionTitle("Componentes principales", 3);
  bullet([
    "Tabla de clientes con búsqueda y filtros (tipo de cliente, estado activo/suspendido)",
    "Botón 'Nuevo Cliente' para crear registros",
    "Importación masiva desde archivo CSV",
    "Acciones por fila: ver detalle, editar, suspender, eliminar",
    "Indicador visual de estado: activo (verde) / suspendido (rojo)",
  ]);
  sectionTitle("Tareas comunes", 3);
  numberedList([
    "CREAR CLIENTE: Clic en 'Nuevo Cliente' → Seleccionar tipo (Empresa / Persona Natural) → Completar campos obligatorios (RUC/DNI, Razón Social) → Guardar.",
    "EDITAR CLIENTE: Clic en el ícono de lápiz en la fila correspondiente → Modificar campos → Guardar cambios.",
    "SUSPENDER CLIENTE: Clic en el botón de suspensión → Seleccionar motivo → Confirmar. El cliente aparecerá con estado 'Suspendido'.",
    "REACTIVAR CLIENTE: En la vista de clientes suspendidos, clic en el botón de reactivación.",
    "IMPORTAR CLIENTES: Clic en 'Importar CSV' → Descargar plantilla → Completar datos → Subir archivo → Revisar previsualización → Confirmar importación.",
  ]);
  noteBox("Los campos RUC/DNI y Razón Social son obligatorios. Verifique que el RUC sea válido antes de guardar.", "warning");

  space(3);

  // 5.2 PROFORMAS
  sectionTitle("5.2 Módulo: Proformas", 2);
  para("Objetivo: Crear, gestionar y enviar propuestas comerciales de servicios contables a los clientes, con capacidad de generar PDF profesionales.");
  space(2);
  sectionTitle("Componentes principales", 3);
  bullet([
    "Lista de proformas con filtros por estado, fecha, tipo de servicio y cliente",
    "Estados disponibles: Borrador, Enviada, Aprobada, Rechazada, Facturada",
    "Diseñador de proformas con plantillas personalizables",
    "Generación de PDF con estilos profesionales",
    "Envío de proforma por correo electrónico directamente desde el sistema",
    "Proyección de calendario de pagos integrada",
    "Conversión directa de proforma aprobada a contrato",
  ]);
  sectionTitle("Flujo de trabajo de una proforma", 3);
  numberedList([
    "Crear proforma: seleccionar cliente, tipo de servicio y agregar ítems con precio.",
    "Guardar como borrador para revisión interna.",
    "Cambiar estado a 'Enviada' al compartirla con el cliente.",
    "Registrar respuesta del cliente: 'Aprobada' o 'Rechazada'.",
    "Si es aprobada: generar el contrato correspondiente desde la proforma.",
  ]);

  addPage();
  setCursorY(20);

  // 5.3 CONTRATOS
  sectionTitle("5.3 Módulo: Contratos", 2);
  para("Objetivo: Administrar los contratos de prestación de servicios, con soporte para plantillas de contrato personalizadas y seguimiento del ciclo de vida contractual.");
  space(2);
  sectionTitle("Componentes principales", 3);
  bullet([
    "Tabla de contratos con filtros por estado, condición, tipo de servicio y fecha",
    "Estados del contrato: Borrador, En Gestión, Aprobado, Activo, Pausado, Finalizado, Cancelado, Anulado",
    "Condiciones: Vigente, Terminado, Anulado, Suspendido",
    "Plantillas de contrato con cláusulas, partes y anexos",
    "Diseñador de contrato interactivo",
    "Generación de PDF del contrato firmado",
    "Vinculación automática con proforma de origen",
  ]);
  sectionTitle("Crear un contrato", 3);
  numberedList([
    "Acceder al módulo de Contratos y clic en 'Nuevo Contrato'.",
    "Seleccionar el cliente y el tipo de servicio.",
    "Definir fechas de inicio y fin, moneda y monto.",
    "Opcionalmente, aplicar una plantilla de contrato predefinida.",
    "Completar las cláusulas y partes del contrato.",
    "Guardar el contrato (estado inicial: Borrador).",
    "Avanzar el estado según el flujo de aprobación interno.",
  ]);

  space(3);

  // 5.4 CALENDARIO DE PAGOS
  sectionTitle("5.4 Módulo: Calendario de Pagos", 2);
  para("Objetivo: Gestionar el flujo de cobros mensuales de los contratos activos, registrar pagos recibidos y mantener el registro de ventas actualizado.");
  space(2);
  sectionTitle("Componentes principales", 3);
  bullet([
    "Vista de calendario con codificación por colores según estado del pago",
    "Tabla de pagos pendientes, vencidos y cobrados",
    "Formulario de registro de pago con datos fiscales (tipo de comprobante, serie, IGV, detracciones, retenciones)",
    "Registro de ventas automático al registrar un pago",
    "Filtros por mes, estado y cliente",
  ]);
  sectionTitle("Registrar un pago", 3);
  numberedList([
    "Acceder al Calendario de Pagos y localizar el pago pendiente.",
    "Hacer clic en el botón de registro del pago correspondiente.",
    "Completar el formulario: fecha de pago, método de pago, tipo de comprobante, serie y número.",
    "Indicar si aplica IGV, detracción o retención.",
    "Confirmar el registro. El estado del pago cambiará a 'Pagado'.",
    "Se generará automáticamente un registro en el libro de ventas.",
  ]);

  space(3);

  // 5.5 WORKFLOW
  sectionTitle("5.5 Módulo: WorkFlow", 2);
  para("Objetivo: Gestionar de forma jerárquica las actividades de cada contrato activo, organizadas en una estructura tipo ClickUp: Cartera → Mes → Contrato → Actividades.");
  space(2);
  sectionTitle("Estructura jerárquica", 3);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Nivel", "Nombre", "Descripción"]],
    body: [
      ["1", "Espacio (Cartera)", "Agrupa todos los contratos de una cartera de clientes"],
      ["2", "Mes", "Organiza los contratos activos por período mensual"],
      ["3", "Contrato", "Muestra el detalle de actividades de un contrato específico"],
      ["4", "Actividades", "Lista de procesos: Inputs, Tareas, Outputs y Supervisión"],
      ["5", "Actividad", "Detalle individual con Gantt, checklists y archivos adjuntos"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("Vistas disponibles", 3);
  bullet([
    "Vista Kanban: tarjetas arrastrables por columnas de estado (Pendiente, En Progreso, En Revisión, Completado)",
    "Vista de Datos/Notion: edición tipo bloque con notas, tablas y referencias",
    "Vista de Supervisión: checklists de verificación por responsable",
    "Diagrama Gantt: línea de tiempo de actividades con fechas de inicio y fin",
    "Backlog: tabla consolidada de todas las actividades con filtros",
  ]);

  addPage();
  setCursorY(20);

  // 5.6 CARTERAS
  sectionTitle("5.6 Módulo: Carteras", 2);
  para("Objetivo: Organizar a los clientes en carteras de trabajo asignadas a equipos específicos, facilitando el seguimiento del desempeño por cartera.");
  space(2);
  bullet([
    "Creación de carteras con nombre, descripción y responsable",
    "Asignación de clientes a cada cartera",
    "Asignación de miembros del equipo con roles en la cartera",
    "Dashboard de rendimiento con métricas por cartera y por miembro",
    "Ranking de equipos por desempeño",
    "Filtros por período y categoría de servicio",
  ]);

  space(3);

  // 5.7 USUARIOS
  sectionTitle("5.7 Módulo: Usuarios", 2);
  para("Objetivo: Administrar las cuentas de acceso al sistema, asignar roles y gestionar el personal del estudio (incluyendo personal sin cuenta de acceso).");
  space(2);
  sectionTitle("Gestión de usuarios del sistema", 3);
  bullet([
    "Crear nuevos usuarios con correo y contraseña inicial",
    "Asignar rol de acceso (Administrador, Gerente, Asesor, Auxiliar, etc.)",
    "Editar datos del perfil del usuario",
    "Cambiar contraseña de cualquier usuario (solo Administrador)",
    "Desactivar o eliminar cuentas de usuario",
  ]);
  sectionTitle("Gestión de personal (sin cuenta)", 3);
  bullet([
    "Registrar miembros del equipo sin cuenta de sistema",
    "Asignar puesto y datos de contacto",
    "Importar personal desde archivo CSV",
    "Este personal puede ser asignado en carteras y actividades",
  ]);
  space(2);

  autoTable(doc, {
    startY: getCursorY(),
    head: [["Rol", "Nivel de Acceso", "Módulos Principales"]],
    body: [
      ["Administrador", "Total", "Todos los módulos + Configuración"],
      ["Gerente", "Alto", "Dashboard, Clientes, Contratos, Carteras, Reportes"],
      ["Asesor", "Medio", "Clientes, Proformas, Contratos, WorkFlow"],
      ["Contador", "Medio", "Clientes, Contratos, Calendario de Pagos"],
      ["Auxiliar", "Básico", "Clientes, WorkFlow (asignado)"],
      ["Asistente", "Básico", "WorkFlow, Actividades asignadas"],
      ["Practicante", "Limitado", "Actividades asignadas"],
      ["Supervisor", "Supervisión", "WorkFlow, Reportes de supervisión"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  // 5.8 CONFIGURACIÓN
  addPage();
  setCursorY(20);
  sectionTitle("5.8 Módulo: Configuración", 2);
  para("Objetivo: Personalizar y ajustar los parámetros del sistema según las necesidades del estudio contable. Accesible exclusivamente para usuarios con rol Administrador.");
  space(2);

  autoTable(doc, {
    startY: getCursorY(),
    head: [["Pestaña", "Descripción"]],
    body: [
      ["Regímenes", "Gestionar opciones de régimen tributario y laboral para clientes"],
      ["Roles", "Configurar permisos detallados para cada rol del sistema"],
      ["Proformas", "Codificación de proformas, vencimiento y estados personalizados"],
      ["Contratos", "Secuencias de numeración para contratos"],
      ["Servicios", "Catálogo de servicios por categoría (Contabilidad, Trámites, Auditoría)"],
      ["Pagos", "Documentos y métodos de pago disponibles"],
      ["Calendario Pagos", "Configuración del calendario de cobros"],
      ["Notificaciones", "Activar/desactivar tipos de notificaciones"],
      ["Sistema", "Parámetros financieros, datos de la empresa, visibilidad por rol"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  // ── SECCIÓN 6: FLUJOS OPERATIVOS ─────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("6. FLUJOS OPERATIVOS PRINCIPALES");
  space(3);

  sectionTitle("6.1 Flujo: Onboarding de Nuevo Cliente", 2);
  numberedList([
    "Registrar el cliente en el módulo de Clientes con todos sus datos.",
    "Asignar el cliente a la cartera correspondiente.",
    "Crear la proforma de servicios y enviarla al cliente.",
    "Una vez aprobada la proforma, generar el contrato.",
    "Activar el contrato y configurar el calendario de pagos.",
    "Crear el WorkFlow del contrato para gestionar las actividades del servicio.",
  ]);
  space(3);

  sectionTitle("6.2 Flujo: Gestión Mensual de Servicios", 2);
  numberedList([
    "Al inicio del mes, revisar el Calendario de Pagos para identificar cobros pendientes.",
    "En el módulo WorkFlow, asignar las actividades del mes a cada miembro del equipo.",
    "Hacer seguimiento del avance mediante el tablero Kanban y el diagrama Gantt.",
    "Registrar los pagos recibidos en el Calendario de Pagos.",
    "Al cierre del mes, generar el reporte del Registro de Ventas.",
  ]);
  space(3);

  sectionTitle("6.3 Flujo: Generación y Descarga de PDF", 2);
  sectionTitle("Para Proformas:", 3);
  numberedList([
    "Abrir la proforma deseada desde el listado.",
    "Hacer clic en el botón 'Descargar PDF' o 'Generar PDF'.",
    "El sistema generará automáticamente el documento con el diseño configurado.",
    "El archivo se descargará en su equipo en formato PDF.",
  ]);
  sectionTitle("Para Contratos:", 3);
  numberedList([
    "Abrir el contrato deseado y acceder a la vista de detalle.",
    "Hacer clic en el botón 'Generar PDF del Contrato'.",
    "El sistema incluirá las cláusulas, partes y datos configurados.",
    "El archivo se descargará en formato PDF listo para firma.",
  ]);
  space(3);

  sectionTitle("6.4 Flujo: Importación Masiva de Datos", 2);
  numberedList([
    "Acceder al módulo correspondiente (Clientes o Personal).",
    "Hacer clic en el botón 'Importar CSV'.",
    "Descargar la plantilla CSV modelo provista por el sistema.",
    "Completar la plantilla con los datos a importar respetando el formato.",
    "Subir el archivo CSV completado.",
    "Revisar la previsualización de los datos detectados.",
    "Confirmar la importación. El sistema procesará los registros automáticamente.",
  ]);
  noteBox("Verifique que el archivo CSV esté en codificación UTF-8 para evitar problemas con caracteres especiales (tildes, ñ).", "warning");

  // ── SECCIÓN 7: REPORTES ──────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("7. REPORTES Y EXPORTACIONES");
  space(3);

  sectionTitle("7.1 Tipos de Reportes Disponibles", 2);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Reporte", "Descripción", "Formato"]],
    body: [
      ["Registro de Ventas", "Libro de ventas mensual con comprobantes emitidos", "Tabla / PDF"],
      ["Rendimiento de Cartera", "Métricas de desempeño por cartera y asesor", "Gráficos / Tabla"],
      ["Contratos Vigentes", "Listado de contratos activos con montos", "PDF / Exportable"],
      ["Calendario de Pagos", "Estado de cobros por mes y cliente", "Vista Calendario"],
      ["Proformas por Estado", "Seguimiento del pipeline de propuestas", "Gráfico / Tabla"],
      ["WorkFlow por Contrato", "Avance de actividades por contrato", "Gantt / Tabla"],
      ["Manual de Usuario", "Documentación completa del sistema", "PDF"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("7.2 Filtros Aplicables", 2);
  bullet([
    "Período: filtro por mes y año",
    "Cliente: búsqueda por razón social o RUC",
    "Estado: filtrar por estado del registro",
    "Tipo de servicio: contabilidad, trámites, auditoría",
    "Responsable: filtrar por asesor o miembro del equipo",
    "Cartera: filtrar por cartera de clientes",
  ]);

  sectionTitle("7.3 Exportación de Información", 2);
  para("El sistema permite exportar datos en los siguientes formatos:");
  bullet([
    "PDF: documentos formateados listos para impresión o archivo digital",
    "Excel/CSV: datos tabulares para análisis en hojas de cálculo",
  ]);
  numberedList([
    "Acceder al módulo o reporte deseado.",
    "Aplicar los filtros necesarios para acotar los datos.",
    "Hacer clic en el botón de exportación (ícono de descarga o botón 'Exportar').",
    "Seleccionar el formato deseado si el sistema ofrece opciones.",
    "El archivo se descargará automáticamente a su equipo.",
  ]);

  // ── SECCIÓN 8: NOTIFICACIONES ────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("8. NOTIFICACIONES Y ALERTAS");
  space(3);

  sectionTitle("8.1 Tipos de Notificaciones", 2);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Tipo", "Descripción", "Canal"]],
    body: [
      ["Pagos próximos a vencer", "Alerta cuando un pago vence en los próximos 3 días", "Sistema / Email"],
      ["Pagos vencidos", "Notificación de cobros con fecha de vencimiento superada", "Sistema / Email"],
      ["Contratos por vencer", "Aviso de contratos próximos a su fecha de fin", "Sistema"],
      ["Actividades asignadas", "Cuando se asigna una actividad a un usuario", "Sistema"],
      ["Proforma respondida", "Cuando el cliente aprueba o rechaza una proforma", "Email"],
      ["Nuevos mensajes del sistema", "Actualizaciones y comunicados generales", "Sistema"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("8.2 Gestión de Notificaciones", 2);
  para("Las notificaciones del sistema pueden ser configuradas en el módulo de Configuración → Notificaciones. Desde allí se puede:");
  bullet([
    "Activar o desactivar notificaciones por correo electrónico",
    "Configurar alertas de pagos vencidos",
    "Activar recordatorios de contratos próximos a vencer",
    "Habilitar notificaciones push en el navegador",
  ]);

  // ── SECCIÓN 9: SEGURIDAD ─────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("9. SEGURIDAD");
  space(3);

  sectionTitle("9.1 Roles y Niveles de Acceso", 2);
  para("El sistema implementa un control de acceso basado en roles (RBAC). Cada usuario tiene un único rol que determina qué módulos puede ver y qué acciones puede realizar.");
  space(2);
  noteBox("Los roles son asignados por el Administrador del sistema y almacenados de forma segura en la base de datos. Nunca se almacenan en el navegador ni pueden ser modificados por el usuario.", "info");
  space(3);

  sectionTitle("9.2 Políticas de Seguridad", 2);
  bullet([
    "Autenticación segura mediante Supabase Auth con tokens JWT",
    "Las contraseñas se almacenan encriptadas con bcrypt (nunca en texto plano)",
    "Todas las comunicaciones son encriptadas mediante HTTPS/TLS",
    "Row Level Security (RLS) en base de datos: cada usuario solo accede a sus datos autorizados",
    "Sesiones con tiempo de expiración automático",
    "Auditoría de acciones críticas (creación, eliminación de registros)",
  ]);

  sectionTitle("9.3 Protección de Datos", 2);
  bullet([
    "Los datos se almacenan en servidores seguros con respaldo automático",
    "La información financiera y de clientes está protegida por políticas de acceso por rol",
    "Los datos de clientes (RUC, SUNAT) se manejan con cifrado adicional",
    "Se recomienda no compartir credenciales de acceso bajo ninguna circunstancia",
    "Ante sospecha de acceso no autorizado, cambiar contraseña inmediatamente y notificar al administrador",
  ]);

  // ── SECCIÓN 10: FAQ ──────────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("10. PREGUNTAS FRECUENTES (FAQ)");
  space(3);

  const faqs = [
    {
      q: "¿Cómo recupero mi contraseña si la olvidé?",
      a: "En la pantalla de inicio de sesión, haga clic en '¿Olvidaste tu contraseña?'. Ingrese su correo electrónico y recibirá un enlace de recuperación. Si no recibe el correo, revise su carpeta de spam o contacte al administrador."
    },
    {
      q: "¿Puedo acceder al sistema desde mi celular o tablet?",
      a: "Sí. El sistema es completamente responsivo y funciona en dispositivos móviles y tablets. Se recomienda utilizar Chrome o Safari en su versión más reciente para la mejor experiencia."
    },
    {
      q: "¿Cómo creo una proforma para un cliente nuevo?",
      a: "Primero debe registrar el cliente en el módulo de Clientes. Luego vaya a Proformas → Nuevo → Seleccione el cliente → Agregue los servicios → Guarde como borrador."
    },
    {
      q: "¿Por qué no veo algunos módulos en el menú?",
      a: "El acceso a módulos depende del rol asignado a su cuenta. Si necesita acceso a un módulo específico, solicítelo al Administrador del sistema."
    },
    {
      q: "¿Cómo genero el PDF de un contrato?",
      a: "Abra el contrato desde el módulo de Contratos → haga clic en el botón 'Detalle' o en el ícono del contrato → busque el botón 'Generar PDF'. El archivo se descargará automáticamente."
    },
    {
      q: "¿Qué pasa si cierro el navegador sin guardar?",
      a: "Los cambios no guardados se perderán. El sistema no tiene guardado automático en formularios. Siempre confirme con el botón 'Guardar' antes de cerrar la ventana."
    },
    {
      q: "¿Cómo importo múltiples clientes a la vez?",
      a: "Vaya a Clientes → Importar CSV → Descargue la plantilla → Llénela con sus datos → Súbala al sistema → Revise la previsualización y confirme."
    },
    {
      q: "¿Puedo eliminar un contrato ya firmado?",
      a: "Solo el Administrador puede eliminar contratos. Se recomienda cambiar el estado a 'Anulado' en lugar de eliminar, para mantener el historial. La eliminación es irreversible."
    },
    {
      q: "¿Cómo sé si un pago fue registrado correctamente?",
      a: "El estado del pago cambiará a 'Pagado' (verde) en el Calendario de Pagos. Adicionalmente, se creará automáticamente un registro en el Registro de Ventas del período correspondiente."
    },
    {
      q: "¿Cómo agrego un nuevo miembro al equipo?",
      a: "Vaya al módulo de Usuarios → pestaña 'Personal' → 'Agregar Personal'. Si el miembro necesita acceso al sistema, también debe crear una cuenta de usuario desde la pestaña 'Usuarios'."
    },
    {
      q: "¿El sistema funciona sin internet?",
      a: "No. AccountEase Suite es una aplicación web en la nube que requiere conexión a internet para funcionar. Asegúrese de tener una conexión estable durante su uso."
    },
    {
      q: "¿Cómo cambio el IGV aplicado a las proformas?",
      a: "Vaya a Configuración → Sistema → Configuración Financiera → IGV (%) → Modifique el valor → Guardar cambios. Este cambio aplica a nuevas proformas creadas desde ese momento."
    },
  ];

  faqs.forEach((faq, i) => {
    if (getCursorY() > PAGE_H - 45) { addPage(); setCursorY(20); }
    const qY = getCursorY();
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(MARGIN_L, qY, CONTENT_W, 8, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${faq.q}`, MARGIN_L + 4, qY + 5.5);
    setCursorY(qY + 11);
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "normal");
    const aLines = doc.splitTextToSize(faq.a, CONTENT_W - 8);
    doc.text(aLines, MARGIN_L + 4, getCursorY());
    setCursorY(getCursorY() + aLines.length * 5 + 5);
  });

  // ── SECCIÓN 11: GLOSARIO ─────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("11. GLOSARIO DE TÉRMINOS");
  space(3);

  const glossary = [
    ["Backlog", "Lista consolidada de todas las actividades o tareas pendientes en el WorkFlow."],
    ["Cartera", "Conjunto de clientes asignados a un equipo de trabajo específico."],
    ["Comprobante", "Documento fiscal que sustenta una transacción (factura, boleta, recibo)."],
    ["Contrato", "Documento legal que formaliza la prestación de servicios contables a un cliente."],
    ["CSV", "Formato de archivo de texto para importar datos masivos (valores separados por comas)."],
    ["Detracción", "Descuento aplicado al pago por mandato de SUNAT para depósito en cuenta corriente."],
    ["IGV", "Impuesto General a las Ventas (18% en Perú). Se aplica sobre el valor del servicio."],
    ["Kanban", "Metodología visual de gestión de tareas mediante columnas y tarjetas."],
    ["PDF", "Formato de archivo de documento portátil, ideal para compartir documentos formateados."],
    ["Proforma", "Propuesta comercial de servicios enviada al cliente antes de la firma del contrato."],
    ["RBAC", "Control de acceso basado en roles (Role-Based Access Control)."],
    ["Registro de Ventas", "Libro contable que registra todas las ventas/servicios facturados del período."],
    ["Retención", "Porcentaje retenido al proveedor por la empresa compradora según régimen tributario."],
    ["RLS", "Row Level Security: política de seguridad que restringe el acceso a filas de la base de datos."],
    ["RUC", "Registro Único de Contribuyentes. Identificador tributario de empresas en Perú."],
    ["Secuencia", "Configuración de la numeración correlativa de proformas o contratos."],
    ["Token JWT", "Credencial digital cifrada utilizada para autenticar y autorizar usuarios en el sistema."],
    ["WorkFlow", "Flujo de trabajo organizado jerárquicamente para gestionar actividades por contrato."],
  ];

  autoTable(doc, {
    startY: getCursorY(),
    head: [["Término", "Definición"]],
    body: glossary,
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  // ── SECCIÓN 12: SOPORTE ──────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  sectionTitle("12. SOPORTE TÉCNICO");
  space(3);

  sectionTitle("12.1 Canales de Contacto", 2);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Canal", "Detalle", "Tiempo de Respuesta"]],
    body: [
      ["Correo electrónico", "soporte@accountease.com", "24-48 horas hábiles"],
      ["Teléfono / WhatsApp", "+51 XXX XXX XXX", "Horario de atención"],
      ["Sistema de tickets", "Desde el menú de ayuda del sistema", "24-48 horas hábiles"],
      ["Documentación en línea", "https://docs.accountease.com", "Disponible 24/7"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("12.2 Horarios de Atención", 2);
  autoTable(doc, {
    startY: getCursorY(),
    head: [["Día", "Horario"]],
    body: [
      ["Lunes a Viernes", "08:00 - 18:00 (Hora de Lima, Perú)"],
      ["Sábados", "09:00 - 13:00"],
      ["Domingos y feriados", "Solo emergencias críticas por correo"],
    ],
    theme: "striped",
    headStyles: { fillColor: COLORS.secondary, textColor: COLORS.white, fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: MARGIN_L, right: MARGIN_R },
  });
  setCursorY((doc as any).lastAutoTable.finalY + 6);

  sectionTitle("12.3 Procedimiento para Reportar una Incidencia", 2);
  numberedList([
    "Identificar y documentar el problema: capture un pantallazo si es posible.",
    "Verificar si el problema es reproducible (¿ocurre siempre o de forma intermitente?).",
    "Recopilar información: módulo afectado, pasos realizados, mensaje de error exacto.",
    "Contactar al administrador interno o al soporte técnico por el canal correspondiente.",
    "Proporcionar toda la información recopilada para acelerar la solución.",
    "Anotar el número de ticket de soporte para seguimiento.",
    "Esperar la respuesta en los tiempos establecidos según la prioridad del incidente.",
  ]);
  space(2);
  noteBox("Para incidencias críticas que afecten la operación del estudio completo, indique 'URGENTE' en el asunto del correo para priorizar la atención.", "danger");

  // ── PÁGINA FINAL ─────────────────────────────────────────────────────────────
  addPage();
  setCursorY(20);
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("AccountEase Suite", PAGE_W / 2, 100, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Manual de Usuario — Versión 1.0", PAGE_W / 2, 115, { align: "center" });
  doc.setTextColor(180, 210, 255);
  doc.setFontSize(9);
  doc.text("Sistema de Gestión Contable y Administrativa", PAGE_W / 2, 130, { align: "center" });
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1);
  doc.line(MARGIN_L + 30, 140, PAGE_W - MARGIN_R - 30, 140);
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.text("© 2024 — Todos los derechos reservados", PAGE_W / 2, 155, { align: "center" });

  // ── GENERAR TABLA DE CONTENIDO ───────────────────────────────────────────────
  // Ahora que tenemos todas las entradas, llenamos las páginas del TOC
  doc.setPage(tocPageStart);
  doc.setPage(tocPageStart);

  // Re-render TOC en las páginas reservadas
  let tocY = 35;
  const tocPage1 = tocPageStart;
  const tocPage2 = tocPageStart + 1;
  let tocCurrentPage = tocPage1;

  const switchTocPage = () => {
    if (tocCurrentPage === tocPage1) {
      doc.setPage(tocPage2);
      tocCurrentPage = tocPage2;
      tocY = 20;
    }
  };

  tocEntries.forEach((entry) => {
    if (entry.level === 1) {
      if (tocY > PAGE_H - 25) { switchTocPage(); }
      doc.setPage(tocCurrentPage);
      doc.setFillColor(...COLORS.primary);
      doc.setFillColor(230, 237, 250);
      doc.roundedRect(MARGIN_L, tocY, CONTENT_W, 7.5, 1, 1, "F");
      doc.setTextColor(...COLORS.primary);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(entry.title, MARGIN_L + 3, tocY + 5.5);
      doc.setTextColor(...COLORS.gray);
      doc.text(`${entry.page}`, PAGE_W - MARGIN_R - 1, tocY + 5.5, { align: "right" });
      tocY += 9;
    } else if (entry.level === 2) {
      if (tocY > PAGE_H - 20) { switchTocPage(); }
      doc.setPage(tocCurrentPage);
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      const dotLine = ".".repeat(Math.floor((CONTENT_W - 10 - doc.getTextWidth(entry.title) - doc.getTextWidth(`${entry.page}`)) / doc.getTextWidth(".")));
      doc.text(`  ${entry.title}`, MARGIN_L + 4, tocY + 4);
      doc.setTextColor(...COLORS.gray);
      doc.text(dotLine, MARGIN_L + 8 + doc.getTextWidth(`  ${entry.title}`), tocY + 4);
      doc.text(`${entry.page}`, PAGE_W - MARGIN_R - 1, tocY + 4, { align: "right" });
      tocY += 7;
    }
  });

  // Añadir footer a todas las páginas de contenido
  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages - 1; p++) {
    doc.setPage(p);
    addPageFooter();
  }

  // Descargar
  doc.save("Manual_de_Usuario_AccountEase_Suite.pdf");
}
