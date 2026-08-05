import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PoweredByXata } from "@/components/PoweredByXata";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves the og:image/twitter:image URLs emitted by the opengraph-image
  // routes to absolute URLs. Production is pinned to the canonical domain so
  // cards never point at the vercel.app alias; previews fall back to
  // NEXT_PUBLIC_APP_URL or the deployment URL.
  metadataBase:
    process.env.VERCEL_ENV === "production"
      ? new URL(SITE_URL)
      : process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL)
        : undefined,
  // Resolved against the current route, so every page asserts itself as the
  // original on the canonical host.
  alternates: { canonical: "./" },
  openGraph: { url: "./", siteName: "Learn Postgres" },
  title: "Learn Postgres",
  description: "Short, hands-on Postgres lessons in real disposable databases.",
};

// Runs before first paint so a stored theme choice never flashes the wrong
// mode. The shared badge page is a light-only design, so /badge/ paths never
// get the dark class (ForceLightTheme covers client-side navigation).
const themeInitScript = `try{var l=/^\\/badge\\//.test(location.pathname),t=localStorage.getItem("learn:theme"),d=!l&&(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <PoweredByXata />
      </body>
    </html>
  );
}
