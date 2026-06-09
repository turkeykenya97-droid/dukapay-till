-- Add analytics-related fields to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'mpesa', 'card')) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add cost price to products for stock value calculation
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;

-- Add target revenue tracking
CREATE TABLE IF NOT EXISTS public.shop_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  target_revenue NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, month)
);

CREATE INDEX IF NOT EXISTS idx_shop_targets_shop_month ON public.shop_targets(shop_id, month);

-- Create table for customer profiles (to track returning customers)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  first_purchase_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_purchase_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_spent NUMERIC(12,2) DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_shop_phone ON public.customers(shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_shop_last_purchase ON public.customers(shop_id, last_purchase_at DESC);
