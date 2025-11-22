-- ============================================================================
-- ETAPA 1: Criar Funções Helper de Permissões por Módulo
-- ============================================================================

-- Função: Verificar se usuário pode acessar área de Vendas/Comandas
CREATE OR REPLACE FUNCTION public.can_access_sales_area(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'master'::app_role) OR
    EXISTS (
      SELECT 1 
      FROM public.user_permissions 
      WHERE user_id = _user_id AND can_access_sales = true
    )
$$;

-- Função: Verificar se usuário pode acessar área de Produtos
CREATE OR REPLACE FUNCTION public.can_access_products_area(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'master'::app_role) OR
    EXISTS (
      SELECT 1 
      FROM public.user_permissions 
      WHERE user_id = _user_id AND can_access_products = true
    )
$$;

-- Função: Verificar se usuário pode acessar área de Estoque
CREATE OR REPLACE FUNCTION public.can_access_stock_area(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'master'::app_role) OR
    EXISTS (
      SELECT 1 
      FROM public.user_permissions 
      WHERE user_id = _user_id AND can_access_stock = true
    )
$$;

-- Função: Verificar se usuário pode acessar área Financeira
CREATE OR REPLACE FUNCTION public.can_access_financial_area(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'master'::app_role) OR
    EXISTS (
      SELECT 1 
      FROM public.user_permissions 
      WHERE user_id = _user_id AND can_access_financial = true
    )
$$;

-- Função: Verificar se usuário pode acessar Configurações
CREATE OR REPLACE FUNCTION public.can_access_settings_area(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'master'::app_role) OR
    EXISTS (
      SELECT 1 
      FROM public.user_permissions 
      WHERE user_id = _user_id AND can_access_settings = true
    )
$$;

-- ============================================================================
-- ETAPA 2: Atualizar Políticas RLS da Tabela SALES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can create sales" ON sales;
DROP POLICY IF EXISTS "Anyone authenticated can view sales" ON sales;
DROP POLICY IF EXISTS "Masters can manage sales" ON sales;

CREATE POLICY "Users with sales access can view sales"
ON sales FOR SELECT
TO authenticated
USING (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can create sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can update sales"
ON sales FOR UPDATE
TO authenticated
USING (can_access_sales_area(auth.uid()))
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can delete sales"
ON sales FOR DELETE
TO authenticated
USING (can_access_sales_area(auth.uid()));

-- ============================================================================
-- ETAPA 3: Atualizar Políticas RLS da Tabela SALE_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can create sale items" ON sale_items;
DROP POLICY IF EXISTS "Anyone authenticated can view sale items" ON sale_items;

CREATE POLICY "Users with sales access can view sale items"
ON sale_items FOR SELECT
TO authenticated
USING (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can create sale items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can update sale items"
ON sale_items FOR UPDATE
TO authenticated
USING (can_access_sales_area(auth.uid()))
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can delete sale items"
ON sale_items FOR DELETE
TO authenticated
USING (can_access_sales_area(auth.uid()));

-- ============================================================================
-- ETAPA 4: Atualizar Políticas RLS da Tabela COUPONS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can create coupons" ON coupons;
DROP POLICY IF EXISTS "Anyone authenticated can view coupons" ON coupons;
DROP POLICY IF EXISTS "Masters can manage coupons" ON coupons;

CREATE POLICY "Users with sales access can view coupons"
ON coupons FOR SELECT
TO authenticated
USING (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can create coupons"
ON coupons FOR INSERT
TO authenticated
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can update coupons"
ON coupons FOR UPDATE
TO authenticated
USING (can_access_sales_area(auth.uid()))
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can delete coupons"
ON coupons FOR DELETE
TO authenticated
USING (can_access_sales_area(auth.uid()));

-- ============================================================================
-- ETAPA 5: Atualizar Políticas RLS da Tabela PRODUCTS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can view products" ON products;
DROP POLICY IF EXISTS "Masters can manage products" ON products;

CREATE POLICY "Users with products access can view products"
ON products FOR SELECT
TO authenticated
USING (can_access_products_area(auth.uid()));

CREATE POLICY "Users with products access can create products"
ON products FOR INSERT
TO authenticated
WITH CHECK (can_access_products_area(auth.uid()));

CREATE POLICY "Users with products access can update products"
ON products FOR UPDATE
TO authenticated
USING (can_access_products_area(auth.uid()))
WITH CHECK (can_access_products_area(auth.uid()));

CREATE POLICY "Users with products access can delete products"
ON products FOR DELETE
TO authenticated
USING (can_access_products_area(auth.uid()));

-- ============================================================================
-- ETAPA 6: Atualizar Políticas RLS da Tabela STOCK_MOVEMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can create stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Anyone authenticated can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Masters can manage stock movements" ON stock_movements;

CREATE POLICY "Users with stock access can view stock movements"
ON stock_movements FOR SELECT
TO authenticated
USING (can_access_stock_area(auth.uid()));

CREATE POLICY "Users with stock access can create stock movements"
ON stock_movements FOR INSERT
TO authenticated
WITH CHECK (can_access_stock_area(auth.uid()));

CREATE POLICY "Users with stock access can update stock movements"
ON stock_movements FOR UPDATE
TO authenticated
USING (can_access_stock_area(auth.uid()))
WITH CHECK (can_access_stock_area(auth.uid()));

CREATE POLICY "Users with stock access can delete stock movements"
ON stock_movements FOR DELETE
TO authenticated
USING (can_access_stock_area(auth.uid()));

-- ============================================================================
-- ETAPA 7: Atualizar Políticas RLS da Tabela FINANCIAL_TRANSACTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can create transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Anyone authenticated can view transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Masters can manage transactions" ON financial_transactions;

CREATE POLICY "Users with financial access can view transactions"
ON financial_transactions FOR SELECT
TO authenticated
USING (can_access_financial_area(auth.uid()));

CREATE POLICY "Users with financial access can create transactions"
ON financial_transactions FOR INSERT
TO authenticated
WITH CHECK (can_access_financial_area(auth.uid()));

CREATE POLICY "Users with financial access can update transactions"
ON financial_transactions FOR UPDATE
TO authenticated
USING (can_access_financial_area(auth.uid()))
WITH CHECK (can_access_financial_area(auth.uid()));

CREATE POLICY "Users with financial access can delete transactions"
ON financial_transactions FOR DELETE
TO authenticated
USING (can_access_financial_area(auth.uid()));

-- ============================================================================
-- ETAPA 8: Atualizar Políticas RLS da Tabela CUSTOMERS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone authenticated can create customers" ON customers;
DROP POLICY IF EXISTS "Anyone authenticated can view customers" ON customers;
DROP POLICY IF EXISTS "Masters can manage customers" ON customers;

CREATE POLICY "Users with sales access can view customers"
ON customers FOR SELECT
TO authenticated
USING (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can create customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can update customers"
ON customers FOR UPDATE
TO authenticated
USING (can_access_sales_area(auth.uid()))
WITH CHECK (can_access_sales_area(auth.uid()));

CREATE POLICY "Users with sales access can delete customers"
ON customers FOR DELETE
TO authenticated
USING (can_access_sales_area(auth.uid()));