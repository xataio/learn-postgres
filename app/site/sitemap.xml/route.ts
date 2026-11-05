import { canonicalUrl, getAllPages, SECTIONS } from "@/lib/database-tech";

export const dynamic = "force-static";

export const GET = async () => {
  const pages = await getAllPages();
  const paths = [
    "/",
    ...SECTIONS.map((section) => `/${section}`),
    ...pages.map((page) => page.path),
  ];
  const urls = paths
    .map((path) => `  <url><loc>${canonicalUrl(path)}</loc></url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
