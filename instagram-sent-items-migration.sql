-- Create instagram_sent_items table for tracking sent posts
CREATE TABLE IF NOT EXISTS instagram_sent_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    urun_grup_id TEXT,
    urun_ismi TEXT,
    post_id TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_instagram_sent_items_user_id 
ON instagram_sent_items(user_id);

-- Enable RLS
ALTER TABLE instagram_sent_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sent items"
ON instagram_sent_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sent items"
ON instagram_sent_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sent items"
ON instagram_sent_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sent items"
ON instagram_sent_items FOR DELETE
USING (auth.uid() = user_id);
