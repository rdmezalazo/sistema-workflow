import { useState, useEffect, useRef, useCallback } from "react";
import {
  Link2,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
  Download,
  CloudUpload,
  File,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileTabProps {
  workflowId: string;
  workflowItemId: string;
  isOutput?: boolean; // Outputs can also upload files
  externalUrl?: string;
  attachmentId?: string;
  onUrlChange?: (url: string) => void;
  onAttachmentChange?: (attachmentId: string | null) => void;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string | null;
  created_at: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE_LABEL = "10 MB";

export function FileTab({
  workflowId,
  workflowItemId,
  isOutput = false,
  externalUrl = "",
  attachmentId,
  onUrlChange,
  onAttachmentChange,
}: FileTabProps) {
  const [url, setUrl] = useState(externalUrl);
  const [urlSaving, setUrlSaving] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce URL save
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch existing attachment
  useEffect(() => {
    if (attachmentId) {
      fetchAttachment(attachmentId);
    }
  }, [attachmentId]);

  // Fetch latest attachment for this item
  useEffect(() => {
    fetchLatestAttachment();
  }, [workflowId, workflowItemId]);

  const fetchAttachment = async (id: string) => {
    const { data, error } = await supabase
      .from("workflow_attachments")
      .select("*")
      .eq("id", id)
      .single();

    if (data && !error) {
      setAttachment(data);
    }
  };

  const fetchLatestAttachment = async () => {
    const { data, error } = await supabase
      .from("workflow_attachments")
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("workflow_item_id", workflowItemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      setAttachment(data);
    }
  };

  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setUrlSaving(true);
      onUrlChange?.(newUrl);
      setTimeout(() => setUrlSaving(false), 500);
    }, 800);
  }, [onUrlChange]);

  const handleFileSelect = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`El archivo excede el límite de ${MAX_FILE_SIZE_LABEL}`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Generate unique path
      const fileExt = file.name.split('.').pop();
      const fileName = `${workflowItemId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("workflow-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Create attachment record
      const { data: attachData, error: attachError } = await supabase
        .from("workflow_attachments")
        .insert({
          workflow_id: workflowId,
          workflow_item_id: workflowItemId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (attachError) throw attachError;

      setUploadProgress(100);
      setAttachment(attachData);
      onAttachmentChange?.(attachData.id);
      toast.success("Archivo subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const deleteAttachment = async () => {
    if (!attachment) return;

    try {
      // Delete from storage
      await supabase.storage
        .from("workflow-attachments")
        .remove([attachment.file_path]);

      // Delete record
      await supabase
        .from("workflow_attachments")
        .delete()
        .eq("id", attachment.id);

      setAttachment(null);
      onAttachmentChange?.(null);
      toast.success("Archivo eliminado");
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Error al eliminar el archivo");
    }
  };

  const downloadAttachment = async () => {
    if (!attachment) return;

    try {
      const { data, error } = await supabase.storage
        .from("workflow-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Error al descargar el archivo");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* URL Section - Available for both Data and Outputs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium">Enlace Externo</CardTitle>
          </div>
          <CardDescription className="text-xs">
            URL de SharePoint, Google Drive u otro servicio en la nube
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://sharepoint.com/... o https://drive.google.com/..."
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="flex-1"
            />
            {urlSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {url && isValidUrl(url) && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(url, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
          {url && !isValidUrl(url) && (
            <p className="text-xs text-destructive mt-1">URL no válida</p>
          )}
        </CardContent>
      </Card>

      {/* File Upload Section - Only for Outputs */}
      {isOutput && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium">Archivo Adjunto</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Máx: {MAX_FILE_SIZE_LABEL}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Sube el entregable directamente o arrástralo aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attachment ? (
              // Show existing attachment
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <File className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={downloadAttachment}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={deleteAttachment}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : uploading ? (
              // Upload progress
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Subiendo archivo...</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ) : (
              // Drop zone
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-muted-foreground/40"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <CloudUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Arrastra un archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tamaño máximo: {MAX_FILE_SIZE_LABEL}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hint for non-output types */}
      {!isOutput && (
        <div className="text-xs text-muted-foreground text-center py-2">
          💡 La subida de archivos solo está disponible para Entregables (Outputs)
        </div>
      )}
    </div>
  );
}