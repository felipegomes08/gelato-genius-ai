-- Create app_settings table for general configurations
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can view settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Only masters can modify settings
CREATE POLICY "Masters can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can update settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'master'::app_role))
WITH CHECK (has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "Masters can delete settings"
ON public.app_settings
FOR DELETE
USING (has_role(auth.uid(), 'master'::app_role));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES 
('coupon_message_5', '"| CUPOM CASHBACK | \n\nOlá {nome}! Amei te atender hoje!\nUhuu! Você garantiu R${valor} de cashback para usar na Churrosteria! \nUse na sua próxima compra dentro de 7 dias.\nCorre pra aproveitar e experimentar uma delícia nova!  Qualquer dúvida é só chamar! \nValidade: {validade}\nEle pode ser utilizado em compras a partir de R${minimo}.\nUse e já garante um novo cupom. Te vejo em breve!"'),
('coupon_message_10', '"| CUPOM CASHBACK | \n\nOlá {nome}! Amei te atender hoje!\nUhuu! Você garantiu R${valor} de cashback para usar na Churrosteria!\nUse na sua próxima compra dentro de 7 dias.\nCorre pra aproveitar e experimentar uma delícia nova! Qualquer dúvida é só chamar! \nValidade: {validade}\nEle pode ser utilizado em compras a partir de R${minimo}.\nUse e já garanta um novo cupom. Te vejo em breve!"'),
('coupon_rules', '{"threshold": 50, "lowValue": 5, "highValue": 10, "minPurchase5": 30, "minPurchase10": 50}');