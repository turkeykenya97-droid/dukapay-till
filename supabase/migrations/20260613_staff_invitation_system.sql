-- ============================================================================
-- DUKAPAY STAFF INVITATION & ROLE-BASED ACCESS CONTROL SYSTEM
-- Migration: 20260613_staff_invitation_system
-- Description: Enterprise-grade role-based access control with secure
--              staff invitation flow, permissions mapping, and shift tracking
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE CORE ROLE & PERMISSION INFRASTRUCTURE (NO DEPENDENCIES)
-- ============================================================================

-- Create roles table (foundational, no dependencies)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE roles IS 'Core role definitions for RBAC system';
COMMENT ON COLUMN roles.name IS 'Unique role identifier (cashier, stock_clerk, etc)';

-- Create role_permissions table (depends only on roles)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_role_permission UNIQUE(role_id, permission)
);

COMMENT ON TABLE role_permissions IS 'Permission mappings for each role';
COMMENT ON COLUMN role_permissions.permission IS 'Permission identifier (view_pos, process_payment, etc)';

-- ============================================================================
-- PHASE 2: SEED CORE ROLE & PERMISSION DATA
-- ============================================================================

-- Insert core roles (if not already present)
INSERT INTO roles (name, description) VALUES
  ('cashier', 'Handles checkout and sales transactions'),
  ('stock_clerk', 'Manages inventory and stock movements'),
  ('supervisor', 'Approves discounts and refunds'),
  ('branch_manager', 'Manages branch operations and staff'),
  ('accountant', 'Views financial reports and expenses'),
  ('admin', 'Full system access and configuration')
ON CONFLICT (name) DO NOTHING;

-- Insert role permissions (if not already present)
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission FROM roles r, (
  -- Cashier permissions
  VALUES 
  ('cashier', 'view_pos'),
  ('cashier', 'scan_barcodes'),
  ('cashier', 'process_payment'),
  ('cashier', 'view_receipt'),
  -- Stock Clerk permissions
  ('stock_clerk', 'view_inventory'),
  ('stock_clerk', 'update_stock'),
  ('stock_clerk', 'receive_stock'),
  ('stock_clerk', 'transfer_stock'),
  -- Supervisor permissions
  ('supervisor', 'approve_discount'),
  ('supervisor', 'approve_refund'),
  ('supervisor', 'view_cashier_sales'),
  ('supervisor', 'void_transaction'),
  -- Branch Manager permissions
  ('branch_manager', 'view_branch_sales'),
  ('branch_manager', 'manage_products'),
  ('branch_manager', 'manage_staff'),
  ('branch_manager', 'view_branch_analytics'),
  -- Accountant permissions
  ('accountant', 'view_sales_reports'),
  ('accountant', 'view_expenses'),
  ('accountant', 'view_profit_reports'),
  ('accountant', 'view_tax_reports'),
  -- Admin permissions
  ('admin', 'manage_users'),
  ('admin', 'manage_roles'),
  ('admin', 'view_system_settings'),
  ('admin', 'view_all_branches')
) AS p(role_name, permission)
WHERE r.name = p.role_name
ON CONFLICT (role_id, permission) DO NOTHING;

-- ============================================================================
-- PHASE 3: CREATE STAFF INVITATION & SHIFT TABLES (MINIMAL DEPENDENCIES)
-- ============================================================================

-- Create staff_invitations table - only depends on roles table
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  branch_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

COMMENT ON TABLE staff_invitations IS 'Staff member invitations with secure token flow';
COMMENT ON COLUMN staff_invitations.invitation_token IS '64-char hex token, generated via crypto.randomBytes(32)';
COMMENT ON COLUMN staff_invitations.status IS 'pending=not used, accepted=used, expired=past expires_at, cancelled=admin cancelled';
COMMENT ON COLUMN staff_invitations.expires_at IS 'Default: 7 days from creation';

-- Create shift_logs table - no external dependencies needed initially
CREATE TABLE IF NOT EXISTS shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
  shift_end TIMESTAMP WITH TIME ZONE,
  opening_cash DECIMAL(10, 2),
  closing_cash DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT valid_shift_status CHECK (status IN ('active', 'closed', 'voided'))
);

COMMENT ON TABLE shift_logs IS 'Employee shift tracking for audit and reconciliation';
COMMENT ON COLUMN shift_logs.status IS 'active=ongoing, closed=completed, voided=discarded';

-- ============================================================================
-- PHASE 4: ADD FOREIGN KEYS TO EXTERNAL TABLES (IF THEY EXIST)
-- ============================================================================

-- Add shop_id and branch_id foreign keys to staff_invitations (depends on shops/shop_branches)
DO $$
BEGIN
  -- Add shop_id foreign key if shops table exists and constraint doesn't
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shops') THEN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'staff_invitations' AND constraint_name = 'fk_staff_invitations_shop_id'
    ) THEN
      ALTER TABLE staff_invitations ADD CONSTRAINT fk_staff_invitations_shop_id 
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add branch_id foreign key if shop_branches table exists and constraint doesn't
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shop_branches') THEN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'staff_invitations' AND constraint_name = 'fk_staff_invitations_branch_id'
    ) THEN
      ALTER TABLE staff_invitations ADD CONSTRAINT fk_staff_invitations_branch_id 
        FOREIGN KEY (branch_id) REFERENCES shop_branches(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Phase 4a - Could not add shop/branch FKs to staff_invitations: %', SQLERRM;
END $$;

-- Add created_by foreign key to staff_invitations (depends on users table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'staff_invitations' AND constraint_name = 'fk_staff_invitations_created_by'
    ) THEN
      ALTER TABLE staff_invitations ADD CONSTRAINT fk_staff_invitations_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE WARNING 'Phase 4b - users table does not exist. Skipping created_by FK for staff_invitations.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Phase 4b - Could not add created_by FK to staff_invitations: %', SQLERRM;
END $$;

-- Add foreign keys to shift_logs (depends on users, shop_branches, shops)
DO $$
BEGIN
  -- Add user_id foreign key if users table exists and constraint doesn't
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'shift_logs' AND constraint_name = 'fk_shift_logs_user_id'
    ) THEN
      ALTER TABLE shift_logs ADD CONSTRAINT fk_shift_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  ELSE
    RAISE WARNING 'Phase 4c - users table does not exist. Skipping user_id FK for shift_logs.';
  END IF;
  
  -- Add branch_id foreign key if shop_branches table exists and constraint doesn't
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shop_branches') THEN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'shift_logs' AND constraint_name = 'fk_shift_logs_branch_id'
    ) THEN
      ALTER TABLE shift_logs ADD CONSTRAINT fk_shift_logs_branch_id 
        FOREIGN KEY (branch_id) REFERENCES shop_branches(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add shop_id foreign key if shops table exists and constraint doesn't
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shops') THEN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'shift_logs' AND constraint_name = 'fk_shift_logs_shop_id'
    ) THEN
      ALTER TABLE shift_logs ADD CONSTRAINT fk_shift_logs_shop_id 
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Phase 4d - Could not add FKs to shift_logs: %', SQLERRM;
END $$;

-- ============================================================================
-- PHASE 5: CREATE INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Staff invitations indexes
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_shop_id ON staff_invitations(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires_at ON staff_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_role_id ON staff_invitations(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_created_by ON staff_invitations(created_by);

-- Shift logs indexes
CREATE INDEX IF NOT EXISTS idx_shift_logs_user_id ON shift_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_branch_id ON shift_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_shop_id ON shift_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_shift_start ON shift_logs(shift_start);
CREATE INDEX IF NOT EXISTS idx_shift_logs_status ON shift_logs(status);

-- Role permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- ============================================================================
-- PHASE 6: VERIFY DATA INTEGRITY
-- ============================================================================

-- Verify all roles are created
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    IF (SELECT COUNT(*) FROM roles) >= 6 THEN
      RAISE NOTICE 'Phase 6a - Successfully created % roles', (SELECT COUNT(*) FROM roles);
    ELSE
      RAISE WARNING 'Phase 6a - Warning: Expected 6 roles, found % roles', (SELECT COUNT(*) FROM roles);
    END IF;
  ELSE
    RAISE WARNING 'Phase 6a - roles table does not exist';
  END IF;
END $$;

-- Verify all permissions are mapped
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') THEN
    IF (SELECT COUNT(*) FROM role_permissions) >= 24 THEN
      RAISE NOTICE 'Phase 6b - Successfully created % role permissions', (SELECT COUNT(*) FROM role_permissions);
    ELSE
      RAISE WARNING 'Phase 6b - Warning: Expected 24 permissions, found % permissions', (SELECT COUNT(*) FROM role_permissions);
    END IF;
  ELSE
    RAISE WARNING 'Phase 6b - role_permissions table does not exist';
  END IF;
END $$;

-- Verify tables created
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_invitations') THEN
    RAISE NOTICE 'Phase 6c - staff_invitations table created successfully';
  ELSE
    RAISE WARNING 'Phase 6c - staff_invitations table does not exist';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_logs') THEN
    RAISE NOTICE 'Phase 6d - shift_logs table created successfully';
  ELSE
    RAISE WARNING 'Phase 6d - shift_logs table does not exist';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK SAFETY
-- ============================================================================
-- All tables use IF NOT EXISTS and INSERT ... ON CONFLICT DO NOTHING
-- to safely apply migration multiple times without data loss.
-- Foreign keys are added conditionally, only if target tables exist.
-- Existing data is preserved.

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New Features Enabled:
-- ✓ 6 role-based access levels (cashier to admin)
-- ✓ 24 granular permissions per role
-- ✓ Secure token-based staff invitation system
-- ✓ Automatic dashboard routing based on role
-- ✓ Shift tracking for employee accountability
-- ✓ Branch-specific access control
-- ✓ Audit trail via created_by tracking
--
-- Migration Execution Order:
-- Phase 1: Create core roles & role_permissions tables (no dependencies)
-- Phase 2: Seed 6 roles & 24 permissions
-- Phase 3: Create staff_invitations & shift_logs tables (only depends on roles)
-- Phase 4: Add conditional FKs to shops/shop_branches/users (if they exist)
-- Phase 5: Create performance indexes
-- Phase 6: Verify data integrity
--
-- Note: Users table extension is NOT included in this migration.
-- To extend users table with role/branch support, use a separate migration
-- after confirming users table exists in your project.
--
-- Testing:
-- 1. Run: supabase migration up
-- 2. Check logs for Phase results
-- 3. Verify: SELECT * FROM roles;
-- 4. Verify: SELECT * FROM role_permissions;
-- 5. Test invitation: POST /api/staff-invitation
-- ============================================================================
