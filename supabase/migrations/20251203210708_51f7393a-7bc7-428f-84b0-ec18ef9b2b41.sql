-- Add can_access_tasks column to user_permissions table
ALTER TABLE public.user_permissions 
ADD COLUMN can_access_tasks boolean NOT NULL DEFAULT false;