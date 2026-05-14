/**
 * Translate psql backslash commands to ordinary SQL we can run against the
 * user's branch. Coverage is intentionally narrow — the common discovery
 * commands a learner will reach for.
 */

export type MetaResult =
  | { kind: "query"; sql: string }
  | { kind: "message"; text: string }
  | { kind: "error"; message: string };

const HELP_TEXT = [
  "Backslash commands implemented in this shell:",
  "  \\?            this help",
  "  \\l            list databases",
  "  \\dn           list schemas",
  "  \\dt           list tables",
  "  \\d            list relations (tables, views, sequences)",
  "  \\d  NAME      describe a table's columns",
  "  \\df           list functions",
  "",
  "Type SQL and end with `;` to run it. Up/Down arrows recall history.",
].join("\n");

function quoteIdent(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

const LIST_RELATIONS_BASE = `
SELECT n.nspname AS "Schema",
       c.relname AS "Name",
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         WHEN 'i' THEN 'index'
         WHEN 'S' THEN 'sequence'
         WHEN 't' THEN 'TOAST table'
         WHEN 'f' THEN 'foreign table'
         WHEN 'p' THEN 'partitioned table'
         WHEN 'I' THEN 'partitioned index'
       END AS "Type",
       pg_catalog.pg_get_userbyid(c.relowner) AS "Owner"
FROM pg_catalog.pg_class c
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
`;

const DESCRIBE_COLUMNS = (table: string) => `
SELECT a.attname AS "Column",
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS "Type",
       CASE WHEN a.attnotnull THEN 'not null' ELSE '' END AS "Nullable",
       pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS "Default"
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d
       ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attrelid = ${quoteIdent(table)}::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
`;

export function expandMeta(rawLine: string): MetaResult {
  const line = rawLine.trim();
  if (!line.startsWith("\\")) {
    return { kind: "error", message: `not a meta-command: ${rawLine}` };
  }

  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(" ");

  switch (cmd) {
    case "\\?":
    case "\\h":
    case "\\help":
      return { kind: "message", text: HELP_TEXT };

    case "\\l":
    case "\\list":
      return {
        kind: "query",
        sql: `SELECT datname AS "Name", pg_catalog.pg_get_userbyid(datdba) AS "Owner", pg_catalog.pg_encoding_to_char(encoding) AS "Encoding" FROM pg_catalog.pg_database ORDER BY 1;`,
      };

    case "\\dn":
      return {
        kind: "query",
        sql: `SELECT n.nspname AS "Name", pg_catalog.pg_get_userbyid(n.nspowner) AS "Owner" FROM pg_catalog.pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' ORDER BY 1;`,
      };

    case "\\dt":
      return {
        kind: "query",
        sql:
          LIST_RELATIONS_BASE +
          `WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_toast' ORDER BY 1,2;`,
      };

    case "\\df":
      return {
        kind: "query",
        sql: `
SELECT n.nspname AS "Schema",
       p.proname AS "Name",
       pg_catalog.pg_get_function_result(p.oid) AS "Result type",
       pg_catalog.pg_get_function_arguments(p.oid) AS "Argument types"
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY 1, 2;`,
      };

    case "\\d":
      if (arg) return { kind: "query", sql: DESCRIBE_COLUMNS(arg) };
      return {
        kind: "query",
        sql:
          LIST_RELATIONS_BASE +
          `WHERE c.relkind IN ('r','v','m','S','f','p') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_toast' ORDER BY 1,2;`,
      };

    case "\\q":
      return {
        kind: "message",
        text: "(in a browser shell — there's nowhere to quit to)",
      };

    default:
      return {
        kind: "error",
        message: `unknown command: ${cmd}. Try \\? for help.`,
      };
  }
}
