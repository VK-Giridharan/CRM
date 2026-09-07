-- ======================================================
-- Migration 002
--
-- Required for:
--   * BUG-015  Lead "Requirement" field  -> new nullable column leads.requirement
--   * BUG-024  Session invalidation      -> new nullable column users.password_changed_at
--
-- Nothing is dropped, truncated, renamed or back-filled with destructive
-- intent. No existing column is altered. Every statement is idempotent, so
-- re-running is harmless.
--
-- Conventions match the existing schema exactly:
--   text for free-form notes (same as leads.remarks),
--   timestamp without time zone (same as users.last_login).
-- ======================================================

BEGIN;

-- ------------------------------------------------------
-- 1. LEAD REQUIREMENT
--
-- The Manager UI has always had a "Requirement" input, a "Requirement"
-- table column and a "Requirement" detail field, but no such column existed
-- on the table and the controller never read or wrote it, so everything the
-- user typed there was silently discarded.
--
-- Nullable so every existing lead row stays valid.
-- ------------------------------------------------------
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS requirement TEXT;


-- ------------------------------------------------------
-- 2. PASSWORD CHANGED AT
--
-- Lets the token middleware reject a JWT that was issued before the user's
-- most recent password change or reset, so changing a password actually
-- ends other sessions.
--
-- Left NULL for existing rows on purpose: a NULL means "never changed since
-- this feature shipped", and the check treats NULL as "do not reject", so no
-- existing user is logged out by applying this migration.
-- ------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

COMMIT;
