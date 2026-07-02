-- Seed for "02-locking": two tables that model the situations where locks
-- matter. accounts is a tiny ledger for the read-modify-write pattern (lock a
-- balance before you change it). jobs is a work queue with several 'pending'
-- rows, so many workers can claim different jobs with FOR UPDATE SKIP LOCKED.

CREATE TABLE accounts (
  id      int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner   text NOT NULL UNIQUE,
  balance int  NOT NULL CHECK (balance >= 0)
);

INSERT INTO accounts (owner, balance) VALUES
  ('ada',   100),
  ('grace', 100),
  ('linus', 100);

CREATE TABLE jobs (
  id       int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload  text NOT NULL,
  status   text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'done')),
  claimed_by text
);

INSERT INTO jobs (payload) VALUES
  ('resize-image-1'),
  ('resize-image-2'),
  ('send-email-3'),
  ('send-email-4'),
  ('build-report-5');
