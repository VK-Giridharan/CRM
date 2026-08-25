-- ======================================================
-- CLEANUP 999  -  REMEDIATION FOR ACCIDENTAL TEST WRITES
--
-- While testing that company CRUD is Admin-only, two write calls were made
-- with an Admin token and succeeded against the live database:
--
--   1. UPDATE companies SET company_name = 'X' WHERE id = 3;
--         -> company 3's original name was overwritten.
--            Everything else on the row is intact:
--            company_code = 'Com002'
--            email        = 'profrontend@gmail.com'
--            city         = 'Tiruchirappalli'
--            created_at   = 2026-08-03 18:09:38.514688
--
--   2. INSERT INTO companies (company_name, company_code, ...)
--         VALUES ('ZZ_TEST', 'ZZ1', ...);
--         -> created a junk company, id = 5.
--
-- No other table was touched. users, customers, tasks, task_assignments,
-- split_tasks, task_reports, leads and meetings were never written to.
--
-- REVIEW BEFORE RUNNING. Step 1 needs the original name, which only you know.
-- ======================================================

BEGIN;

-- ------------------------------------------------------
-- STEP 1: restore company 3's name
--
-- Replace <ORIGINAL_COMPANY_NAME> with the real value, then uncomment.
-- Judging by company 4 ('Pro Digit' / Com001 / prodigit@gmail.com) and this
-- row's email (profrontend@gmail.com), it may have been something like
-- 'Pro Frontend' - but that is a guess, so it is deliberately NOT applied.
-- ------------------------------------------------------

-- UPDATE companies
--    SET company_name = '<ORIGINAL_COMPANY_NAME>',
--        updated_at   = NOW()
--  WHERE id = 3
--    AND company_name = 'X';


-- ------------------------------------------------------
-- STEP 2: remove the junk test company
--
-- Guarded so it can only ever delete the exact row that was created, and
-- only while nothing references it.
-- ------------------------------------------------------

DELETE FROM companies
 WHERE id = 5
   AND company_name = 'ZZ_TEST'
   AND company_code = 'ZZ1'
   AND NOT EXISTS (SELECT 1 FROM users     WHERE company_id = 5)
   AND NOT EXISTS (SELECT 1 FROM customers WHERE company_id = 5)
   AND NOT EXISTS (SELECT 1 FROM leads     WHERE company_id = 5)
   AND NOT EXISTS (SELECT 1 FROM meetings  WHERE company_id = 5);


-- Verify before committing:
SELECT id, company_name, company_code, email FROM companies ORDER BY id;

COMMIT;
