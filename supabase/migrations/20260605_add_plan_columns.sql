-- Add plan and transaction tracking columns to shops table
ALTER TABLE shops ADD COLUMN plan text DEFAULT 'basic' CHECK (plan IN ('basic', 'pro'));
ALTER TABLE shops ADD COLUMN transaction_count integer DEFAULT 0;
ALTER TABLE shops ADD COLUMN transaction_reset_date date DEFAULT CURRENT_DATE;

-- Create index for efficient querying
CREATE INDEX idx_shops_plan ON shops(plan);
CREATE INDEX idx_shops_transaction_reset ON shops(transaction_reset_date);

-- Add comment for clarity
COMMENT ON COLUMN shops.plan IS 'Subscription plan: basic (150 transactions/month) or pro (unlimited)';
COMMENT ON COLUMN shops.transaction_count IS 'Number of STK pushes sent in current month';
COMMENT ON COLUMN shops.transaction_reset_date IS 'Date when transaction_count was last reset to 0';
