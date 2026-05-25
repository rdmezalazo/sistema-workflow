import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PDF_CONFIG, PDFStyleConfig } from "@/lib/generateProformaPDF";

/**
 * Fetches PDF styles for a given proforma type from the database.
 * Returns the merged config with defaults if no custom styles exist.
 */
export async function getPDFStylesForType(tipo: string): Promise<PDFStyleConfig> {
  // First, try to find a plantilla that matches this type
  const { data: plantilla } = await supabase
    .from("proforma_plantillas")
    .select("estilos_pdf")
    .eq("tipo", tipo)
    .eq("activa", true)
    .limit(1)
    .single();

  if (plantilla?.estilos_pdf && typeof plantilla.estilos_pdf === "object" && !Array.isArray(plantilla.estilos_pdf) && Object.keys(plantilla.estilos_pdf).length > 0) {
    const savedConfig = plantilla.estilos_pdf as unknown as Partial<PDFStyleConfig>;
    return {
      colors: { ...DEFAULT_PDF_CONFIG.colors, ...savedConfig.colors },
      typography: { ...DEFAULT_PDF_CONFIG.typography, ...savedConfig.typography },
      layout: { ...DEFAULT_PDF_CONFIG.layout, ...savedConfig.layout },
      company: { ...DEFAULT_PDF_CONFIG.company, ...savedConfig.company },
      bank: { ...DEFAULT_PDF_CONFIG.bank, ...savedConfig.bank },
      annotations: savedConfig.annotations ?? DEFAULT_PDF_CONFIG.annotations,
    };
  }

  return DEFAULT_PDF_CONFIG;
}

/**
 * Fetches PDF styles for a specific plantilla ID from the database.
 * Returns the merged config with defaults if no custom styles exist.
 */
export async function getPDFStylesForPlantilla(plantillaId: string): Promise<PDFStyleConfig> {
  const { data: plantilla } = await supabase
    .from("proforma_plantillas")
    .select("estilos_pdf")
    .eq("id", plantillaId)
    .single();

  if (plantilla?.estilos_pdf && typeof plantilla.estilos_pdf === "object" && !Array.isArray(plantilla.estilos_pdf) && Object.keys(plantilla.estilos_pdf).length > 0) {
    const savedConfig = plantilla.estilos_pdf as unknown as Partial<PDFStyleConfig>;
    return {
      colors: { ...DEFAULT_PDF_CONFIG.colors, ...savedConfig.colors },
      typography: { ...DEFAULT_PDF_CONFIG.typography, ...savedConfig.typography },
      layout: { ...DEFAULT_PDF_CONFIG.layout, ...savedConfig.layout },
      company: { ...DEFAULT_PDF_CONFIG.company, ...savedConfig.company },
      bank: { ...DEFAULT_PDF_CONFIG.bank, ...savedConfig.bank },
      annotations: savedConfig.annotations ?? DEFAULT_PDF_CONFIG.annotations,
    };
  }

  return DEFAULT_PDF_CONFIG;
}
