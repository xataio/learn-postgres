-- Seed for "03-set-operations": two overlapping contact lists so we can stack
-- their rows vertically. Joins combine tables *side by side* (more columns);
-- set operations combine them *top to bottom* (more rows). Same columns, same
-- types — that's the whole requirement. Some emails appear on both lists so
-- INTERSECT/EXCEPT have something to find.

CREATE TABLE newsletter_subscribers (
  email    text NOT NULL,
  name     text NOT NULL
);

INSERT INTO newsletter_subscribers (email, name) VALUES
  ('ada@example.com',    'Ada Lovelace'),
  ('alan@example.com',   'Alan Turing'),
  ('grace@example.com',  'Grace Hopper'),
  ('linus@example.com',  'Linus Torvalds'),
  ('linus@example.com',  'Linus Torvalds'),   -- a duplicate, on purpose
  ('margaret@example.com','Margaret Hamilton');

CREATE TABLE webinar_attendees (
  email    text NOT NULL,
  name     text NOT NULL
);

INSERT INTO webinar_attendees (email, name) VALUES
  ('grace@example.com',  'Grace Hopper'),      -- also on the newsletter
  ('linus@example.com',  'Linus Torvalds'),    -- also on the newsletter
  ('dennis@example.com', 'Dennis Ritchie'),
  ('ken@example.com',    'Ken Thompson'),
  ('barbara@example.com','Barbara Liskov');
