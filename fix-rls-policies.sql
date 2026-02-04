-- ============================================
-- RLS POLICY FIX SCRIPT - GÜVENLİ VERSİYON
-- ============================================
-- Bu scripti Supabase SQL Editor'da çalıştırın
-- Zaten var olan tablolar ve policy'ler atlanır, sadece eksikler eklenir

-- ============================================
-- 1. SITE_PRODUCTS TABLE
-- ============================================

-- Tablo oluştur (yoksa)
CREATE TABLE IF NOT EXISTS site_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trendyol_key TEXT NOT NULL,
  barcode TEXT,
  site_price NUMERIC,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trendyol_key)
);

-- Indexler (yoksa)
CREATE INDEX IF NOT EXISTS site_products_user_id_idx ON site_products(user_id);
CREATE INDEX IF NOT EXISTS site_products_trendyol_key_idx ON site_products(trendyol_key);

-- RLS Etkinleştir
ALTER TABLE site_products ENABLE ROW LEVEL SECURITY;

-- Policy'leri güvenli şekilde ekle (DROP IF EXISTS + CREATE)
DO $$ 
BEGIN
  -- SELECT Policy
  DROP POLICY IF EXISTS "Users can view their own site products" ON site_products;
  CREATE POLICY "Users can view their own site products" ON site_products FOR SELECT USING (auth.uid() = user_id);
  
  -- INSERT Policy
  DROP POLICY IF EXISTS "Users can insert their own site products" ON site_products;
  CREATE POLICY "Users can insert their own site products" ON site_products FOR INSERT WITH CHECK (auth.uid() = user_id);
  
  -- UPDATE Policy (UPSERT için gerekli!)
  DROP POLICY IF EXISTS "Users can update their own site products" ON site_products;
  CREATE POLICY "Users can update their own site products" ON site_products FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  
  -- DELETE Policy
  DROP POLICY IF EXISTS "Users can delete their own site products" ON site_products;
  CREATE POLICY "Users can delete their own site products" ON site_products FOR DELETE USING (auth.uid() = user_id);
END $$;

-- ============================================
-- 2. TRENDYOL_PRODUCTS - UPDATE Policy Ekle
-- ============================================

DO $$ 
BEGIN
  -- UPDATE policy ekle (UPSERT için gerekli!)
  DROP POLICY IF EXISTS "Users can update their own trendyol products" ON trendyol_products;
  CREATE POLICY "Users can update their own trendyol products" ON trendyol_products FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END $$;

-- ============================================
-- SONUÇ: Başarılı mesajı
-- ============================================
SELECT 'RLS Policy düzeltmeleri tamamlandı!' as sonuc;
