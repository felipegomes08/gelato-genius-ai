-- Drop existing INSERT policy
DROP POLICY IF EXISTS "users_create_completions" ON task_completions;

-- Create new INSERT policy that allows masters to complete any task
CREATE POLICY "users_create_completions" ON task_completions
  FOR INSERT
  WITH CHECK (
    completed_by = auth.uid() AND (
      has_role(auth.uid(), 'master'::app_role)
      OR
      EXISTS (
        SELECT 1 FROM task_assignees
        WHERE task_assignees.task_id = task_completions.task_id
          AND task_assignees.user_id = auth.uid()
      )
    )
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "users_delete_completions" ON task_completions;

-- Create new DELETE policy that allows masters to remove any completion
CREATE POLICY "users_delete_completions" ON task_completions
  FOR DELETE
  USING (
    completed_by = auth.uid() AND (
      has_role(auth.uid(), 'master'::app_role)
      OR
      EXISTS (
        SELECT 1 FROM task_assignees
        WHERE task_assignees.task_id = task_completions.task_id
          AND task_assignees.user_id = auth.uid()
      )
    )
  );