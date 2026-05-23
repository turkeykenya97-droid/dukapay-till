
CREATE INDEX IF NOT EXISTS idx_sales_shop_status ON public.sales(shop_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_shop_date_status ON public.sales(shop_id, sold_at DESC, payment_status);
CREATE INDEX IF NOT EXISTS idx_products_shop_name_lower ON public.products(shop_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(shop_id, stock);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_product ON public.sale_items(sale_id, product_id);
CREATE INDEX IF NOT EXISTS idx_shops_subscription ON public.shops(id, subscription_expiry, subscription_status);
