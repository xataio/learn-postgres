import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { ComponentProps } from "react";
import remarkGfm from "remark-gfm";
import { sitePath } from "@/lib/database-tech";

const MarkdownLink = ({ href = "", ...props }: ComponentProps<"a">) =>
  href.startsWith("/") ? (
    <Link href={sitePath(href)} {...props} />
  ) : (
    <a href={href} {...props} />
  );

export const Markdown = ({ source }: { source: string }) => (
  <div className="prose prose-zinc max-w-none dark:prose-invert">
    <MDXRemote
      source={source}
      components={{ a: MarkdownLink }}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
    />
  </div>
);
