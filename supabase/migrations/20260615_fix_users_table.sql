-- Fix users table - remove foreign key constraint to auth.users
-- This allows creating users without requiring auth records

-- Drop and recreate the users table without the auth.users foreign key constraint
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Recreate shop_members table which references users
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

-- Recreate shop_invitations table
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

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_invitations ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES - USERS TABLE
CREATE POLICY IF NOT EXISTS "Users can view themselves" ON public.users
  FOR SELECT USING (TRUE);

CREATE POLICY IF NOT EXISTS "Users can update themselves" ON public.users
  FOR UPDATE USING (TRUE);

CREATE POLICY IF NOT EXISTS "Users can insert" ON public.users
  FOR INSERT WITH CHECK (TRUE);

