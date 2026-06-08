import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://glowva-peach.vercel.app";

export const metadata = {
  title: "Glowva | ذكاء عربي للمكياج",
  description: "حللي منتجات المكياج بالاسم أو الصورة، واكتشفي الشعبية والمتاجر والبدائل الأقرب.",
  manifest: "/manifest.json",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Glowva",
    description: "ذكاء عربي لتحليل منتجات المكياج واكتشاف البدائل والمتاجر.",
    url: siteUrl,
    siteName: "Glowva",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Glowva",
    description: "ذكاء عربي لتحليل منتجات المكياج واكتشاف البدائل والمتاجر.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#db2777",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
