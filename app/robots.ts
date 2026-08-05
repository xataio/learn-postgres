import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// No Disallow for the vercel.app host: Google must be able to follow its 308s.
const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/", disallow: "/api/" },
  sitemap: `${SITE_URL}/sitemap.xml`,
});

export default robots;
