-- Allow users with sales access to create financial transactions for sales
CREATE POLICY "Users with sales access can create sale transactions"
ON public.financial_transactions
FOR INSERT
WITH CHECK (
  can_access_sales_area(auth.uid()) 
  AND transaction_type = 'income' 
  AND category = 'Vendas'
  AND created_by = auth.uid()
);