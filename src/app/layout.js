import "./globals.css";

export const metadata = {
  title: "Glowva | ذكاء المكياج العربي",
  description: "حللي منتجات المكياج واكتشفي انتشارها، المتاجر الخليجية، والبدائل الأقرب.",
  manifest: "/manifest.json",
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
