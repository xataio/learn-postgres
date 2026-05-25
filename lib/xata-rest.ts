/**
 * Pure (no `server-only`) wrapper around Xata's REST API for branch lifecycle.
 * Importable from both the Next server runtime (via `lib/xata.ts`) and plain
 * Node scripts (e.g. `scripts/prepare-templates.ts`).
 *
 * https://api.xata.tech — bearer auth with an API key.
 * Scoped to a single organization + project (set via env).
 */

const XATA_API_BASE = "https://api.xata.tech";

export type XataBranch = {
  id: string;
  name: string;
  description?: string;
  parentID: string | null;
  region: string;
  createdAt: string;
  updatedAt: string;
  publicAccess?: boolean;
  connectionString?: string | null;
};

export type XataCredentials = { username: string; password: string };

export class XataApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "XataApiError";
  }
}

type XataConfig = {
  apiKey: string;
  orgId: string;
  projectId: string;
};

function loadConfig(): XataConfig {
  const apiKey = process.env.XATA_API_KEY;
  const orgId = process.env.XATA_ORG_ID;
  const projectId = process.env.XATA_PROJECT_ID;
  if (!apiKey || !orgId || !projectId) {
    throw new Error(
      "Xata is not configured. Set XATA_API_KEY, XATA_ORG_ID, XATA_PROJECT_ID.",
    );
  }
  return { apiKey, orgId, projectId };
}

async function call<T>(
  cfg: XataConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${XATA_API_BASE}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${cfg.apiKey}`);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...init, headers });
  if (res.status === 204) return undefined as T;

  let body: unknown;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const hint =
      res.status === 401
        ? " — check XATA_API_KEY"
        : res.status === 403
          ? " — the API key is missing required scopes (branch:read, branch:write, credentials:read) or isn't authorized for this project"
          : res.status === 404
            ? " — check XATA_ORG_ID and XATA_PROJECT_ID"
            : "";
    throw new XataApiError(
      `Xata ${init.method ?? "GET"} ${path} failed: ${res.status}${hint}`,
      res.status,
      body,
    );
  }
  return body as T;
}

function base(cfg: XataConfig): string {
  return `/organizations/${encodeURIComponent(cfg.orgId)}/projects/${encodeURIComponent(cfg.projectId)}`;
}

export async function listBranches(): Promise<XataBranch[]> {
  const cfg = loadConfig();
  const res = await call<{ branches: XataBranch[] }>(
    cfg,
    `${base(cfg)}/branches`,
  );
  return res.branches;
}

export async function getBranch(branchId: string): Promise<XataBranch> {
  const cfg = loadConfig();
  return call<XataBranch>(
    cfg,
    `${base(cfg)}/branches/${encodeURIComponent(branchId)}`,
  );
}

export async function createBranch(input: {
  name: string;
  parentId: string;
  description?: string;
}): Promise<XataBranch> {
  const cfg = loadConfig();
  return call<XataBranch>(cfg, `${base(cfg)}/branches`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      mode: "inherit",
      parentID: input.parentId,
    }),
  });
}

export async function deleteBranch(branchId: string): Promise<void> {
  const cfg = loadConfig();
  await call<void>(
    cfg,
    `${base(cfg)}/branches/${encodeURIComponent(branchId)}`,
    { method: "DELETE" },
  );
}

const DEFAULT_BRANCH_ROLE = "xata";

export async function getCredentials(
  branchId: string,
  username: string = DEFAULT_BRANCH_ROLE,
): Promise<XataCredentials> {
  const cfg = loadConfig();
  const qs = `?username=${encodeURIComponent(username)}`;
  return call<XataCredentials>(
    cfg,
    `${base(cfg)}/branches/${encodeURIComponent(branchId)}/credentials${qs}`,
  );
}

export async function rotateCredentials(
  branchId: string,
  username: string = DEFAULT_BRANCH_ROLE,
): Promise<void> {
  const cfg = loadConfig();
  await call<void>(
    cfg,
    `${base(cfg)}/branches/${encodeURIComponent(branchId)}/credentials/rotate`,
    {
      method: "POST",
      body: JSON.stringify({ username }),
    },
  );
}

/**
 * Compose a ready-to-use Postgres DSN by injecting credentials into the
 * branch's connection string template. URL.username/password setters already
 * percent-encode, so pass raw values.
 */
export function buildBranchDsn(
  connectionString: string,
  creds: XataCredentials,
): string {
  const url = new URL(connectionString);
  url.username = creds.username;
  url.password = creds.password;
  if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

/**
 * Returns the credentials embedded in a connection string, or null if it's
 * just a template without auth. Xata sometimes hands you a complete DSN at
 * create time; when it does, there's no need for a second /credentials call.
 */
export function readCredentialsFromDsn(
  dsn: string,
): XataCredentials | null {
  try {
    const url = new URL(dsn);
    if (url.username && url.password) {
      return {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
    }
  } catch {
    // not a URL we can parse
  }
  return null;
}

/**
 * After a successful create-branch call, Xata sometimes still returns a null
 * `connectionString` because the branch is still being provisioned. Poll the
 * branch details with backoff until it's populated.
 */
export async function awaitConnectionString(
  branchId: string,
  initial: string | null | undefined,
  timeoutMs = 60_000,
): Promise<string> {
  if (initial) return initial;

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    const remaining = deadline - Date.now();
    const wait = Math.min(500 + 500 * attempt, 3000, remaining);
    await new Promise((r) => setTimeout(r, wait));
    let updated;
    try {
      updated = await getBranch(branchId);
    } catch (err) {
      console.error(
        `[branch-create] poll attempt ${attempt} for ${branchId} failed: ${(err as Error).message}`,
      );
      continue;
    }
    if (updated.connectionString) {
      if (attempt > 1) {
        console.log(
          `[branch-create] ${branchId} connection string ready after ${attempt} poll(s)`,
        );
      }
      return updated.connectionString;
    }
  }
  throw new Error(
    `Xata never returned a connection string for branch ${branchId} (timed out after ${timeoutMs}ms)`,
  );
}

/**
 * Resolve a usable Postgres DSN for a freshly-created Xata branch.
 *
 * Xata's create-branch response sometimes already embeds credentials in
 * `connectionString`; when it doesn't, we have to fetch them from the
 * credentials endpoint. If that endpoint 400s (Xata hasn't issued credentials
 * for this role yet), trigger a rotate and try once more.
 */
export async function resolveBranchDsn(
  branchId: string,
  connectionString: string,
): Promise<string> {
  const inline = readCredentialsFromDsn(connectionString);
  if (inline) return connectionString;

  try {
    const creds = await getCredentials(branchId);
    return buildBranchDsn(connectionString, creds);
  } catch (err) {
    if (err instanceof XataApiError && err.status === 400) {
      await rotateCredentials(branchId);
      const creds = await getCredentials(branchId);
      return buildBranchDsn(connectionString, creds);
    }
    throw err;
  }
}
