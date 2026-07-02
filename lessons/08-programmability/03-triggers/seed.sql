-- Seed for "03-triggers": a tiny document store plus an empty audit log.
-- documents holds a handful of rows the lesson will UPDATE (so a BEFORE
-- trigger can maintain updated_at) and change (so an AFTER trigger can write
-- history rows). document_audit starts empty — the learner's trigger fills it.

CREATE TABLE documents (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      text        NOT NULL,
  body       text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document_audit (
  id          int         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id int         NOT NULL,
  action      text        NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO documents (title, body) VALUES
  ('Welcome',      'Getting started with the docs.'),
  ('Roadmap',      'What we plan to build this quarter.'),
  ('Style guide',  'How we write and format things.');
