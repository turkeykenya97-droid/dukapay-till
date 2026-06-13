-- Add barcode fields to products
ALTER TABLE products ADD COLUMN barcode VARCHAR(50) UNIQUE;
ALTER TABLE products ADD COLUMN barcode_type VARCHAR(20) DEFAULT 'ean13';

-- Add receipt fields to sales
ALTER TABLE sales ADD COLUMN receipt_qr_code TEXT;
ALTER TABLE sales ADD COLUMN receipt_generated_at TIMESTAMP DEFAULT NOW();

-- Create receipt templates table
CREATE TABLE IF NOT EXISTS public.receipt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Default',
  header_text TEXT,
  footer_text TEXT,
  logo_url TEXT,
  show_qr_code BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  show_cashier_name BOOLEAN DEFAULT false,
  paper_width INTEGER DEFAULT 80,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shop branches table (for multi-location support)
CREATE TABLE IF NOT EXISTS public.shop_branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add shop_branch_id to sales to track which branch made the sale
ALTER TABLE sales ADD COLUMN shop_branch_id UUID REFERENCES shop_branches(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_receipt_templates_shop_id ON receipt_templates(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_branches_shop_id ON shop_branches(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_branch_id ON sales(shop_branch_id);
