-- Seed for "01-roles-and-privileges": a tiny shared document store. documents
-- holds a handful of rows owned by two people (owner is a plain role name), so
-- a row-level security policy can later hand each owner only their own slice of
-- the same table.

CREATE TABLE documents (
  id    int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner text NOT NULL,
  title text NOT NULL
);

INSERT INTO documents (owner, title) VALUES
  ('alice', 'Q3 roadmap'),
  ('alice', 'Hiring plan'),
  ('alice', '1:1 notes'),
  ('bob',   'Migration runbook'),
  ('bob',   'On-call schedule');
