import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/site/Markdown";
import { PageList } from "@/components/site/PageList";
import {
  canonicalUrl,
  getSectionIntro,
  getSectionPages,
  isSection,
  SECTIONS,
} from "@/lib/database-tech";

type Props = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export const generateStaticParams = () =>
  SECTIONS.map((section) => ({ section }));

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { section } = await params;
  if (!isSection(section)) return {};
  const intro = await getSectionIntro(section);
  return {
    title: intro?.title,
    description: intro?.description,
    alternates: { canonical: canonicalUrl(`/${section}`) },
    openGraph: { url: canonicalUrl(`/${section}`) },
  };
};

const SectionPage = async ({ params }: Props) => {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const intro = await getSectionIntro(section);
  if (!intro) notFound();
  const pages = await getSectionPages(section);
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">{intro.title}</h1>
      <div className="mt-6">
        <Markdown source={intro.body} />
      </div>
      <PageList pages={pages} />
    </>
  );
};

export default SectionPage;
