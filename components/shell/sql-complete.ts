/**
 * Detect whether accumulated SQL input is a complete statement — i.e. its
 * last non-comment, non-whitespace character is `;` outside any string,
 * comment, or dollar-quoted block. psql does this server-side; we do it
 * client-side so multi-line input works without a roundtrip per Enter.
 *
 * Backslash meta-commands are also "complete" (they're submitted as-is).
 */
export function isStatementComplete(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("\\")) return true;

  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const n = input[i + 1];

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && n === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (dollarTag) {
      if (input.startsWith(dollarTag, i)) {
        i += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (inSingle) {
      if (c === "'" && n === "'") {
        i++;
      } else if (c === "'") {
        inSingle = false;
      }
      continue;
    }
    if (inDouble) {
      if (c === '"' && n === '"') {
        i++;
      } else if (c === '"') {
        inDouble = false;
      }
      continue;
    }

    if (c === "-" && n === "-") {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === "'") {
      inSingle = true;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      continue;
    }
    if (c === "$") {
      const m = input.slice(i).match(/^\$([A-Za-z_]\w*)?\$/);
      if (m) {
        dollarTag = m[0];
        i += dollarTag.length - 1;
      }
    }
  }

  if (inSingle || inDouble || inBlockComment || dollarTag) return false;
  // last non-whitespace char must be `;`
  return /;\s*$/.test(input);
}
