-- Seed master role for all existing users so role-based RLS works correctly
-- This uses service-role context and is not subject to RLS
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'master'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = u.id
);
