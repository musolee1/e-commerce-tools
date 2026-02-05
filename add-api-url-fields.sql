-- Yeni site API alanlarını ekle
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS site_products_api_url TEXT,
ADD COLUMN IF NOT EXISTS site_update_price_api_url TEXT;

-- Default değerleri kaldır (onlar artık NULL olacak)
ALTER TABLE user_settings 
ALTER COLUMN site_url DROP DEFAULT,
ALTER COLUMN ikas_store_name DROP DEFAULT;

-- Mevcut default değerleri temizle (opsiyonel - sadece swassonline olanları temizler)
-- UPDATE user_settings SET site_url = NULL WHERE site_url = 'https://swassonline.com/';
-- UPDATE user_settings SET ikas_store_name = NULL WHERE ikas_store_name = 'swassonline';
