import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ronda-tawny-xi.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-18T10:00:00.000Z");
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/visor`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/privacidade`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
