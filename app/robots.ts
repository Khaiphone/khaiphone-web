import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/finance/", "/stock/", "/api/"],
      },
    ],
    sitemap: "https://khaiphone.com/sitemap.xml",
  };
}
