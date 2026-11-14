import Link from "next/link";
import { type SitePage, sitePath } from "@/lib/database-tech";

export const PageList = ({ pages }: { pages: SitePage[] }) => (
  <ul className="mt-6 divide-y divide-black/5 dark:divide-white/5">
    {pages.map((page) => (
      <li key={page.path} className="py-4">
        <Link
          href={sitePath(page.path)}
          className="font-medium hover:underline"
        >
          {page.title}
        </Link>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {page.description}
        </p>
      </li>
    ))}
  </ul>
);
