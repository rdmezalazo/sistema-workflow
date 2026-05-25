import { useState } from "react";
import { Send, Loader2, Mail, AlertCircle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proformaNumero: string;
  proformaId: string;
  clienteEmail: string | null;
  clienteNombre: string;
  onSuccess?: () => void;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  proformaNumero,
  proformaId,
  clienteEmail,
  clienteNombre,
  onSuccess,
}: SendEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(clienteEmail || "");
  const [subject, setSubject] = useState(`Proforma ${proformaNumero} - Contadores & Auditores Arequipa`);
  const [message, setMessage] = useState(
    `Estimado/a ${clienteNombre},\n\nAdjunto encontrará la proforma ${proformaNumero} con el detalle de nuestros servicios.\n\nQuedamos atentos a sus consultas.\n\nSaludos cordiales,\nContadores & Auditores Arequipa S.A.C.`
  );

  const handleSend = async () => {
    if (!email) {
      toast.error("Por favor ingrese un email de destino");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-proforma-email", {
        body: {
          to: email,
          subject,
          message,
          proformaId,
          proformaNumero,
          clienteNombre,
        },
      });

      if (error) throw error;

      toast.success("Email enviado correctamente");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Proforma por Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Se enviará desde: <strong>cotizacion@contadoresyauditoresarequipa.com</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="email">Email de destino</Label>
            <Input
              id="email"
              type="email"
              placeholder="cliente@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            El PDF de la proforma se adjuntará automáticamente al email.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading} className="btn-gradient gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
