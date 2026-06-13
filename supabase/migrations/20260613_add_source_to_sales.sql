-- Add source column to sales table to track QR code vs POS payments
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS source TEXT 
CHECK (source IN ('pos', 'qr_code')) 
DEFAULT 'pos';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_sales_source ON sales(source);
