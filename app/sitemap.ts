import type { MetadataRoute } from "next";
import { getAllLessons } from "@/lib/lessons";
import { SITE_URL } from "@/lib/site";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const lessons = await getAllLessons();
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/lessons` },
    ...lessons.map((lesson) => ({
      url: `${SITE_URL}/lessons/${lesson.meta.slug}`,
    })),
  ];
};

export default sitemap;
