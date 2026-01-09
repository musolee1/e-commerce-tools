import requests
import json
import pandas as pd
import time

# --- AYARLAR ---
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBhOTZiZjQ3LTQyYmQtNDMwZS05NDdkLWY5MDFjMTcxMjgwMiIsImVtYWlsIjoiw7xyw7xuLWJpbGdpbGVyaSIsImZpcnN0TmFtZSI6IsO8csO8bi1iaWxnaWxlcmkiLCJsYXN0TmFtZSI6IiIsInN0b3JlTmFtZSI6InN3YXNzb25saW5lIiwibWVyY2hhbnRJZCI6ImIwMGY0MmQ3LWNjNWQtNDMzOC1hNjAxLTNmYzM2MWYyZTJmMCIsImZlYXR1cmVzIjpbMTAsMTEsMTIsMiwyMDEsMyw0LDUsNyw4LDldLCJhdXRob3JpemVkQXBwSWQiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIiLCJzYWxlc0NoYW5uZWxJZCI6IjlhMDQwNWViLTdiZTgtNDIyNS1hOTE4LWQ0NTJlM2YyNDAwMCIsInR5cGUiOjQsImV4cCI6MTc2Nzk2MDk1MjU1MywiaWF0IjoxNzY3OTQ2NTUyNTU0LCJpc3MiOiJiMDBmNDJkNy1jYzVkLTQzMzgtYTYwMS0zZmMzNjFmMmUyZjAiLCJzdWIiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIifQ.ejABTNhQvWl8RaDToOoD4AI41Ms-vlgLOpp-r9b9jtk"
URL = "https://api.myikas.com/api/v1/admin/graphql"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}


def fetch_products(page=1):
    query = """
    query GetAllProducts($page: Int) {
      listProduct(pagination: { limit: 50, page: $page }) {
        count
        data {
          id
          name
          variants {
            id
            sku
            barcodeList
            prices {
              priceListId
              sellPrice
              discountPrice
            }
          }
        }
      }
    }
    """
    variables = {"page": page}
    try:
        response = requests.post(URL, json={"query": query, "variables": variables}, headers=headers)
        return response.json()
    except Exception as e:
        print(f"Bağlantı hatası (Sayfa {page}): {e}")
        return None

# --- VERİ TOPLAMA ---
all_data = []
current_page = 1
all_done = False

print("🚀 İşlem başlatıldı. Ürünler ve Variant ID'ler çekiliyor...")

while not all_done:
    result = fetch_products(current_page)
    
    if result and "data" in result and result["data"]["listProduct"]:
        data_block = result["data"]["listProduct"]
        products = data_block["data"]
        total_count = data_block["count"]
        
        for p in products:
            p_id = p['id']      # Product ID
            p_name = p['name']
            
            for v in p['variants']:
                v_id = v.get('id') # Variant ID (Güncelleme için kritik)
                sku = v.get('sku', '')
                barcode = v.get('barcodeList', [None])[0] if v.get('barcodeList') else ""
                
                sell_price = 0
                discount_price = 0
                
                if v.get('prices'):
                    for price_item in v['prices']:
                        if price_item['priceListId'] is None:
                            sell_price = price_item.get('sellPrice', 0)
                            discount_price = price_item.get('discountPrice', 0)
                            break
                
                all_data.append({
                    "Product ID": p_id,
                    "Variant ID": v_id,
                    "Ürün Adı": p_name,
                    "SKU": sku,
                    "Barkod": barcode,
                    "Normal Fiyat": sell_price,
                    "İndirimli Fiyat": discount_price if discount_price else sell_price
                })

        print(f"📦 Sayfa {current_page} okundu... ({len(all_data)} satır toplandı)")

        if current_page * 250 >= total_count:
            all_done = True
        else:
            current_page += 1
            time.sleep(0.2)
    else:
        print("Veri alınamadı, işlem kesildi.")
        break

# --- EXCEL (.xlsx) KAYDETME ---
if all_data:
    df = pd.DataFrame(all_data)
    filename = "ikas_guncelleme_listesi.xlsx"
    
    df.to_excel(filename, index=False, engine='openpyxl')
    
    print(f"\n✅ İŞLEM TAMAMLANDI!")
    print(f"📊 Toplam {len(df)} varyant verisi hazır.")
    print(f"📁 Dosya: {filename}")
    print("\n💡 Not: Artık bu Excel'deki Product ID ve Variant ID'leri kullanarak toplu güncelleme yapabilirsiniz.")
else:
    print("Kaydedilecek veri bulunamadı.")