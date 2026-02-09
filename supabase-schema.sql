-- Swass Telegram Bot - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. TELEGRAM LOGS TABLE
-- ============================================
-- Bu tablo Telegram'a gönderilen ürünlerin geçmişini saklar

CREATE TABLE IF NOT EXISTS telegram_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  stock_count INTEGER NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS telegram_logs_user_id_idx ON telegram_logs(user_id);
CREATE INDEX IF NOT EXISTS telegram_logs_sent_at_idx ON telegram_logs(sent_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE telegram_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own logs
CREATE POLICY "Users can view their own logs"
  ON telegram_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON telegram_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. USER SETTINGS TABLE
-- ============================================
-- Bu tablo her kullanıcının kendi Telegram bot ayarlarını saklar

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  site_url TEXT DEFAULT 'https://swassonline.com/',
  trendyol_target_url TEXT,
  trendyol_brand_slug TEXT DEFAULT 'swass',
  replace_genel_markalar BOOLEAN DEFAULT false,
  ikas_client_id TEXT,
  ikas_client_secret TEXT,
  ikas_store_name TEXT DEFAULT 'swassonline',
  ikas_excel_mapping JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own settings
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. TRENDYOL PRODUCTS TABLE
-- ============================================
-- Bu tablo Trendyol'dan çekilen ürünleri saklar

CREATE TABLE IF NOT EXISTS trendyol_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  normal_price TEXT,
  discounted_price TEXT,
  product_link TEXT NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_link)
);

-- Indexes
CREATE INDEX IF NOT EXISTS trendyol_products_user_id_idx ON trendyol_products(user_id);
CREATE INDEX IF NOT EXISTS trendyol_products_scraped_at_idx ON trendyol_products(scraped_at DESC);

-- Row Level Security
ALTER TABLE trendyol_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trendyol products"
  ON trendyol_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trendyol products"
  ON trendyol_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trendyol products"
  ON trendyol_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trendyol products"
  ON trendyol_products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. IKAS PRODUCTS TABLE
-- ============================================
-- Bu tablo İKAS'tan çekilen ürünleri saklar

CREATE TABLE IF NOT EXISTS ikas_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  normal_price NUMERIC,
  discounted_price NUMERIC,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, variant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ikas_products_user_id_idx ON ikas_products(user_id);
CREATE INDEX IF NOT EXISTS ikas_products_fetched_at_idx ON ikas_products(fetched_at DESC);

-- Row Level Security
ALTER TABLE ikas_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ikas products"
  ON ikas_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ikas products"
  ON ikas_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ikas products"
  ON ikas_products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- MATCHING FILES - Eşleştirme Dosyaları
-- ============================================
-- Bu tablo Trendyol ve İKAS ürün eşleştirmelerini saklar

CREATE TABLE IF NOT EXISTS matching_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trendyol_link TEXT NOT NULL,
  ikas_sku TEXT,
  ikas_barcode TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS matching_data_user_id_idx ON matching_data(user_id);
CREATE INDEX IF NOT EXISTS matching_data_trendyol_link_idx ON matching_data(trendyol_link);

-- Row Level Security
ALTER TABLE matching_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own matching data"
  ON matching_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own matching data"
  ON matching_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matching data"
  ON matching_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matching data"
  ON matching_data FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- IKAS GROUPED PRODUCTS - Gruplandırılmış Ürünler
-- ============================================
-- Bu tablo Excel'den yüklenen ve gruplandırılmış ürünleri saklar

CREATE TABLE IF NOT EXISTS ikas_grouped_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  urun_grup_id TEXT NOT NULL,
  urun_ismi TEXT NOT NULL,
  varyant_degerler TEXT NOT NULL,  -- "S, M, L, XL" formatında
  resim_urlleri TEXT,               -- ";" ile ayrılmış URL'ler
  toplam_stok INTEGER DEFAULT 0,
  stok_kodu TEXT,                   -- SKU'dan ilk "-" işaretine kadar (örn: SWS9072)
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, urun_grup_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ikas_grouped_products_user_id_idx ON ikas_grouped_products(user_id);
CREATE INDEX IF NOT EXISTS ikas_grouped_products_uploaded_at_idx ON ikas_grouped_products(uploaded_at DESC);

-- Row Level Security
ALTER TABLE ikas_grouped_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own grouped products"
  ON ikas_grouped_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grouped products"
  ON ikas_grouped_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grouped products"
  ON ikas_grouped_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grouped products"
  ON ikas_grouped_products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SITE PRODUCTS - Site Ürünleri
-- ============================================
-- Bu tablo sitenizden çekilen ürün verilerini saklar

CREATE TABLE IF NOT EXISTS site_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trendyol_key TEXT NOT NULL,
  barcode TEXT,
  site_price NUMERIC,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trendyol_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS site_products_user_id_idx ON site_products(user_id);
CREATE INDEX IF NOT EXISTS site_products_trendyol_key_idx ON site_products(trendyol_key);
CREATE INDEX IF NOT EXISTS site_products_fetched_at_idx ON site_products(fetched_at DESC);

-- Row Level Security
ALTER TABLE site_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own site products"
  ON site_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own site products"
  ON site_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own site products"
  ON site_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own site products"
  ON site_products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Tabloların oluştuğunu doğrulamak için:

-- Show all tables
SELECT table_name, obj_description(oid) as description
FROM information_schema.tables 
JOIN pg_class ON relname = table_name
WHERE table_schema = 'public';

-- Show RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('telegram_logs', 'user_settings', 'trendyol_products', 'ikas_products', 'matching_data');
