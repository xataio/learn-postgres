"use client";

import { useCallback, useState } from "react";

export type PrepPhase = "branching" | "seeding" | "ready" | "error";

type PrepEvent =
  | { phase: "branching" }
  | { phase: "seeding" }
  | { phase: "ready"; branch: { name: string } }
  | { phase: "error"; message: string; retryAfterSeconds?: number };

type RunResult =
  | { ok: true; branchName: string }
  | { ok: false; error: string };

/**
 * Drive the streaming /prepare endpoint, surfacing the live branching/seeding
 * phases. `run` POSTs, reads the NDJSON stream, and resolves once the branch is
 * ready (or errored). `phase` reflects the current stage for the progress UI;
 * `clear` resets it back to idle after the caller has handled the result.
 */
export function usePrepareStream(lessonSlug: string) {
  const [phase, setPhase] = useState<PrepPhase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (opts?: { reset?: boolean }): Promise<RunResult> => {
      setError(null);
      setPhase("branching");
      try {
        const res = await fetch(
          `/api/lessons/${encodeURIComponent(lessonSlug)}/prepare`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reset: opts?.reset === true }),
          },
        );
        if (!res.ok || !res.body) {
          const failed = await res.json().catch(() => ({}));
          throw new Error(failed.error ?? `Prepare failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let branchName: string | null = null;
        let streamError: string | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            let event: PrepEvent;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }
            if (event.phase === "branching" || event.phase === "seeding") {
              setPhase(event.phase);
            } else if (event.phase === "ready") {
              branchName = event.branch.name;
            } else if (event.phase === "error") {
              streamError = event.message;
            }
          }
        }

        if (streamError) throw new Error(streamError);
        if (!branchName) {
          throw new Error("Sandbox preparation ended unexpectedly.");
        }
        setPhase("ready");
        return { ok: true, branchName };
      } catch (err) {
        const message = (err as Error).message;
        setPhase("error");
        setError(message);
        return { ok: false, error: message };
      }
    },
    [lessonSlug],
  );

  const clear = useCallback(() => {
    setPhase(null);
    setError(null);
  }, []);

  return { phase, error, run, clear };
}
