import requests
import json

# --- AYARLAR ---
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBhOTZiZjQ3LTQyYmQtNDMwZS05NDdkLWY5MDFjMTcxMjgwMiIsImVtYWlsIjoiw7xyw7xuLWJpbGdpbGVyaSIsImZpcnN0TmFtZSI6IsO8csO8bi1iaWxnaWxlcmkiLCJsYXN0TmFtZSI6IiIsInN0b3JlTmFtZSI6InN3YXNzb25saW5lIiwibWVyY2hhbnRJZCI6ImIwMGY0MmQ3LWNjNWQtNDMzOC1hNjAxLTNmYzM2MWYyZTJmMCIsImZlYXR1cmVzIjpbMTEsMiwzLDQsNyw4LDldLCJhdXRob3JpemVkQXBwSWQiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIiLCJzYWxlc0NoYW5uZWxJZCI6IjlhMDQwNWViLTdiZTgtNDIyNS1hOTE4LWQ0NTJlM2YyNDAwMCIsInR5cGUiOjQsImV4cCI6MTc2ODI2MzkyNTQzOSwiaWF0IjoxNzY4MjQ5NTI1NDM5LCJpc3MiOiJiMDBmNDJkNy1jYzVkLTQzMzgtYTYwMS0zZmMzNjFmMmUyZjAiLCJzdWIiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIifQ.gYITRGzpiYK2gaqA4e5lI2CeqWVY-CnU8JWIV42_c9o" 
URL = "https://api.myikas.com/api/v1/admin/graphql"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}

# --- GÜNCELLENECEK ÜRÜN BİLGİLERİ ---
PRODUCT_ID = "d6d964c8-e277-4976-a06c-afde5d8cb022" 
VARIANT_ID = "9b4a7f7d-56e4-4cb7-9a6a-0d4ff9877ff9"

# Yeni Fiyat Değerleri
YENI_NORMAL_FIYAT = 1000.0   # sellPrice (Zorunlu)
YENI_INDIRIMLI_FIYAT = 719.0  # discountPrice
YENI_ALIS_FIYATI = 401.0      # buyPrice (Eksik kalmasın diye ekledik)

mutation = """
mutation SaveVariantPrices($input: SaveVariantPricesInput!) {
  saveVariantPrices(input: $input)
}
"""

variables = {
    "input": {
        "priceListId": None,
        "variantPriceInputs": [
            {
                "productId": PRODUCT_ID,
                "variantId": VARIANT_ID,
                "price": {
                    "sellPrice": YENI_NORMAL_FIYAT,
                    "discountPrice": YENI_INDIRIMLI_FIYAT,
                    "buyPrice": YENI_ALIS_FIYATI  # Alış fiyatı buraya eklendi
                }
            }
        ]
    }
}

print(f"🚀 ikas fiyat ve maliyet güncellemesi başlatılıyor...")

try:
    response = requests.post(URL, json={"query": mutation, "variables": variables}, headers=headers)
    result = response.json()

    if response.status_code == 200:
        if "errors" in result:
            print("\n❌ API Hatası:")
            print(json.dumps(result["errors"], indent=2, ensure_ascii=False))
        elif result.get("data", {}).get("saveVariantPrices") == True:
            print(f"\n✅ BAŞARILI! Tüm fiyatlar korundu ve güncellendi.")
            print(f"💰 Satış: {YENI_NORMAL_FIYAT} TRY")
            print(f"🏷️ İndirimli: {YENI_INDIRIMLI_FIYAT} TRY")
            print(f"📉 Maliyet (Alış): {YENI_ALIS_FIYATI} TRY")
    else:
        print(f"❌ Bağlantı Hatası: {response.status_code}")

except Exception as e:
    print(f"❌ Hata: {e}")