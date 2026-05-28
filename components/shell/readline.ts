import { isStatementComplete } from "./sql-complete";

const PROMPT_PRIMARY = "\x1b[36mlearn=>\x1b[0m ";
const PROMPT_CONT = "\x1b[2mlearn->\x1b[0m ";

export type ReadlineHandlers = {
  write: (s: string) => void;
  onSubmit: (statement: string) => void | Promise<void>;
};

export type Completer = (prefix: string) => string[];

/**
 * Tiny readline state machine. We track an explicit cursor index so the
 * standard editing keys (arrows, home/end, ctrl-a/e/w/u/k) all work mid-line.
 *
 * Redraw model: every mutating action emits ANSI sequences to (a) update the
 * tail of the visible line and (b) reposition the cursor. Cheap enough for
 * the size of inputs we ever see in a shell.
 */
export class Readline {
  private buffer = "";
  private cursor = 0;
  private accumulated: string[] = [];
  private historyIdx: number | null = null;
  private savedDraft = "";
  private busy = false;

  constructor(
    private readonly handlers: ReadlineHandlers,
    private readonly getHistory: () => string[],
    private readonly completer: Completer = () => [],
  ) {}

  setBusy(busy: boolean): void {
    this.busy = busy;
  }

  start(): void {
    this.handlers.write(PROMPT_PRIMARY);
  }

  promptAgain(): void {
    this.buffer = "";
    this.cursor = 0;
    this.accumulated = [];
    this.historyIdx = null;
    this.handlers.write(PROMPT_PRIMARY);
  }

  inject(statement: string): void {
    if (this.busy) return;
    const text = statement.trim();
    if (!text) return;

    if (this.buffer || this.accumulated.length > 0) {
      this.handlers.write("\r\n");
    }
    this.handlers.write(text + "\r\n");
    this.buffer = "";
    this.cursor = 0;
    this.accumulated = [];
    this.historyIdx = null;
    void this.handlers.onSubmit(text);
  }

  handleData(data: string): void {
    if (this.busy) return;
    for (const seq of splitSequences(data)) {
      this.dispatch(seq);
    }
  }

  private dispatch(seq: string): void {
    // Control characters first.
    switch (seq) {
      case "\r":
        return this.onEnter();
      case "\x7f": // backspace (DEL)
      case "\b":
        return this.onBackspace();
      case "\x03": // Ctrl-C
        return this.onCtrlC();
      case "\x0c": // Ctrl-L
        return this.onCtrlL();
      case "\x01": // Ctrl-A — beginning of line
        return this.moveHome();
      case "\x05": // Ctrl-E — end of line
        return this.moveEnd();
      case "\x02": // Ctrl-B — back one char
        return this.moveLeft();
      case "\x06": // Ctrl-F — forward one char
        return this.moveRight();
      case "\x04": // Ctrl-D — delete forward (or EOF on empty line)
        return this.onCtrlD();
      case "\x0b": // Ctrl-K — kill to end of line
        return this.killToEnd();
      case "\x15": // Ctrl-U — kill to start of line
        return this.killToStart();
      case "\x17": // Ctrl-W — kill previous word
        return this.killPreviousWord();
      case "\x1b[A":
        return this.onUp();
      case "\x1b[B":
        return this.onDown();
      case "\x1b[C":
        return this.moveRight();
      case "\x1b[D":
        return this.moveLeft();
      case "\x1b[H":
      case "\x1b[1~":
        return this.moveHome();
      case "\x1b[F":
      case "\x1b[4~":
        return this.moveEnd();
      case "\x1b[3~":
        return this.deleteForward();
      case "\x1bb": // Alt-B — word back
        return this.moveWordLeft();
      case "\x1bf": // Alt-F — word forward
        return this.moveWordRight();
    }

    if (seq === "\t") return this.onTab();
    if (seq.startsWith("\x1b")) {
      // Some keyboard layouts (e.g. Spanish/German on macOS) require Option to
      // produce characters like `@` or `\`, and the terminal can deliver those
      // as `Esc <char>`. Treat an unknown Alt-printable as the bare character
      // so meta commands like `\d` and email-style input still work.
      if (seq.length === 2 && seq[1] >= " " && seq[1] !== "\x7f") {
        return this.insert(seq[1]);
      }
      return;
    }
    if (seq < " ") return;

    this.insert(seq);
  }

  private onTab(): void {
    let i = this.cursor;
    while (i > 0 && /[A-Za-z0-9_]/.test(this.buffer[i - 1])) i--;
    const prefix = this.buffer.slice(i, this.cursor);
    if (!prefix) return;

    const matches = this.completer(prefix);
    if (matches.length === 0) return;

    if (matches.length === 1) {
      const remaining = matches[0].slice(prefix.length);
      if (remaining) this.insert(remaining + " ");
      else this.insert(" ");
      return;
    }

    const lcp = longestCommonPrefix(matches);
    if (lcp.length > prefix.length) {
      this.insert(lcp.slice(prefix.length));
    }
  }

  // ---------- insertion / deletion ----------

  private insert(text: string): void {
    const before = this.buffer.slice(0, this.cursor);
    const after = this.buffer.slice(this.cursor);
    this.buffer = before + text + after;
    this.cursor += text.length;

    // Write inserted text, then the tail (so it appears past the cursor),
    // clear anything stale to EOL, then move the cursor back over the tail.
    this.handlers.write(text + after + "\x1b[K");
    if (after.length > 0) this.handlers.write(`\x1b[${after.length}D`);
  }

  private onBackspace(): void {
    if (this.cursor === 0) {
      // On an empty continuation line, fold back into the previous line so the
      // user can keep editing it. The prompts are the same visible width, so
      // a plain `\x1b[A` after clearing keeps the cursor in column 8 (just
      // past the prompt); we then walk forward to the end of the restored
      // buffer.
      if (this.buffer.length === 0 && this.accumulated.length > 0) {
        const prev = this.accumulated.pop()!;
        this.handlers.write("\r\x1b[K\x1b[A");
        if (prev.length > 0) this.handlers.write(`\x1b[${prev.length}C`);
        this.buffer = prev;
        this.cursor = prev.length;
      }
      return;
    }
    const before = this.buffer.slice(0, this.cursor - 1);
    const after = this.buffer.slice(this.cursor);
    this.buffer = before + after;
    this.cursor--;
    this.handlers.write("\b" + after + " \x1b[K");
    // We wrote tail + space; cursor is now `after.length + 1` past where it
    // needs to be.
    this.handlers.write(`\x1b[${after.length + 1}D`);
  }

  private deleteForward(): void {
    if (this.cursor >= this.buffer.length) return;
    const before = this.buffer.slice(0, this.cursor);
    const after = this.buffer.slice(this.cursor + 1);
    this.buffer = before + after;
    this.handlers.write(after + " \x1b[K");
    this.handlers.write(`\x1b[${after.length + 1}D`);
  }

  private onCtrlD(): void {
    if (this.buffer.length === 0 && this.accumulated.length === 0) return;
    this.deleteForward();
  }

  private killToEnd(): void {
    if (this.cursor >= this.buffer.length) return;
    this.buffer = this.buffer.slice(0, this.cursor);
    this.handlers.write("\x1b[K");
  }

  private killToStart(): void {
    if (this.cursor === 0) return;
    const after = this.buffer.slice(this.cursor);
    const back = this.cursor;
    this.buffer = after;
    this.cursor = 0;
    this.handlers.write(`\x1b[${back}D` + after + "\x1b[K");
    if (after.length > 0) this.handlers.write(`\x1b[${after.length}D`);
  }

  private killPreviousWord(): void {
    if (this.cursor === 0) return;
    let i = this.cursor;
    while (i > 0 && /\s/.test(this.buffer[i - 1])) i--;
    while (i > 0 && /\S/.test(this.buffer[i - 1])) i--;
    if (i === this.cursor) return;
    const removed = this.cursor - i;
    const before = this.buffer.slice(0, i);
    const after = this.buffer.slice(this.cursor);
    this.buffer = before + after;
    this.cursor = i;
    this.handlers.write(`\x1b[${removed}D` + after + "\x1b[K");
    if (after.length > 0) this.handlers.write(`\x1b[${after.length}D`);
  }

  // ---------- cursor movement ----------

  private moveLeft(): void {
    if (this.cursor === 0) return;
    this.cursor--;
    this.handlers.write("\x1b[D");
  }

  private moveRight(): void {
    if (this.cursor >= this.buffer.length) return;
    this.cursor++;
    this.handlers.write("\x1b[C");
  }

  private moveHome(): void {
    if (this.cursor === 0) return;
    this.handlers.write(`\x1b[${this.cursor}D`);
    this.cursor = 0;
  }

  private moveEnd(): void {
    const dist = this.buffer.length - this.cursor;
    if (dist === 0) return;
    this.handlers.write(`\x1b[${dist}C`);
    this.cursor = this.buffer.length;
  }

  private moveWordLeft(): void {
    if (this.cursor === 0) return;
    let i = this.cursor;
    while (i > 0 && /\s/.test(this.buffer[i - 1])) i--;
    while (i > 0 && /\S/.test(this.buffer[i - 1])) i--;
    const delta = this.cursor - i;
    if (delta === 0) return;
    this.handlers.write(`\x1b[${delta}D`);
    this.cursor = i;
  }

  private moveWordRight(): void {
    if (this.cursor >= this.buffer.length) return;
    let i = this.cursor;
    while (i < this.buffer.length && /\s/.test(this.buffer[i])) i++;
    while (i < this.buffer.length && /\S/.test(this.buffer[i])) i++;
    const delta = i - this.cursor;
    if (delta === 0) return;
    this.handlers.write(`\x1b[${delta}C`);
    this.cursor = i;
  }

  // ---------- enter / history / interrupt ----------

  private onEnter(): void {
    this.handlers.write("\r\n");
    const full = [...this.accumulated, this.buffer].join("\n");

    if (isStatementComplete(full)) {
      this.buffer = "";
      this.cursor = 0;
      this.accumulated = [];
      this.historyIdx = null;
      void this.handlers.onSubmit(full);
    } else {
      this.accumulated.push(this.buffer);
      this.buffer = "";
      this.cursor = 0;
      this.handlers.write(PROMPT_CONT);
    }
  }

  private onUp(): void {
    const history = this.getHistory();
    if (history.length === 0) return;
    if (this.historyIdx === null) {
      this.savedDraft = this.buffer;
      this.historyIdx = history.length - 1;
    } else if (this.historyIdx > 0) {
      this.historyIdx--;
    } else {
      return;
    }
    this.replaceBuffer(history[this.historyIdx]);
  }

  private onDown(): void {
    if (this.historyIdx === null) return;
    const history = this.getHistory();
    if (this.historyIdx < history.length - 1) {
      this.historyIdx++;
      this.replaceBuffer(history[this.historyIdx]);
    } else {
      this.historyIdx = null;
      this.replaceBuffer(this.savedDraft);
      this.savedDraft = "";
    }
  }

  private replaceBuffer(next: string): void {
    // Move cursor to start of current buffer, clear to EOL, write new content.
    if (this.cursor > 0) this.handlers.write(`\x1b[${this.cursor}D`);
    this.handlers.write("\x1b[K" + next);
    this.buffer = next;
    this.cursor = next.length;
  }

  private onCtrlC(): void {
    this.handlers.write("^C\r\n");
    this.buffer = "";
    this.cursor = 0;
    this.accumulated = [];
    this.historyIdx = null;
    this.handlers.write(PROMPT_PRIMARY);
  }

  private onCtrlL(): void {
    this.handlers.write("\x1b[2J\x1b[H");
    this.handlers.write(
      this.accumulated.length > 0 ? PROMPT_CONT : PROMPT_PRIMARY,
    );
    this.handlers.write(this.buffer);
    if (this.cursor < this.buffer.length) {
      this.handlers.write(`\x1b[${this.buffer.length - this.cursor}D`);
    }
  }
}

function longestCommonPrefix(items: string[]): string {
  if (items.length === 0) return "";
  let prefix = items[0];
  for (let i = 1; i < items.length && prefix; i++) {
    while (!items[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

/**
 * Split a chunk from xterm.onData into atomic sequences so the dispatcher
 * can match CSI / SS3 codes (\x1b[A …, \x1bO~, etc.) as single tokens, plus
 * Alt-modified bytes (\x1bb, \x1bf) used for word-wise movement.
 */
function splitSequences(data: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < data.length) {
    const c = data[i];
    if (c === "\x1b" && data[i + 1] === "[") {
      const m = data.slice(i + 2).match(/^[\d;]*[A-Za-z~]/);
      if (m) {
        out.push(data.slice(i, i + 2 + m[0].length));
        i += 2 + m[0].length;
        continue;
      }
    }
    if (c === "\x1b" && data[i + 1] === "O" && data[i + 2]) {
      out.push(data.slice(i, i + 3));
      i += 3;
      continue;
    }
    if (c === "\x1b" && data[i + 1] && data[i + 1] !== "[" && data[i + 1] !== "O") {
      out.push(data.slice(i, i + 2));
      i += 2;
      continue;
    }
    out.push(c);
    i++;
  }
  return out;
}
