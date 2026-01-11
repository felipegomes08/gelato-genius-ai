-- Create storage bucket for store assets (logo and banner)
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for store-assets bucket
CREATE POLICY "Store assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can upload store assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update store assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete store assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

-- Public RLS policy for products (only active products)
CREATE POLICY "Public can view active products"
ON public.products FOR SELECT
USING (is_active = true);

-- Public RLS policy for categories (only active categories)
CREATE POLICY "Public can view active categories"
ON public.categories FOR SELECT
USING (is_active = true);

-- Public RLS policy for app_settings (menu settings only)
CREATE POLICY "Public can view menu settings"
ON public.app_settings FOR SELECT
USING (key LIKE 'menu_%' OR key LIKE 'store_%');