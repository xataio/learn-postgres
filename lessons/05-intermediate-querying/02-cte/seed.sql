-- Seed for "02-cte": a tiny music-streaming service. artists have tracks, and
-- plays records every listen during June 2024. Play counts are skewed on
-- purpose so multi-step CTE chains (filter, aggregate, join back) produce
-- meaningful, uneven results.

CREATE TABLE artists (
  id    int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  text NOT NULL,
  genre text NOT NULL
);

INSERT INTO artists (name, genre) VALUES
  ('Nina Cole',   'jazz'),
  ('The Volts',   'rock'),
  ('Lumen',       'electronic'),
  ('Marta Reyes', 'folk');

CREATE TABLE tracks (
  id               int  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  artist_id        int  NOT NULL REFERENCES artists(id),
  title            text NOT NULL,
  duration_seconds int  NOT NULL
);

INSERT INTO tracks (artist_id, title, duration_seconds) VALUES
  (1, 'Blue Doorway',  243),
  (1, 'Midnight Brew', 198),
  (2, 'Capacitor',     215),
  (2, 'Short Circuit', 187),
  (3, 'Afterglow',     301),
  (3, 'Neon Tide',     264),
  (4, 'Paper Boats',   226),
  (4, 'Harvest Moon',  252);

CREATE TABLE plays (
  id        int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  track_id  int NOT NULL REFERENCES tracks(id),
  played_at timestamptz NOT NULL
);

INSERT INTO plays (track_id, played_at) VALUES
  (1, '2024-06-02 09:15+00'),
  (1, '2024-06-05 21:40+00'),
  (1, '2024-06-16 08:05+00'),
  (1, '2024-06-20 17:30+00'),
  (1, '2024-06-28 23:10+00'),
  (2, '2024-06-03 11:25+00'),
  (2, '2024-06-18 19:45+00'),
  (3, '2024-06-04 14:00+00'),
  (3, '2024-06-10 10:50+00'),
  (3, '2024-06-22 20:15+00'),
  (4, '2024-06-08 16:35+00'),
  (5, '2024-06-01 07:55+00'),
  (5, '2024-06-07 22:20+00'),
  (5, '2024-06-15 18:00+00'),
  (5, '2024-06-17 09:30+00'),
  (5, '2024-06-24 13:45+00'),
  (5, '2024-06-29 21:05+00'),
  (6, '2024-06-06 12:10+00'),
  (6, '2024-06-12 20:00+00'),
  (6, '2024-06-19 15:25+00'),
  (6, '2024-06-26 18:40+00'),
  (7, '2024-06-09 10:05+00'),
  (7, '2024-06-21 19:55+00'),
  (8, '2024-06-11 13:20+00'),
  (8, '2024-06-30 22:45+00');
