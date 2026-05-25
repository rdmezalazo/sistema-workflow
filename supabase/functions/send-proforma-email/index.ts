import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  proformaId: string;
  proformaNumero: string;
  clienteNombre: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, message, proformaId, proformaNumero, clienteNombre }: EmailRequest = await req.json();

    console.log("Sending proforma email to:", to);
    console.log("Proforma:", proformaNumero);

    // Get proforma details
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: proforma, error: proformaError } = await supabaseClient
      .from("proformas")
      .select(`
        *,
        cliente:clientes(razon_social, codigo, direccion, email, telefono)
      `)
      .eq("id", proformaId)
      .single();

    if (proformaError) {
      console.error("Error fetching proforma:", proformaError);
      throw new Error("Error al obtener la proforma");
    }

    const { data: items, error: itemsError } = await supabaseClient
      .from("proforma_items")
      .select("*")
      .eq("proforma_id", proformaId);

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      throw new Error("Error al obtener los items");
    }

    // Create HTML table for items
    const itemsHtml = items && items.length > 0
      ? `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #7c1f2f; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Descripción</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Cant.</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">P. Unit.</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.descripcion}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.cantidad}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">S/ ${Number(item.precio_unitario).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">S/ ${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>Subtotal:</strong></td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">S/ ${Number(proforma.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>IGV (18%):</strong></td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">S/ ${Number(proforma.igv).toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold; color: #7c1f2f;">S/ ${Number(proforma.total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      `
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #7c1f2f; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">CONTADORES & AUDITORES AREQUIPA S.A.C.</h1>
          <p style="color: #d4af37; margin: 5px 0 0 0; font-style: italic;">Tu mejor aliado en gestión contable</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
          <h2 style="color: #7c1f2f; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">
            Proforma N° ${proformaNumero}
          </h2>
          
          <p style="white-space: pre-line;">${message}</p>
          
          ${itemsHtml}
          
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Esta proforma es válida hasta: ${proforma.fecha_vencimiento}
          </p>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">
            <strong>Contadores & Auditores Arequipa S.A.C.</strong><br>
            📞 959000000 | 📧 cotizacion@contadoresyauditoresarequipa.com<br>
            📍 Arequipa, Perú
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Contadores & Auditores Arequipa <cotizacion@contadoresyauditoresarequipa.com>",
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailData);
      throw new Error(emailData.message || "Error al enviar el email");
    }

    console.log("Email sent successfully:", emailResponse);

    // Update proforma status to 'enviada' if it was 'borrador'
    if (proforma.status === "borrador") {
      await supabaseClient
        .from("proformas")
        .update({ status: "enviada" })
        .eq("id", proformaId);
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-proforma-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
