-- ADD RLS POLICIES TO SHOP-SCOPED TABLES
-- Restrict access to shop data based on shop_members relationship

-- ============================================================================
-- PRODUCTS TABLE - RLS POLICY
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view products in their shops" ON public.products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = products.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can insert products in their shops" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = products.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can update products in their shops" ON public.products
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = products.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can delete products in their shops" ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = products.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

-- ============================================================================
-- SALES TABLE - RLS POLICY
-- ============================================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sales in their shops" ON public.sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = sales.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can insert sales in their shops" ON public.sales
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = sales.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can update sales in their shops" ON public.sales
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = sales.shop_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

-- ============================================================================
-- SALE_ITEMS TABLE - RLS POLICY
-- ============================================================================
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sale items from their shop sales" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      JOIN public.shop_members sm ON sm.shop_id = s.shop_id
      WHERE s.id = sale_items.sale_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can insert sale items for their shop sales" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      JOIN public.shop_members sm ON sm.shop_id = s.shop_id
      WHERE s.id = sale_items.sale_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

-- ============================================================================
-- SUBSCRIPTION_PAYMENTS TABLE - RLS POLICY (OWNER ONLY)
-- ============================================================================
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view subscription payments" ON public.subscription_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = subscription_payments.shop_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Owners can insert subscription payments" ON public.subscription_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = subscription_payments.shop_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Owners can update subscription payments" ON public.subscription_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = subscription_payments.shop_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.status = 'active'
    )
  );

-- ============================================================================
-- SHOPS TABLE - RLS POLICY (OWNER ONLY FOR SENSITIVE DATA)
-- ============================================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their shop data" ON public.shops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shops.id
        AND sm.user_id = auth.uid()
        AND sm.status = 'active'
    )
  );

CREATE POLICY "Owners can update their shop" ON public.shops
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shops.id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
        AND sm.status = 'active'
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✓ RLS policies added to shop-scoped tables';
  RAISE NOTICE '  - products: Member access via shop_members';
  RAISE NOTICE '  - sales: Member access via shop_members';
  RAISE NOTICE '  - sale_items: Member access via sales.shop_id';
  RAISE NOTICE '  - subscription_payments: Owner-only access';
  RAISE NOTICE '  - shops: Member view, owner edit';
END;
$$;
