import pandas as pd

# 1. Dosyaları Yükleme
df_trendyol = pd.read_excel('trendyol_urunleri.xlsx')
df_match = pd.read_excel('match_dosyasi.xlsx')
df_ikas = pd.read_excel('ikas_urunleri.xlsx')

# --- KRİTİK FONKSİYON: TR Formatını Sayıya Çevirme ---
def temiz_sayi_yap(deger):
    if pd.isna(deger) or deger == "":
        return 0.0
    
    # Sayı zaten float/int gelmişse (bazı hücreler temiz olabilir)
    if isinstance(deger, (int, float)):
        return float(deger)
    
    s = str(deger).replace('TL', '').strip()
    
    # Mantık: 
    # 1. Binlik ayracı olan noktayı (.) tamamen kaldır (Örn: 4.617 -> 4617)
    # 2. Ondalık ayracı olan virgülü (,) noktaya çevir (Örn: 2.498,95 -> 2498.95)
    
    if ',' in s:
        s = s.replace('.', '') # Binlik noktalarını sil
        s = s.replace(',', '.') # Ondalık virgülünü nokta yap
    else:
        # Eğer sadece nokta varsa ve virgül yoksa, bu bir binlik ayracıdır
        s = s.replace('.', '')
        
    try:
        return float(s)
    except:
        return 0.0

# 2. Fiyatları en başta temizle
df_trendyol['Normal Fiyat'] = df_trendyol['Normal Fiyat'].apply(temiz_sayi_yap)
df_trendyol['İndirimli Fiyat'] = df_trendyol['İndirimli Fiyat'].apply(temiz_sayi_yap)
df_ikas['Normal Fiyat'] = df_ikas['Normal Fiyat'].apply(temiz_sayi_yap)
df_ikas['İndirimli Fiyat'] = df_ikas['İndirimli Fiyat'].apply(temiz_sayi_yap)

# 3. Veri Standardizasyonu ve Birleştirme (Eski düzen)
df_trendyol['Link'] = df_trendyol['Link'].astype(str).str.strip()
df_match['Trendyol.com Linki'] = df_match['Trendyol.com Linki'].astype(str).str.strip()
df_match['Barkod'] = df_match['Barkod'].astype(str).str.strip()
df_ikas['Barkod'] = df_ikas['Barkod'].astype(str).str.strip()

step1 = pd.merge(df_trendyol, df_match[['Trendyol.com Linki', 'Barkod']], 
                 left_on='Link', right_on='Trendyol.com Linki', how='left')

barcode_map = df_ikas[['Barkod', 'Product ID']].drop_duplicates(subset=['Barkod'])
step2 = pd.merge(step1, barcode_map, on='Barkod', how='left')

ikas_data = df_ikas[['Product ID', 'Variant ID', 'Normal Fiyat', 'İndirimli Fiyat']].drop_duplicates()
final_df = pd.merge(step2, ikas_data, on='Product ID', how='left', suffixes=('_Trendyol', '_Ikas'))

# Sütun İsimlerini Düzenle
final_df = final_df.rename(columns={
    'Normal Fiyat_Trendyol': 'Trendyol Ürün fiyatı',
    'İndirimli Fiyat_Trendyol': 'Trendyol İndirimli fiyat',
    'Normal Fiyat_Ikas': 'İKAS ürün fiyatı',
    'İndirimli Fiyat_Ikas': 'İkas indirimli fiyat'
})

# 4. ADIM: Karşılaştırma Sütunu ve Doğru Filtreleme
# Karşılaştırma Sütunu: Trendyol İndirimli Fiyatın %10 indirimli hali
final_df['Karşılaştırma Sütunu'] = final_df['Trendyol İndirimli fiyat'] * 0.90

# SADECE Karşılaştırma Sütunu, İkas İndirimli Fiyattan KÜÇÜK olanları tut
# Örnek: 4155.30 (Kıyas) < 2498.95 (İkas) -> False (Bu satır silinecek)
final_df = final_df[final_df['Karşılaştırma Sütunu'] < final_df['İkas indirimli fiyat']]

# 5. Sonuçları Temizle ve Kaydet
final_df = final_df.dropna(subset=['Product ID', 'Variant ID'])

cols = [
    'Ürün Adı', 'Trendyol Ürün fiyatı', 'Trendyol İndirimli fiyat', 
    'Karşılaştırma Sütunu', 'İKAS ürün fiyatı', 'İkas indirimli fiyat',
    'Link', 'Barkod', 'Product ID', 'Variant ID'
]
final_df = final_df[cols]

# Excel'e yazdırırken sayı formatını koru
final_df.to_excel('gercek_aksiyon_listesi.xlsx', index=False)

print(f"Filtreleme tamamlandı. Kalan ürün sayısı: {len(final_df)}")