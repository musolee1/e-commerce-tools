-- Add Instagram Location ID to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS instagram_location_id TEXT;

-- If you previously added instagram_location_name, rename it:
-- ALTER TABLE user_settings RENAME COLUMN instagram_location_name TO instagram_location_id;
