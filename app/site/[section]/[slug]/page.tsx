import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/site/Markdown";
import {
  canonicalUrl,
  getAllPages,
  getPage,
  isSection,
  LEARN_URL,
  SECTION_LABELS,
  type SitePage,
  sitePath,
} from "@/lib/database-tech";

type Props = { params: Promise<{ section: string; slug: string }> };

export const dynamicParams = false;

export const generateStaticParams = async () =>
  (await getAllPages()).map(({ section, slug }) => ({ section, slug }));

const loadPage = async ({ params }: Props) => {
  const { section, slug } = await params;
  return isSection(section) ? getPage(section, slug) : null;
};

export const generateMetadata = async (props: Props): Promise<Metadata> => {
  const page = await loadPage(props);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: canonicalUrl(page.path) },
    openGraph: { type: "article", url: canonicalUrl(page.path) },
  };
};

const jsonLd = (page: SitePage) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: page.title,
      description: page.description,
      url: canonicalUrl(page.path),
      publisher: {
        "@type": "Organization",
        name: "Xata",
        url: "https://xata.io",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "database.tech",
          item: canonicalUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: SECTION_LABELS[page.section],
          item: canonicalUrl(`/${page.section}`),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: page.title,
          item: canonicalUrl(page.path),
        },
      ],
    },
  ],
});

const ContentPage = async (props: Props) => {
  const page = await loadPage(props);
  if (!page) notFound();
  const all = await getAllPages();
  const related = page.related
    .map((path) => all.find((candidate) => candidate.path === `/${path}`))
    .filter((candidate): candidate is SitePage => Boolean(candidate));

  return (
    <article>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD built from repo content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)) }}
      />
      <Link
        href={sitePath(`/${page.section}`)}
        className="text-sm text-zinc-500 hover:underline"
      >
        {SECTION_LABELS[page.section]}
      </Link>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        {page.title}
      </h1>
      <div className="mt-8">
        <Markdown source={page.body} />
      </div>

      {page.lessons.length > 0 && (
        <aside className="mt-12 rounded-lg border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-semibold">Try it on your own copy</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {page.lessons.map((lesson) => (
              <li key={lesson.slug}>
                <a
                  href={`${LEARN_URL}/lessons/${lesson.slug}`}
                  className="underline"
                >
                  {lesson.anchor}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {related.length > 0 && (
        <nav className="mt-12">
          <h2 className="font-semibold">Related</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {related.map((item) => (
              <li key={item.path}>
                <Link href={sitePath(item.path)} className="underline">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
};

export default ContentPage;
