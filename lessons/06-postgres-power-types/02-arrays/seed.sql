-- Seed for "02-arrays": a small blog. Each article carries a text[] `tags`
-- column with a handful of overlapping tags, so containment, overlap, and
-- unnest queries all have something interesting to chew on.

CREATE TABLE articles (
  id    int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  tags  text[] NOT NULL DEFAULT '{}'
);

INSERT INTO articles (title, tags) VALUES
  ('Indexing 101',            ARRAY['postgres', 'performance', 'indexes']),
  ('A gentle intro to JSONB', ARRAY['postgres', 'json', 'beginner']),
  ('Scaling reads',           ARRAY['postgres', 'performance', 'replication']),
  ('CSS grid in practice',    ARRAY['css', 'frontend']),
  ('Debugging slow queries',  '{postgres,performance,explain}'),
  ('Hello, world',            '{}');
