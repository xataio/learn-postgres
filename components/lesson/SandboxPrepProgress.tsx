import type { PrepPhase } from "./usePrepareStream";

type StepStatus = "pending" | "active" | "done";

function branchStatus(phase: PrepPhase): StepStatus {
  if (phase === "branching") return "active";
  if (phase === "seeding" || phase === "ready") return "done";
  return "pending";
}

function seedStatus(phase: PrepPhase): StepStatus {
  if (phase === "seeding") return "active";
  if (phase === "ready") return "done";
  return "pending";
}

/**
 * Two-step checklist showing the live branching → seeding progress while a
 * sandbox is being prepared. Drive it with the `phase` from usePrepareStream.
 */
export function SandboxPrepProgress({ phase }: { phase: PrepPhase }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      <Step
        status={branchStatus(phase)}
        label="Forking Postgres branch"
        activeLabel="Forking Postgres branch…"
      />
      <Step
        status={seedStatus(phase)}
        label="Seeding sample data"
        activeLabel="Seeding sample data…"
      />
    </ul>
  );
}

function Step({
  status,
  label,
  activeLabel,
}: {
  status: StepStatus;
  label: string;
  activeLabel: string;
}) {
  return (
    <li
      className={`flex items-center gap-2 ${
        status === "pending" ? "text-zinc-400 dark:text-zinc-600" : ""
      }`}
    >
      <StatusIcon status={status} />
      <span>{status === "active" ? activeLabel : label}</span>
    </li>
  );
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-emerald-500"
        viewBox="0 0 16 16"
        fill="none"
        aria-label="done"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5 8.2 7 10.2 11 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "active") {
    return (
      <svg
        className="h-4 w-4 shrink-0 animate-spin text-amber-500"
        viewBox="0 0 16 16"
        fill="none"
        aria-label="in progress"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path
          d="M14 8a6 6 0 0 0-6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-current opacity-40"
    />
  );
}
