-- Make receipts bucket private to prevent public URL access
UPDATE storage.buckets SET public = false WHERE id = 'receipts';