"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * Tilts its children toward the cursor with a moving glare highlight. Writes
 * CSS variables directly on the element so pointer moves never trigger React
 * re-renders. Touch pointers and prefers-reduced-motion get a static card.
 */
export function BadgeCard3D({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    el.style.setProperty("--go", "1");
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--go", "0");
  };

  return (
    <div style={{ perspective: "1000px" }}>
      <div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="relative rounded-2xl border border-black/10 bg-white shadow-xl transition-transform duration-150 ease-out will-change-transform motion-reduce:!transform-none"
        style={{
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            opacity: "var(--go, 0)",
            background:
              "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.25), transparent 60%)",
          }}
        />
      </div>
    </div>
  );
}
