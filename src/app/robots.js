export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/"],
    },
    sitemap: "https://glowva-peach.vercel.app/sitemap.xml",
  };
}
