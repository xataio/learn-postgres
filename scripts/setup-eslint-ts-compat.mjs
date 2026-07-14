#!/usr/bin/env node
/**
 * Postinstall compatibility shim for TypeScript 7 + @typescript-eslint.
 *
 * @typescript-eslint (bundled inside eslint-config-next) requires TypeScript
 * >=4.8.4 <6.1.0 and uses compiler APIs that no longer exist in TypeScript 7.
 * This script installs TypeScript 5 symlinks in the nested node_modules
 * directories that eslint tooling resolves before reaching the root
 * TypeScript 7 installation.
 *
 * Remove this script (and the typescript-for-eslint devDependency and the
 * postinstall hook) once @typescript-eslint ships TypeScript 7 support.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(__dirname, "..");
const ts5 = path.join(root, "node_modules", "typescript-for-eslint");

if (!fs.existsSync(ts5)) {
  // Nothing to do – likely a production install that skipped devDependencies.
  process.exit(0);
}

const targets = [
  // eslint-config-next bundles its own typescript-eslint subtree; all
  // @typescript-eslint/* packages in that subtree resolve `typescript` via
  // node_modules/eslint-config-next/node_modules/typescript.
  path.join(
    root,
    "node_modules",
    "eslint-config-next",
    "node_modules",
    "typescript"
  ),
  // ts-api-utils is hoisted to the root and used by @typescript-eslint
  // packages; give it its own TypeScript 5 so it doesn't pick up the root
  // TypeScript 7.
  path.join(root, "node_modules", "ts-api-utils", "node_modules", "typescript"),
];

for (const target of targets) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    if (fs.lstatSync(target)) {
      // Already present – skip.
      continue;
    }
  } catch {
    // target does not exist – fall through to create it.
  }

  fs.symlinkSync(ts5, target, "dir");
  console.log(`[setup-eslint-ts-compat] symlink created: ${target}`);
}
