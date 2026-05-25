import { useState } from "react";
import { Eye, Edit, Trash2, MoreHorizontal, FileText, CheckCircle, XCircle, ArrowRight, Ban, FileSignature } from "lucide-react";
import { ApplyTemplateModal } from "./ApplyTemplateModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { buildContractPaymentDrafts } from "@/lib/paymentSchedule";
import { toast } from "sonner";

export type ContractStatus = "borrador" | "en_gestion" | "aprobado" | "anulado" | "activo" | "pausado" | "finalizado" | "cancelado";

interface ContractActionsProps {
  contractId: string;
  contractNumero: string;
  currentStatus: ContractStatus;
  onStatusChange: () => void;
  onViewDetail: () => void;
  onEdit: () => void;
}

export const ContractActions = ({
  contractId,
  contractNumero,
  currentStatus,
  onStatusChange,
  onViewDetail,
  onEdit,
}: ContractActionsProps) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "aprobar" | "anular" | "eliminar" | null;
  }>({ open: false, action: null });
  const [loading, setLoading] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);

  const generatePaymentSchedule = async () => {
    const { data: contract, error: fetchError } = await supabase
      .from("contratos")
      .select("fecha_inicio, monto_total, numero_cuotas, dia_vencimiento, datos_plantilla")
      .eq("id", contractId)
      .maybeSingle();

    if (fetchError || !contract) {
      console.error("Error fetching contract:", fetchError);
      throw new Error("No se pudo obtener los datos del contrato");
    }

    const { data: existingPayments } = await supabase
      .from("pagos")
      .select("id")
      .eq("contrato_id", contractId);

    if (existingPayments && existingPayments.length > 0) {
      return existingPayments.length;
    }

    const payments = buildContractPaymentDrafts(contract, contractId);

    if (payments.length > 0) {
      const { error: insertError } = await supabase
        .from("pagos")
        .insert(payments);

      if (insertError) {
        console.error("Error creating payments:", insertError);
        throw new Error("No se pudo crear el calendario de pagos");
      }
    }

    return payments.length;
  };

  const handleStatusChange = async (newStatus: ContractStatus) => {
    setLoading(true);
    
    try {
      // If approving, generate payment schedule first
      if (newStatus === "aprobado") {
        const paymentCount = await generatePaymentSchedule();
        toast.success(`Se generaron ${paymentCount} cuotas en el calendario de pagos`);
      }

      const { error } = await supabase
        .from("contratos")
        .update({ status: newStatus })
        .eq("id", contractId);

      if (error) {
        console.error("Error updating status:", error);
        toast.error("Error al actualizar el estado");
      } else {
        const statusLabels: Record<string, string> = {
          en_gestion: "En Gestión",
          aprobado: "Aprobado",
          anulado: "Anulado",
        };
        toast.success(`Contrato ${statusLabels[newStatus] || newStatus}`);
        onStatusChange();
      }
    } catch (err) {
      console.error("Error in status change:", err);
      toast.error(err instanceof Error ? err.message : "Error al procesar la operación");
    }
    
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const handleDelete = async () => {
    setLoading(true);
    
    // First delete associated payments
    await supabase
      .from("pagos")
      .delete()
      .eq("contrato_id", contractId);

    const { error } = await supabase
      .from("contratos")
      .delete()
      .eq("id", contractId);

    if (error) {
      console.error("Error deleting contract:", error);
      toast.error("Error al eliminar el contrato");
    } else {
      toast.success("Contrato eliminado");
      onStatusChange();
    }
    setLoading(false);
    setConfirmDialog({ open: false, action: null });
  };

  const getAvailableActions = () => {
    switch (currentStatus) {
      case "borrador":
        return ["view", "edit", "gestion", "anular", "delete"];
      case "en_gestion":
        return ["view", "edit", "aprobar", "anular", "delete"];
      case "aprobado":
        return ["view", "anular"];
      case "anulado":
        return ["view", "delete"];
      default:
        return ["view", "edit"];
    }
  };

  const actions = getAvailableActions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.includes("view") && (
            <DropdownMenuItem onClick={onViewDetail}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalle
            </DropdownMenuItem>
          )}
          
          {actions.includes("edit") && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Detalles
            </DropdownMenuItem>
          )}

          {(actions.includes("gestion") || actions.includes("aprobar")) && (
            <DropdownMenuSeparator />
          )}

          {actions.includes("gestion") && (
            <DropdownMenuItem onClick={() => setApplyTemplateOpen(true)}>
              <FileSignature className="h-4 w-4 mr-2" />
              Iniciar Gestión
            </DropdownMenuItem>
          )}

          {actions.includes("aprobar") && (
            <DropdownMenuItem 
              onClick={() => setConfirmDialog({ open: true, action: "aprobar" })}
              className="text-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar Contrato
            </DropdownMenuItem>
          )}

          {actions.includes("anular") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setConfirmDialog({ open: true, action: "anular" })}
                className="text-amber-600"
              >
                <Ban className="h-4 w-4 mr-2" />
                Anular Contrato
              </DropdownMenuItem>
            </>
          )}

          {actions.includes("delete") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setConfirmDialog({ open: true, action: "eliminar" })}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialogs */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog({ open, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "aprobar" && "¿Aprobar este contrato?"}
              {confirmDialog.action === "anular" && "¿Anular este contrato?"}
              {confirmDialog.action === "eliminar" && "¿Eliminar este contrato?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "aprobar" && (
                <>
                  El contrato <strong>{contractNumero}</strong> pasará a estado Aprobado y se generará automáticamente el calendario de pagos según las cuotas configuradas.
                </>
              )}
              {confirmDialog.action === "anular" && (
                <>
                  El contrato <strong>{contractNumero}</strong> será anulado. 
                  Quedará registrado en el sistema pero no podrá ser aprobado.
                </>
              )}
              {confirmDialog.action === "eliminar" && (
                <>
                  El contrato <strong>{contractNumero}</strong> será eliminado permanentemente junto con sus pagos asociados. 
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={() => {
                if (confirmDialog.action === "aprobar") {
                  handleStatusChange("aprobado");
                } else if (confirmDialog.action === "anular") {
                  handleStatusChange("anulado");
                } else if (confirmDialog.action === "eliminar") {
                  handleDelete();
                }
              }}
              className={
                confirmDialog.action === "aprobar" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : confirmDialog.action === "anular"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-destructive hover:bg-destructive/90"
              }
            >
              {loading ? "Procesando..." : (
                confirmDialog.action === "aprobar" ? "Aprobar" :
                confirmDialog.action === "anular" ? "Anular" : "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Apply Template Modal */}
      <ApplyTemplateModal
        open={applyTemplateOpen}
        onOpenChange={setApplyTemplateOpen}
        contractId={contractId}
        onSuccess={onStatusChange}
      />
    </>
  );
};
