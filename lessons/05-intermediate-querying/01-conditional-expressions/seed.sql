-- Seed for "01-conditional-expressions": a help-desk tickets table built to
-- exercise CASE, COALESCE, and NULLIF. It's deliberately full of NULLs:
-- unassigned tickets, missing contact details, unrated satisfaction scores,
-- and one ticket with zero agent replies (the divide-by-zero trap).

CREATE TABLE tickets (
  id             int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject        text NOT NULL,
  priority       text NOT NULL,  -- 'low' | 'normal' | 'high' | 'urgent'
  status         text NOT NULL,  -- 'open' | 'pending' | 'closed'
  assignee       text,           -- NULL = nobody picked it up yet
  customer_phone text,
  customer_email text,
  satisfaction   int,            -- 1-5, NULL until the customer rates
  messages       int NOT NULL,   -- total messages on the thread
  agent_replies  int NOT NULL    -- can be 0 (nobody replied yet)
);

INSERT INTO tickets
  (subject, priority, status, assignee, customer_phone, customer_email, satisfaction, messages, agent_replies)
VALUES
  ('Password reset loop',       'high',   'closed',  'ada',   NULL,       'sam@example.com', 5,    4, 2),
  ('Billing charged twice',     'urgent', 'open',    'grace', '555-0100', NULL,              NULL, 6, 3),
  ('Dark mode flickers',        'low',    'closed',  'ada',   NULL,       'lee@example.com', 3,    9, 4),
  ('Export to CSV broken',      'normal', 'pending', 'grace', NULL,       'kim@example.com', NULL, 3, 1),
  ('Cannot log in on mobile',   'urgent', 'open',    NULL,    '555-0101', 'pat@example.com', NULL, 1, 0),
  ('Typo on pricing page',      'low',    'closed',  'grace', NULL,       NULL,              4,    2, 1),
  ('API returns 500 on upload', 'high',   'open',    'ada',   NULL,       'dev@example.com', NULL, 7, 3),
  ('Feature request: webhooks', 'normal', 'closed',  'ada',   NULL,       'ona@example.com', 2,    5, 2);
