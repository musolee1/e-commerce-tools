# Swass Telegram Bot - Web Interface

Modern Next.js web arayüzü ile Telegram bot yönetimi.

## 📸 Preview

### Login Page
![Login Page](C:/Users/sorgera/.gemini/antigravity/brain/39e1cc9e-7a6d-4dfe-98bf-e9595b89af7c/login_page_design_1767876383367.png)

### Dashboard Interface
![Dashboard](C:/Users/sorgera/.gemini/antigravity/brain/39e1cc9e-7a6d-4dfe-98bf-e9595b89af7c/dashboard_interface_1767876401215.png)

## 🚀 Özellikler

- ✅ Google OAuth ile güvenli giriş (Supabase)
- ✅ Kullanıcı başına özel Telegram bot ayarları
- ✅ Excel dosyası yükleme ve otomatik stok filtreleme
- ✅ Telegram'a ürün gönderimi (albüm desteği)
- ✅ Gerçek zamanlı progress tracking
- ✅ Gönderim geçmişi ve istatistikler
- ✅ Kullanıcı ayarları yönetimi
- ✅ Güncellenmiş Excel dosyası indirme
- ✅ Responsive ve modern tasarım
- ✅ Vercel'de kolay deployment

## 📋 Gereksinimler

- Node.js 18+
- Supabase hesabı (ücretsiz)
- Google OAuth credentials
- Telegram Bot Token ve Chat ID

## 🛠️ Kurulum

### 1. Supabase Kurulumu

Detaylı kurulum için [SUPABASE_GOOGLE_OAUTH_SETUP.md](./docs/SUPABASE_GOOGLE_OAUTH_SETUP.md) dosyasına bakın.

**Özet:**
1. [Supabase](https://app.supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. Authentication → Providers → Google'ı aktifleştirin
4. Google Cloud Console'da OAuth client oluşturun
5. API keys'leri alın

### 2. Environment Variables

`.env.local` dosyası oluşturun:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Site URL
SITE_URL=https://swassonline.com/
```

### 3. Dependencies Yükleme

```bash
npm install
```

### 4. Development Server

```bash
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresine gidin.

## 🌐 Vercel'e Deployment

### 1. GitHub Repository Oluşturma

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/swass-telegram-bot.git
git push -u origin main
```

### 2. Vercel Import

1. [Vercel Dashboard](https://vercel.com/dashboard)'a gidin
2. "Add New..." → "Project" tıklayın
3. GitHub repository'nizi import edin
4. Environment Variables ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `SITE_URL`
5. "Deploy" butonuna tıklayın

### 3. Google OAuth Callback Güncelleme

Deployment tamamlandıktan sonra:

1. Google Cloud Console → Credentials
2. OAuth 2.0 Client ID'nizi seçin
3. "Authorized redirect URIs" kısmına ekleyin:
   ```
   https://your-project.vercel.app/auth/callback
   https://your-supabase-project.supabase.co/auth/v1/callback
   ```
4. Save

## 📁 Proje Yapısı

```
Web/
├── app/
│   ├── api/
│   │   ├── process-excel/      # Excel işleme API
│   │   └── send-telegram/       # Telegram gönderme API
│   ├── auth/
│   │   └── callback/            # OAuth callback
│   ├── dashboard/
│   │   ├── layout.tsx           # Dashboard layout
│   │   └── telegram-bot/        # Bot yönetim sayfası
│   ├── login/                   # Login sayfası
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── DashboardNav.tsx         # Navigation component
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   └── utils.ts
├── middleware.ts                # Route protection
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## 🎯 Kullanım

1. Google hesabınızla giriş yapın
2. Excel dosyanızı (ikas-urunler.xlsx) yükleyin
3 Sistem otomatik olarak stoklu ürünleri filtreler
4. Slider ile kaç ürün göndereceğinizi seçin (1-10)
5. "Telegram'a Gönder" butonuna tıklayın
6. Progress bar ile ilerlemeyi takip edin
7. Tamamlandığında güncellenmiş Excel dosyasını indirin

## 🔧 Teknolojiler

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth (Google OAuth)
- **Backend:** Next.js API Routes
- **Excel:** ExcelJS
- **Telegram:** node-telegram-bot-api
- **Deployment:** Vercel

## 📝 Notlar

- Excel dosyanız şu kolonları içermelidir:
  - `İsim` - Ürün adı
  - `Stok:Merter Depo` - Stok miktarı
  - `Slug` - Ürün URL slug'ı
  - `Resim URL` - Ürün görselleri (noktalı virgülle ayrılmış)

- Telegram rate limiting'den kaçınmak için her ürün arasında 2 saniye bekleme süresi vardır

- Maksimum 10 görsel/ürün (Telegram limiti)

## 🐛 Sorun Giderme

### "Auth failed" hatası
- Google OAuth ayarlarını kontrol edin
- Callback URL'lerinin doğru olduğundan emin olun
- Supabase provider'ın aktif olduğunu kontrol edin

### "Telegram bot ayarları yapılmamış" hatası
- Environment variables'ları kontrol edin
- `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` değerlerinin doğru olduğundan emin olun

### Excel okuma hatası
- Dosya formatının .xlsx olduğundan emin olun
- Gerekli kolonların olduğunu kontrol edin
- Dosya boyutunun makul olduğundan emin olun (<5MB)

## 📄 Lisans

MIT

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır!
