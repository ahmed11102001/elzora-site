import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "@/lib/site";

// Preview and staging deployments stay out of search results unless ALLOW_INDEXING=true.
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
