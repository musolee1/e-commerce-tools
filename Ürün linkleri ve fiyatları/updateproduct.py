import requests
import json

# --- AYARLAR ---
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBhOTZiZjQ3LTQyYmQtNDMwZS05NDdkLWY5MDFjMTcxMjgwMiIsImVtYWlsIjoiw7xyw7xuLWJpbGdpbGVyaSIsImZpcnN0TmFtZSI6IsO8csO8bi1iaWxnaWxlcmkiLCJsYXN0TmFtZSI6IiIsInN0b3JlTmFtZSI6InN3YXNzb25saW5lIiwibWVyY2hhbnRJZCI6ImIwMGY0MmQ3LWNjNWQtNDMzOC1hNjAxLTNmYzM2MWYyZTJmMCIsImZlYXR1cmVzIjpbMTAsMTEsMTIsMiwyMDEsMyw0LDUsNyw4LDldLCJhdXRob3JpemVkQXBwSWQiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIiLCJzYWxlc0NoYW5uZWxJZCI6IjlhMDQwNWViLTdiZTgtNDIyNS1hOTE4LWQ0NTJlM2YyNDAwMCIsInR5cGUiOjQsImV4cCI6MTc2Nzk2MDk1MjU1MywiaWF0IjoxNzY3OTQ2NTUyNTU0LCJpc3MiOiJiMDBmNDJkNy1jYzVkLTQzMzgtYTYwMS0zZmMzNjFmMmUyZjAiLCJzdWIiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIifQ.ejABTNhQvWl8RaDToOoD4AI41Ms-vlgLOpp-r9b9jtk"
URL = "https://api.myikas.com/api/v1/admin/graphql"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}

# --- GÜNCELLENECEK ÜRÜN BİLGİLERİ ---
# Excel'den veya loglardan aldığınız ID'leri buraya girin
PRODUCT_ID = "24898531-0fe8-4cc0-b886-6670cc51bd28" # Örnek ID
VARIANT_ID = "ee17fda6-edb8-45b0-957f-ecba0bf9de2b" # Örnek ID

# Yeni Fiyatlar
YENI_SATIS_FIYATI = 3748.75  # sellPrice
YENI_INDIRIMLI_FIYAT = 1748.95 # discountPrice

# Fiyat güncelleme Mutation sorgusu
mutation = """
mutation UpdatePrice($input: SaveVariantPricesInput!) {
  saveVariantPrices(input: $input)
}
"""

# Gönderilecek veri paketi
variables = {
    "input": {
        "priceListId": None, # Varsayılan fiyat listesi için null (None)
        "variantPriceInputs": [
            {
                "productId": PRODUCT_ID,
                "variantId": VARIANT_ID,
                "price": {
                    "sellPrice": YENI_SATIS_FIYATI,
                    "discountPrice": YENI_INDIRIMLI_FIYAT,
                }
            }
        ]
    }
}

print(f"🚀 Ürün fiyatı güncelleniyor: {VARIANT_ID}...")

try:
    response = requests.post(URL, json={"query": mutation, "variables": variables}, headers=headers)
    result = response.json()

    if response.status_code == 200 and "errors" not in result:
        # ikas başarılı olduğunda genellikle "data": {"saveVariantPrices": true} döner
        if result.get("data", {}).get("saveVariantPrices") == True:
            print("\n✅ BAŞARILI! Fiyat güncellendi.")
            print(f"Yeni Satış Fiyatı: {YENI_SATIS_FIYATI} TRY")
            print(f"Yeni İndirimli Fiyat: {YENI_INDIRIMLI_FIYAT} TRY")
        else:
            print("❌ İşlem başarısız görünüyor.")
            print(result)
    else:
        print("\n❌ Hata Oluştu:")
        print(json.dumps(result.get("errors", result), indent=2, ensure_ascii=False))

except Exception as e:
    print(f"❌ Bağlantı Hatası: {e}")