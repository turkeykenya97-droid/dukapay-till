-- Fix get_user_shops RPC to work with JWT sessions
-- Update the function to accept user_id parameter instead of relying on auth.uid()

CREATE OR REPLACE FUNCTION public.get_user_shops(p_user_id UUID)
RETURNS TABLE (
  shop_id UUID,
  shop_name TEXT,
  owner_name TEXT,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    s.id,
    s.shop_name,
    s.owner_name,
    sm.role,
    sm.status,
    sm.created_at
  FROM public.shop_members sm
  JOIN public.shops s ON s.id = sm.shop_id
  WHERE sm.user_id = p_user_id
    AND sm.status = 'active'
  ORDER BY sm.created_at DESC;
$$;
