"use client";

import { useEffect } from "react";

const KEY = "learn:scroll-anchor";

/** Call this before triggering a sign-in redirect to remember which element to scroll to on return. */
export function storeScrollAnchor(id: string) {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    // sessionStorage unavailable (private mode, etc.) — scroll restoration is best-effort
  }
}

/** Drop this component anywhere in the lesson page tree; it scrolls to the stored anchor on mount. */
export function ScrollToAnchor() {
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(KEY);
      if (id) sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  return null;
}
