-- Create storage bucket for workflow file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('workflow-attachments', 'workflow-attachments', false, 10485760); -- 10MB limit

-- Create table to track workflow file attachments
CREATE TABLE public.workflow_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  workflow_item_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_attachments
CREATE POLICY "Users can view workflow attachments" 
ON public.workflow_attachments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert workflow attachments" 
ON public.workflow_attachments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update workflow attachments" 
ON public.workflow_attachments 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete workflow attachments" 
ON public.workflow_attachments 
FOR DELETE 
USING (true);

-- Storage policies for workflow-attachments bucket
CREATE POLICY "Authenticated users can view workflow attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'workflow-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload workflow attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'workflow-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update workflow attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'workflow-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete workflow attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'workflow-attachments' AND auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_workflow_attachments_updated_at
BEFORE UPDATE ON public.workflow_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();