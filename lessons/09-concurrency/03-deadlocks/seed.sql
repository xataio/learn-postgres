-- Seed for "03-deadlocks": the same tiny bank ledger from the rest of Module 9.
-- accounts holds four owners with starting balances, so we can reason about two
-- concurrent transfers grabbing row locks in opposite orders (a deadlock) and
-- then fix it by always locking rows in a consistent order (lowest id first).

CREATE TABLE accounts (
  id      int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner   text NOT NULL UNIQUE,
  balance int  NOT NULL CHECK (balance >= 0)
);

INSERT INTO accounts (owner, balance) VALUES
  ('ada',   100),
  ('grace', 100),
  ('linus', 100),
  ('sofia', 100);
