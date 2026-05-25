import { createHash } from "node:crypto";

/**
 * Naming for pre-seeded, per-lesson template branches.
 *
 * A template's name encodes the slug plus a short hash of its seed SQL:
 *   tpl-<slug>-<seedHash>
 * Changing a lesson's seed.sql changes the hash, which yields a brand-new
 * template branch — so a deploy only creates what's missing, and user branches
 * already forked from the previous template are left untouched.
 *
 * Pure (no `server-only`) so both the server runtime and the deploy script
 * (`scripts/prepare-templates.ts`) can compute identical names.
 */

const XATA_NAME_MAX = 63;
const PREFIX = "tpl-";

export function seedHash(seedSql: string): string {
  return createHash("sha256").update(seedSql.trim()).digest("hex").slice(0, 8);
}

export function templateBranchName(slug: string, seedSql: string): string {
  const suffix = `-${seedHash(seedSql)}`;
  const middle = slug.slice(0, XATA_NAME_MAX - PREFIX.length - suffix.length);
  return PREFIX + middle + suffix;
}
