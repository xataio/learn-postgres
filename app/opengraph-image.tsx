import { ImageResponse } from "next/og";
import {
  OgPill,
  OgPrompt,
  OgWindow,
  ogContentType,
  ogFonts,
  ogSize,
} from "@/lib/og";

export const alt =
  "Learn Postgres — short, hands-on lessons in real, disposable Postgres databases";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image() {
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
          <OgPrompt command="SELECT * FROM lessons;" />
          <h1
            style={{
              margin: "28px 0 0",
              fontFamily: "Geist Mono",
              fontSize: 88,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "#18181b",
            }}
          >
            Learn Postgres
          </h1>
          <p
            style={{
              margin: "20px 0 0",
              maxWidth: 820,
              fontSize: 32,
              lineHeight: 1.4,
              color: "#52525b",
            }}
          >
            Short, hands-on lessons in real, disposable Postgres instances. No
            setup, no docker, no resets.
          </p>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <OgPill bg="#ecfdf5" color="#047857">
            Real Postgres
          </OgPill>
          <OgPill bg="#f4f4f5" color="#3f3f46">
            psql-like terminal
          </OgPill>
          <OgPill bg="#f4f4f5" color="#3f3f46">
            Free &amp; open source
          </OgPill>
        </div>
      </OgWindow>
    ),
    { ...ogSize, fonts: await ogFonts() },
  );
}
