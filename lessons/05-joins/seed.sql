-- Seed for "05-joins": users + orders + a small categories table so we can
-- show two- and three-table joins. Some users have no orders so LEFT JOIN
-- has something interesting to surface.

CREATE TABLE categories (
  id    serial PRIMARY KEY,
  name  text NOT NULL UNIQUE
);

INSERT INTO categories (name) VALUES
  ('apparel'),
  ('book'),
  ('hardware'),
  ('accessory');

CREATE TABLE users (
  id           serial PRIMARY KEY,
  email        text NOT NULL UNIQUE,
  full_name    text NOT NULL,
  country      text,
  is_active    boolean NOT NULL DEFAULT true,
  signed_up_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (email, full_name, country, is_active, signed_up_at) VALUES
  ('ada@example.com',      'Ada Lovelace',      'UK',  true,  '2024-01-12 09:00:00+00'),
  ('alan@example.com',     'Alan Turing',       'UK',  true,  '2024-02-03 14:30:00+00'),
  ('grace@example.com',    'Grace Hopper',      'US',  true,  '2024-02-22 18:15:00+00'),
  ('linus@example.com',    'Linus Torvalds',    'FI',  true,  '2024-03-08 11:45:00+00'),
  ('margaret@example.com', 'Margaret Hamilton', 'US',  true,  '2024-03-19 08:05:00+00'),
  ('dennis@example.com',   'Dennis Ritchie',    'US',  false, '2024-04-01 16:20:00+00'),
  ('ken@example.com',      'Ken Thompson',      'US',  true,  '2024-04-15 10:10:00+00'),
  ('barbara@example.com',  'Barbara Liskov',    'US',  true,  '2024-04-28 13:50:00+00'),
  ('edsger@example.com',   'Edsger Dijkstra',   'NL',  false, '2024-05-09 07:25:00+00'),
  ('don@example.com',      'Donald Knuth',      'US',  false, '2024-05-21 19:40:00+00'),
  ('bjarne@example.com',   'Bjarne Stroustrup', 'DK',  true,  '2024-06-02 12:00:00+00'),
  ('guido@example.com',    'Guido van Rossum',  'NL',  true,  '2024-06-18 15:35:00+00');

CREATE TABLE orders (
  id          serial PRIMARY KEY,
  user_id     int NOT NULL REFERENCES users(id),
  category_id int NOT NULL REFERENCES categories(id),
  product     text NOT NULL,
  amount      numeric(10, 2) NOT NULL,
  placed_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO orders (user_id, category_id, product, amount, placed_at) VALUES
  (1,  3, 'Difference Engine kit',  299.00, '2024-02-05 10:00:00+00'),
  (1,  4, 'Punched cards (500)',     19.50, '2024-03-01 11:20:00+00'),
  (1,  2, 'Reference manual',        45.00, '2024-04-12 09:15:00+00'),
  (3,  1, 'Compiler T-shirt',        25.00, '2024-03-10 14:00:00+00'),
  (3,  2, 'COBOL handbook',          39.95, '2024-03-25 16:30:00+00'),
  (4,  4, 'Penguin plush',           18.00, '2024-04-02 13:45:00+00'),
  (4,  4, 'Linux mug',               12.50, '2024-04-02 13:45:00+00'),
  (4,  4, 'Kernel poster',            9.99, '2024-05-18 10:00:00+00'),
  (5,  1, 'Apollo guidance hoodie',  64.00, '2024-04-20 18:00:00+00'),
  (7,  2, 'Unix philosophy book',    29.00, '2024-05-01 12:00:00+00'),
  (7,  1, 'Bell Labs cap',           22.00, '2024-05-22 15:30:00+00'),
  (8,  4, 'Liskov substitution mug', 15.00, '2024-06-09 09:30:00+00'),
  (11, 2, 'C++ reference',           59.00, '2024-07-03 11:00:00+00'),
  (12, 4, 'Python sticker pack',      8.50, '2024-07-15 17:45:00+00'),
  (12, 2, 'Monty Python DVD',        24.99, '2024-08-01 20:10:00+00');
