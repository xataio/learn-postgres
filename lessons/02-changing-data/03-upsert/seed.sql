-- Seed for "03-upsert": two tables that benefit from upsert.
-- page_views is the "increment a counter, creating it if needed" example —
-- it has a UNIQUE (page, user_email) so the conflict target is meaningful.
-- tags is a tiny dedup table for DO NOTHING.

CREATE TABLE page_views (
  id          serial PRIMARY KEY,
  page        text  NOT NULL,
  user_email  text  NOT NULL,
  views       int   NOT NULL DEFAULT 1,
  last_seen   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page, user_email)
);

INSERT INTO page_views (page, user_email, views, last_seen) VALUES
  ('/home',    'ada@example.com',   1, '2024-05-01 09:00:00+00'),
  ('/home',    'grace@example.com', 4, '2024-05-02 11:30:00+00'),
  ('/pricing', 'grace@example.com', 2, '2024-05-03 12:00:00+00'),
  ('/blog',    'linus@example.com', 7, '2024-05-04 18:45:00+00');

CREATE TABLE tags (
  id   serial PRIMARY KEY,
  name text   NOT NULL UNIQUE
);

INSERT INTO tags (name) VALUES
  ('postgres'),
  ('sql'),
  ('database'),
  ('tutorial');
