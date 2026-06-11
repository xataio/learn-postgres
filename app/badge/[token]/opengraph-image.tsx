import { ImageResponse } from "next/og";
import { getBadgeByToken } from "@/lib/badge-share";
import {
  OgCheck,
  OgPrompt,
  OgWindow,
  ogContentType,
  ogFonts,
  ogSize,
  truncate,
} from "@/lib/og";

// Same reason as the badge page: never serve a cached image after the owner
// disabled sharing.
export const dynamic = "force-dynamic";

export const alt = "A Learn Postgres progress badge";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const badge = await getBadgeByToken(token);
  const fonts = await ogFonts();

  if (!badge) {
    return new ImageResponse(
      (
        <OgWindow label="learn-postgres — badge">
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
                fontSize: 72,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "#18181b",
              }}
            >
              Learn Postgres
            </h1>
            <p style={{ margin: "18px 0 0", fontSize: 30, color: "#52525b" }}>
              Short, hands-on Postgres exercises in real disposable databases.
            </p>
          </div>
        </OgWindow>
      ),
      { ...ogSize, fonts },
    );
  }

  const percent =
    badge.totalLessons > 0
      ? Math.round((badge.completedLessons / badge.totalLessons) * 100)
      : 0;

  return new ImageResponse(
    (
      <OgWindow label="learn-postgres — badge">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            flexGrow: 1,
          }}
        >
          {/* Replica of the shared badge card (BadgeCard3D content). The
              avatar is always the initial circle: satori fetching a remote
              avatar at request time would fail the whole image if the host
              hiccups. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 470,
              flexShrink: 0,
              backgroundColor: "#ffffff",
              borderRadius: 16,
              border: "1px solid rgba(0, 0, 0, 0.10)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)",
              padding: "26px 30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: 9999,
                    backgroundColor: "#f4f4f5",
                    fontFamily: "Geist Mono",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#52525b",
                  }}
                >
                  {badge.name.charAt(0).toUpperCase()}
                </div>
                {badge.isCourseComplete && (
                  <svg
                    viewBox="0 0 24 24"
                    width="46"
                    height="46"
                    style={{
                      position: "absolute",
                      top: -20,
                      left: -16,
                      transform: "rotate(-12deg)",
                      color: "#27272a",
                    }}
                  >
                    <path d="M12 3 22.8 8 12 13 1.2 8Z" fill="currentColor" />
                    <path
                      d="M6.2 10.4v3.1c0 1.7 2.6 3 5.8 3s5.8-1.3 5.8-3v-3.1l-5 2.3a2 2 0 0 1-1.6 0Z"
                      fill="currentColor"
                    />
                    <path
                      d="M21.6 9v4.3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="21.6" cy="14.6" r="1.3" fill="currentColor" />
                  </svg>
                )}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span
                  style={{
                    fontFamily: "Geist Mono",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#18181b",
                  }}
                >
                  {truncate(badge.name, 18)}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 20,
                    fontWeight: badge.isCourseComplete ? 500 : 400,
                    color: badge.isCourseComplete ? "#059669" : "#71717a",
                  }}
                >
                  {badge.isCourseComplete && (
                    <OgCheck size={18} color="#059669" />
                  )}
                  {badge.isCourseComplete
                    ? "Completed the course"
                    : `${badge.completedLessons} of ${badge.totalLessons} lessons completed`}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 10,
                  borderRadius: 9999,
                  backgroundColor: "#f4f4f5",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    borderRadius: 9999,
                    backgroundColor: "#10b981",
                  }}
                />
              </div>
              <span
                style={{
                  marginTop: 6,
                  alignSelf: "flex-end",
                  fontFamily: "Geist Mono",
                  fontSize: 16,
                  color: "#a1a1aa",
                }}
              >
                {percent}%
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
              }}
            >
              {badge.modules.map((m) => {
                const done = m.total > 0 && m.completed === m.total;
                const pill = done
                  ? { bg: "#ecfdf5", color: "#047857" }
                  : m.completed > 0
                    ? { bg: "#fffbeb", color: "#b45309" }
                    : { bg: "#f4f4f5", color: "#3f3f46" };
                return (
                  <div
                    key={m.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 20, color: "#3f3f46" }}>
                      {truncate(m.title, 30)}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 9999,
                        padding: "3px 12px",
                        fontSize: 16,
                        fontWeight: 500,
                        backgroundColor: pill.bg,
                        color: pill.color,
                      }}
                    >
                      {done && <OgCheck size={13} color={pill.color} />}
                      {m.completed}/{m.total}
                    </span>
                  </div>
                );
              })}
            </div>

            <span
              style={{
                marginTop: 18,
                paddingTop: 12,
                borderTop: "1px solid rgba(0, 0, 0, 0.05)",
                alignSelf: "center",
                fontFamily: "Geist Mono",
                fontSize: 16,
                color: "#a1a1aa",
              }}
            >
              learn-postgres
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 440 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "Geist Mono",
                fontSize: 52,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "#18181b",
              }}
            >
              Learn Postgres
            </h1>
            <p
              style={{
                margin: "16px 0 0",
                fontSize: 26,
                lineHeight: 1.45,
                color: "#52525b",
              }}
            >
              Short, hands-on Postgres exercises that run in real disposable
              databases.
            </p>
            <div style={{ display: "flex", marginTop: 28 }}>
              <OgPrompt command="" />
            </div>
          </div>
        </div>
      </OgWindow>
    ),
    { ...ogSize, fonts },
  );
}
