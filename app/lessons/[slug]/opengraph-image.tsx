import { ImageResponse } from "next/og";
import { getLesson } from "@/lib/lessons";
import {
  OgPill,
  OgPrompt,
  OgWindow,
  ogContentType,
  ogDifficultyTone,
  ogFonts,
  ogSize,
  truncate,
} from "@/lib/og";

export const alt = "A hands-on Postgres lesson on Learn Postgres";
export const size = ogSize;
export const contentType = ogContentType;

// Geist Mono is wide; scale the title down as it gets longer so even
// three-line titles stay inside the window.
function titleSize(title: string): number {
  if (title.length <= 26) return 72;
  if (title.length <= 52) return 56;
  return 44;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = await getLesson(slug);
  const fonts = await ogFonts();

  if (!lesson) {
    return new ImageResponse(
      (
        <OgWindow label="learn-postgres — psql">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: "Geist Mono",
                fontSize: 80,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "#18181b",
              }}
            >
              Learn Postgres
            </h1>
          </div>
        </OgWindow>
      ),
      { ...ogSize, fonts },
    );
  }

  const { meta } = lesson;
  const tone =
    ogDifficultyTone[meta.module.difficulty] ?? ogDifficultyTone.beginner;
  const checkCount = meta.checks.length;

  return new ImageResponse(
    (
      <OgWindow label={`learn-postgres — lessons/${truncate(slug, 40)}`}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Geist Mono",
              fontSize: 26,
              color: "#a1a1aa",
            }}
          >
            Module {String(meta.module.order).padStart(2, "0")} ·{" "}
            {truncate(meta.module.title, 40)}
          </span>
          <h1
            style={{
              margin: "16px 0 0",
              fontFamily: "Geist Mono",
              fontSize: titleSize(meta.title),
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "#18181b",
            }}
          >
            {truncate(meta.title, 80)}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 30,
            }}
          >
            <OgPill bg={tone.bg} color={tone.color}>
              {meta.module.difficulty}
            </OgPill>
            <OgPill bg="#f4f4f5" color="#3f3f46">
              {meta.estimatedMinutes} min
            </OgPill>
            {checkCount > 0 && (
              <OgPill bg="#f4f4f5" color="#3f3f46">
                {checkCount} {checkCount === 1 ? "check" : "checks"}
              </OgPill>
            )}
            {meta.tags.length > 0 && (
              <span
                style={{
                  fontFamily: "Geist Mono",
                  fontSize: 22,
                  color: "#a1a1aa",
                }}
              >
                {truncate(meta.tags.join(" · "), 36)}
              </span>
            )}
          </div>
        </div>
        <OgPrompt command={`\\i ${truncate(slug, 32)}.sql`} />
      </OgWindow>
    ),
    { ...ogSize, fonts },
  );
}
