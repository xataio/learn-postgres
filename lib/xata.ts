import "server-only";

/**
 * Server-only entry point for the Xata REST client. The wire-level helpers live
 * in `lib/xata-rest.ts` (no `server-only`) so plain Node scripts can reuse them;
 * this module re-exports them and adds the parent/template branch resolvers used
 * by the server runtime.
 */

export * from "./xata-rest";

import { listBranches } from "./xata-rest";

/**
 * Resolve the parent branch ID to fork user sandboxes from when no per-lesson
 * template exists (the fallback path). By default the "main" branch is used;
 * override with XATA_PARENT_BRANCH (name or id).
 */
let cachedParentBranchId: string | null = null;
export async function getParentBranchId(): Promise<string> {
  if (cachedParentBranchId) return cachedParentBranchId;

  const override = process.env.XATA_PARENT_BRANCH;
  const branches = await listBranches();
  const target = override ?? "main";

  const match =
    branches.find((b) => b.id === target) ??
    branches.find((b) => b.name === target);

  if (!match) {
    throw new Error(
      `Could not find a Xata branch named/identified "${target}". Set XATA_PARENT_BRANCH to a valid branch name or id.`,
    );
  }

  cachedParentBranchId = match.id;
  return match.id;
}

const TEMPLATE_PREFIX = "tpl-";
const TEMPLATE_TTL_MS = 5 * 60_000;
let templateCache: { at: number; map: Map<string, string> } | null = null;

/**
 * Resolve a pre-seeded template branch id by name (see `templateBranchName`).
 * Returns null when no such template exists so callers can fall back to forking
 * from `main` and seeding on demand.
 *
 * The full `tpl-*` name→id map is cached per server instance with a short TTL.
 * Templates are created at deploy time before traffic is served, and each new
 * deploy gets fresh instances with an empty cache, so staleness is bounded.
 */
export async function getTemplateBranchId(
  name: string,
): Promise<string | null> {
  const now = Date.now();
  if (!templateCache || now - templateCache.at > TEMPLATE_TTL_MS) {
    const branches = await listBranches();
    const map = new Map<string, string>();
    for (const b of branches) {
      if (b.name.startsWith(TEMPLATE_PREFIX)) map.set(b.name, b.id);
    }
    templateCache = { at: now, map };
  }
  return templateCache.map.get(name) ?? null;
}
