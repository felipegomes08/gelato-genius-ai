-- Tornar o campo price opcional na tabela products
ALTER TABLE public.products 
ALTER COLUMN price DROP NOT NULL;