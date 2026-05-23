
-- SHOPS
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_valid_until TIMESTAMPTZ,
  payhero_channel_id INTEGER,
  till_number TEXT,
  till_type TEXT CHECK (till_type IN ('paybill', 'till', 'bank')),
  trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_expiry TIMESTAMPTZ NOT NULL,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('trial', 'active', 'expired')) DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX products_shop_lower_name_unique ON public.products (shop_id, LOWER(name));

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
  customer_phone TEXT NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  payhero_reference TEXT,
  payhero_checkout_request_id TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SALE ITEMS
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price > 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total > 0)
);

-- SUBSCRIPTION PAYMENTS
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payhero_reference TEXT,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_products_shop_stock ON public.products(shop_id, stock);
CREATE INDEX idx_products_shop_name ON public.products(shop_id, name);
CREATE INDEX idx_sales_shop_sold ON public.sales(shop_id, sold_at DESC);
CREATE INDEX idx_sales_checkout_request ON public.sales(payhero_checkout_request_id);
CREATE INDEX idx_sales_reference ON public.sales(payhero_reference);
CREATE INDEX idx_shops_expiry ON public.shops(subscription_expiry);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_subscription_payments_shop ON public.subscription_payments(shop_id, paid_at DESC);
CREATE INDEX idx_subscription_payments_reference ON public.subscription_payments(payhero_reference);

-- ATOMIC STOCK DECREMENT
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;
  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
  END IF;
  new_stock := current_stock - p_quantity;
  UPDATE public.products SET stock = new_stock, updated_at = NOW() WHERE id = p_product_id;
  RETURN new_stock;
END;
$$;

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shops_updated_at BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ROW LEVEL SECURITY: deny-by-default. The service role (used by validated
-- server functions) bypasses RLS; no anon/authenticated access is granted.
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
