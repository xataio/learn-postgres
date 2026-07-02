-- Seed for "03-extensions": a tiny users table with plain-text emails. The
-- email column is ordinary text, so 'Ada@Example.com' and 'ada@example.com'
-- are two different values here — exactly the pain the citext extension fixes.
-- No CREATE EXTENSION in the seed: the learner installs citext in the lesson.

CREATE TABLE users (
  id    int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  text NOT NULL,
  email text NOT NULL
);

INSERT INTO users (name, email) VALUES
  ('Ada Lovelace',     'Ada@Example.com'),
  ('Grace Hopper',     'grace@example.com'),
  ('Linus Torvalds',   'Linus@Example.com'),
  ('Margaret Hamilton','margaret@example.com');
