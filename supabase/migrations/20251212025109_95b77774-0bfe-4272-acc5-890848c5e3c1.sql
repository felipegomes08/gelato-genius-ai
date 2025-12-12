
-- Create categories table with hierarchical support
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add category_id to products table
ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for faster hierarchical queries
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users with products access can view categories"
ON public.categories
FOR SELECT
USING (can_access_products_area(auth.uid()));

CREATE POLICY "Masters can create categories"
ON public.categories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update categories"
ON public.categories
FOR UPDATE
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can delete categories"
ON public.categories
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing category strings to categories table
INSERT INTO public.categories (name, created_by)
SELECT DISTINCT category, created_by
FROM public.products
WHERE category IS NOT NULL AND category != ''
ON CONFLICT DO NOTHING;

-- Update products with category_id based on existing category text
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category = c.name AND p.category IS NOT NULL AND p.category != '';
