-- Seed for "01-mvcc-and-isolation": a tiny bank ledger. accounts holds three
-- owners with a starting balance, so we can watch UPDATE create new row
-- versions (xmin/xmax) and reason about what concurrent transactions see.

CREATE TABLE accounts (
  id      int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner   text NOT NULL UNIQUE,
  balance int  NOT NULL CHECK (balance >= 0)
);

INSERT INTO accounts (owner, balance) VALUES
  ('ada',   100),
  ('grace', 100),
  ('linus', 100);
