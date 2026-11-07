"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  callbackURL?: string;
  variant?: "default" | "inline";
  children?: ReactNode;
  // Kept for call-site compatibility; scroll restore happens after /sign-in
  // when the destination lesson page reads sessionStorage.
  preserveScroll?: boolean;
};

/**
 * Routes to the sign-in page (email + GitHub) instead of jumping straight
 * into GitHub OAuth — beginners without a GitHub account need a path in.
 */
export function SignInButton({
  callbackURL = "/lessons",
  variant = "default",
  children,
  preserveScroll = false,
}: Props) {
  const href = `/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`;

  const onClick = () => {
    if (preserveScroll) {
      try {
        sessionStorage.setItem(
          `learn:scroll-restore:${callbackURL}`,
          String(window.scrollY),
        );
      } catch {
        // ignore
      }
    }
  };

  const isInline = variant === "inline";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        isInline
          ? "inline-flex items-center gap-1.5 rounded border border-black/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/[.04]"
          : "flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
      }
    >
      {children ?? "Sign in"}
    </Link>
  );
}
