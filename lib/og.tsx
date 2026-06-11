import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

// Shared building blocks for the opengraph-image routes. Everything renders
// through satori (next/og), which only supports a subset of CSS: flexbox,
// absolute positioning, and explicit `display: flex` on any element with
// multiple children.

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

// satori can't parse the woff2 files next/font downloads, so the ttf copies
// vendored in assets/og (from the `geist` npm package) are used instead.
const loadFont = (file: string) =>
  readFile(join(process.cwd(), "assets/og", file));

export async function ogFonts() {
  const [monoRegular, monoSemiBold, sansRegular, sansMedium] =
    await Promise.all([
      loadFont("GeistMono-Regular.ttf"),
      loadFont("GeistMono-SemiBold.ttf"),
      loadFont("Geist-Regular.ttf"),
      loadFont("Geist-Medium.ttf"),
    ]);
  return [
    { name: "Geist Mono", data: monoRegular, weight: 400, style: "normal" },
    { name: "Geist Mono", data: monoSemiBold, weight: 600, style: "normal" },
    { name: "Geist", data: sansRegular, weight: 400, style: "normal" },
    { name: "Geist", data: sansMedium, weight: 500, style: "normal" },
  ] as { name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" }[];
}

// Mirrors the DIFFICULTY_TONE pills on the lessons dashboard (light mode).
export const ogDifficultyTone: Record<string, { bg: string; color: string }> = {
  beginner: { bg: "#ecfdf5", color: "#047857" },
  intermediate: { bg: "#f0f9ff", color: "#0369a1" },
  advanced: { bg: "#fff1f2", color: "#be123c" },
};

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: 9999,
        backgroundColor: color,
      }}
    />
  );
}

// The common frame: a light terminal window, echoing the psql sandbox that
// every lesson runs in.
export function OgWindow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: "44px 52px",
        background: "linear-gradient(135deg, #fafafa 0%, #f4f4f5 55%, #d9f3e7 100%)",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          backgroundColor: "#ffffff",
          borderRadius: 20,
          border: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 26px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
            backgroundColor: "#fafafa",
          }}
        >
          <Dot color="#ff5f57" />
          <Dot color="#febc2e" />
          <Dot color="#28c840" />
          <span
            style={{
              marginLeft: 14,
              fontFamily: "Geist Mono",
              fontSize: 20,
              color: "#a1a1aa",
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "40px 56px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function OgPill({
  bg,
  color,
  children,
}: {
  bg: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: bg,
        color,
        borderRadius: 9999,
        padding: "6px 18px",
        fontSize: 22,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

// Geist has no U+2713 glyph (it renders as tofu), so checkmarks are drawn.
export function OgCheck({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M5 13l4 4 10-11"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OgPrompt({ command }: { command: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontFamily: "Geist Mono",
        fontSize: 26,
      }}
    >
      <span style={{ color: "#10b981", fontWeight: 600 }}>psql&gt;</span>
      {command && (
        <span style={{ color: "#52525b", marginLeft: 16 }}>{command}</span>
      )}
      <div
        style={{
          width: 14,
          height: 30,
          backgroundColor: "#10b981",
          marginLeft: 14,
        }}
      />
    </div>
  );
}
