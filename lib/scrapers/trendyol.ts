import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import * as cheerio from 'cheerio';

export interface TrendyolProduct {
    name: string;
    normalPrice: string;
    discountedPrice: string;
    link: string;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Yerel ortamda Chrome yolunu bul
async function getChromePath(): Promise<string> {
    const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
        // Vercel/Lambda ortamında @sparticuz/chromium kullan
        return await chromium.executablePath();
    }

    // Önce CHROME_PATH environment variable kontrol et
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }

    // Yerel ortamda Chrome yollarını dene
    const possiblePaths = [
        // Windows
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        // Mac
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        // Linux
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ];

    const fs = await import('fs');
    for (const chromePath of possiblePaths) {
        if (chromePath && fs.existsSync(chromePath)) {
            return chromePath;
        }
    }

    throw new Error('Chrome bulunamadı. Lütfen Google Chrome yükleyin veya CHROME_PATH environment variable ayarlayın.');
}

export async function scrapeTrendyol(targetUrl: string): Promise<TrendyolProduct[]> {
    console.log('🕵️ Gizli tarayıcı başlatılıyor...');

    const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const executablePath = await getChromePath();

    console.log(`🌐 Chrome yolu: ${executablePath}`);

    // Ortama göre farklı ayarlar kullan
    const browser = await puppeteer.launch({
        args: isVercel ? chromium.args : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
        defaultViewport: { width: 1920, height: 1080 },
        executablePath,
        headless: true,
    });

    try {
        const page = await browser.newPage();

        // Set user agent and viewport
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1920, height: 1080 });

        console.log(`🌍 Siteye gidiliyor: ${targetUrl}`);

        await page.goto(targetUrl, {
            timeout: 60000,
            waitUntil: 'networkidle2'
        });

        // Wait for product cards to load
        try {
            await page.waitForSelector('div.search-result-content', { timeout: 30000 });
            console.log('✅ Ürün kartları yüklendi');
        } catch (e) {
            console.log('⚠️ Ürün kartları yüklenirken zaman aşımı, devam ediliyor...');
        }

        // Wait for price elements to be rendered (important for Vercel)
        try {
            await page.waitForSelector('[data-testid="ty-plus-promotion-price"], [data-testid="single-price"]', { timeout: 15000 });
            console.log('✅ Fiyat elementleri yüklendi');
        } catch (e) {
            console.log('⚠️ Fiyat elementleri henüz yüklenmedi, devam ediliyor...');
        }

        // Extra wait for JavaScript to fully render
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Scroll to load all products - IMPROVED INFINITE SCROLL
        console.log('⏳ Tüm ürünler yükleniyor (Scroll yapılıyor)...');

        let lastHeight = await page.evaluate('document.body.scrollHeight');
        let scrollAttempts = 0;
        let noChangeCount = 0;
        const maxScrollAttempts = 50; // Maximum 50 scrolls

        while (scrollAttempts < maxScrollAttempts) {
            // Scroll to bottom
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');

            // Wait longer for lazy loading (2.5 seconds)
            await new Promise(resolve => setTimeout(resolve, 2500));

            const newHeight = await page.evaluate('document.body.scrollHeight');

            // Count products loaded so far
            const currentProductCount = await page.evaluate(() => {
                return document.querySelectorAll('a.product-card').length;
            });

            console.log(`📊 Scroll ${scrollAttempts + 1}: ${currentProductCount} ürün yüklendi`);

            // Check if page stopped growing
            if (newHeight === lastHeight) {
                noChangeCount++;
                // If no change for 3 consecutive attempts, we're done
                if (noChangeCount >= 3) {
                    console.log('✅ Tüm ürünler yüklendi (sayfa boyutu sabit kaldı)');
                    break;
                }
            } else {
                noChangeCount = 0; // Reset counter if page is still growing
            }

            lastHeight = newHeight;
            scrollAttempts++;
        }

        console.log('✅ Sayfa sonuna ulaşıldı. DOM verileri çekiliyor...');

        // Extract products directly from DOM using page.evaluate()
        // This runs in the browser context with fully rendered DOM
        const products = await page.evaluate(() => {
            const results: Array<{ name: string, normalPrice: string, discountedPrice: string, link: string }> = [];

            const cards = document.querySelectorAll('a.product-card');

            cards.forEach((card, index) => {
                try {
                    // 1. Link
                    let link = card.getAttribute('href') || '';
                    if (link && !link.startsWith('http')) {
                        link = 'https://www.trendyol.com' + link;
                    }
                    link = link.split('?')[0];

                    // 2. Name
                    const brand = card.querySelector('span.product-brand')?.textContent?.trim() || '';
                    const name = card.querySelector('span.product-name')?.textContent?.trim() || '';
                    const fullName = `${brand} ${name}`.trim();

                    // 3. Prices
                    let normalPrice = '-';
                    let discountedPrice = '-';

                    // CASE 1: ty-plus-promotion-price structure
                    const promoDiv = card.querySelector('[data-testid="ty-plus-promotion-price"]');
                    if (promoDiv) {
                        // Normal price from strikethrough-price
                        const strikeEl = promoDiv.querySelector('.strikethrough-price');
                        if (strikeEl) {
                            normalPrice = strikeEl.textContent?.trim() || '-';
                        }

                        // Discounted price from price-value
                        const priceValueEl = promoDiv.querySelector('.price-value');
                        if (priceValueEl) {
                            discountedPrice = priceValueEl.textContent?.trim() || '-';
                        }

                        // Debug first 3
                        if (index < 3) {
                            console.log(`🔍 Ürün ${index + 1}: strikeEl=${!!strikeEl}, priceValueEl=${!!priceValueEl}`);
                        }
                    }

                    // CASE 2: single-price structure
                    if (discountedPrice === '-' && normalPrice === '-') {
                        const singlePriceDiv = card.querySelector('[data-testid="single-price"]');
                        if (singlePriceDiv) {
                            const priceSectionEl = singlePriceDiv.querySelector('.price-section');
                            if (priceSectionEl) {
                                const singlePrice = priceSectionEl.textContent?.trim() || '-';
                                normalPrice = singlePrice;
                                discountedPrice = singlePrice;
                            }
                        }
                    }

                    // CASE 3: Fallback - try any price-related elements
                    if (discountedPrice === '-') {
                        const anyPriceValue = card.querySelector('.price-value');
                        if (anyPriceValue) {
                            discountedPrice = anyPriceValue.textContent?.trim() || '-';
                        }
                    }

                    if (normalPrice === '-') {
                        const anyStrike = card.querySelector('.strikethrough-price');
                        if (anyStrike) {
                            normalPrice = anyStrike.textContent?.trim() || '-';
                        }
                    }

                    if (fullName && link) {
                        results.push({
                            name: fullName,
                            normalPrice,
                            discountedPrice,
                            link
                        });
                    }
                } catch (e) {
                    console.error('Ürün işlenirken hata:', e);
                }
            });

            return results;
        });

        console.log(`📦 Toplam ${products.length} adet ürün çekildi.`);

        // Log first 5 products for debugging
        products.slice(0, 5).forEach((p, i) => {
            console.log(`💰 Ürün ${i + 1}: "${p.name.substring(0, 30)}..." | Normal: ${p.normalPrice} | İnd: ${p.discountedPrice}`);
        });

        return products;
    } finally {
        await browser.close();
    }
}
