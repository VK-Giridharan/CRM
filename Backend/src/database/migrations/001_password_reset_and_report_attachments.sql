-- ======================================================
-- Migration 001
--
-- Required for:
--   * Forgot / Reset Password  -> new table  password_resets
--   * Task report file upload  -> new nullable columns on task_reports
--
-- Nothing is dropped, truncated, renamed or back-filled. No existing column
-- is altered. Every statement is idempotent, so re-running is harmless.
--
-- Conventions match the existing schema exactly:
--   integer identity column, timestamp without time zone,
--   CURRENT_TIMESTAMP defaults, integer FK to users(id).
--
-- APPLY THIS FILE MANUALLY (TablePlus). It is not executed by the app.
-- ======================================================

BEGIN;

-- ------------------------------------------------------
-- 1. PASSWORD RESETS
--
-- Only the SHA-256 hash of the reset token is stored, so read access to this
-- table cannot be used to reset anyone's password. used_at enforces
-- single-use; expires_at enforces the time window.
-- ------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
    id          SERIAL PRIMARY KEY,

    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- sha256 hex digest, always 64 characters
    token_hash  VARCHAR(64) NOT NULL,

    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash
    ON password_resets (token_hash);

CREATE INDEX IF NOT EXISTS idx_password_resets_user
    ON password_resets (user_id);


-- ------------------------------------------------------
-- 2. TASK REPORT ATTACHMENT
--
-- One optional attachment per report, stored as columns on the existing
-- task_reports table rather than a separate table - this is the minimum
-- schema needed for the workflow.
--
-- attachment_path holds the generated on-disk filename only (never the
-- client-supplied name, never a full path).
-- ------------------------------------------------------
ALTER TABLE task_reports
    ADD COLUMN IF NOT EXISTS attachment_path          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_original_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_mime          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS attachment_size          INTEGER;

COMMIT;
