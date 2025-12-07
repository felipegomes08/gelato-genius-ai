-- Add new columns to financial_transactions for expense management
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS payment_source TEXT,
ADD COLUMN IF NOT EXISTS reimbursement_status TEXT,
ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
ADD COLUMN IF NOT EXISTS installment_current INTEGER,
ADD COLUMN IF NOT EXISTS installment_total INTEGER,
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT true;

-- Add check constraints for valid values
ALTER TABLE public.financial_transactions
ADD CONSTRAINT check_payment_source CHECK (payment_source IS NULL OR payment_source IN ('personal', 'company')),
ADD CONSTRAINT check_reimbursement_status CHECK (reimbursement_status IS NULL OR reimbursement_status IN ('pending', 'reimbursed')),
ADD CONSTRAINT check_recurrence_type CHECK (recurrence_type IS NULL OR recurrence_type IN ('fixed', 'variable', 'installment'));

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for receipts bucket
CREATE POLICY "Users with financial access can upload receipts"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND can_access_financial_area(auth.uid()));

CREATE POLICY "Users with financial access can view receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'receipts' AND can_access_financial_area(auth.uid()));

CREATE POLICY "Users with financial access can delete receipts"
ON storage.objects
FOR DELETE
USING (bucket_id = 'receipts' AND can_access_financial_area(auth.uid()));

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reimbursement 
ON public.financial_transactions(reimbursement_status) 
WHERE reimbursement_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date 
ON public.financial_transactions(due_date) 
WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_parent 
ON public.financial_transactions(parent_transaction_id) 
WHERE parent_transaction_id IS NOT NULL;