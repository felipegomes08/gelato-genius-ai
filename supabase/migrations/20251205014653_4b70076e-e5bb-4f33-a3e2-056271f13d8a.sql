-- Adicionar constraint único no telefone (ignorando nulls e strings vazias)
CREATE UNIQUE INDEX customers_phone_unique 
ON customers (phone) 
WHERE phone IS NOT NULL AND phone != '';