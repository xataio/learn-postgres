#!/usr/bin/env tsx
/**
 * List or delete Xata branches in the configured project.
 *
 * Usage:
 *   npx tsx scripts/xata-cleanup.ts          # dry-run; lists what would be deleted
 *   npx tsx scripts/xata-cleanup.ts --force  # actually delete every branch except main
 *
 * Standalone — doesn't import lib/xata.ts (which uses next/server-only and
 * can't be loaded outside the Next build).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const API = "https://api.xata.tech";

type Branch = {
  id: string;
  name: string;
  parentID: string | null;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = requireEnv("XATA_API_KEY");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Xata ${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function main() {
  const orgId = requireEnv("XATA_ORG_ID");
  const projectId = requireEnv("XATA_PROJECT_ID");
  const parentName = process.env.XATA_PARENT_BRANCH ?? "main";

  const base = `/organizations/${encodeURIComponent(orgId)}/projects/${encodeURIComponent(projectId)}`;
  const force = process.argv.includes("--force");

  const res = await call<{ branches: Branch[] }>(`${base}/branches`);
  const branches = res.branches;

  // Auto-detect the parent: by configured name, by parentID==null, or by being
  // the parent of every forked branch.
  const explicit =
    branches.find((b) => b.id === parentName) ??
    branches.find((b) => b.name === parentName);
  const noParent = branches.filter((b) => b.parentID === null);
  const referencedParents = new Set(
    branches.map((b) => b.parentID).filter((p): p is string => !!p),
  );
  const parent =
    explicit ??
    (noParent.length === 1 ? noParent[0] : undefined) ??
    branches.find((b) => referencedParents.has(b.id));

  console.log(
    `Project ${projectId} has ${branches.length} branch(es).\n`,
  );
  for (const b of branches) {
    const isParent = parent && b.id === parent.id;
    const tag = isParent ? "  KEEP" : "DELETE";
    console.log(
      `  [${tag}] ${b.id}  ${b.name}  parent=${b.parentID ?? "(none)"}`,
    );
  }

  if (!parent) {
    console.error(
      `\nCould not auto-detect a parent branch — refusing to delete anything.`,
    );
    console.error(
      `Set XATA_PARENT_BRANCH to the name or id of the branch you want to keep, then re-run.`,
    );
    process.exit(2);
  }

  console.log(`\nParent (kept): ${parent.name} [${parent.id}]`);

  const toDelete = branches.filter((b) => b.id !== parent.id);
  if (toDelete.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  if (!force) {
    console.log(
      `\nDry run. Re-run with --force to delete ${toDelete.length} branch(es).`,
    );
    return;
  }

  console.log(`\nDeleting ${toDelete.length} branch(es)…\n`);
  let ok = 0;
  let fail = 0;
  for (const b of toDelete) {
    try {
      await call(`${base}/branches/${encodeURIComponent(b.id)}`, {
        method: "DELETE",
      });
      console.log(`  ✓ ${b.name}`);
      ok++;
    } catch (err) {
      console.log(`  ✗ ${b.name}: ${(err as Error).message}`);
      fail++;
    }
  }
  console.log(`\nDone — ${ok} deleted, ${fail} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
