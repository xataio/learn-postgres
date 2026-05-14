import { isStatementComplete } from "./sql-complete";

const PROMPT_PRIMARY = "\x1b[36mlearn=>\x1b[0m ";
const PROMPT_CONT = "\x1b[2mlearn->\x1b[0m ";

export type ReadlineHandlers = {
  write: (s: string) => void;
  onSubmit: (statement: string) => void | Promise<void>;
};

export class Readline {
  private buffer = "";
  private accumulated: string[] = [];
  private historyIdx: number | null = null;
  private savedDraft = "";
  private busy = false;

  constructor(
    private readonly handlers: ReadlineHandlers,
    private readonly getHistory: () => string[],
  ) {}

  setBusy(busy: boolean): void {
    this.busy = busy;
  }

  /** Write the initial prompt — call once after the terminal mounts. */
  start(): void {
    this.handlers.write(PROMPT_PRIMARY);
  }

  /** Write a fresh prompt after a command finishes. */
  promptAgain(): void {
    this.buffer = "";
    this.accumulated = [];
    this.historyIdx = null;
    this.handlers.write(PROMPT_PRIMARY);
  }

  /** External pathway (e.g. RunBlock button) — print and submit immediately. */
  inject(statement: string): void {
    if (this.busy) return;
    const text = statement.trim();
    if (!text) return;

    // If the user was mid-typing, abort that input first.
    if (this.buffer || this.accumulated.length > 0) {
      this.handlers.write("\r\n");
    }
    this.handlers.write(text + "\r\n");
    this.buffer = "";
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
    if (seq === "\r") return this.onEnter();
    if (seq === "\x7f" || seq === "\b") return this.onBackspace();
    if (seq === "\x1b[A") return this.onUp();
    if (seq === "\x1b[B") return this.onDown();
    if (seq === "\x03") return this.onCtrlC();
    if (seq === "\x0c") return this.onCtrlL();
    if (seq.startsWith("\x1b")) return; // unhandled escape — ignore
    if (seq < " " && seq !== "\t") return;

    this.buffer += seq;
    this.handlers.write(seq);
  }

  private onEnter(): void {
    this.handlers.write("\r\n");
    const full = [...this.accumulated, this.buffer].join("\n");

    if (isStatementComplete(full)) {
      this.buffer = "";
      this.accumulated = [];
      this.historyIdx = null;
      void this.handlers.onSubmit(full);
    } else {
      this.accumulated.push(this.buffer);
      this.buffer = "";
      this.handlers.write(PROMPT_CONT);
    }
  }

  private onBackspace(): void {
    if (this.buffer.length === 0) return;
    this.buffer = this.buffer.slice(0, -1);
    this.handlers.write("\b \b");
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
    if (this.buffer.length > 0) {
      this.handlers.write("\b \b".repeat(this.buffer.length));
    }
    this.buffer = next;
    this.handlers.write(next);
  }

  private onCtrlC(): void {
    this.handlers.write("^C\r\n");
    this.buffer = "";
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
  }
}

/**
 * xterm.onData can deliver several keystrokes coalesced into one string
 * (especially when pasting). Split into atomic sequences so the dispatcher
 * sees CSI codes (\x1b[A …) as single tokens.
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
    out.push(c);
    i++;
  }
  return out;
}
