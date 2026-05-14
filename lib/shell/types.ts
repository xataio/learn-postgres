export type FieldInfo = { name: string; dataTypeID: number };

export type ResultBlock = {
  command: string | null;
  fields: FieldInfo[];
  rows: unknown[][];
  rowCount: number | null;
  truncated: boolean;
};

export type QueryOk = {
  ok: true;
  results: ResultBlock[];
  notices: string[];
  durationMs: number;
};

export type QueryErr = {
  ok: false;
  error: string;
  severity?: string;
  code?: string;
  hint?: string;
  detail?: string;
  position?: number;
};

export type QueryResult = QueryOk | QueryErr;
