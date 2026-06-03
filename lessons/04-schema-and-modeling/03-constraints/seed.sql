-- Seed for "03-constraints": a tiny bank schema where every column carries a
-- rule. accounts has a primary key, a UNIQUE email, NOT NULL columns, a CHECK
-- that balances can't go negative, and a DEFAULT. transactions has a FOREIGN
-- KEY back to accounts so we can show referential integrity and ON DELETE.

CREATE TABLE accounts (
  id      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email   text    NOT NULL UNIQUE,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

INSERT INTO accounts (email, balance) VALUES
  ('ada@example.com',   500.00),
  ('grace@example.com', 1200.00),
  ('linus@example.com', 0.00);

CREATE TABLE transactions (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id int     NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount     numeric(12,2) NOT NULL CHECK (amount <> 0),
  memo       text
);

INSERT INTO transactions (account_id, amount, memo) VALUES
  (1,  500.00, 'opening deposit'),
  (1, -120.00, 'groceries'),
  (2, 1200.00, 'opening deposit'),
  (2, -300.00, 'rent');
