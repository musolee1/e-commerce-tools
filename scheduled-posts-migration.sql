-- ============================================
-- INSTAGRAM SCHEDULED POSTS
-- ============================================
-- Bu tablo planlanmış Instagram postlarını saklar

CREATE TABLE IF NOT EXISTS instagram_scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    image_urls JSONB NOT NULL,
    caption TEXT,
    location_id TEXT,
    product_id TEXT,
    urun_grup_id TEXT,
    urun_ismi TEXT,
    product_name TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    post_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON instagram_scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled ON instagram_scheduled_posts(status, scheduled_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON instagram_scheduled_posts(scheduled_at);

-- Enable RLS
ALTER TABLE instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scheduled posts"
ON instagram_scheduled_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled posts"
ON instagram_scheduled_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
ON instagram_scheduled_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
ON instagram_scheduled_posts FOR DELETE
USING (auth.uid() = user_id);
