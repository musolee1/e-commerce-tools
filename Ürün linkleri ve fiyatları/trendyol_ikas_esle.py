import pandas as pd

# 1. Dosyaları Yükleyelim
# trendyol_ikas_eslesme_listesi.xlsx (Önceki adımda oluşturduğumuz dosya)
# diger_fiyat_listesi.xlsx (Yeni gelen fiyat bilgilerinin olduğu dosya)
ikas_eslesme_dosyasi = "trendyol_ikas_eslesme_listesi.xlsx"
fiyat_listesi_dosyasi = "trendyol_swass_final.xlsx" 

print("📁 Dosyalar okunuyor...")
df_ikas = pd.read_excel(ikas_eslesme_dosyasi)
df_fiyat = pd.read_excel(fiyat_listesi_dosyasi)

def link_temizle(link):
    """
    Linkteki ? ve sonrasını atar, 'genel-markalar'ı 'swass' yapar.
    """
    if pd.isna(link):
        return ""
    
    link = str(link).strip()
    
    # 1. Adım: ? işaretinden sonrasını kes (split)
    link = link.split('?')[0]
    
    # 2. Adım: 'genel-markalar' yazısını 'swass' ile değiştir
    link = link.replace('genel-markalar', 'swass')
    
    return link

print("🧹 Linkler temizleniyor ve formatlanıyor...")

# Her iki tablodaki link sütunlarını eşleşebilmeleri için aynı temizlikten geçiriyoruz
df_ikas['Eslestirme_Linki'] = df_ikas['Trendyol Ürün Linki'].apply(link_temizle)
df_fiyat['Eslestirme_Linki'] = df_fiyat['Link'].apply(link_temizle)

print("🔗 Eşleştirme (Merge) yapılıyor...")

# 2. Tabloyu 'Eslestirme_Linki' üzerinden birleştiriyoruz
# df_fiyat'tan 'Ürün Adı', 'Normal Fiyat' ve 'İndirimli Fiyat' sütunlarını alıyoruz
merged_df = pd.merge(
    df_ikas, 
    df_fiyat[['Ürün Adı', 'Normal Fiyat', 'İndirimli Fiyat', 'Eslestirme_Linki']], 
    on='Eslestirme_Linki', 
    how='inner'
)

# 3. Gereksiz olan temizleme sütununu silelim ve sıralayalım
final_df = merged_df[[
    'Ürün Adı', 
    'Normal Fiyat', 
    'İndirimli Fiyat', 
    'Trendyol Ürün Linki', 
    'Product ID', 
    'Variant ID'
]]

# 4. Sonucu Kaydet
cikti_adi = "final_guncelleme_listesi.xlsx"
final_df.to_excel(cikti_adi, index=False)

print(f"\n✅ İŞLEM TAMAMLANDI!")
print(f"📊 Toplam {len(final_df)} ürün başarıyla eşleşti ve fiyatlandırıldı.")
print(f"📁 Yeni dosya hazır: {cikti_adi}")