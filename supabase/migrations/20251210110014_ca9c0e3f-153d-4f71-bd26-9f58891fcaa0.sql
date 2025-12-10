-- Create task_assignees junction table for multiple assignees per task
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Masters can manage all task assignees
CREATE POLICY "masters_manage_task_assignees"
ON public.task_assignees
FOR ALL
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Users can view their own task assignments
CREATE POLICY "users_view_own_assignments"
ON public.task_assignees
FOR SELECT
USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);

-- Migrate existing assigned_to data to task_assignees
INSERT INTO public.task_assignees (task_id, user_id)
SELECT id, assigned_to FROM public.tasks WHERE assigned_to IS NOT NULL;

-- Update task_completions RLS to allow completion by any assignee
DROP POLICY IF EXISTS "users_create_completions" ON public.task_completions;
CREATE POLICY "users_create_completions"
ON public.task_completions
FOR INSERT
WITH CHECK (
  completed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.task_assignees 
    WHERE task_id = task_completions.task_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "users_delete_completions" ON public.task_completions;
CREATE POLICY "users_delete_completions"
ON public.task_completions
FOR DELETE
USING (
  completed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.task_assignees 
    WHERE task_id = task_completions.task_id AND user_id = auth.uid()
  )
);

-- Update tasks RLS policy for users to view tasks they are assigned to
DROP POLICY IF EXISTS "users_view_own_tasks" ON public.tasks;
CREATE POLICY "users_view_own_tasks"
ON public.tasks
FOR SELECT
USING (
  assigned_to = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.task_assignees 
    WHERE task_id = tasks.id AND user_id = auth.uid()
  )
);