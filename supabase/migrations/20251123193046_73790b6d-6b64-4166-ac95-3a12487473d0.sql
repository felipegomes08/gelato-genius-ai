-- Adicionar coluna payment_method à tabela financial_transactions
ALTER TABLE financial_transactions 
ADD COLUMN payment_method TEXT;

-- Atualizar transações existentes que são de vendas com a forma de pagamento da venda
UPDATE financial_transactions ft
SET payment_method = s.payment_method
FROM sales s
WHERE ft.reference_id = s.id 
  AND ft.category = 'Vendas'
  AND ft.transaction_type = 'income';

-- Definir valor padrão 'N/A' para transações sem forma de pagamento
UPDATE financial_transactions
SET payment_method = 'N/A'
WHERE payment_method IS NULL;