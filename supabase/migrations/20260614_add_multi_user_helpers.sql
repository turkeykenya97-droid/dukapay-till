-- INITIALIZE SHOP OWNERS IN SHOP_MEMBERS
-- Description: Helper migration to establish owner relationships for existing shops.
-- This should be run after the multi-user access migration.

-- ============================================================================
-- MIGRATION STRATEGY
-- ============================================================================
-- Since existing shops don't have corresponding Supabase Auth users yet,
-- we provide a function that the application calls during onboarding:
-- "Claim existing shop" → Links shop to authenticated user as owner

-- ============================================================================
-- PHASE 1: CREATE FUNCTION TO LINK SHOP TO AUTH USER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_shop_as_owner(p_shop_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  shop_id UUID,
  user_id UUID,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_shop_exists BOOLEAN;
  v_already_member BOOLEAN;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, p_shop_id, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Verify shop exists
  SELECT EXISTS(SELECT 1 FROM public.shops WHERE id = p_shop_id)
    INTO v_shop_exists;
  IF NOT v_shop_exists THEN
    RETURN QUERY SELECT FALSE, 'Shop not found'::TEXT, p_shop_id, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if user already has a membership in this shop
  SELECT EXISTS(
    SELECT 1 FROM public.shop_members
    WHERE shop_id = p_shop_id AND user_id = v_user_id
  ) INTO v_already_member;
  IF v_already_member THEN
    RETURN QUERY SELECT FALSE, 'User already member of this shop'::TEXT, p_shop_id, v_user_id, NULL::TEXT;
    RETURN;
  END IF;

  -- Create or update user entry
  INSERT INTO public.users (id, email)
    VALUES (v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id))
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

  -- Create shop_members entry as owner
  INSERT INTO public.shop_members (shop_id, user_id, role, status, invited_by, invited_at, accepted_at)
    VALUES (p_shop_id, v_user_id, 'owner', 'active', v_user_id, NOW(), NOW())
    ON CONFLICT (shop_id, user_id) DO UPDATE
      SET role = 'owner', status = 'active', updated_at = NOW();

  RETURN QUERY
    SELECT TRUE, 'Successfully claimed shop as owner'::TEXT, p_shop_id, v_user_id, 'owner'::TEXT;
END;
$$;

-- ============================================================================
-- PHASE 2: CREATE FUNCTION FOR OWNER TO INVITE STAFF
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_shop_invitation(
  p_shop_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'staff'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  invitation_token TEXT,
  invite_url TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_base_url TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Check if current user is owner of the shop
  v_is_owner := public.is_shop_owner(p_shop_id);
  IF NOT v_is_owner THEN
    RETURN QUERY SELECT FALSE, 'Only shop owners can create invitations'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + INTERVAL '7 days';
  v_base_url := current_setting('app.invite_base_url', TRUE) || '/invite/';

  -- Insert invitation
  INSERT INTO public.shop_invitations (
    shop_id,
    invitation_token,
    email,
    role,
    created_by,
    expires_at
  ) VALUES (
    p_shop_id,
    v_token,
    p_email,
    p_role,
    v_user_id,
    v_expires_at
  )
  ON CONFLICT (shop_id, email) DO UPDATE
    SET invitation_token = v_token,
        expires_at = v_expires_at,
        status = 'pending',
        updated_at = NOW()
  RETURNING invitation_token INTO v_token;

  RETURN QUERY
    SELECT TRUE, 'Invitation created successfully'::TEXT, v_token, v_base_url || v_token, v_expires_at;
END;
$$;

-- ============================================================================
-- PHASE 3: CREATE FUNCTION TO ACCEPT INVITATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_shop_invitation(
  p_invitation_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  shop_id UUID,
  user_id UUID,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_shop_id UUID;
  v_role TEXT;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Fetch invitation details
  SELECT shop_id, role, status, expires_at, email
    INTO v_shop_id, v_role, v_status, v_expires_at, v_email
    FROM public.shop_invitations
    WHERE invitation_token = p_invitation_token
    LIMIT 1;

  IF v_shop_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or expired'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'Invitation already accepted or revoked'::TEXT, v_shop_id, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_expires_at < NOW() THEN
    UPDATE public.shop_invitations
      SET status = 'expired', updated_at = NOW()
      WHERE invitation_token = p_invitation_token;
    RETURN QUERY SELECT FALSE, 'Invitation has expired'::TEXT, v_shop_id, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Verify invitation email matches authenticated user email
  IF v_email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Invitation email does not match authenticated user'::TEXT, v_shop_id, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Create/update user entry
  INSERT INTO public.users (id, email)
    VALUES (v_user_id, v_email)
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

  -- Create shop_members entry
  INSERT INTO public.shop_members (shop_id, user_id, role, status, invited_by, invited_at, accepted_at)
    SELECT v_shop_id, v_user_id, v_role, 'active', created_by, invited_at, NOW()
    FROM public.shop_invitations
    WHERE invitation_token = p_invitation_token
    ON CONFLICT (shop_id, user_id) DO UPDATE
      SET status = 'active', role = v_role, accepted_at = NOW();

  -- Mark invitation as accepted
  UPDATE public.shop_invitations
    SET status = 'accepted', accepted_by = v_user_id, accepted_at = NOW()
    WHERE invitation_token = p_invitation_token;

  RETURN QUERY
    SELECT TRUE, 'Invitation accepted successfully'::TEXT, v_shop_id, v_user_id, v_role;
END;
$$;

-- ============================================================================
-- PHASE 4: CREATE FUNCTION TO GET SHOPS FOR CURRENT USER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_shops()
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
  WHERE sm.user_id = auth.uid()
    AND sm.status = 'active'
  ORDER BY sm.created_at DESC;
$$;

-- ============================================================================
-- PHASE 5: VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✓ Multi-user helper functions created successfully';
  RAISE NOTICE '  - claim_shop_as_owner(shop_id): Link existing shop to authenticated user as owner';
  RAISE NOTICE '  - create_shop_invitation(shop_id, email, role): Generate invite link for staff';
  RAISE NOTICE '  - accept_shop_invitation(token): Accept invite and join shop as staff';
  RAISE NOTICE '  - get_user_shops(): Get all shops for current user';
END;
$$;
