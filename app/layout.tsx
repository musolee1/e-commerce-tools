import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Pazar Yöneticim | E-Ticaret Yönetim Paneli",
    description: "Trendyol, İkas ve diğer pazaryerlerini tek panelden yönetin. Fiyat karşılaştırma, stok takibi ve Telegram entegrasyonu.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
