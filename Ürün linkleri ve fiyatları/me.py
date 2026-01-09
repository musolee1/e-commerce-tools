import requests

# 1. Az önce aldığınız uzun token'ı buraya yapıştırın
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBhOTZiZjQ3LTQyYmQtNDMwZS05NDdkLWY5MDFjMTcxMjgwMiIsImVtYWlsIjoiw7xyw7xuLWJpbGdpbGVyaSIsImZpcnN0TmFtZSI6IsO8csO8bi1iaWxnaWxlcmkiLCJsYXN0TmFtZSI6IiIsInN0b3JlTmFtZSI6InN3YXNzb25saW5lIiwibWVyY2hhbnRJZCI6ImIwMGY0MmQ3LWNjNWQtNDMzOC1hNjAxLTNmYzM2MWYyZTJmMCIsImZlYXR1cmVzIjpbMTAsMTEsMTIsMiwyMDEsMyw0LDUsNyw4LDldLCJhdXRob3JpemVkQXBwSWQiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIiLCJzYWxlc0NoYW5uZWxJZCI6IjlhMDQwNWViLTdiZTgtNDIyNS1hOTE4LWQ0NTJlM2YyNDAwMCIsInR5cGUiOjQsImV4cCI6MTc2Nzk2MDk1MjU1MywiaWF0IjoxNzY3OTQ2NTUyNTU0LCJpc3MiOiJiMDBmNDJkNy1jYzVkLTQzMzgtYTYwMS0zZmMzNjFmMmUyZjAiLCJzdWIiOiIwYTk2YmY0Ny00MmJkLTQzMGUtOTQ3ZC1mOTAxYzE3MTI4MDIifQ.ejABTNhQvWl8RaDToOoD4AI41Ms-vlgLOpp-r9b9jtk"

# Dokümanda belirtilen GraphQL uç noktası
url = "https://api.myikas.com/api/v1/admin/graphql"

# Header bilgileri (Bearer Token burada gidiyor)
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}

# Gönderilecek basit sorgu: { me { id } }
payload = {
    "query": "{ me { id } }"
}

print("Sorgu gönderiliyor...")

try:
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        print("\n✅ BAŞARILI! Cevap:")
        print(response.json())
    else:
        print(f"\n❌ HATA (Kod: {response.status_code})")
        print(response.text)

except Exception as e:
    print(f"\n❌ Bağlantı Hatası: {e}")