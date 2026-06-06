-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create index on email for faster lookups
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Insert initial admin user (password: admin@dukapos - hash this properly in production)
-- This is just a placeholder - in production you should create admins through a separate process
INSERT INTO admin_users (email, password_hash, full_name)
VALUES ('admin@dukapos.com', '$2a$10$S9/Lh3sK8ZfF5D0q8Q0YAuNV9.WN/QC5N5Z8K4mK4mK4mK4mK4mK4', 'DukaPOS Admin')
ON CONFLICT (email) DO NOTHING;
