import type { QueryResult, ResultBlock } from "@/lib/shell/types";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
} as const;

function padRight(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
  return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

function isNumberLike(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s);
}

function valueToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatBlock(
  block: ResultBlock,
  opts: { footer?: boolean } = {},
): string[] {
  const footer = opts.footer ?? true;
  const lines: string[] = [];

  if (block.fields.length === 0) {
    if (block.command) {
      const tag =
        block.command === "INSERT"
          ? `INSERT 0 ${block.rowCount ?? 0}`
          : block.rowCount != null
            ? `${block.command} ${block.rowCount}`
            : block.command;
      lines.push(tag);
    }
    return lines;
  }

  const headers = block.fields.map((f) => f.name);
  const cells = block.rows.map((row) => row.map(valueToString));

  const widths = headers.map((h, i) => {
    let max = h.length;
    for (const r of cells) {
      const v = r[i] ?? "";
      if (v.length > max) max = v.length;
    }
    return max;
  });

  // Header
  lines.push(
    headers.map((h, i) => ` ${padRight(h, widths[i])} `).join("|").replace(/\s+$/, ""),
  );
  // Separator
  lines.push(widths.map((w) => "-".repeat(w + 2)).join("+"));
  // Rows
  for (const r of cells) {
    const line = r
      .map((v, i) => {
        const aligned = isNumberLike(v) ? padLeft(v, widths[i]) : padRight(v, widths[i]);
        return ` ${aligned} `;
      })
      .join("|")
      .replace(/\s+$/, "");
    lines.push(line);
  }
  // Footer
  if (footer) {
    const rc = block.rowCount ?? cells.length;
    lines.push(`(${rc} ${rc === 1 ? "row" : "rows"})`);
  }
  if (block.truncated) {
    lines.push(
      `${ANSI.yellow}-- output capped at ${cells.length} rows --${ANSI.reset}`,
    );
  }

  return lines;
}

export function formatQueryResult(result: QueryResult): string {
  const lines: string[] = [];

  if (!result.ok) {
    lines.push(`${ANSI.red}ERROR:${ANSI.reset} ${result.error}`);
    if (result.detail) lines.push(`${ANSI.dim}DETAIL: ${result.detail}${ANSI.reset}`);
    if (result.hint) lines.push(`${ANSI.dim}HINT:   ${result.hint}${ANSI.reset}`);
    if (result.code) lines.push(`${ANSI.dim}CODE:   ${result.code}${ANSI.reset}`);
    return lines.join("\r\n") + "\r\n";
  }

  for (const n of result.notices) {
    lines.push(`${ANSI.yellow}${n}${ANSI.reset}`);
  }

  for (let i = 0; i < result.results.length; i++) {
    if (i > 0) lines.push("");
    lines.push(...formatBlock(result.results[i]));
  }

  lines.push(`${ANSI.dim}Time: ${result.durationMs} ms${ANSI.reset}`);

  return lines.join("\r\n") + "\r\n";
}

export function formatClientMessage(text: string): string {
  // The terminal runs with convertEol disabled, so bare "\n" would move down a
  // row without returning to column 0 (the staircase effect). Normalize to CRLF.
  const normalized = text.replace(/\r?\n/g, "\r\n");
  return `${ANSI.cyan}${normalized}${ANSI.reset}\r\n`;
}

export function formatClientError(text: string): string {
  return `${ANSI.red}${text}${ANSI.reset}\r\n`;
}

/** One rendered piece of a `\d NAME` describe, assembled by the orchestrator. */
export type DescribeItem =
  | { kind: "heading"; text: string }
  | { kind: "table"; block: ResultBlock }
  | { kind: "list"; caption: string; lines: string[] };

/**
 * Render the multi-section output of `\d NAME`: a bold heading, the column
 * table (no row-count footer), then captioned lists of indexes / FKs /
 * referenced-by whose text lines come pre-indented from SQL. Sections with no
 * rows are omitted, matching psql.
 */
export function formatDescribe(
  items: DescribeItem[],
  durationMs: number,
): string {
  const lines: string[] = [];
  for (const item of items) {
    if (item.kind === "heading") {
      lines.push(`${ANSI.bold}${item.text}${ANSI.reset}`);
    } else if (item.kind === "table") {
      lines.push(...formatBlock(item.block, { footer: false }));
    } else {
      if (item.lines.length === 0) continue;
      lines.push(item.caption);
      lines.push(...item.lines);
    }
  }
  lines.push(`${ANSI.dim}Time: ${durationMs} ms${ANSI.reset}`);
  return lines.join("\r\n") + "\r\n";
}
