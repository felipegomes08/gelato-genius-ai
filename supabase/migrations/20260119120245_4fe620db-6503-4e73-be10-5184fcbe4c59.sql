-- Add sort_order column to products table for menu ordering
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order);

-- Update existing products with sequential sort order based on current name order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM public.products
)
UPDATE public.products p
SET sort_order = n.rn
FROM numbered n
WHERE p.id = n.id;