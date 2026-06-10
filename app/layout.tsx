import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PoweredByXata } from "@/components/PoweredByXata";
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
  title: "Learn Postgres",
  description: "Short, hands-on Postgres lessons in real disposable databases.",
};

// Runs before first paint so a stored theme choice never flashes the wrong mode.
const themeInitScript = `try{var t=localStorage.getItem("learn:theme"),d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}`;

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
