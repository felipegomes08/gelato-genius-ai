-- Adicionar coluna is_active na tabela coupons
ALTER TABLE coupons 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;