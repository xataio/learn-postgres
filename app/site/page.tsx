import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/site/Markdown";
import { PageList } from "@/components/site/PageList";
import {
  canonicalUrl,
  getHome,
  getSectionPages,
  SECTION_LABELS,
  SECTIONS,
  sitePath,
} from "@/lib/database-tech";

export const generateMetadata = async (): Promise<Metadata> => {
  const home = await getHome();
  return {
    title: { absolute: home?.title ?? "database.tech" },
    description: home?.description,
    alternates: { canonical: canonicalUrl("/") },
    openGraph: { url: canonicalUrl("/") },
  };
};

const SiteHome = async () => {
  const home = await getHome();
  if (!home) notFound();
  const sections = await Promise.all(
    SECTIONS.map(async (section) => ({
      section,
      pages: await getSectionPages(section),
    })),
  );
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">{home.title}</h1>
      <div className="mt-6">
        <Markdown source={home.body} />
      </div>
      {sections.map(({ section, pages }) => (
        <section key={section} className="mt-12">
          <h2 className="text-xl font-semibold">
            <Link href={sitePath(`/${section}`)} className="hover:underline">
              {SECTION_LABELS[section]}
            </Link>
          </h2>
          <PageList pages={pages} />
        </section>
      ))}
    </>
  );
};

export default SiteHome;
