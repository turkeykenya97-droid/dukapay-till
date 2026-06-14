-- MULTI-USER ACCESS CONTROL SYSTEM
-- Description: Enable shop owners to invite staff members with role-based access.
-- Tables: users, shop_members, shop_invitations with RLS policies and helper functions.

-- ============================================================================
-- PHASE 1: CREATE USERS TABLE (links to Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- PHASE 2: CREATE SHOP_MEMBERS TABLE (user-shop relationship with roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shop_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')) DEFAULT 'staff',
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'active',
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_members_shop ON public.shop_members(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_user ON public.shop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_role ON public.shop_members(shop_id, role);
CREATE INDEX IF NOT EXISTS idx_shop_members_status ON public.shop_members(status);

-- ============================================================================
-- PHASE 3: CREATE SHOP_INVITATIONS TABLE (ephemeral invite tokens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shop_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff')) DEFAULT 'staff',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, email)
);

CREATE INDEX IF NOT EXISTS idx_shop_invitations_token ON public.shop_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_shop_invitations_shop ON public.shop_invitations(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_invitations_email ON public.shop_invitations(email);
CREATE INDEX IF NOT EXISTS idx_shop_invitations_expires ON public.shop_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_shop_invitations_status ON public.shop_invitations(status);

-- ============================================================================
-- PHASE 4: ENABLE RLS
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 5: RLS POLICIES - USERS TABLE
-- ============================================================================
CREATE POLICY "Users can view themselves" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update themselves" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- PHASE 6: RLS POLICIES - SHOP_MEMBERS TABLE
-- ============================================================================
CREATE POLICY "Members can view their own shop members" ON public.shop_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_members.shop_id
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
    )
  );

CREATE POLICY "Members can update shop members (owner only)" ON public.shop_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_members.shop_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.status = 'active'
    )
  );

CREATE POLICY "Owners can delete members" ON public.shop_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_members.shop_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.status = 'active'
    )
  );

-- ============================================================================
-- PHASE 7: RLS POLICIES - SHOP_INVITATIONS TABLE
-- ============================================================================
CREATE POLICY "Owners can view shop invitations" ON public.shop_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_invitations.shop_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.status = 'active'
    )
  );

CREATE POLICY "Owners can create invitations" ON public.shop_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_invitations.shop_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.status = 'active'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Owners can update invitations" ON public.shop_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_invitations.shop_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
      AND sm.status = 'active'
    )
  );

-- ============================================================================
-- PHASE 8: HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role in a shop
CREATE OR REPLACE FUNCTION public.get_user_shop_role(p_shop_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM shop_members
  WHERE shop_id = p_shop_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

-- Check if current user is owner of a shop
CREATE OR REPLACE FUNCTION public.is_shop_owner(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_members
    WHERE shop_id = p_shop_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
  );
$$;

-- Check if current user is member of a shop
CREATE OR REPLACE FUNCTION public.is_shop_member(p_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_members
    WHERE shop_id = p_shop_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Get shop's owner user ID
CREATE OR REPLACE FUNCTION public.get_shop_owner_id(p_shop_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id
  FROM shop_members
  WHERE shop_id = p_shop_id
    AND role = 'owner'
    AND status = 'active'
  LIMIT 1;
$$;

-- ============================================================================
-- PHASE 9: VERIFY MIGRATION SUCCESS
-- ============================================================================
-- Check all tables exist
DO $$
DECLARE
  users_exists BOOLEAN;
  shop_members_exists BOOLEAN;
  shop_invitations_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
    INTO users_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_members' AND table_schema = 'public')
    INTO shop_members_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_invitations' AND table_schema = 'public')
    INTO shop_invitations_exists;
  
  IF users_exists AND shop_members_exists AND shop_invitations_exists THEN
    RAISE NOTICE '✓ Multi-user access tables created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create multi-user access tables';
  END IF;
END;
$$;
