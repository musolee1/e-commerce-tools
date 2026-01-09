import asyncio
import random
import pandas as pd
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# --- AYARLAR ---
TARGET_URL = "https://www.trendyol.com/sr?mid=2457&os=1"
EXCEL_FILENAME = "trendyol_swass_final.xlsx"

# Trendyol'un bot olduğumuzu anlamaması için gerçek bir bilgisayar kimliği
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async def scrape_trendyol():
    async with async_playwright() as p:
        print("🕵️  Gizli tarayıcı, kimlik gizlenerek başlatılıyor...")
        
        # Tarayıcıyı başlat (Headless: True -> Pencere açılmaz)
        browser = await p.chromium.launch(headless=True)
        
        # Context oluştururken User-Agent ekliyoruz (ÇOK ÖNEMLİ)
        context = await browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1920, "height": 1080}
        )
        
        page = await context.new_page()
        
        print(f"🌍 Siteye gidiliyor: {TARGET_URL}")
        try:
            await page.goto(TARGET_URL, timeout=60000)
            # Ürün kartlarının yüklenmesini bekle
            await page.wait_for_selector("div.search-result-content", timeout=15000)
        except Exception as e:
            print("⚠️ Sayfa yüklenirken zaman aşımı veya hata oldu, devam ediliyor...")

        # --- SCROLL İŞLEMİ ---
        print("⏳ Tüm ürünler yükleniyor (Scroll yapılıyor)...")
        last_height = await page.evaluate("document.body.scrollHeight")
        
        while True:
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1500) # Yüklenme için bekleme
            
            new_height = await page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
            
        print("✅ Sayfa sonuna ulaşıldı. HTML alınıyor...")

        # Sayfanın son halinin HTML içeriğini alıyoruz
        content = await page.content()
        await browser.close()

        # --- BEAUTIFULSOUP İLE PARÇALAMA ---
        # Playwright yerine BeautifulSoup kullanıyoruz çünkü daha hata toleranslıdır.
        soup = BeautifulSoup(content, "html.parser")
        
        # Verdiğin HTML'e göre kartlar "a" etiketi ve class="product-card"
        cards = soup.find_all("a", class_="product-card")
        
        print(f"📦 Toplam {len(cards)} adet ürün kartı bulundu. Veriler işleniyor...")
        
        products_data = []

        for card in cards:
            try:
                # 1. Link
                link = card.get("href")
                if link and not link.startswith("http"):
                    link = "https://www.trendyol.com" + link

                # 2. İsim (Marka + Ad)
                brand = card.find("span", class_="product-brand")
                name = card.find("span", class_="product-name")
                
                brand_text = brand.text.strip() if brand else ""
                name_text = name.text.strip() if name else ""
                full_name = f"{brand_text} {name_text}"

                # 3. Fiyatlar (Senin verdiğin yapıya göre)
                # İki ihtimal var: Ya "Sepette" kampanyası vardır ya da normal indirim.
                
                normal_price = "-"
                discounted_price = "-"
                
                # Önce senin attığın "ty-plus-promotion-price" yapısını kontrol edelim
                promo_div = card.find("div", class_="ty-plus-promotion-price")
                
                if promo_div:
                    # Promosyonlu yapı
                    # Üstü çizili fiyat
                    strike_tag = promo_div.find("div", class_="strikethrough-price")
                    if strike_tag:
                        normal_price = strike_tag.text.strip()
                    
                    # İndirimli (Sepette) fiyat
                    price_val_tag = promo_div.find("span", class_="price-value")
                    if price_val_tag:
                        discounted_price = price_val_tag.text.strip()
                
                else:
                    # Eğer "Trendyol Plus" özel fiyatı yoksa standart fiyat kutusuna bakalım
                    # Genelde class="prc-box-dscntd" olur
                    price_box = card.find("div", class_="prc-box-dscntd")
                    if price_box:
                        discounted_price = price_box.text.strip()
                        # Bazen burada da üstü çizili fiyat olur
                        box_strike = card.find("div", class_="prc-box-orgnl")
                        if box_strike:
                            normal_price = box_strike.text.strip()

                products_data.append({
                    "Ürün Adı": full_name,
                    "Normal Fiyat": normal_price,
                    "İndirimli Fiyat": discounted_price,
                    "Link": link
                })

            except Exception as e:
                print(f"Hata: {e}")
                continue

        return products_data

# --- ÇALIŞTIRMA ---
if __name__ == "__main__":
    data = asyncio.run(scrape_trendyol())
    
    if data:
        df = pd.DataFrame(data)
        df.to_excel(EXCEL_FILENAME, index=False)
        print(f"🎉 Dosya başarıyla oluşturuldu: {EXCEL_FILENAME}")
        print(df.head()) # İlk 5 ürünü ekrana basar
    else:
        print("❌ Hala veri çekilemedi. Trendyol IP adresini geçici engellemiş olabilir.")