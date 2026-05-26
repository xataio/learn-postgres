-- Seed for "02-insert-and-update": the same users table from the SELECT lesson,
-- so changes you make are easy to spot. Three users start inactive on purpose
-- so UPDATE has something to do.

CREATE TABLE users (
  id          serial PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  full_name   text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  signed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (email, full_name, is_active, signed_up_at) VALUES
  ('ada@example.com',      'Ada Lovelace',        true,  '2024-01-12 09:00:00+00'),
  ('alan@example.com',     'Alan Turing',         true,  '2024-02-03 14:30:00+00'),
  ('grace@example.com',    'Grace Hopper',        true,  '2024-02-22 18:15:00+00'),
  ('linus@example.com',    'Linus Torvalds',      true,  '2024-03-08 11:45:00+00'),
  ('margaret@example.com', 'Margaret Hamilton',   true,  '2024-03-19 08:05:00+00'),
  ('dennis@example.com',   'Dennis Ritchie',      false, '2024-04-01 16:20:00+00'),
  ('ken@example.com',      'Ken Thompson',        true,  '2024-04-15 10:10:00+00'),
  ('barbara@example.com',  'Barbara Liskov',      true,  '2024-04-28 13:50:00+00'),
  ('edsger@example.com',   'Edsger Dijkstra',     false, '2024-05-09 07:25:00+00'),
  ('don@example.com',      'Donald Knuth',        false, '2024-05-21 19:40:00+00');
