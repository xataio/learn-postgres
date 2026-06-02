/**
 * Translate psql backslash commands to ordinary SQL we can run against the
 * user's branch. Coverage mirrors the discovery commands a learner reaches for
 * in real psql: the full `\d*` family, the `+` verbose modifier, name patterns,
 * and a multi-section `\d NAME` describe.
 */

export type DescribeSection =
  | { type: "heading"; text: string } // e.g. `Table "public.users"`
  | { type: "table"; sql: string } // a column table, rendered without a row-count footer
  | { type: "list"; caption: string; sql: string }; // single-column rows → indented text lines

export type MetaResult =
  | { kind: "query"; sql: string }
  | { kind: "message"; text: string }
  | { kind: "error"; message: string }
  | {
      kind: "describe";
      arg: string;
      oidSql: string;
      build: (relkind: string, title: string, oid: string) => DescribeSection[];
    };

const HELP_TEXT = [
  "Backslash commands implemented in this shell:",
  "  \\?                 this help",
  "  \\l[+] [PATTERN]    list databases",
  "  \\dn[+] [PATTERN]   list schemas",
  "  \\dt[+] [PATTERN]   list tables",
  "  \\dv[+] [PATTERN]   list views",
  "  \\dm[+] [PATTERN]   list materialized views",
  "  \\di[+] [PATTERN]   list indexes",
  "  \\ds[+] [PATTERN]   list sequences",
  "  \\dT[+] [PATTERN]   list data types",
  "  \\du[+] [PATTERN]   list roles (also \\dg)",
  "  \\dx [PATTERN]      list installed extensions",
  "  \\df[+] [PATTERN]   list functions",
  "  \\d[+] [PATTERN]    list relations (tables, views, sequences, …)",
  "  \\d  NAME           describe a relation: columns, indexes, FKs, referenced by",
  "",
  "Add `+` for extra detail (e.g. \\dt+). PATTERN accepts * and ? wildcards.",
  "Type SQL and end with `;` to run it. Up/Down arrows recall history.",
].join("\n");

/** Wrap a value as a SQL string literal (doubling embedded single quotes). */
function quoteIdent(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * Convert a psql name pattern (`user*`, `u?er`, exact) into a SQL string
 * literal suitable for `ILIKE … ESCAPE '\'`. LIKE metacharacters in the user's
 * text are escaped; shell wildcards `*`/`?` map to `%`/`_`.
 */
function patternToLike(pat: string): string {
  const escaped = pat
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\*/g, "%")
    .replace(/\?/g, "_");
  return quoteIdent(escaped);
}

function patternClause(column: string, pattern: string): string {
  if (!pattern) return "";
  return ` AND ${column} ILIKE ${patternToLike(pattern)} ESCAPE '\\'`;
}

function listRelations(opts: {
  kinds: string[];
  verbose: boolean;
  pattern: string;
}): string {
  const kindList = opts.kinds.map((k) => `'${k}'`).join(",");
  const verboseCols = opts.verbose
    ? `,
       pg_catalog.pg_size_pretty(pg_catalog.pg_total_relation_size(c.oid)) AS "Size",
       pg_catalog.obj_description(c.oid, 'pg_class') AS "Description"`
    : "";
  return `
SELECT n.nspname AS "Schema",
       c.relname AS "Name",
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         WHEN 'i' THEN 'index'
         WHEN 'I' THEN 'partitioned index'
         WHEN 'S' THEN 'sequence'
         WHEN 't' THEN 'TOAST table'
         WHEN 'f' THEN 'foreign table'
         WHEN 'p' THEN 'partitioned table'
       END AS "Type",
       pg_catalog.pg_get_userbyid(c.relowner) AS "Owner"${verboseCols}
FROM pg_catalog.pg_class c
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN (${kindList})
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname !~ '^pg_toast'${patternClause("c.relname", opts.pattern)}
ORDER BY 1,2;`;
}

function listDatabases(verbose: boolean, pattern: string): string {
  const verboseCols = verbose
    ? `,
       pg_catalog.pg_size_pretty(pg_catalog.pg_database_size(d.datname)) AS "Size",
       pg_catalog.shobj_description(d.oid, 'pg_database') AS "Description"`
    : "";
  return `SELECT d.datname AS "Name",
       pg_catalog.pg_get_userbyid(d.datdba) AS "Owner",
       pg_catalog.pg_encoding_to_char(d.encoding) AS "Encoding"${verboseCols}
FROM pg_catalog.pg_database d
WHERE 1=1${patternClause("d.datname", pattern)}
ORDER BY 1;`;
}

function listSchemas(verbose: boolean, pattern: string): string {
  const verboseCols = verbose
    ? `,
       pg_catalog.obj_description(n.oid, 'pg_namespace') AS "Description"`
    : "";
  return `SELECT n.nspname AS "Name",
       pg_catalog.pg_get_userbyid(n.nspowner) AS "Owner"${verboseCols}
FROM pg_catalog.pg_namespace n
WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'${patternClause("n.nspname", pattern)}
ORDER BY 1;`;
}

function listFunctions(verbose: boolean, pattern: string): string {
  const verboseCols = verbose
    ? `,
       CASE p.prokind WHEN 'a' THEN 'agg' WHEN 'w' THEN 'window' WHEN 'p' THEN 'proc' ELSE 'func' END AS "Type",
       CASE p.provolatile WHEN 'i' THEN 'immutable' WHEN 's' THEN 'stable' ELSE 'volatile' END AS "Volatility",
       l.lanname AS "Language"`
    : "";
  const verboseJoin = verbose
    ? `
LEFT JOIN pg_catalog.pg_language l ON l.oid = p.prolang`
    : "";
  return `SELECT n.nspname AS "Schema",
       p.proname AS "Name",
       pg_catalog.pg_get_function_result(p.oid) AS "Result type",
       pg_catalog.pg_get_function_arguments(p.oid) AS "Argument types"${verboseCols}
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace${verboseJoin}
WHERE n.nspname NOT IN ('pg_catalog','information_schema')${patternClause("p.proname", pattern)}
ORDER BY 1, 2;`;
}

function listTypes(verbose: boolean, pattern: string): string {
  const verboseCols = verbose
    ? `,
       pg_catalog.obj_description(t.oid, 'pg_type') AS "Description"`
    : "";
  return `SELECT n.nspname AS "Schema",
       pg_catalog.format_type(t.oid, NULL) AS "Name"${verboseCols}
FROM pg_catalog.pg_type t
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
  AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
  AND n.nspname NOT IN ('pg_catalog','information_schema')${patternClause("pg_catalog.format_type(t.oid, NULL)", pattern)}
ORDER BY 1, 2;`;
}

function listRoles(pattern: string): string {
  return `SELECT r.rolname AS "Role name",
       pg_catalog.concat_ws(', ',
         CASE WHEN r.rolsuper THEN 'Superuser' END,
         CASE WHEN r.rolcreatedb THEN 'Create DB' END,
         CASE WHEN r.rolcreaterole THEN 'Create role' END,
         CASE WHEN NOT r.rolcanlogin THEN 'Cannot login' END,
         CASE WHEN r.rolreplication THEN 'Replication' END
       ) AS "Attributes",
       ARRAY(SELECT b.rolname FROM pg_catalog.pg_auth_members m
             JOIN pg_catalog.pg_roles b ON m.roleid = b.oid
             WHERE m.member = r.oid) AS "Member of"
FROM pg_catalog.pg_roles r
WHERE 1=1${patternClause("r.rolname", pattern)}
ORDER BY 1;`;
}

function listExtensions(pattern: string): string {
  return `SELECT e.extname AS "Name",
       e.extversion AS "Version",
       n.nspname AS "Schema",
       c.description AS "Description"
FROM pg_catalog.pg_extension e
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
LEFT JOIN pg_catalog.pg_description c
       ON c.objoid = e.oid AND c.classoid = 'pg_extension'::regclass
WHERE 1=1${patternClause("e.extname", pattern)}
ORDER BY 1;`;
}

/** Resolve a relation name to (oid, relkind, schema-qualified title). */
function describeOidSql(name: string): string {
  return `SELECT c.oid AS oid,
       c.relkind AS relkind,
       format('%I.%I', n.nspname, c.relname) AS title
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.oid = ${quoteIdent(name)}::regclass;`;
}

const RELKIND_LABEL: Record<string, string> = {
  r: "Table",
  p: "Table",
  v: "View",
  m: "Materialized view",
  S: "Sequence",
  f: "Foreign table",
  i: "Index",
  I: "Index",
  c: "Composite type",
  t: "TOAST table",
};

/** Build the ordered describe sections for `\d NAME`, given the resolved oid. */
function buildDescribe(
  relkind: string,
  title: string,
  oid: string,
): DescribeSection[] {
  const label = RELKIND_LABEL[relkind] ?? "Relation";
  const sections: DescribeSection[] = [
    { type: "heading", text: `${label} "${title}"` },
  ];

  if (relkind === "S") {
    sections.push({
      type: "table",
      sql: `SELECT s.seqtypid::regtype AS "Type",
       s.seqstart AS "Start",
       s.seqmin AS "Minimum",
       s.seqmax AS "Maximum",
       s.seqincrement AS "Increment",
       CASE WHEN s.seqcycle THEN 'yes' ELSE 'no' END AS "Cycles?"
FROM pg_catalog.pg_sequence s WHERE s.seqrelid = ${oid};`,
    });
    return sections;
  }

  // Columns
  sections.push({
    type: "table",
    sql: `SELECT a.attname AS "Column",
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS "Type",
       CASE WHEN a.attnotnull THEN 'not null' ELSE '' END AS "Nullable",
       pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS "Default"
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attrelid = ${oid} AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;`,
  });

  // Indexes
  sections.push({
    type: "list",
    caption: "Indexes:",
    sql: `SELECT '    "' || ic.relname || '" ' ||
       CASE WHEN i.indisprimary THEN 'PRIMARY KEY, '
            WHEN i.indisunique THEN 'UNIQUE, '
            ELSE '' END ||
       regexp_replace(pg_catalog.pg_get_indexdef(i.indexrelid, 0, true),
                      '^CREATE (UNIQUE )?INDEX [^ ]+ ON [^ ]+ USING ', '') AS line
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
WHERE i.indrelid = ${oid}
ORDER BY ic.relname;`,
  });

  // Foreign-key constraints declared on this relation
  sections.push({
    type: "list",
    caption: "Foreign-key constraints:",
    sql: `SELECT '    "' || conname || '" ' || pg_catalog.pg_get_constraintdef(oid, true) AS line
FROM pg_catalog.pg_constraint
WHERE conrelid = ${oid} AND contype = 'f'
ORDER BY conname;`,
  });

  // Foreign keys in other tables that reference this relation
  sections.push({
    type: "list",
    caption: "Referenced by:",
    sql: `SELECT '    TABLE "' || rn.nspname || '.' || rc.relname || '" CONSTRAINT "' ||
       con.conname || '" ' || pg_catalog.pg_get_constraintdef(con.oid, true) AS line
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rc ON rc.oid = con.conrelid
JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
WHERE con.confrelid = ${oid} AND con.contype = 'f'
ORDER BY rc.relname, con.conname;`,
  });

  return sections;
}

export function expandMeta(rawLine: string): MetaResult {
  const line = rawLine.trim();
  if (!line.startsWith("\\")) {
    return { kind: "error", message: `not a meta-command: ${rawLine}` };
  }

  // Split into base command, optional `+` verbose flag, and argument/pattern.
  const m = line.match(/^(\\[a-zA-Z?]+)(\+)?(?:\s+(.*))?$/);
  if (!m) {
    return {
      kind: "error",
      message: `unknown command: ${line}. Try \\? for help.`,
    };
  }
  const base = m[1];
  const verbose = m[2] === "+";
  const arg = (m[3] ?? "").trim();

  switch (base) {
    case "\\?":
    case "\\h":
    case "\\help":
      return { kind: "message", text: HELP_TEXT };

    case "\\l":
    case "\\list":
      return { kind: "query", sql: listDatabases(verbose, arg) };

    case "\\dn":
      return { kind: "query", sql: listSchemas(verbose, arg) };

    case "\\dt":
      return {
        kind: "query",
        sql: listRelations({ kinds: ["r", "p"], verbose, pattern: arg }),
      };

    case "\\dv":
      return {
        kind: "query",
        sql: listRelations({ kinds: ["v"], verbose, pattern: arg }),
      };

    case "\\dm":
      return {
        kind: "query",
        sql: listRelations({ kinds: ["m"], verbose, pattern: arg }),
      };

    case "\\di":
      return {
        kind: "query",
        sql: listRelations({ kinds: ["i", "I"], verbose, pattern: arg }),
      };

    case "\\ds":
      return {
        kind: "query",
        sql: listRelations({ kinds: ["S"], verbose, pattern: arg }),
      };

    case "\\df":
      return { kind: "query", sql: listFunctions(verbose, arg) };

    case "\\dT":
      return { kind: "query", sql: listTypes(verbose, arg) };

    case "\\du":
    case "\\dg":
      return { kind: "query", sql: listRoles(arg) };

    case "\\dx":
      return { kind: "query", sql: listExtensions(arg) };

    case "\\d":
      if (arg) {
        return {
          kind: "describe",
          arg,
          oidSql: describeOidSql(arg),
          build: buildDescribe,
        };
      }
      return {
        kind: "query",
        sql: listRelations({
          kinds: ["r", "v", "m", "S", "f", "p"],
          verbose,
          pattern: "",
        }),
      };

    case "\\q":
      return {
        kind: "message",
        text: "(in a browser shell — there's nowhere to quit to)",
      };

    default:
      return {
        kind: "error",
        message: `unknown command: ${base}. Try \\? for help.`,
      };
  }
}
