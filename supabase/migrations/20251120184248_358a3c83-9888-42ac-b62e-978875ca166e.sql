-- Fix RLS policy for user_roles to allow masters to insert
-- Drop existing ALL policy and create separate policies for better control
DROP POLICY IF EXISTS "Masters can manage roles" ON user_roles;

-- Allow masters to insert roles for any user
CREATE POLICY "Masters can insert roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Allow masters to update roles
CREATE POLICY "Masters can update roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Allow masters to delete roles
CREATE POLICY "Masters can delete roles"
ON user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master'::app_role));

-- Fix user_permissions policies similarly
DROP POLICY IF EXISTS "Masters can manage permissions" ON user_permissions;

-- Allow masters to insert permissions for any user
CREATE POLICY "Masters can insert permissions"
ON user_permissions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Allow masters to update permissions
CREATE POLICY "Masters can update permissions"
ON user_permissions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

-- Allow masters to delete permissions
CREATE POLICY "Masters can delete permissions"
ON user_permissions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'master'::app_role));