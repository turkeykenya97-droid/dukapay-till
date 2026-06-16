-- Backfill missing shop_members rows for shops without owner entries
-- This ensures all shops have at least one active owner in shop_members table

-- Create shop_members entries for shops that have no members
-- Match shops to their "original" user based on creation order
-- For shops created before users were added: create a user entry first

BEGIN;

-- Step 1: Create missing users for shops that have no corresponding user yet
-- We'll use the shop's phone as email (same as registerShop does)
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  s.phone || '@shop.local',
  s.created_at,
  s.created_at
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_members sm
  WHERE sm.shop_id = s.id AND sm.role = 'owner' AND sm.status = 'active'
)
AND NOT EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.email = s.phone || '@shop.local'
)
ON CONFLICT DO NOTHING;

-- Step 2: Create shop_members entries with owner role for shops that are missing them
INSERT INTO public.shop_members (shop_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at)
SELECT 
  s.id,
  u.id,
  'owner',
  'active',
  s.created_at,
  s.created_at,
  s.created_at,
  s.created_at
FROM public.shops s
JOIN public.users u ON u.email = s.phone || '@shop.local'
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_members sm
  WHERE sm.shop_id = s.id AND sm.role = 'owner' AND sm.status = 'active'
)
ON CONFLICT (shop_id, user_id) DO UPDATE
SET role = 'owner', status = 'active'
WHERE shop_members.role != 'owner' OR shop_members.status != 'active';

COMMIT;
