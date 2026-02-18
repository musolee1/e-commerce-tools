-- Instagram Integration Migration
-- Run this SQL in your Supabase SQL Editor to add Instagram support

-- Add Instagram columns to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_account_id TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name IN ('instagram_access_token', 'instagram_account_id');
