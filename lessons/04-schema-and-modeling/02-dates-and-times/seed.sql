-- Seed for "02-dates-and-times": a few conference talks with a start time
-- stored as timestamptz and a duration. Spread across days and times of day so
-- date_trunc, extract, and interval arithmetic all have something to chew on.

CREATE TABLE talks (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      text        NOT NULL,
  speaker    text        NOT NULL,
  starts_at  timestamptz NOT NULL,
  duration   interval    NOT NULL
);

INSERT INTO talks (title, speaker, starts_at, duration) VALUES
  ('Keynote',            'Ada Lovelace',      '2024-09-10 09:00+00', interval '45 minutes'),
  ('Indexing deep dive', 'Grace Hopper',      '2024-09-10 11:30+00', interval '50 minutes'),
  ('Query planning',     'Linus Torvalds',    '2024-09-10 14:00+00', interval '1 hour'),
  ('Replication 101',    'Margaret Hamilton', '2024-09-11 09:30+00', interval '40 minutes'),
  ('Lightning talks',    'Various',           '2024-09-11 16:15+00', interval '90 minutes'),
  ('Closing panel',      'Dennis Ritchie',    '2024-09-11 17:30+00', interval '1 hour 15 minutes');
