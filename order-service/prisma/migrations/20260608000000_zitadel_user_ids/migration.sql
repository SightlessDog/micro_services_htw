-- Zitadel `sub` identifiers are opaque strings, not local auto-increment ints.
-- Pre-launch data — no real orders to preserve a numeric user_id for.
ALTER TABLE "orders" ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::TEXT;
