-- Seed for "03-where-conditions": a richer users table with a nullable column
-- so we can demonstrate IS NULL alongside the rest of the predicate vocabulary.

CREATE TABLE users (
  id           serial PRIMARY KEY,
  email        text NOT NULL UNIQUE,
  full_name    text NOT NULL,
  country      text,                    -- nullable on purpose
  is_active    boolean NOT NULL DEFAULT true,
  signed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (email, full_name, country, is_active, signed_up_at) VALUES
  ('ada@example.com',      'Ada Lovelace',      'UK',     true,  '2024-01-12 09:00:00+00'),
  ('alan@example.com',     'Alan Turing',       'UK',     true,  '2024-02-03 14:30:00+00'),
  ('grace@example.com',    'Grace Hopper',      'US',     true,  '2024-02-22 18:15:00+00'),
  ('linus@example.com',    'Linus Torvalds',    'FI',     true,  '2024-03-08 11:45:00+00'),
  ('margaret@example.com', 'Margaret Hamilton', 'US',     true,  '2024-03-19 08:05:00+00'),
  ('dennis@example.com',   'Dennis Ritchie',    'US',     false, '2024-04-01 16:20:00+00'),
  ('ken@example.com',      'Ken Thompson',      'US',     true,  '2024-04-15 10:10:00+00'),
  ('barbara@example.com',  'Barbara Liskov',    'US',     true,  '2024-04-28 13:50:00+00'),
  ('edsger@example.com',   'Edsger Dijkstra',   'NL',     false, '2024-05-09 07:25:00+00'),
  ('don@example.com',      'Donald Knuth',      'US',     false, '2024-05-21 19:40:00+00'),
  ('bjarne@example.com',   'Bjarne Stroustrup', 'DK',     true,  '2024-06-02 12:00:00+00'),
  ('guido@example.com',    'Guido van Rossum',  'NL',     true,  '2024-06-18 15:35:00+00'),
  ('rich@example.com',     'Rich Hickey',       'US',     true,  '2024-07-04 09:55:00+00'),
  ('anders@example.com',   'Anders Hejlsberg',  'DK',     true,  '2024-07-22 17:10:00+00'),
  ('niklaus@example.com',  'Niklaus Wirth',     NULL,     true,  '2024-08-09 11:00:00+00'),
  ('john@example.com',     'John McCarthy',     NULL,     false, '2024-08-25 08:40:00+00');
