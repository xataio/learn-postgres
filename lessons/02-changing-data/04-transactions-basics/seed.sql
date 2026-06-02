-- Seed for "04-transactions-basics": the canonical bank-accounts table so
-- "transfer money atomically" is the worked example.

CREATE TABLE accounts (
  owner   text PRIMARY KEY,
  balance int  NOT NULL CHECK (balance >= 0)
);

INSERT INTO accounts (owner, balance) VALUES
  ('ada',     100),
  ('grace',   100),
  ('linus',   100);
