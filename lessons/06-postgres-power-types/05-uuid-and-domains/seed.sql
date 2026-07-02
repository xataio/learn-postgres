-- Seed for "05-uuid-and-domains": a tiny SaaS account model. accounts uses a
-- uuid primary key defaulted from the core gen_random_uuid() (no extension),
-- an enum for a fixed lifecycle status, and two domains (email, positive_int)
-- that bundle a base type with a CHECK so the rule lives in one place.

CREATE TYPE account_status AS ENUM ('trial', 'active', 'suspended');

CREATE DOMAIN email AS text
  CHECK (VALUE ~ '^[^@]+@[^@]+$');

CREATE DOMAIN positive_int AS integer
  CHECK (VALUE > 0);

CREATE TABLE accounts (
  id       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  email    email          NOT NULL,
  status   account_status NOT NULL DEFAULT 'trial',
  seats    positive_int   NOT NULL DEFAULT 1
);

INSERT INTO accounts (email, status, seats) VALUES
  ('ada@example.com',   'active',    12),
  ('grace@example.com', 'trial',      1),
  ('linus@example.com', 'suspended',  5);
