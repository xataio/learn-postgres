import { ImageResponse } from "next/og";
import { getModules } from "@/lib/lessons";
import {
  OgPill,
  OgWindow,
  ogContentType,
  ogDifficultyTone,
  ogFonts,
  ogSize,
  truncate,
} from "@/lib/og";

export const alt = "Browse the Learn Postgres lessons";
export const size = ogSize;
export const contentType = ogContentType;

// The window holds five rows comfortably; anything beyond collapses into a
// "+N more" line instead of overflowing the canvas.
const MAX_ROWS = 5;

export default async function Image() {
  const modules = await getModules();
  const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
  const shown = modules.slice(0, MAX_ROWS);
  const hidden = modules.length - shown.length;

  return new ImageResponse(
    (
      <OgWindow label="learn-postgres — \d lessons">
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "Geist Mono",
              fontSize: 54,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "#18181b",
            }}
          >
            All lessons
          </h1>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "Geist Mono",
              fontSize: 24,
              color: "#a1a1aa",
            }}
          >
            {lessonCount} lessons · {modules.length} modules
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginTop: 32,
          }}
        >
          {shown.map(({ module, lessons }) => {
            const tone =
              ogDifficultyTone[module.difficulty] ?? ogDifficultyTone.beginner;
            return (
              <div
                key={module.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  borderRadius: 12,
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  padding: "14px 24px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Geist Mono",
                    fontSize: 24,
                    color: "#a1a1aa",
                  }}
                >
                  {String(module.order).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: "Geist Mono",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#27272a",
                  }}
                >
                  {truncate(module.title, 38)}
                </span>
                <OgPill bg={tone.bg} color={tone.color}>
                  {module.difficulty}
                </OgPill>
                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "Geist Mono",
                    fontSize: 22,
                    color: "#a1a1aa",
                  }}
                >
                  {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
                </span>
              </div>
            );
          })}
          {hidden > 0 && (
            <span
              style={{
                fontFamily: "Geist Mono",
                fontSize: 22,
                color: "#a1a1aa",
                paddingLeft: 24,
              }}
            >
              +{hidden} more {hidden === 1 ? "module" : "modules"}
            </span>
          )}
        </div>
      </OgWindow>
    ),
    { ...ogSize, fonts: await ogFonts() },
  );
}
