"use client";

import { useEffect } from "react";

// Restores the scroll offset stashed by a sign-in CTA before the OAuth
// round-trip, so the reader lands back where they were on the lesson.
export function RestoreScroll() {
  useEffect(() => {
    const key = `learn:scroll-restore:${window.location.pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved === null) return;
    sessionStorage.removeItem(key);

    const y = Number.parseInt(saved, 10);
    if (Number.isNaN(y)) return;

    // Wait for the SSR'd prose to lay out before jumping.
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, []);

  return null;
}
