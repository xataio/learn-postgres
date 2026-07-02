-- Seed for "04-query-optimization": an events log big enough that plan choices
-- actually matter. 200,000 rows over the last ~200 days, each stamped with a
-- created_at plus a city and its country. city fully determines country, so the
-- two columns are strongly correlated -- perfect for the extended-statistics
-- demo. A small users table gives us a join whose foreign key is deliberately
-- left unindexed.

CREATE TABLE users (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text   NOT NULL
);

INSERT INTO users (name)
SELECT 'user_' || g FROM generate_series(1, 5000) AS g;

CREATE TABLE events (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users (id),
  city       text        NOT NULL,
  country    text        NOT NULL,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL
);

INSERT INTO events (user_id, city, country, action, created_at)
SELECT
  (g % 5000) + 1                                   AS user_id,
  c.city,
  c.country,
  (ARRAY['login','view','click','purchase','logout'])[1 + (g % 5)] AS action,
  now() - ((g % 200) * interval '1 day')
        - ((g % 86400) * interval '1 second')      AS created_at
FROM generate_series(1, 200000) AS g
CROSS JOIN LATERAL (
  SELECT city, country
  FROM (VALUES
    ('Paris',    'France'),
    ('Lyon',     'France'),
    ('Berlin',   'Germany'),
    ('Munich',   'Germany'),
    ('Madrid',   'Spain'),
    ('Seville',  'Spain'),
    ('Rome',     'Italy'),
    ('Milan',    'Italy'),
    ('Lisbon',   'Portugal'),
    ('Porto',    'Portugal')
  ) AS v(city, country)
  OFFSET g % 10 LIMIT 1
) AS c;

-- One index, on created_at, so the sargability demos have something to use (or
-- to miss, when a function wraps the column). We deliberately leave user_id,
-- city, and country unindexed so the anti-pattern demos are real.
CREATE INDEX events_created_at_idx ON events (created_at);

-- Freshen the planner's statistics so estimates are trustworthy from the start.
ANALYZE users;
ANALYZE events;
