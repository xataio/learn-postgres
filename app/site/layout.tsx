import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DATABASE_TECH_URL,
  LEARN_URL,
  SECTION_LABELS,
  SECTIONS,
  sitePath,
} from "@/lib/database-tech";

export const metadata: Metadata = {
  metadataBase: new URL(DATABASE_TECH_URL),
  title: { default: "database.tech", template: "%s | database.tech" },
  openGraph: { siteName: "database.tech" },
};

const SiteLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-1 flex-col">
    <header className="border-b border-black/5 px-6 py-4 dark:border-white/5">
      <nav className="mx-auto flex max-w-3xl items-center gap-6 text-sm">
        <Link href={sitePath("/")} className="font-mono font-semibold">
          database.tech
        </Link>
        {SECTIONS.map((section) => (
          <Link
            key={section}
            href={sitePath(`/${section}`)}
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {SECTION_LABELS[section]}
          </Link>
        ))}
        <a
          href={LEARN_URL}
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Learn
        </a>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </nav>
    </header>
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      {children}
    </main>
    <p className="px-6 pb-2 text-center text-xs text-zinc-500">
      database.tech is written by the team at Xata.
    </p>
  </div>
);

export default SiteLayout;
