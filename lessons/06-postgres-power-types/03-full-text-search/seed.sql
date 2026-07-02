-- Seed for "03-full-text-search": a tiny blog. articles holds a handful of rows
-- with real-ish prose in title and body so stemming, ranking, headlines, and
-- field weighting all have something meaningful to match. Full-text search here
-- is pure core PostgreSQL -- no extensions required.

CREATE TABLE articles (
  id    int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  body  text NOT NULL
);

INSERT INTO articles (title, body) VALUES
  ('Running a marathon on a treadmill',
   'Marathon training does not have to happen outdoors. Many runners log their long runs on a treadmill, where the pace never drifts and the surface is forgiving. If you ran ten miles yesterday, an easy treadmill jog today keeps the legs turning without pounding.'),
  ('How Postgres stores rows on disk',
   'A running Postgres server keeps table data in fixed-size pages. Understanding how rows are laid out on disk helps you reason about bloat, vacuum, and why an update is really a delete plus an insert under the hood.'),
  ('The quick brown fox and other typing drills',
   'Typing drills built around the quick brown fox sentence are a fun way to warm up. Practising short bursts every day builds speed faster than one long session per week.'),
  ('Cooking a slow braise for a cold evening',
   'A good braise rewards patience. Brown the meat, deglaze the pan, then let everything cook low and slow for hours. The kitchen fills with the smell of a proper winter dinner.'),
  ('Debugging a slow query in production',
   'When a query suddenly runs slow, the first move is to read the plan. A missing index turns a fast lookup into a full scan, and a full scan over a large table crawls. Measure, then fix.'),
  ('A morning run in the rain',
   'There is a quiet joy to a run in the rain. The streets are empty, the air is cool, and the miles pass quickly. I ran through the park at dawn and had the whole trail to myself.');
