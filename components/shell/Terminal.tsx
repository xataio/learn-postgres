"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import { Readline } from "./readline";
import { clearHistory, loadHistory, pushHistory } from "./history";
import { expandMeta } from "./meta";
import {
  formatClientError,
  formatClientMessage,
  formatQueryResult,
} from "./format";
import type { QueryResult } from "@/lib/shell/types";

const BANNER = [
  "\x1b[2mlearn-postgres shell — type \\? for help, \\d to list relations.\x1b[0m",
  "",
].join("\r\n") + "\r\n";

const THEME = {
  background: "#09090b",
  foreground: "#e4e4e7",
  cursor: "#e4e4e7",
  cursorAccent: "#09090b",
  selectionBackground: "#3f3f46",
  black: "#27272a",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e4e4e7",
  brightBlack: "#52525b",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#fafafa",
};

type Props = { lessonSlug: string };

export function Terminal({ lessonSlug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let term: import("@xterm/xterm").Terminal | null = null;
    let fit: import("@xterm/addon-fit").FitAddon | null = null;
    let dataDisposable: { dispose(): void } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let runHandler: ((e: Event) => void) | null = null;
    let clearHandler: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (cancelled) return;

      term = new XTerm({
        cursorBlink: true,
        fontFamily:
          'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Mono", monospace',
        fontSize: 13,
        lineHeight: 1.25,
        theme: THEME,
        scrollback: 5000,
        convertEol: false,
      });
      fit = new FitAddon();
      term.loadAddon(fit);
      term.open(container);
      fit.fit();
      term.focus();

      const write = (s: string) => term?.write(s);

      const readline: Readline = new Readline(
        {
          write,
          onSubmit: (stmt: string) =>
            handleSubmit(stmt, write, readline, lessonSlug),
        },
        loadHistory,
      );

      write(BANNER);
      readline.start();

      dataDisposable = term.onData((d) => readline.handleData(d));

      const fitNow = () => {
        try {
          fit?.fit();
        } catch {
          /* container not yet sized */
        }
      };

      resizeObserver = new ResizeObserver(fitNow);
      resizeObserver.observe(container);
      window.addEventListener("resize", fitNow);

      runHandler = (e: Event) => {
        const detail = (e as CustomEvent<{ sql: string }>).detail;
        if (detail?.sql) readline.inject(detail.sql);
        term?.focus();
      };
      window.addEventListener("learn:run", runHandler);

      clearHandler = () => {
        clearHistory();
        term?.clear();
        term?.write(BANNER);
        readline.promptAgain();
        term?.focus();
      };
      window.addEventListener("learn:clear-shell", clearHandler);
    })();

    return () => {
      cancelled = true;
      dataDisposable?.dispose();
      resizeObserver?.disconnect();
      if (runHandler) window.removeEventListener("learn:run", runHandler);
      if (clearHandler)
        window.removeEventListener("learn:clear-shell", clearHandler);
      term?.dispose();
    };
  }, [lessonSlug]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-black/10 bg-[#09090b] dark:border-white/10">
      <div ref={containerRef} className="h-full w-full p-3" />
    </div>
  );
}

async function handleSubmit(
  raw: string,
  write: (s: string) => void,
  readline: Readline,
  lessonSlug: string,
): Promise<void> {
  const stmt = raw.trim();
  if (!stmt) {
    readline.promptAgain();
    return;
  }

  pushHistory(stmt);

  // Meta-command handling
  if (stmt.startsWith("\\")) {
    const firstLine = stmt.split(/\r?\n/)[0];
    const meta = expandMeta(firstLine);
    if (meta.kind === "message") {
      write(formatClientMessage(meta.text));
      readline.promptAgain();
      return;
    }
    if (meta.kind === "error") {
      write(formatClientError(meta.message));
      readline.promptAgain();
      return;
    }
    // meta.kind === "query" — execute the translated SQL
    await runOnServer(meta.sql, write, lessonSlug);
    readline.promptAgain();
    return;
  }

  readline.setBusy(true);
  try {
    await runOnServer(stmt, write, lessonSlug);
  } finally {
    readline.setBusy(false);
    readline.promptAgain();
  }
}

async function runOnServer(
  sql: string,
  write: (s: string) => void,
  lessonSlug: string,
): Promise<void> {
  try {
    const res = await fetch(
      `/api/lessons/${encodeURIComponent(lessonSlug)}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      },
    );
    const json = (await res.json()) as QueryResult | { error?: string };

    if (res.status === 401) {
      write(formatClientError("Not authenticated — refresh the page."));
      return;
    }
    if (res.status === 404) {
      write(
        formatClientError(
          "No sandbox for this lesson — refresh the page to prepare one.",
        ),
      );
      return;
    }
    if ("ok" in json) {
      write(formatQueryResult(json));
      return;
    }
    write(formatClientError(json.error ?? `Request failed (${res.status})`));
  } catch (err) {
    write(formatClientError(`Network error: ${(err as Error).message}`));
  }
}
