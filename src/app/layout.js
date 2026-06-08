import "./globals.css";

export const metadata = {
  title: "Glowva | Arabic Makeup Intelligence",
  description: "Analyze makeup products, discover regional popularity, Gulf stores, and close alternatives.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://glowva-peach.vercel.app"),
  openGraph: {
    title: "Glowva",
    description: "ذكاء عربي لتحليل منتجات المكياج واكتشاف البدائل والمتاجر.",
    url: "https://glowva-peach.vercel.app",
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
  maximumScale: 1,
  themeColor: "#db2777",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
