import pandas as pd

# 1. Dosyaları yükleyelim
# Dosya adlarını kendinize göre güncelleyin
ikas_dosyasi = "ikas_id.xlsx"
trendyol_dosyasi = "trendyol_liste.xlsx" 

print("📁 Dosyalar okunuyor...")
df_ikas = pd.read_excel(ikas_dosyasi)
df_trendyol = pd.read_excel(trendyol_dosyasi)

# 2. Veri Temizliği (ÖNEMLİ)
# Barkodlar bazen sayı (float) bazen metin olarak okunur. 
# Eşleşme hatası olmaması için her ikisini de metne çevirip boşlukları temizleyelim.
df_ikas['Barkod'] = df_ikas['Barkod'].astype(str).str.strip()
df_trendyol['Barkod'] = df_trendyol['Barkod'].astype(str).str.strip()

print("🔗 Eşleştirme işlemi yapılıyor...")

# 3. Barkod sütunu üzerinden iki tabloyu birleştiriyoruz (Inner Join)
# Trendyol listesini temel alıyoruz ve yanına ikas ID'lerini getiriyoruz.
merged_df = pd.merge(
    df_trendyol, 
    df_ikas[['Product ID', 'Variant ID', 'Barkod']], 
    on='Barkod', 
    how='inner'
)

# 4. Sadece istediğiniz sütunları seçelim
sonuc_df = merged_df[['Trendyol Ürün Linki', 'Product ID', 'Variant ID']]

# 5. Sonucu yeni bir Excel dosyası olarak kaydedelim
cikti_dosyasi = "trendyol_ikas_eslesme_listesi.xlsx"
sonuc_df.to_excel(cikti_dosyasi, index=False)

print(f"\n✅ İŞLEM TAMAMLANDI!")
print(f"📊 Toplam {len(sonuc_df)} ürün başarıyla eşleşti.")
print(f"📁 Kaydedilen dosya: {cikti_dosyasi}")