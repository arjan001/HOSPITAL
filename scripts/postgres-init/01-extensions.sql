-- First-boot Postgres init for Shaniid RX.
-- These run only when the data volume is empty (fresh install).

-- UUID helpers used by some Drizzle migrations.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- citext = case-insensitive text. Useful for emails, slugs, etc.
CREATE EXTENSION IF NOT EXISTS "citext";
