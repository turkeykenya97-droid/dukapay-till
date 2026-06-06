-- Create admin_settings table
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  value_type TEXT DEFAULT 'string',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_id, key)
);

-- Create indexes
CREATE INDEX idx_admin_settings_admin_id ON admin_settings(admin_id);
CREATE INDEX idx_admin_settings_key ON admin_settings(key);

-- Insert default notification settings for admins
-- These will be populated per admin as needed
COMMENT ON TABLE admin_settings IS 'Key-value store for admin-specific settings and preferences';
