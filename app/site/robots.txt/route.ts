import { DATABASE_TECH_URL, isIndexable } from "@/lib/database-tech";

export const dynamic = "force-static";

export const GET = () => {
  const body = isIndexable()
    ? `User-agent: *\nAllow: /\n\nSitemap: ${DATABASE_TECH_URL}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
