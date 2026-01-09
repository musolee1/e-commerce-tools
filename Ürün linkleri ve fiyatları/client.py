import requests

# --- AYARLAR ---
# Mağaza adresiniz (Örn: https://magazam.myikas.com ise buraya "magazam" yazın)
STORE_NAME = "swassonline" 

CLIENT_ID = "0a96bf47-42bd-430e-947d-f901c1712802"
CLIENT_SECRET = "s_ZDYQ7rBPCZJfqooEnEpOGmh4603ed2b762bc4139ac8c079f8540b405"

# Auth URL'i
url = f"https://{STORE_NAME}.myikas.com/api/admin/oauth/token"

# Gönderilecek veriler (Form Data)
payload = {
    "grant_type": "client_credentials",
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET
}

print(f"İstek yapılıyor: {url} ...")

try:
    # data=payload kullanıyoruz (application/x-www-form-urlencoded için)
    response = requests.post(url, data=payload)

    if response.status_code == 200:
        token = response.json().get("access_token")
        print("\n✅ BAŞARILI! Token alındı:")
        print(token)
    else:
        print(f"\n❌ HATA (Kod: {response.status_code})")
        print("Sunucu Cevabı:", response.text)

except Exception as e:
    print(f"\n❌ Bağlantı Hatası: {e}")