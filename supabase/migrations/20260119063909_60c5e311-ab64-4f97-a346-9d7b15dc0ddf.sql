-- Add INSERT policy for workflow_secuencias
CREATE POLICY "Staff can insert workflow_secuencias"
ON public.workflow_secuencias
FOR INSERT
WITH CHECK (true);

-- Also add ALL policy for workflows to ensure proper management
DROP POLICY IF EXISTS "Staff can manage workflows" ON public.workflows;

CREATE POLICY "Staff can insert workflows"
ON public.workflows
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can update workflows"
ON public.workflows
FOR UPDATE
USING (true);

CREATE POLICY "Staff can delete workflows"
ON public.workflows
FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'gerente'::app_role));