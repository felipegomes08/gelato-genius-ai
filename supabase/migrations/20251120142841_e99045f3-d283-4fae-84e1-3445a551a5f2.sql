-- Add is_active column to profiles table to allow soft deletion
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Update RLS policy to allow masters to update is_active status
CREATE POLICY "Masters can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'master'::app_role));

-- Masters can also delete profiles (hard delete if needed)
CREATE POLICY "Masters can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));