"use client";

import { useLayoutEffect } from "react";

// The shared badge is a light-only design. The root layout's theme init
// script already skips /badge/ paths on first load; this handles client-side
// navigation into and out of the badge page.
export function ForceLightTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    return () => {
      if (wasDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);
  return null;
}
