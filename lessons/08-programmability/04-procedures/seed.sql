-- Seed for "04-procedures": a work queue to churn through in batches. jobs holds
-- 500 pending tasks; the lesson writes a procedure that processes them in chunks
-- and COMMITs after each chunk. archived_jobs starts empty — the "Your turn"
-- exercise fills it by CALLing a procedure that moves finished work aside.

CREATE TABLE jobs (
  id         int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload    text NOT NULL,
  status     text NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO jobs (payload)
SELECT 'task #' || g
FROM generate_series(1, 500) AS g;

CREATE TABLE archived_jobs (
  id          int PRIMARY KEY,
  payload     text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
