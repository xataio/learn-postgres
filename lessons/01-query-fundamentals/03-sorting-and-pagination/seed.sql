-- Seed for "03-sorting-and-pagination": a small articles feed with a few
-- intentional ties on published_at so ORDER BY tie-breakers are visible, and
-- some duplicate authors so DISTINCT has something to do.

CREATE TABLE articles (
  id           serial PRIMARY KEY,
  title        text NOT NULL,
  author       text NOT NULL,
  views        int  NOT NULL,
  published_at timestamptz NOT NULL
);

INSERT INTO articles (title, author, views, published_at) VALUES
  ('Indexing for humans',         'Ada Lovelace',      1200, '2024-01-05 09:00:00+00'),
  ('The case for MVCC',           'Alan Turing',        890, '2024-01-05 09:00:00+00'),
  ('Why your query is slow',      'Grace Hopper',      4300, '2024-01-12 14:00:00+00'),
  ('EXPLAIN, explained',          'Grace Hopper',      3100, '2024-01-20 10:30:00+00'),
  ('B-trees from first principles','Donald Knuth',     2750, '2024-01-28 08:15:00+00'),
  ('Postgres tips, vol 1',        'Ada Lovelace',       640, '2024-02-04 16:45:00+00'),
  ('Postgres tips, vol 2',        'Ada Lovelace',       720, '2024-02-11 16:45:00+00'),
  ('Joins by example',            'Linus Torvalds',    1810, '2024-02-19 12:00:00+00'),
  ('LATERAL is fine, actually',   'Barbara Liskov',     980, '2024-02-26 11:00:00+00'),
  ('When to use JSONB',           'Guido van Rossum',  2210, '2024-03-04 09:30:00+00'),
  ('When not to use JSONB',       'Guido van Rossum',  1560, '2024-03-11 09:30:00+00'),
  ('Window functions in anger',   'Margaret Hamilton', 3380, '2024-03-18 13:20:00+00'),
  ('Reading EXPLAIN ANALYZE',     'Grace Hopper',      4710, '2024-03-25 13:20:00+00'),
  ('Vacuum and bloat',            'Dennis Ritchie',     430, '2024-04-01 07:00:00+00'),
  ('A small note on COLLATE',     'Bjarne Stroustrup',  210, '2024-04-08 18:00:00+00'),
  ('GIN vs GiST',                 'Donald Knuth',      1990, '2024-04-15 10:00:00+00'),
  ('Trigram search basics',       'Ken Thompson',       870, '2024-04-22 10:00:00+00'),
  ('CTEs are not optimization fences anymore','Linus Torvalds', 2540, '2024-04-29 15:15:00+00'),
  ('Schema migrations without tears','Barbara Liskov',  3050, '2024-05-06 11:45:00+00'),
  ('Idempotent INSERTs with ON CONFLICT','Margaret Hamilton', 2890, '2024-05-13 11:45:00+00'),
  ('Three flavors of UUID',       'Edsger Dijkstra',    760, '2024-05-20 09:00:00+00'),
  ('Counting is harder than it looks','Ada Lovelace',  1680, '2024-05-27 14:30:00+00'),
  ('Pagination, the LIMIT/OFFSET trap','Grace Hopper', 5120, '2024-06-03 14:30:00+00'),
  ('Pagination, the keyset way',  'Grace Hopper',      4870, '2024-06-10 14:30:00+00'),
  ('Date math in Postgres',       'Guido van Rossum',   930, '2024-06-17 08:30:00+00'),
  ('Time zones, again',           'Bjarne Stroustrup',  410, '2024-06-24 08:30:00+00'),
  ('Generated columns: hidden gems','Dennis Ritchie',  1240, '2024-07-01 17:00:00+00'),
  ('Foreign keys revisited',      'Ken Thompson',      1080, '2024-07-08 17:00:00+00'),
  ('Locking, lightly',            'Edsger Dijkstra',   1340, '2024-07-15 12:30:00+00'),
  ('How autovacuum keeps you sane','Margaret Hamilton', 980, '2024-07-22 12:30:00+00');
