-- Add receipt_email_sent_at column for tracking email notifications
-- This ensures we don't send duplicate emails

ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_payment_transactions_receipt_email_sent
ON payment_transactions (receipt_email_sent_at)
WHERE receipt_email_sent_at IS NOT NULL;

COMMENT ON COLUMN payment_transactions.receipt_email_sent_at IS 'Timestamp when receipt email was sent to customer';
