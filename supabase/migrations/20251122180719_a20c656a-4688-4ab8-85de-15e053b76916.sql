-- Remover o constraint antigo que não inclui "open"
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;

-- Criar novo constraint que permite "open", "pending" e "completed"
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('open', 'pending', 'completed'));