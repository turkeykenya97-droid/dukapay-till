-- Add phone column to admin_users table for phone-based login
ALTER TABLE admin_users
ADD COLUMN phone TEXT UNIQUE;

-- Create index on phone for faster lookups
CREATE INDEX idx_admin_users_phone ON admin_users(phone);

-- Update admin user with phone number
UPDATE admin_users
SET phone = '0743053511'
WHERE email = 'johnmainamurage414@gmail.com';

-- If the admin user doesn't exist yet, insert it
INSERT INTO admin_users (id, email, phone, password_hash, full_name, created_at)
VALUES (
  gen_random_uuid(),
  'johnmainamurage414@gmail.com',
  '0743053511',
  '$2b$10$YJyud9HFqOUIeZwkPm5K5urUPWn7BGrgjv9YkUEloXOxt2Xq86uYW',
  'JOHN maina',
  NOW()
)
ON CONFLICT (email) DO NOTHING;
