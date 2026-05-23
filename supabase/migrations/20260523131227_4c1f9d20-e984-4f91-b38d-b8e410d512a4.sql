
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Revoke public execute on SECURITY DEFINER function (server-only via service role)
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) FROM authenticated;

-- Explicit deny-all policies so the linter sees policies present.
-- Service role bypasses RLS entirely; these block anon and authenticated.
CREATE POLICY "Deny all to anon and authenticated" ON public.shops
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all to anon and authenticated" ON public.products
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all to anon and authenticated" ON public.sales
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all to anon and authenticated" ON public.sale_items
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny all to anon and authenticated" ON public.subscription_payments
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
