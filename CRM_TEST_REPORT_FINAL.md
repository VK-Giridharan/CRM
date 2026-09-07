# CRM FINAL A-Z TEST REPORT

> Companion to `CRM_TEST_REPORT.md` (the original A-Z audit). That document is
> unchanged and remains the record of the original findings.
>
> This report covers the remediation work and the complete A-Z regression test
> that followed it.

**Date:** 2026-08-29
**Baseline commit:** `725c99c` — "Complete CRM Project"
**Environment:** Node 24.15.0 · Express 5 · PostgreSQL 18.4 · React 19 / Vite 8.1.5 · Windows 11

---

## Original Baseline

| | |
|---|---:|
| Total | **473** |
| PASS | **409** |
| FAIL | **48** |
| BLOCKED | **15** |
| NOT TESTED | **1** |
| Pass rate | **86.5 %** |
| Verdict | **NOT READY — CRITICAL ISSUES** |

---

## Final Result

| | |
|---|---:|
| **Total Tests** | **570** |
| **PASS** | **570** |
| **FAIL** | **0** |
| **BLOCKED** | **0** |
| **NOT TESTED** | **0** |
| **NOT APPLICABLE** | **0** |
| **Pass rate** | **100 %** |

The final suite was executed **from a freshly created database**, in one
uninterrupted run, across eight phases. Every number above comes from that run.

---

## Improvement

| Metric | Original | Final | Change |
|---|---:|---:|---:|
| Total tests | 473 | 570 | **+97** |
| PASS | 409 | 570 | **+161** |
| FAIL | 48 | **0** | **−48** |
| BLOCKED | 15 | **0** | **−15** |
| NOT TESTED | 1 | **0** | **−1** |
| Pass rate | 86.5 % | **100 %** | **+13.5 pts** |

All 409 originally-passing behaviours were re-tested and still pass. The suite
grew by 97 tests because each fix added explicit regression guards (for example:
"Manager can *still* update customers", "a task with no split tasks is *never*
auto-completed", "throttling one account does *not* lock out other users").

---

## Module Summary

| Module | Total | Pass | Fail | Blocked | Not Tested | Status |
|---|---:|---:|---:|---:|---:|---|
| Authentication | 1 | 1 | 0 | 0 | 0 | PASS |
| Registration | 26 | 26 | 0 | 0 | 0 | PASS |
| Login | 15 | 15 | 0 | 0 | 0 | PASS |
| Password Reset | 22 | 22 | 0 | 0 | 0 | PASS |
| Admin | 18 | 18 | 0 | 0 | 0 | PASS |
| Manager | 7 | 7 | 0 | 0 | 0 | PASS |
| Team Leader | 1 | 1 | 0 | 0 | 0 | PASS |
| Employee | 4 | 4 | 0 | 0 | 0 | PASS |
| Intern | 4 | 4 | 0 | 0 | 0 | PASS |
| Company | 26 | 26 | 0 | 0 | 0 | PASS |
| Customers | 29 | 29 | 0 | 0 | 0 | PASS |
| Leads | 19 | 19 | 0 | 0 | 0 | PASS |
| Meetings | 27 | 27 | 0 | 0 | 0 | PASS |
| Tasks | 72 | 72 | 0 | 0 | 0 | PASS |
| Task Reports | 31 | 31 | 0 | 0 | 0 | PASS |
| Dashboard | 13 | 13 | 0 | 0 | 0 | PASS |
| Profile | 24 | 24 | 0 | 0 | 0 | PASS |
| Workers | 5 | 5 | 0 | 0 | 0 | PASS |
| API | 1 | 1 | 0 | 0 | 0 | PASS |
| Data Integrity | 5 | 5 | 0 | 0 | 0 | PASS |
| Authorization | 44 | 44 | 0 | 0 | 0 | PASS |
| Company Isolation | 60 | 60 | 0 | 0 | 0 | PASS |
| Security | 56 | 56 | 0 | 0 | 0 | PASS |
| Error Handling | 3 | 3 | 0 | 0 | 0 | PASS |
| End-to-End | 9 | 9 | 0 | 0 | 0 | PASS |
| UI | 48 | 48 | 0 | 0 | 0 | PASS |
| **TOTAL** | **570** | **570** | **0** | **0** | **0** | **PASS** |

---

## All Fixed Bugs

### BUG-001 — Task Report module 100 % non-functional · CRITICAL

* **Original problem:** migration `001` had never been applied to the live
  database. `password_resets` did not exist and `task_reports` was missing all
  four `attachment_*` columns, so five endpoints returned HTTP 500 on every
  call. Employees/Interns could not open or report on tasks; Team Leads could
  not review anything. Password reset was silently broken by the same cause.
* **Fix implemented:** applied `001_password_reset_and_report_attachments.sql`
  to the live `enterprise_crm` database. The migration is purely additive
  (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) — no DROP,
  TRUNCATE, DELETE or ALTER COLUMN. Row counts were captured before and after
  and are identical. **No application code was changed for this bug — the code
  was already correct.**
  To stop it recurring, `server.js` now runs `validateSchema()` at boot and
  refuses to start with a message naming the exact migration to run.
* **Retest result:** **PASS.** 31/31 Task Report tests pass. Submit, resubmit,
  rework loop, approve, attachment upload/download, and every authorisation and
  isolation check now work. `✅ Database Schema Verified` appears at boot.

### BUG-002 — No backend phone validation on registration · HIGH

* **Original problem:** `phone` was only checked for presence, so a direct API
  call stored `"12345"`, `"123456789012345"`, `"abcdefghij"` and `"-123456789"`
  even though the Register screen enforces exactly 10 digits.
* **Fix implemented:** new `Backend/src/utils/validation.js` with a
  `validatePhone` that mirrors `Frontend/src/utils/phoneValidation.js` exactly
  (digits only, exactly 10). Wired into `register`.
* **Retest result:** **PASS.** All four cases now return 400 with a specific
  message. A database sweep after the full run found **0 users with a
  non-10-digit phone**. Visually confirmed: the Admin Pending Users page no
  longer displays any malformed phone.

### BUG-003 — Same missing phone validation on profile update · HIGH

* **Original problem:** `POST /auth/update-profile` accepted `phone: "123"`.
* **Fix implemented:** same validators applied to `updateProfile`. Original
  error messages preserved so existing passing tests still match.
* **Retest result:** **PASS.** 3-digit, 15-digit and alphabetic phones all 400.

### BUG-004 — No customer email/phone validation; 25-digit phone → 500 · HIGH

* **Original problem:** invalid emails and alphabetic phones were stored; an
  over-length phone overflowed `varchar(20)` and surfaced as HTTP 500.
* **Fix implemented:** full field validation in `createCustomer`, with column
  width limits enforced in the application so nothing reaches Postgres as a
  failed cast.
* **Retest result:** **PASS.** All four cases return 400. DB sweep: **0
  customers with a non-10-digit phone**.

### BUG-005 — Employee and Intern could update/delete any customer · CRITICAL

* **Original problem:** `updateCustomer` and `deleteCustomer` checked company
  membership but never the caller's role. An Intern successfully soft-deleted a
  Manager's customer.
* **Fix implemented:** `CUSTOMER_WRITE_ROLES = [Admin, Manager]` gate added to
  both handlers. `createCustomer` (already Manager-only) untouched. Read access
  for Team Lead / Employee / Intern deliberately **unchanged**.
* **Retest result:** **PASS.** All six write attempts (TL/Employee/Intern ×
  update/delete) return 403. Regression guards confirm Manager **and** Admin can
  still write, and that all three worker roles can still **read** customer
  details.

### BUG-006 — Partial customer update wiped every unsupplied field · HIGH

* **Original problem:** a name-only update nulled `city`, `email`,
  `gst_number`, `website`, `address` and more — silent data loss.
* **Fix implemented:** `updateCustomer` rewritten to build the SET clause from
  keys actually present in the body, against a fixed whitelist:
  key absent → column untouched; key present → set; key present but blank →
  explicitly cleared. Required fields (`customer_name`, `phone`) cannot be
  blanked.
* **Retest result:** **PASS.** A name-only update preserves all eight other
  populated fields; an explicitly blank optional field still clears; blanking
  `phone` returns 400.

### BUG-007 — Lead duplicate check leaked across tenants · MEDIUM

* **Original problem:** duplicate phone/email checks queried `leads` globally,
  creating a cross-tenant existence oracle and blocking two companies from ever
  holding the same prospect.
* **Fix implemented:** both checks in `createLead` and `updateLead` now include
  `AND company_id = $n`.
* **Retest result:** **PASS.** Company B can create a lead with a phone and an
  email that exist only in Company A (both 201). Duplicate detection still works
  correctly *within* a company.

### BUG-008 — Invalid meeting date/time → HTTP 500 · MEDIUM

* **Original problem:** `2026-13-45`, `notadate` and `99:99` reached Postgres
  and became generic 500s.
* **Fix implemented:** `validateDate` / `validateTime` (with real calendar
  checks, so `2026-02-30` is rejected too) applied to `createMeeting`,
  `updateMeeting` and `completeMeeting`'s `next_meeting_date`.
* **Retest result:** **PASS.** All four malformed values return 400.

### BUG-009 — Non-string password → HTTP 500 on login · MEDIUM

* **Original problem:** `password: ["a","b"]` threw out of `bcrypt.compare`.
* **Fix implemented:** type guard before the bcrypt call; both `emailOrPhone`
  and `password` must be primitives.
* **Retest result:** **PASS.** Array and object passwords both return 400.
  *Contract note:* `emailOrPhone` as an object now returns **400** instead of
  the previous 401 — same security outcome (no authentication granted), more
  accurate status. This is the only intentional status-code change in the whole
  remediation.

### BUG-010 — Non-numeric IDs → HTTP 500 · MEDIUM

* **Original problem:** `id: "abc"` on company/customer details produced
  `invalid input syntax for type integer`.
* **Fix implemented:** `parseId()` applied across **every** ID-accepting
  handler — company, customer, lead, meeting, task, split task, assignment and
  user — not only the two the report happened to catch.
* **Retest result:** **PASS.** `abc`, `-5`, `0` and `1.5` all return 400 across
  every module.

### BUG-011 — No task priority whitelist; invalid dates → 500 · MEDIUM

* **Original problem:** `SUPER_URGENT` was persisted; `notadate` produced a
  500; a `due_date` before `start_date` was accepted.
* **Fix implemented:** `TASK_PRIORITIES` added to `utils/status.js` (Low,
  Medium, High, Urgent — matching the UI dropdown) and enforced in create and
  update; date validation and a date-order check added.
* **Retest result:** **PASS.** Invalid priority, invalid date, impossible date
  and backwards range all 400; all four valid priorities still accepted. DB
  sweep: **0 tasks with an invalid priority**.

### BUG-012 — Partial task update wiped description and dates · HIGH

* **Original problem:** a title-only edit nulled `description`, `start_date`
  and `due_date`.
* **Fix implemented:** same present-keys-only pattern as BUG-006.
* **Retest result:** **PASS.** Title-only update preserves description and both
  dates; explicitly blank description clears it while dates survive.

### BUG-013 — Every date displayed one day early, as a raw ISO string · HIGH

* **Original problem:** a meeting stored as `2026-10-15` rendered as
  `2026-10-14T18:30:00.000Z`. Root cause: `node-postgres` parses a `DATE`
  column into a JS `Date` at local midnight; `JSON.stringify` converts it to
  UTC, rolling the calendar day back by the local offset.
* **Fix implemented:** two layers.
  1. **Backend** — `types.setTypeParser(1082, v => v)` in `connection.js`
     returns `DATE` columns as the plain `YYYY-MM-DD` text Postgres already
     sends. Scoped to OID 1082 only; `TIMESTAMP` columns are untouched, so
     `created_at` / `submitted_at` still carry a real time.
  2. **Frontend** — new `src/utils/formatDate.js` formats date-only values
     without going through the `Date` constructor. The two unformatted render
     sites were fixed, and the duplicated local `formatDate`/`formatDateTime`
     helpers in five files now import the shared one (required, not cosmetic:
     `new Date("2026-10-15")` is UTC midnight and would shift again in a
     negative-offset timezone).
* **Retest result:** **PASS.** API returns exactly `2026-10-15`. UI shows
  `10/15/2026`, `10/18/2026`, `11/30/2026`, `9/30/2026` — correct days,
  formatted. Dates verified unshifted through a complete create → assign →
  split → report → approve lifecycle.

### BUG-014 — Manager could not view task reports anywhere · HIGH

* **Original problem:** every report endpoint was gated to Team Lead, so a
  Manager could create and assign work but never see the reports it produced.
  The documented "Manager views Report" workflow step did not exist.
* **Fix implemented:**
  * New `GET /api/v1/task-report/manager` (`managerReportList`) — every report
    in the Manager's own company, scoped from their own user row.
  * `getTaskReportDetails` extended to allow a Manager within their company.
    The Team Lead branch is byte-for-byte unchanged.
  * New `Frontend/src/pages/manager/Reports.jsx` with summary cards, status
    filter, search and a read-only detail modal; route + sidebar link added.
* **Retest result:** **PASS.** Manager lists and reads all 6 company reports;
  Manager B sees none of Company A's; Team Lead / Employee / Intern / Admin all
  get 403 on the Manager endpoint. The page is **read-only** — no Approve or
  Rework controls — so review authority stays with the Team Lead and no
  permission creep was introduced.

### BUG-015 — Lead "Requirement" field silently discarded · HIGH

* **Original problem:** the Manager UI had a Requirement input, table column
  and detail field, but `leads` had no such column and the controller never
  read or wrote it. Everything typed there was thrown away.
* **Fix implemented:** migration `002` adds `leads.requirement TEXT` (nullable,
  so every existing row stays valid); `createLead`, `updateLead`,
  `getLeadList` and `getLeadDetails` now carry the field.
* **Retest result:** **PASS.** Verified through the complete chain: typed
  `UI-CANARY-REQUIREMENT-789` into the browser form → saved → displayed in the
  table → confirmed present in `leads.requirement` in the database. Also
  survives update and appears in list and details responses.

### BUG-016 — Enter key did not submit the login form · MEDIUM

* **Original problem:** `Login.jsx` had no `<form>`; the button used `onClick`
  only, so Enter did nothing.
* **Fix implemented:** fields wrapped in `<form onSubmit={handleLogin}>`,
  button changed to `type="submit"`, handler now calls `preventDefault()`. The
  password-visibility toggle keeps `type="button"` so it cannot submit.
* **Retest result:** **PASS.** `form.requestSubmit()` — the exact event Enter
  produces — logs in and navigates to `/admin/dashboard`.

### BUG-017 — Lead list not refreshed after creating a meeting · MEDIUM

* **Original problem:** the lead's status changed to "Meeting Scheduled"
  server-side but the Leads tab still showed "Pending".
* **Fix implemented:** `getLeadList()` now also runs after a meeting is saved
  and after one is deleted (deleting the last meeting resets the lead to
  Pending).
* **Retest result:** **PASS.** After creating a meeting in the browser the lead
  row immediately reads "Meeting Scheduled" with no manual reload.

### BUG-018 — Converted/Closed leads permanently invisible · MEDIUM

* **Original problem:** the Leads tab hard-filtered to Pending/Future Business
  with no alternative, so a lead became unreachable once it advanced — while
  the dashboard still counted it.
* **Fix implemented:** a status filter was added (Active Pipeline / All Leads /
  Pending / Meeting Scheduled / Future Business / Converted / Closed). "Active
  Pipeline" remains the default, so the familiar view is unchanged.
* **Retest result:** **PASS.** Selecting "All Leads" reveals the Converted lead
  with full View / Edit / Meeting / Delete actions.

### BUG-019 — Meeting modal offered ineligible leads · LOW

* **Original problem:** the dropdown listed Converted/Closed leads, which the
  backend then rejected with 400.
* **Fix implemented:** dropdown now uses `meetingEligibleLeads`, which excludes
  Converted and Closed — while always keeping the lead already attached to the
  meeting being edited, so editing an old meeting cannot blank its own lead.
* **Retest result:** **PASS.** Dropdown showed only the eligible lead; the
  Converted one was excluded.

### BUG-020 — Unknown route logged authenticated users out · LOW

* **Original problem:** the catch-all route sent everyone to `/login`.
* **Fix implemented:** new `RedirectHome` component sends a signed-in user to
  their own dashboard and only shows `/login` to someone with no session.
  Applied to both `*` and `/`.
* **Retest result:** **PASS.** As an Intern, `/totally/unknown/route` and `/`
  both land on `/intern/dashboard`; signed out, both go to `/login`.

### BUG-021 — Health check never queried the database · LOW

* **Original problem:** `healthCheck` returned a hardcoded
  `"database": "Connected"` and would have reported healthy during a total
  outage.
* **Fix implemented:** now runs `SELECT 1` and returns **503 Database
  Unavailable** when the pool cannot be reached.
* **Retest result:** **PASS.** `/health` returns 200 after a real probe.

### BUG-022 — 404 body reflected the raw request URL · LOW

* **Original problem:** `Route Not Found - /api/v1/<user input>`.
* **Fix implemented:** the response is now a flat `"Route Not Found"`; the path
  is logged server-side only.
* **Retest result:** **PASS.** No reflection of the requested path.

### BUG-023 — Password reset had no token delivery and failed silently · HIGH

* **Original problem:** `forgotPassword` swallowed the missing-table error and
  still told the user a link had been generated. Even with the table present,
  no delivery channel existed — the reset screen asked for a token the user
  could not obtain.
* **Fix implemented:**
  * Migration 001 (BUG-001) makes token generation actually work.
  * The catch block now logs loudly
    (`FORGOT PASSWORD FAILED - no reset token was created`) while keeping the
    generic user-facing response, so account enumeration is still impossible
    but a real failure is visible in the logs.
  * New **`POST /api/v1/auth/admin-generate-reset-link`** (Admin-only) is the
    delivery path: an Admin generates a single-use link and passes it to the
    user through a channel they already trust. Same token mechanics as
    self-service — 32 random bytes, SHA-256 hash stored, single use, same TTL,
    previous tokens invalidated, disabled accounts refused. The raw token is
    returned **only** to the authenticated Admin who requested it, never to an
    anonymous caller.
* **Retest result:** **PASS.** 22/22 Password Reset tests. Full round trip
  verified: generate → reset → old password 401 → new password 200 → token
  reuse 400 → older token invalidated by a newer one. Manager/TL/Employee/Intern
  all get 403 on the Admin endpoint; anonymous gets 401. Anonymous
  forgot-password confirmed to return no token.

### BUG-024 — JWT not revoked on password change or reset · MEDIUM

* **Original problem:** a token captured before a password change kept working
  for up to 24 hours.
* **Fix implemented:** migration `002` adds `users.password_changed_at`
  (nullable — NULL means "never changed", so applying the migration logs
  nobody out). `changePassword` and `resetPassword` stamp it;
  `authMiddleware` rejects any JWT whose `iat` predates it. The middleware also
  now refuses a disabled account on **every** route, not just at login.
* **Retest result:** **PASS.** A token issued before a password change and
  before a reset are both rejected with 401 "Session Expired"; the token issued
  *after* still works; users who never changed their password are unaffected.
  *Documented limitation:* JWT `iat` has one-second resolution, so a token
  minted in the same second as the change survives. That window is inherent to
  the claim's precision; every older token — the realistic stolen-token case —
  is rejected.

### BUG-025 — No brute-force protection · HIGH

* **Original problem:** 30 consecutive failed logins produced 30 plain 401s.
* **Fix implemented:** new `rateLimitMiddleware.js` — in-memory, dependency-free,
  matching the existing single-process architecture. Keyed on client IP **and**
  submitted identifier; only failed attempts count; a successful login clears
  the counter; blocks expire on their own (no permanent lockout); an unref'd
  sweep prevents unbounded growth. Defaults: 8 attempts / 15 min window /
  15 min block, all env-overridable.
* **Retest result:** **PASS.** 15 rapid failures produce 429s with `Retry-After`.
  Regression guards confirm: the correct password is *also* blocked while
  throttled (no bypass), throttling one account does **not** lock out other
  users from the same IP, 3 mistyped passwords followed by the right one still
  logs in, and a successful login resets the counter.

### BUG-026 — No password complexity policy · MEDIUM

* **Original problem:** `12345678` was accepted.
* **Fix implemented:** `validatePassword` requires ≥ 8 characters **and** at
  least one letter and one digit. Applied to register, change-password and
  reset-password. Deliberately light — existing passwords are never
  re-validated, only new ones.
* **Retest result:** **PASS.** `12345678` and `abcdefgh` both 400 on all three
  paths.

### BUG-027 — Whitespace/numeric names accepted; 50k name → 500 · MEDIUM

* **Original problem:** `"   "` passed because presence was checked before
  trimming; a numeric name was accepted; a 50 000-character name overflowed the
  column as a 500.
* **Fix implemented:** `validateName` trims first, rejects non-text, and
  enforces a 100-character limit.
* **Retest result:** **PASS.** Whitespace-only, numeric and 50k names all 400.
  A blank-name row can no longer reach the Admin UI.

### BUG-028 — No duplicate-customer detection · MEDIUM

* **Original problem:** the same customer could be created twice.
* **Fix implemented:** phone uniqueness enforced **within the caller's own
  company** (never globally — that was the BUG-007 mistake), on both create and
  update. Soft-deleted rows are ignored, so a deleted customer's phone can be
  reused.
* **Retest result:** **PASS.** Duplicate within a company → 400; the same phone
  in a *different* company → 201; a soft-deleted customer's phone can be reused.

### BUG-029 — No parent-task roll-up · MEDIUM

* **Original problem:** completing and approving every child split task left
  the parent assignment and parent task at "Pending" forever.
* **Fix implemented:** new `Backend/src/utils/taskRollup.js` derives
  `task_assignments.status` from its split tasks and `tasks.status` from its
  assignments. Called on split create, split update, split status change,
  worker start, report submit and report review (inside the review transaction,
  so it commits atomically). Deliberately conservative: a task with **no** split
  tasks is never touched; Cancelled children are ignored unless all are
  cancelled; a Manager-cancelled task is never revived; the derivation is
  idempotent, so rework moves parents back to In Progress.
* **Retest result:** **PASS.** Starting work → parent In Progress; all children
  complete → assignment **and** task Completed with `completed_at`; rework
  re-opens the parents; adding a new split re-opens a completed parent.
  **Critical regression guards pass:** an unsplit task is never auto-completed,
  and a manually-set assignment status on an unsplit task is not overwritten.
  A database sweep confirmed every assignment/task status is consistent with its
  children.

### BUG-030 — No way to create the first Admin · HIGH

* **Original problem:** `register` always creates `role = NULL`, and
  `change-role` requires the caller to already be Admin/Manager — so a fresh
  install could never produce an Admin without hand-written SQL.
* **Fix implemented:** new `Backend/scripts/create-admin.js`, exposed as
  `npm run create-admin`. Deliberately a **CLI tool, not an HTTP endpoint** —
  creating an Admin requires shell access to the server, so no public attack
  surface is added and normal registration is completely unchanged. It refuses
  to run when an Admin already exists (unless `--force`), promotes an existing
  user by email rather than duplicating them, validates all input, and hashes
  the password with the same bcrypt cost.
* **Retest result:** **PASS.** On an empty database it created Admin id 1; a
  second run was refused; invalid input was rejected. The entire final test run
  bootstrapped through this script.

```bash
npm run create-admin -- --email admin@example.com --password "Str0ngPass" --first-name Admin --phone 9999999999
```

---

## New Bugs Discovered

Found by the new regression suite, **not** present in the original report.
Neither was hidden; both were fixed and re-tested.

### NEW-BUG-001 — `updateLead` wiped every optional field · HIGH · FIXED

* **Description:** `updateLead` assigned all optional columns directly, so a
  caller sending only `lead_name` + `phone` silently nulled the lead's `email`,
  `source`, `city`, `address`, `remarks` and `requirement`.
* **How it surfaced:** a duplicate-email test began passing when it should have
  failed. Investigation showed an earlier update in the same test had wiped the
  email. Confirmed directly in the database.
* **Severity:** HIGH — silent data loss, same class as BUG-006 and BUG-012.
* **Root cause:** identical to BUG-006/012. The original suite never exercised a
  partial lead update, so it was invisible.
* **Status:** **FIXED.** Rewritten to the same present-keys-only pattern.
  Re-tested: the duplicate-email check now behaves correctly and the lead's
  other fields survive an update.

### NEW-BUG-002 — `updateMeeting` wiped optional fields · MEDIUM · FIXED

* **Description:** `meeting_type`, `location` and `description` were
  overwritten with NULL whenever the caller omitted them.
* **Severity:** MEDIUM — same class; not reachable from the current UI (which
  always posts the full form), but reachable by any API consumer.
* **Status:** **FIXED** by the same pattern, found by code review of sibling
  handlers after NEW-BUG-001.

### Regressions introduced during fixing — both caught and fixed before delivery

| # | Regression | Cause | Resolution |
|---|---|---|---|
| R1 | Split-task creation returned HTTP 500 | My roll-up query reused `$1` both as a value and inside a `CASE` comparison; Postgres reported *"inconsistent types deduced for parameter $1"* | Rewrote as two branch-specific statements with the completion decision made in JS. Re-ran the full suite from a clean database. |
| R2 | Frontend build failure | An automated import insertion landed inside a multi-line `import { ... }` block in `Meetings.jsx` | Moved the import below the block; `vite build` verified after every subsequent frontend change. |

---

## Regression Result

Every category that passed in the original audit was re-tested.

| Previously-passing area | Original | Final | Result |
|---|---:|---:|---|
| Authentication / JWT validation | pass | 25/25 | **Still passes** |
| Role loading (re-read from DB, not JWT) | pass | pass | **Still passes** |
| Company isolation | 22/22 | **27/27** | **Still passes, widened** |
| SQL injection protection | pass | pass | **Still passes** |
| Mass-assignment protection | pass | pass | **Still passes** |
| File upload security (whitelist, traversal, size) | pass | 9/9 | **Still passes** |
| Attachment access control | 7/7 | 7/7 | **Still passes** |
| Database relationships | 0 orphans | 0 orphans | **Still passes** |
| Dashboard counts | pass | 13/13 | **Still passes** |
| Intern role separation | pass | 4/4 | **Still passes** |
| Existing CRUD across all modules | pass | pass | **Still passes** |
| Existing API contracts | pass | pass | **Preserved** (one deliberate change, BUG-009) |
| Existing UI and navigation | pass | 48/48 | **Still passes** |
| Correct existing permissions | pass | 44/44 | **Still passes** |

**Explicit guards added so a future change cannot silently undo a fix:**

* Manager **and** Admin can still update/delete customers (BUG-005 did not
  over-restrict).
* Team Lead / Employee / Intern can still **read** customer details.
* Team Lead report list and details behave exactly as before (BUG-014 did not
  disturb them).
* A task with no split tasks is never auto-completed (BUG-029 safety).
* A manually-set assignment status on an unsplit task is not overwritten.
* Throttling one account does not lock out other users (BUG-025 safety).
* Three mistyped passwords followed by the correct one still logs in.
* A user who never changed their password is not logged out by BUG-024.
* The token issued *after* a password change still works.
* All four valid task priorities are still accepted.

---

## Security Result

Re-tested after every functional change. **56/56 security tests pass.**

| Area | Result |
|---|---|
| Missing JWT | 12/12 protected endpoints return 401 |
| Invalid / garbage JWT | 12/12 return 401, never 500 |
| `alg=none` forged token | Rejected 401 |
| Wrong signature | Rejected 401 |
| Expired token | Rejected 401 |
| Payload tampered to `role: "Admin"` | Rejected 401 |
| Auth header parsing (`Basic`, lowercase `bearer`, no scheme) | All 401 |
| JWT contents | Only `id, role, company_id, iat, exp` — no secret material |
| **Session invalidation (NEW)** | Tokens predating a password change or reset are now rejected |
| **Disabled account (STRENGTHENED)** | Now refused on every route, not only at login |
| Role manipulation / mass assignment | `role`, `company_id`, `is_active` in bodies ignored — verified in the DB |
| IDOR — customer / task / lead / meeting / report / assignment / split | **27/27 cross-company attempts denied** |
| `company_id` injection | Blocked; user lands in the caller's own company |
| SQL injection | Not exploitable; payloads stored as literal text, tables intact |
| Stored XSS | Rendered as inert text by React; length/format validation now also applies |
| File upload whitelist (`.exe`, `.html`, `.php`, `.svg`) | All rejected 400 |
| Path traversal (`../../../../server.js`) | Stored under a random name; `server.js` untouched |
| Upload size limit | 3 MB rejected (2 MB limit) |
| Attachment access control | Submitter / owning TL / same-company Manager 200; everyone else 404 |
| **Brute force (NEW)** | 429 with `Retry-After` after the attempt limit |
| **Password complexity (NEW)** | Weak passwords rejected on all three paths |
| User enumeration (login and forgot-password) | Identical responses |
| Reset token storage | SHA-256 hash only; single use; rotation invalidates older tokens |
| **Reset token exposure (NEW)** | Anonymous callers never receive a token; Admin endpoint is role-gated |
| Error leakage | No stack traces, SQL, credentials or driver codes in any response |
| **404 reflection (FIXED)** | Request URL no longer echoed |
| Large payload / prototype pollution | 413 / no pollution; server stayed responsive |

**No security regression was introduced. Three protections were added
(session invalidation, brute-force throttling, password complexity) and one was
strengthened (disabled accounts blocked on every route).**

---

## Database Result

### Schema changes applied to the live `enterprise_crm`

| Migration | Contents | Nature |
|---|---|---|
| `001_password_reset_and_report_attachments.sql` | `password_resets` table + 2 indexes; 4 `attachment_*` columns on `task_reports` | Purely additive, idempotent |
| `002_lead_requirement_and_password_changed_at.sql` (new) | `leads.requirement TEXT`; `users.password_changed_at TIMESTAMP` | Purely additive, idempotent, both nullable |

No DROP, TRUNCATE, DELETE or ALTER COLUMN in either file.

### Live data preservation — verified before and after

| Table | Before | After |
|---|---:|---:|
| companies | 1 | **1** |
| users | 3 | **3** |
| customers | 0 | **0** |
| leads | 0 | **0** |
| meetings | 0 | **0** |
| tasks | 0 | **0** |
| task_assignments | 0 | **0** |
| split_tasks | 0 | **0** |
| task_reports | 0 | **0** |

All three real user accounts (`giridharan@gmail.com` Admin,
`sanjai@gmail.com` Manager, `meera@gmail.com` Team Lead) and the real company
(`Pro frontend` / `RegCom001`) are intact with unchanged roles and company
assignments. **No test data was written to the live database** — all functional
testing ran against a throwaway clone (`enterprise_crm_qa`), which has since
been dropped.

### Integrity sweep after the full 570-test run

| Check | Result |
|---|---|
| Orphan `tasks → customers` | 0 |
| Orphan `task_assignments → tasks` | 0 |
| Orphan `split_tasks → task_assignments` | 0 |
| Orphan `task_reports → split_tasks` | 0 |
| Orphan `users → companies` | 0 |
| Orphan `customers → companies` | 0 |
| Orphan `password_resets → users` | 0 |
| Split tasks assigned outside the task's company | **0** |
| Assignments to a Team Lead outside the company | **0** |
| Reports submitted from outside the company | **0** |
| Duplicate user emails / phones / company codes | 0 / 0 / 0 |
| Duplicate live customers (company + phone) | 0 |
| Duplicate task assignments | 0 |
| **Users with a non-10-digit phone** | **0** |
| **Customers with a non-10-digit phone** | **0** |
| **Leads with a non-10-digit phone** | **0** |
| **Tasks with an invalid priority** | **0** |
| Tasks / split tasks / reports with an out-of-vocabulary status | 0 / 0 / 0 |
| Roll-up consistency (parent status matches children) | **Consistent on all 4 assignments**, including the unsplit-task case |

The four zero-counts in bold are the strongest evidence the validation fixes
hold: after ~570 tests deliberately pushing malformed data at every endpoint,
nothing invalid reached the database.

---

## API Result

All 27 endpoints re-tested for authentication, authorisation, validation,
status codes, persistence, company isolation and error handling.

| Method | Endpoint | Status |
|---|---|---|
| GET | `/api/v1/health` | **PASS** (now a real DB probe) |
| GET | `/` | PASS |
| POST | `/api/v1/auth/register` | **PASS** (was FAIL — BUG-002/026/027) |
| POST | `/api/v1/auth/login` | **PASS** (was FAIL — BUG-009; now rate-limited) |
| POST | `/api/v1/auth/forgot-password` | **PASS** (was silently broken) |
| POST | `/api/v1/auth/reset-password` | PASS |
| POST | `/api/v1/auth/admin-generate-reset-link` | **PASS** (new, Admin-only) |
| GET | `/api/v1/auth/me` | PASS |
| POST | `/api/v1/auth/profile` | PASS |
| POST | `/api/v1/auth/update-profile` | **PASS** (was FAIL — BUG-003) |
| POST | `/api/v1/auth/change-password` | PASS (now invalidates old tokens) |
| POST | `/api/v1/auth/workers` | PASS |
| POST | `/api/v1/auth/change-role` | PASS |
| POST | `/api/v1/auth/pending-users` | PASS |
| POST | `/api/v1/company/create` | PASS |
| POST | `/api/v1/company/list` | PASS |
| POST | `/api/v1/company/details` | **PASS** (was FAIL — BUG-010) |
| POST | `/api/v1/company/update` | PASS |
| POST | `/api/v1/company/delete` | PASS |
| POST | `/api/v1/customer/create` | **PASS** (was FAIL — BUG-004/028) |
| POST | `/api/v1/customer/list` | PASS |
| POST | `/api/v1/customer/admin-list` | PASS |
| POST | `/api/v1/customer/details` | **PASS** (was FAIL — BUG-010) |
| POST | `/api/v1/customer/update` | **PASS** (was FAIL — BUG-005/006) |
| POST | `/api/v1/customer/delete` | **PASS** (was FAIL — BUG-005) |
| POST | `/api/v1/lead/create` | **PASS** (was FAIL — BUG-007/015) |
| POST | `/api/v1/lead/list` | PASS |
| POST | `/api/v1/lead/details` | PASS |
| POST | `/api/v1/lead/update` | **PASS** (was FAIL — NEW-BUG-001) |
| POST | `/api/v1/lead/delete` | PASS |
| POST | `/api/v1/lead/status` | PASS |
| POST | `/api/v1/meeting/create` | **PASS** (was FAIL — BUG-008) |
| POST | `/api/v1/meeting/list` | PASS |
| POST | `/api/v1/meeting/details` | PASS |
| POST | `/api/v1/meeting/update` | **PASS** (was FAIL — NEW-BUG-002) |
| POST | `/api/v1/meeting/delete` | PASS |
| POST | `/api/v1/meeting/complete` | PASS |
| POST | `/api/v1/task/create` | **PASS** (was FAIL — BUG-011) |
| POST | `/api/v1/task/list` | PASS |
| POST | `/api/v1/task/details` | PASS |
| POST | `/api/v1/task/update` | **PASS** (was FAIL — BUG-012) |
| POST | `/api/v1/task/delete` | PASS |
| POST | `/api/v1/task/assign` | PASS |
| POST | `/api/v1/task/assigned-workers` | PASS |
| POST | `/api/v1/task/change-status` | PASS |
| POST | `/api/v1/task/teamlead-list` | PASS |
| POST | `/api/v1/task/split-list` | PASS |
| POST | `/api/v1/task/split-create` | PASS (now rolls up) |
| POST | `/api/v1/task/split-update` | PASS (now rolls up) |
| POST | `/api/v1/task/split-change-status` | PASS (now rolls up) |
| POST | `/api/v1/task/employee/tasks` | PASS |
| POST | `/api/v1/task/employee/task-details` | **PASS** (was 500 — BUG-001) |
| POST | `/api/v1/task/employee/start-task` | PASS (now rolls up) |
| POST | `/api/v1/task-report/submit` | **PASS** (was 500 — BUG-001) |
| GET | `/api/v1/task-report/team-lead` | **PASS** (was 500 — BUG-001) |
| GET | `/api/v1/task-report/manager` | **PASS** (new — BUG-014) |
| GET | `/api/v1/task-report/my` | **PASS** (was 500 — BUG-001) |
| GET | `/api/v1/task-report/employee-list` | **PASS** (was 500 — BUG-001) |
| GET | `/api/v1/task-report/employee-details/:id` | PASS |
| GET | `/api/v1/task-report/:id` | **PASS** (now also allows Manager) |
| POST | `/api/v1/task-report/:id/review` | PASS (now rolls up) |
| GET | `/api/v1/task-report/:id/attachment` | PASS |
| GET | `/api/v1/dashboard` | PASS |
| ANY | unknown route | **PASS** (no URL reflection) |

**No endpoint was renamed or removed. One endpoint was added.**

---

## UI Result

48/48 UI tests pass. Every page in `AppRoutes.jsx` was opened in a real browser
against the test backend.

| Area | Result |
|---|---|
| Public pages (login, register, forgot, reset) | All render |
| Admin pages (dashboard, companies, pending users, workers, customers, profile) | All render with live data |
| Manager pages (dashboard, pending users, workers, customers, tasks, meetings, **reports**, profile) | All render |
| Team Lead pages (dashboard, tasks, workers, reports, profile) | All render |
| Employee pages (dashboard, tasks, reports, profile) | All render |
| Intern pages (dashboard, tasks, reports, profile) | All render |
| **Enter key submits login** | **Fixed** |
| **Dates display correctly** | **Fixed** — `10/15/2026`, not `2026-10-14T18:30:00.000Z` |
| **Requirement field persists** | **Fixed** — verified UI → API → DB → UI |
| **Lead status filter** | **Added** — Converted/Closed leads reachable again |
| **Lead list refresh after meeting** | **Fixed** |
| **Meeting dropdown excludes ineligible leads** | **Fixed** |
| **Manager Reports page** | **Added**, read-only, sidebar link wired |
| **Unknown route while signed in** | **Fixed** — goes to own dashboard |
| Role route protection | Intact — Intern bounced from `/admin`, `/manager`, `/teamleader` |
| Signed-out protection | Intact — protected pages redirect to `/login` |
| Invalid data no longer visible in the UI | Confirmed on Admin Pending Users |
| Stored XSS payload | Rendered as inert text |
| **Browser console errors** | **Zero** across the entire sweep |
| Failed network requests on happy paths | None |
| Frontend production build | `vite build` succeeds |

**Testing-method note:** the browser pane in this environment could not
composite frames, so screenshots were unavailable. Verification was done
through the DOM and accessibility layer (`get_page_text` plus JavaScript
evaluation of real state, network results and `localStorage`). For asserting
text, state and behaviour this is stricter than a screenshot; it does not
verify pixel-level styling, which was not in scope.

---

## End-to-End Result

| # | Workflow | Result | Notes |
|---|---|---|---|
| 1 | Register → Login → Dashboard → Profile → Logout | **PASS** | Unassigned user correctly gets 403 on dashboard, 200 on profile |
| 2 | Admin → Company → Register User → Assign Role → Login → role dashboard | **PASS** | New Manager receives a correctly scoped dashboard |
| 3 | Manager: Customer → Task → Assign TL; TL: Split; Employee: Start → Report; **Manager: view report**; TL: Approve | **PASS** | Was broken at "submit report" (HTTP 500). Now complete, including the previously missing Manager view step |
| 4 | Manager assigns → TL forwards/reassigns → Employee/Intern receives | **PASS** | Intern gains the task, Employee loses it |
| 5 | Task → Split → Children → Complete → Approve → **parent status** | **PASS** | Parent assignment **and** task now become Completed; adding a new split re-opens them |
| 6 | Password change → old fails → new works | **PASS** | Old JWT now also rejected |
| 7 | Profile → Update → refresh → persisted | **PASS** | |
| 8 | Company A customer → Company B attempts access | **PASS — DENIED** | |
| 9 | Company A task → Company B attempts access | **PASS — DENIED** | |
| 10 | Cross-company denial sweep across 27 endpoints | **PASS — 27/27 denied** | |
| 11 | Forgot password → Admin issues link → reset → old fails → new works → reuse blocked | **PASS** | Previously impossible |
| 12 | Full UI workflow in the browser | **PASS** | Lead + Requirement created, meeting scheduled, Manager report viewed |

---

## Remaining Issues

Nothing blocking. Three items are recorded for transparency.

| # | Item | Severity | Why it remains | Blocks use? |
|---|---|---|---|---|
| 1 | **Password reset delivery is Admin-assisted, not self-service email.** A user cannot reset their own password without an Admin generating the link. | Low (design constraint) | The project has no email infrastructure and no SMTP configuration. Adding one would mean a new dependency and credentials the project does not have — beyond the scope of "fix the reported defects". The mechanism is complete and secure; only the transport is manual. | **No** — reset works end-to-end today via the Admin link. Wiring an SMTP sender later is a small, isolated change. |
| 2 | **JWT session invalidation has one-second granularity.** A token minted in the same second as a password change survives. | Low | Inherent to the JWT `iat` claim's one-second resolution. Every older token — the realistic stolen-token case — is rejected. | **No** |
| 3 | **Rate limiting is in-process.** Counters live in memory, so they reset on restart and are not shared across instances. | Low | Matches the existing single-process architecture; adding Redis would introduce a new dependency and deployment requirement. | **No** for the current single-instance deployment. If the app is ever scaled horizontally this should move to a shared store. |

Deliberately **not** changed, and why:

* **Status/priority CHECK constraints were not added to the database.**
  `utils/status.js` explicitly documents that validation stays in the
  application layer. That design decision was respected; enforcement was added
  in the application instead, and a database sweep confirms zero invalid values.
* **`users.status` (the dead duplicate of `is_active`) was left in place** — it
  is unused, harmless, and removing a column is outside "fix the reported
  defects".
* **Past-dated meetings are still allowed** — the original report flagged this
  as possibly intentional (back-dating a meeting that already happened is
  legitimate), so the behaviour was preserved.

---

## Changes Made

**29 files modified, 9 added.** 1,854 insertions, 332 deletions. No endpoint
renamed or removed, no UI redesigned, no dependency added.

**New backend files**
* `src/utils/validation.js` — shared, dependency-free input validation
* `src/utils/taskRollup.js` — parent status derivation
* `src/middleware/rateLimitMiddleware.js` — login throttling
* `src/database/migrations/002_lead_requirement_and_password_changed_at.sql`
* `scripts/create-admin.js` — first-Admin bootstrap

**New frontend files**
* `src/utils/formatDate.js` — timezone-safe date formatting
* `src/pages/manager/Reports.jsx` — Manager report view
* `src/routes/RedirectHome.jsx` — session-aware fallback route

**Preventive hardening added beyond the reported bugs**
* `server.js` verifies the database schema at boot and names the missing
  migration — the exact failure mode behind BUG-001 can no longer happen
  silently.
* `parseId()` applied to every ID-accepting handler, not only the two the
  original report happened to catch.
* Disabled accounts are now refused on every route, not only at login.

---

## FINAL VERDICT

# READY TO USE

### Basis for this decision — actual test results only

* **570 tests, 570 pass, 0 fail, 0 blocked, 0 not tested.** Executed in one run
  against a freshly created database.
* **All 30 originally reported bugs are fixed and individually re-tested**,
  including both CRITICAL issues.
* **Both critical issues are closed.** The Task Report module — the CRM's core
  workflow — works end to end; Employees and Interns can no longer be
  out-privileged by the customer endpoints.
* **All 15 previously BLOCKED tests now execute and pass.** The 1 NOT TESTED
  item (disabled-account login) was executed and passes.
* **All 409 originally-passing tests still pass**, with explicit regression
  guards added around every fix.
* **No security regression.** Three protections were added and one strengthened;
  cross-company isolation widened from 22/22 to 27/27 denials.
* **Database integrity is clean:** zero orphans, zero duplicates, zero
  cross-tenant contamination, and — after ~570 tests deliberately pushing
  malformed data — zero invalid phones, priorities or statuses persisted.
* **Zero browser console errors** across every page and role.
* **Two new bugs found during remediation were disclosed and fixed**, and two
  self-inflicted regressions were caught by the suite and fixed before delivery.
* **Live data is intact:** all 3 real users and 1 real company preserved, zero
  test rows written to the production database.

The three remaining items are Low-severity design constraints (no email
infrastructure, JWT second-resolution, in-process rate limiting), each
documented above with why it remains and why it does not block use.

---

## Appendix — Environment State

* Backend running on **:5000** against live `enterprise_crm` —
  `✅ PostgreSQL Connected` · `✅ Database Schema Verified` · HTTP 200
* Frontend running on **:5173** — HTTP 200
* Sandbox database `enterprise_crm_qa` created for testing and **dropped**
* Test upload files removed; `Backend/uploads/` back to `.gitkeep` only
* `Backend/.env` unmodified; all test configuration passed as launch-time
  environment variables only

### Complete Final Test Matrix

All 570 executed tests, in execution order.

| # | Module | Feature | Test | Role | Expected | Actual | Status |
|---|---|---|---|---|---|---|---|
| 1 | Authentication | First-Admin bootstrap | FIX BUG-030: fresh install can create the first Admin via npm run create-admin | CLI | Admin created on an empty database | Admin id 1 created; second run refused without --force; invalid input rejected | PASS |
| 2 | Registration | Register | Valid registration x9 (baseline happy path) | Public | 9 x 201 | 9/9 created | PASS |
| 3 | Registration | Register | New user created with NO role (awaits promotion) | Public | no role in response | 201=true, role field present: false | PASS |
| 4 | Registration | Register validation | Missing first_name | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 5 | Registration | Register validation | Missing last_name (optional field) | Public | HTTP 201 | HTTP 201 User Registered Successfully | PASS |
| 6 | Registration | Register validation | Missing email | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 7 | Registration | Register validation | Invalid email format | Public | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 8 | Registration | Register validation | Missing phone | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 9 | Registration | Register validation | FIX BUG-002: phone below 10 digits | Public | HTTP 400 | HTTP 400 Phone number must be exactly 10 digits | PASS |
| 10 | Registration | Register validation | FIX BUG-002: phone above 10 digits | Public | HTTP 400 | HTTP 400 Phone number must be exactly 10 digits | PASS |
| 11 | Registration | Register validation | FIX BUG-002: non-numeric phone | Public | HTTP 400 | HTTP 400 Phone number must contain digits only | PASS |
| 12 | Registration | Register validation | FIX BUG-002: negative-number phone | Public | HTTP 400 | HTTP 400 Phone number must contain digits only | PASS |
| 13 | Registration | Register validation | Missing password | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 14 | Registration | Register validation | Weak password (7 chars) | Public | HTTP 400 | HTTP 400 Password must be at least 8 characters | PASS |
| 15 | Registration | Register validation | FIX BUG-026: password with no letters (12345678) | Public | HTTP 400 | HTTP 400 Password must contain at least one letter and one number | PASS |
| 16 | Registration | Register validation | FIX BUG-026: password with no digits (abcdefgh) | Public | HTTP 400 | HTTP 400 Password must contain at least one letter and one number | PASS |
| 17 | Registration | Register validation | Duplicate email | Public | HTTP 400 | HTTP 400 Email already exists | PASS |
| 18 | Registration | Register validation | Duplicate phone | Public | HTTP 400 | HTTP 400 Phone number already exists | PASS |
| 19 | Registration | Register validation | Duplicate email, different case | Public | HTTP 400 | HTTP 400 Email already exists | PASS |
| 20 | Registration | Register validation | Empty request body {} | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 21 | Registration | Register validation | FIX BUG-027: whitespace-only first_name | Public | HTTP 400 | HTTP 400 First name is required | PASS |
| 22 | Registration | Register validation | FIX BUG-027: numeric first_name (wrong type) | Public | HTTP 400 | HTTP 400 First name must be text | PASS |
| 23 | Registration | Register validation | SQL injection in email | Public | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 24 | Registration | Register validation | Leading/trailing spaces in email | Public | HTTP 201 | HTTP 201 User Registered Successfully | PASS |
| 25 | Registration | Register validation | null first_name | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 26 | Registration | Register validation | FIX BUG-027: 50k-char first_name (was HTTP 500) | Public | HTTP 400 | HTTP 400 First name must be 100 characters or fewer | PASS |
| 27 | Registration | Register validation | FIX BUG-027: XSS payload in first_name now length/format checked | Public | HTTP 201 | HTTP 201 User Registered Successfully | PASS |
| 28 | Security | Mass assignment | Register with role:'Admin' + company_id in body | Public | 201 but role/company IGNORED | HTTP 201; response exposes role: false | PASS |
| 29 | Error Handling | Malformed request | Malformed JSON body | Public | 400, no stack trace | HTTP 400 | PASS |
| 30 | Login | Login | Valid login by email | Admin | 200 + JWT | HTTP 200 token=true role=Admin | PASS |
| 31 | Login | Login | Valid login by phone number | Manager | 200 + JWT | HTTP 200 token=true | PASS |
| 32 | Login | Login | Login email is case-insensitive | Admin | 200 | HTTP 200 | PASS |
| 33 | Login | Login validation / injection | Wrong password | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 34 | Login | Login validation / injection | Non-existing account | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 35 | Login | Login validation / injection | Empty identifier | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 36 | Login | Login validation / injection | Empty password | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 37 | Login | Login validation / injection | Both fields empty | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 38 | Login | Login validation / injection | Missing body {} | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 39 | Login | Login validation / injection | SQLi: ' OR '1'='1 | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 40 | Login | Login validation / injection | SQLi: DROP TABLE attempt | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 41 | Login | Login validation / injection | SQLi in password field | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 42 | Login | Login validation / injection | FIX BUG-009: password as array (was HTTP 500) | Public | HTTP 400 | HTTP 400 Email/Phone and Password must be text | PASS |
| 43 | Login | Login validation / injection | FIX BUG-009: password as object | Public | HTTP 400 | HTTP 400 Email/Phone and Password must be text | PASS |
| 44 | Login | Login validation / injection | Type confusion: identifier as object | Public | HTTP 400 | HTTP 400 Email/Phone and Password must be text | PASS |
| 45 | Security | User enumeration | Wrong-password vs unknown-account response identical | Public | identical status + message | 401:Invalid Credentials vs 401:Invalid Credentials | PASS |
| 46 | Security | Data exposure | Login response must not contain password hash | Admin | no password field | password field present: false | PASS |
| 47 | Admin | Login | Admin login | Admin | token | token=true | PASS |
| 48 | Admin | GET /auth/me | Admin fetches own profile | Admin | 200, role=Admin, no password | HTTP 200 role=Admin pwLeak=false | PASS |
| 49 | Authorization | requireRole | role=NULL user calls POST /company/create | role=NULL | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 50 | Dashboard | Unassigned user | role=NULL user requests dashboard | role=NULL | 403 awaiting role assignment | HTTP 403 Your account is awaiting role assignment | PASS |
| 51 | Authorization | requireRole | role=NULL user tries to promote someone | role=NULL | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 52 | Company | Create | Admin creates Company A | Admin | 201 | HTTP 201 Company Created Successfully | PASS |
| 53 | Company | Create | Admin creates Company B | Admin | 201 | HTTP 201 | PASS |
| 54 | Company | Create validation | Missing company_name | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 55 | Company | Create validation | Missing company_code | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 56 | Company | Create validation | Empty body {} | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 57 | Company | Create validation | Duplicate company_code | Admin | HTTP 400 | HTTP 400 Company already exists | PASS |
| 58 | Company | Create validation | Duplicate company_name | Admin | HTTP 400 | HTTP 400 Company already exists | PASS |
| 59 | Company | Create validation | Duplicate code, different case | Admin | HTTP 400 | HTTP 400 Company already exists | PASS |
| 60 | Company | Create validation | Whitespace-only name | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 61 | Company | Create validation | Invalid company email | Admin | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 62 | Company | Create validation | Invalid company phone | Admin | HTTP 400 | HTTP 400 Phone number must contain digits only | PASS |
| 63 | Company | List | Admin lists all companies | Admin | 200, >=2 | HTTP 200 count=2 | PASS |
| 64 | Company | Details | Admin reads Company A details | Admin | 200 | HTTP 200 name=QA Alpha Corp | PASS |
| 65 | Company | ID validation | Details with no id | Admin | HTTP 400 | HTTP 400 Company Id is required | PASS |
| 66 | Company | ID validation | Details with non-existing id 999999 | Admin | HTTP 404 | HTTP 404 Company Not Found | PASS |
| 67 | Company | ID validation | FIX BUG-010: details with non-numeric id 'abc' (was HTTP 500) | Admin | HTTP 400 | HTTP 400 Invalid Company Id | PASS |
| 68 | Company | ID validation | FIX BUG-010: details with negative id | Admin | HTTP 400 | HTTP 400 Invalid Company Id | PASS |
| 69 | Company | ID validation | FIX BUG-010: details with id 0 | Admin | HTTP 400 | HTTP 400 Company Id is required | PASS |
| 70 | Company | ID validation | FIX BUG-010: details with float id | Admin | HTTP 400 | HTTP 400 Invalid Company Id | PASS |
| 71 | Company | ID validation | FIX BUG-010: update with non-numeric id | Admin | HTTP 400 | HTTP 400 Invalid Company Id | PASS |
| 72 | Company | ID validation | FIX BUG-010: delete with non-numeric id | Admin | HTTP 400 | HTTP 400 Invalid Company Id | PASS |
| 73 | Company | Update | Admin updates Company B city, name preserved | Admin | 200 + only city changed | HTTP 200 name=QA Beta Ltd city=Coimbatore | PASS |
| 74 | Company | Update validation | Update Company B to a code already used by A | Admin | 400 | HTTP 400 Another company already uses that name or code | PASS |
| 75 | Company | Update validation | Update non-existing company | Admin | 404 | HTTP 404 | PASS |
| 76 | Company | Delete | Admin deletes an empty company | Admin | 200 | HTTP 200 Company Deleted Successfully | PASS |
| 77 | Company | Delete | Delete same company twice | Admin | 404 | HTTP 404 Company Not Found | PASS |
| 78 | Admin | Pending users | Admin lists pending (role=NULL) users | Admin | 200 + list | HTTP 200 count=14 | PASS |
| 79 | Admin | Change role | Admin promotes user to Manager of Company A | Admin | 200 | HTTP 200 Manager Assigned Successfully | PASS |
| 80 | Admin | Change role | Admin promotes user to Manager of Company B | Admin | 200 | HTTP 200 | PASS |
| 81 | Admin | Change role validation | Admin assigns 'Employee' (only Manager allowed) | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 82 | Admin | Change role validation | Admin assigns 'Admin' role | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 83 | Admin | Change role validation | Admin assigns 'Team Lead' | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 84 | Admin | Change role validation | Admin assigns invalid role string | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 85 | Admin | Change role validation | Manager role without company_id | Admin | HTTP 400 | HTTP 400 Company is required | PASS |
| 86 | Admin | Change role validation | Manager role with non-existing company | Admin | HTTP 404 | HTTP 404 Company Not Found | PASS |
| 87 | Admin | Change role validation | Missing user_id | Admin | HTTP 400 | HTTP 400 User Id and Role are required | PASS |
| 88 | Admin | Change role validation | Missing role | Admin | HTTP 400 | HTTP 400 User Id and Role are required | PASS |
| 89 | Admin | Change role validation | Non-existing target user | Admin | HTTP 404 | HTTP 404 Target User Not Found | PASS |
| 90 | Admin | Change role validation | Admin changes own role (self) | Admin | HTTP 400 | HTTP 400 You cannot change your own role | PASS |
| 91 | Admin | Change role validation | Empty body {} | Admin | HTTP 400 | HTTP 400 User Id and Role are required | PASS |
| 92 | Admin | Change role validation | Non-numeric user_id | Admin | HTTP 400 | HTTP 400 Invalid User Id | PASS |
| 93 | Admin | Change role validation | Non-numeric company_id | Admin | HTTP 400 | HTTP 400 Invalid Company Id | PASS |
| 94 | Manager | Login | Manager A login after promotion | Manager | token | token=true | PASS |
| 95 | Manager | Change role | Manager A assigns Team Lead to tlA | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 96 | Manager | Change role | Manager A assigns Employee to empA | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 97 | Manager | Change role | Manager A assigns Intern to intA | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 98 | Manager | Change role | Manager B assigns Team Lead to tlB | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 99 | Manager | Change role | Manager B assigns Employee to empB | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 100 | Manager | Change role | Manager B assigns Intern to intB | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 101 | Authorization | Manager role limits | Manager tries to grant 'Manager' | Manager | HTTP 400 | HTTP 400 Invalid Role | PASS |
| 102 | Authorization | Manager role limits | Manager tries to grant 'Admin' | Manager | HTTP 400 | HTTP 400 Invalid Role | PASS |
| 103 | Authorization | Manager role limits | Manager A tries to demote the Admin | Manager | HTTP 403 | HTTP 403 You cannot change this user's role | PASS |
| 104 | Authorization | Manager role limits | Manager A tries to change Manager B's role | Manager | HTTP 403 | HTTP 403 You can manage only users in your own company | PASS |
| 105 | Authorization | Manager role limits | Manager A tries to steal Company B's Team Lead | Manager | HTTP 403 | HTTP 403 You can manage only users in your own company | PASS |
| 106 | Authorization | Manager role limits | Manager A changes own role | Manager | HTTP 400 | HTTP 400 You cannot change your own role | PASS |
| 107 | Security | Company isolation | Manager A grants role with company_id=B in body (tenant injection) | Manager | 200 but user lands in Company A | HTTP 200 Role Assigned Successfully | PASS |
| 108 | Customers | Create | Manager A creates customer | Manager | 201 | HTTP 201 Customer Created Successfully | PASS |
| 109 | Customers | Create | Manager B creates customer | Manager | 201 | HTTP 201 | PASS |
| 110 | Customers | Create validation/authz | Missing customer_name | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 111 | Customers | Create validation/authz | Missing phone | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 112 | Customers | Create validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 113 | Customers | Create validation/authz | Whitespace-only name | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 114 | Customers | Create validation/authz | FIX BUG-004: invalid email format | - | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 115 | Customers | Create validation/authz | FIX BUG-004: phone with letters | - | HTTP 400 | HTTP 400 Phone number must contain digits only | PASS |
| 116 | Customers | Create validation/authz | FIX BUG-004: 25-digit phone (was HTTP 500) | - | HTTP 400 | HTTP 400 Phone number must be exactly 10 digits | PASS |
| 117 | Customers | Create validation/authz | FIX BUG-004: 5-digit phone | - | HTTP 400 | HTTP 400 Phone number must be exactly 10 digits | PASS |
| 118 | Customers | Create validation/authz | FIX BUG-028: duplicate customer (same phone, same company) | - | HTTP 400 | HTTP 400 A customer with this phone number already exists | PASS |
| 119 | Customers | Create validation/authz | Team Lead tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 120 | Customers | Create validation/authz | Employee tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 121 | Customers | Create validation/authz | Intern tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 122 | Customers | Create validation/authz | Admin tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 123 | Company Isolation | Duplicate scope | Company B may reuse a phone that exists only in Company A | Manager B | 201 (duplicate check is per company) | HTTP 201 Customer Created Successfully | PASS |
| 124 | Customers | List scoping | Manager A lists customers -> only Company A | Manager A | only Company A | HTTP 200 count=1 companies=[1] | PASS |
| 125 | Customers | List scoping | Manager B lists customers -> only Company B | Manager B | only Company B | HTTP 200 count=2 companies=[2] | PASS |
| 126 | Customers | List scoping | Team Lead A lists customers -> only Company A | Team Lead A | only Company A | HTTP 200 count=1 companies=[1] | PASS |
| 127 | Customers | List scoping | Employee A lists customers -> only Company A | Employee A | only Company A | HTTP 200 count=1 companies=[1] | PASS |
| 128 | Customers | List scoping | Intern A lists customers -> only Company A | Intern A | only Company A | HTTP 200 count=1 companies=[1] | PASS |
| 129 | Customers | List scoping | Admin lists customers -> all companies | Admin | all companies | HTTP 200 count=3 companies=[2,1] | PASS |
| 130 | Customers | Admin global list | Admin cross-company customer list | Admin | 200 + both companies | HTTP 200 count=3 companies=2 | PASS |
| 131 | Authorization | Admin-only endpoint | Manager calls /customer/admin-list | Manager | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 132 | Authorization | Admin-only endpoint | Team Lead calls /customer/admin-list | Team Lead | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 133 | Authorization | Admin-only endpoint | Employee calls /customer/admin-list | Employee | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 134 | Authorization | Admin-only endpoint | Intern calls /customer/admin-list | Intern | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 135 | Authorization | Customer write role check | FIX BUG-005: Team Lead updates a customer | - | HTTP 403 | HTTP 403 Only Admin or Manager can update customers | PASS |
| 136 | Authorization | Customer write role check | FIX BUG-005: Employee updates a customer | - | HTTP 403 | HTTP 403 Only Admin or Manager can update customers | PASS |
| 137 | Authorization | Customer write role check | FIX BUG-005: Intern updates a customer | - | HTTP 403 | HTTP 403 Only Admin or Manager can update customers | PASS |
| 138 | Authorization | Customer write role check | FIX BUG-005: Team Lead deletes a customer | - | HTTP 403 | HTTP 403 Only Admin or Manager can delete customers | PASS |
| 139 | Authorization | Customer write role check | FIX BUG-005: Employee deletes a customer | - | HTTP 403 | HTTP 403 Only Admin or Manager can delete customers | PASS |
| 140 | Authorization | Customer write role check | FIX BUG-005: Intern deletes a customer | - | HTTP 403 | HTTP 403 Only Admin or Manager can delete customers | PASS |
| 141 | Authorization | Customer read (regression) | Team Lead can still READ own-company customer details | Team Lead | 200 - read must not be removed | HTTP 200 name=Alpha Customer One | PASS |
| 142 | Authorization | Customer read (regression) | Employee can still READ own-company customer details | Employee | 200 - read must not be removed | HTTP 200 name=Alpha Customer One | PASS |
| 143 | Authorization | Customer read (regression) | Intern can still READ own-company customer details | Intern | 200 - read must not be removed | HTTP 200 name=Alpha Customer One | PASS |
| 144 | Authorization | Customer write (regression) | Manager can still update customers | Manager | 200 | HTTP 200 Customer Updated Successfully | PASS |
| 145 | Authorization | Customer write (regression) | Admin can still update customers | Admin | 200 | HTTP 200 Customer Updated Successfully | PASS |
| 146 | Customers | Partial update | FIX BUG-006: name-only update must preserve every other field | Manager | all other fields unchanged | renamed=true; preserved=[city,email,gst_number,website,address,company_name,phone,country]; LOST=[] | PASS |
| 147 | Customers | Partial update | Explicitly sending an empty optional field clears it | Manager | website null, city untouched | website=null city="Salem" | PASS |
| 148 | Customers | Partial update | Blanking the required phone is refused | Manager | 400 | HTTP 400 Phone number is required | PASS |
| 149 | Customers | Update validation | Invalid phone on update rejected | Manager | 400 | HTTP 400 Phone number must contain digits only | PASS |
| 150 | Company Isolation | Customer IDOR | Manager B reads Company A customer | Manager B | 403 | HTTP 403 You can access only your company customers | PASS |
| 151 | Company Isolation | Customer IDOR | Manager B updates Company A customer | Manager B | 403 | HTTP 403 You can update only your company customers | PASS |
| 152 | Company Isolation | Customer IDOR | Manager B deletes Company A customer | Manager B | 403 | HTTP 403 You can delete only your company customers | PASS |
| 153 | Customers | ID validation | Non-existing customer id | Manager | HTTP 404 | HTTP 404 Customer Not Found | PASS |
| 154 | Customers | ID validation | FIX BUG-010: non-numeric customer id 'abc' (was HTTP 500) | Manager | HTTP 400 | HTTP 400 Invalid Customer Id | PASS |
| 155 | Customers | ID validation | Missing customer_id | Manager | HTTP 400 | HTTP 400 Customer Id is required | PASS |
| 156 | Leads | Create | Manager A creates lead (with requirement) | Manager | 201 | HTTP 201 Lead Created Successfully | PASS |
| 157 | Leads | Requirement field | FIX BUG-015: requirement is returned by create | Manager | REQUIREMENT-CANARY-123 | requirement="REQUIREMENT-CANARY-123" | PASS |
| 158 | Leads | Requirement field | FIX BUG-015: requirement persists and is returned by details | Manager | REQUIREMENT-CANARY-123 | requirement="REQUIREMENT-CANARY-123" | PASS |
| 159 | Leads | Requirement field | FIX BUG-015: requirement appears in the lead list | Manager | REQUIREMENT-CANARY-123 | requirement="REQUIREMENT-CANARY-123" | PASS |
| 160 | Leads | Requirement field | FIX BUG-015: requirement survives update | Manager | UPDATED-REQUIREMENT-456 | requirement="UPDATED-REQUIREMENT-456" | PASS |
| 161 | Leads | Create | Manager B creates lead | Manager | 201 | HTTP 201 | PASS |
| 162 | Leads | Create validation/authz | Missing lead_name | - | HTTP 400 | HTTP 400 Lead Name and Phone Number are Required | PASS |
| 163 | Leads | Create validation/authz | Missing phone | - | HTTP 400 | HTTP 400 Lead Name and Phone Number are Required | PASS |
| 164 | Leads | Create validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Lead Name and Phone Number are Required | PASS |
| 165 | Leads | Create validation/authz | Duplicate phone within own company | - | HTTP 400 | HTTP 400 Phone Number Already Exists | PASS |
| 166 | Leads | Create validation/authz | Duplicate email within own company | - | HTTP 400 | HTTP 400 Email Already Exists | PASS |
| 167 | Leads | Create validation/authz | Invalid lead phone | - | HTTP 400 | HTTP 400 Phone number must contain digits only | PASS |
| 168 | Leads | Create validation/authz | Invalid lead email | - | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 169 | Leads | Create validation/authz | Team Lead creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 170 | Leads | Create validation/authz | Employee creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 171 | Leads | Create validation/authz | Intern creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 172 | Leads | Create validation/authz | Admin creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 173 | Company Isolation | Lead duplicate scope | FIX BUG-007: Company B creates a lead with a phone that exists only in Company A | Manager B | 201 - no cross-tenant existence oracle | HTTP 201 Lead Created Successfully | PASS |
| 174 | Company Isolation | Lead duplicate scope | FIX BUG-007: Company B creates a lead with an email that exists only in Company A | Manager B | 201 | HTTP 201 Lead Created Successfully | PASS |
| 175 | Company Isolation | Lead IDOR | Manager B reads Company A lead | Manager B | 404 | HTTP 404 Lead Not Found | PASS |
| 176 | Company Isolation | Lead IDOR | Manager B updates Company A lead | Manager B | 404 | HTTP 404 Lead Not Found | PASS |
| 177 | Company Isolation | Lead IDOR | Manager B deletes Company A lead | Manager B | 404 | HTTP 404 Lead Not Found | PASS |
| 178 | Company Isolation | Lead IDOR | Manager B changes Company A lead status | Manager B | 404 | HTTP 404 Lead Not Found | PASS |
| 179 | Leads | ID validation | FIX BUG-010: non-numeric lead_id | Manager | 400 | HTTP 400 Invalid Lead ID | PASS |
| 180 | Leads | Status validation | Invalid lead status rejected | Manager | 400 | HTTP 400 Invalid Lead Status | PASS |
| 181 | Meetings | Create | Manager A creates meeting for own lead | Manager | 201 | HTTP 201 Meeting Created Successfully | PASS |
| 182 | Meetings | Date handling | FIX BUG-013: API returns meeting_date as plain YYYY-MM-DD (no UTC shift) | Manager | 2026-10-15 | meeting_date="2026-10-15" | PASS |
| 183 | Meetings | Business logic | Creating a meeting flips lead status to 'Meeting Scheduled' | Manager | Meeting Scheduled | lead status = Meeting Scheduled | PASS |
| 184 | Meetings | Create validation/authz | Missing lead_id | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 185 | Meetings | Create validation/authz | Missing title | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 186 | Meetings | Create validation/authz | Missing date | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 187 | Meetings | Create validation/authz | Missing time | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 188 | Meetings | Create validation/authz | FIX BUG-008: invalid date '2026-13-45' (was HTTP 500) | - | HTTP 400 | HTTP 400 Meeting date must be a valid date in YYYY-MM-DD format | PASS |
| 189 | Meetings | Create validation/authz | FIX BUG-008: invalid date 'notadate' (was HTTP 500) | - | HTTP 400 | HTTP 400 Meeting date must be a valid date in YYYY-MM-DD format | PASS |
| 190 | Meetings | Create validation/authz | FIX BUG-008: invalid time '99:99' (was HTTP 500) | - | HTTP 400 | HTTP 400 Meeting time must be a valid time in HH:MM format | PASS |
| 191 | Meetings | Create validation/authz | FIX BUG-008: impossible date '2026-02-30' | - | HTTP 400 | HTTP 400 Meeting date must be a valid date in YYYY-MM-DD format | PASS |
| 192 | Meetings | Create validation/authz | Non-existing lead_id | - | HTTP 404 | HTTP 404 Lead Not Found | PASS |
| 193 | Meetings | Create validation/authz | Non-numeric lead_id | - | HTTP 400 | HTTP 400 Invalid Lead ID | PASS |
| 194 | Meetings | Create validation/authz | CROSS-COMPANY: A uses B's lead | - | HTTP 404 | HTTP 404 Lead Not Found | PASS |
| 195 | Meetings | Create validation/authz | Team Lead creates meeting | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 196 | Meetings | Create validation/authz | Employee creates meeting | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 197 | Meetings | Date handling | FIX BUG-013: meeting list returns YYYY-MM-DD | Manager | 2026-10-15 | meeting_date="2026-10-15" | PASS |
| 198 | Company Isolation | Meeting IDOR | Manager B reads Company A meeting | Manager B | 404 | HTTP 404 Meeting Not Found | PASS |
| 199 | Company Isolation | Meeting IDOR | Manager B updates Company A meeting | Manager B | 404 | HTTP 404 Meeting Not Found | PASS |
| 200 | Company Isolation | Meeting IDOR | Manager B deletes Company A meeting | Manager B | 404 | HTTP 404 Meeting Not Found | PASS |
| 201 | Company Isolation | Meeting IDOR | Manager B completes Company A meeting | Manager B | 404 | HTTP 404 Meeting Not Found | PASS |
| 202 | Meetings | Update | Manager A updates own meeting | Manager | 200 + date stays exact | HTTP 200 date="2026-10-18" | PASS |
| 203 | Meetings | Complete validation | Complete 'Future Business' without next_meeting_date | Manager | 400 | HTTP 400 Next Meeting Date is Required | PASS |
| 204 | Meetings | Complete validation | Invalid meeting_result | Manager | 400 | HTTP 400 Invalid Meeting Result | PASS |
| 205 | Meetings | Complete validation | FIX BUG-008: invalid next_meeting_date | Manager | 400 | HTTP 400 Next meeting date must be a valid date in YYYY-MM-DD format | PASS |
| 206 | Meetings | Complete | Manager completes meeting as 'Converted' | Manager | 200 | HTTP 200 Meeting Completed Successfully | PASS |
| 207 | Meetings | Business logic | 'Converted' meeting flips lead to Converted | Manager | Converted | lead status = Converted | PASS |
| 208 | Meetings | Complete | Complete an already-completed meeting | Manager | 400 | HTTP 400 Meeting Already Completed | PASS |
| 209 | Meetings | Update | Update a completed meeting | Manager | 400 | HTTP 400 Completed or Cancelled Meeting Cannot Be Updated | PASS |
| 210 | Meetings | Delete | Delete a completed meeting | Manager | 400 | HTTP 400 Completed Meeting Cannot Be Deleted | PASS |
| 211 | Meetings | Business logic | Create meeting for a 'Converted' lead | Manager | 400 blocked | HTTP 400 Meeting Cannot Be Created For This Lead | PASS |
| 212 | Tasks | Create | Manager A creates main task | Manager | 201 | HTTP 201 Task Created Successfully | PASS |
| 213 | Tasks | Create | Manager B creates main task | Manager | 201 | HTTP 201 | PASS |
| 214 | Tasks | Create validation/authz | Missing customer_id | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 215 | Tasks | Create validation/authz | Missing title | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 216 | Tasks | Create validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 217 | Tasks | Create validation/authz | Whitespace-only title | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 218 | Tasks | Create validation/authz | Non-existing customer | - | HTTP 404 | HTTP 404 Customer Not Found | PASS |
| 219 | Tasks | Create validation/authz | FIX BUG-010: non-numeric customer_id | - | HTTP 400 | HTTP 400 Invalid Customer Id | PASS |
| 220 | Tasks | Create validation/authz | CROSS-COMPANY: A uses B's customer | - | HTTP 403 | HTTP 403 You can create tasks only for your company customers | PASS |
| 221 | Tasks | Create validation/authz | Team Lead creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 222 | Tasks | Create validation/authz | Employee creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 223 | Tasks | Create validation/authz | Intern creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 224 | Tasks | Create validation/authz | Admin creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 225 | Tasks | Create validation/authz | FIX BUG-011: invalid priority 'SUPER_URGENT' | - | HTTP 400 | HTTP 400 Priority must be one of: Low, Medium, High, Urgent | PASS |
| 226 | Tasks | Create validation/authz | FIX BUG-011: invalid due_date 'notadate' (was HTTP 500) | - | HTTP 400 | HTTP 400 Due date must be a valid date in YYYY-MM-DD format | PASS |
| 227 | Tasks | Create validation/authz | FIX BUG-011: due_date before start_date | - | HTTP 400 | HTTP 400 Due date cannot be earlier than start date | PASS |
| 228 | Tasks | Create validation/authz | FIX BUG-011: impossible date 2026-02-30 | - | HTTP 400 | HTTP 400 Due date must be a valid date in YYYY-MM-DD format | PASS |
| 229 | Tasks | Priority whitelist | Valid priority 'Low' accepted | Manager | 201 | HTTP 201 | PASS |
| 230 | Tasks | Priority whitelist | Valid priority 'Medium' accepted | Manager | 201 | HTTP 201 | PASS |
| 231 | Tasks | Priority whitelist | Valid priority 'High' accepted | Manager | 201 | HTTP 201 | PASS |
| 232 | Tasks | Priority whitelist | Valid priority 'Urgent' accepted | Manager | 201 | HTTP 201 | PASS |
| 233 | Tasks | Date handling | FIX BUG-013: task dates return as YYYY-MM-DD (no UTC shift) | Manager | start 2026-09-01, due 2026-09-30 | start="2026-09-01" due="2026-09-30" | PASS |
| 234 | Tasks | List scoping | Manager A lists tasks | Manager A | own company only | HTTP 200 count=5 companies=[1] | PASS |
| 235 | Tasks | List scoping | Manager B lists tasks | Manager B | own company only | HTTP 200 count=1 companies=[2] | PASS |
| 236 | Tasks | List scoping | Team Lead A lists tasks | Team Lead A | own company only | HTTP 200 count=5 companies=[1] | PASS |
| 237 | Tasks | List scoping | Employee A lists tasks | Employee A | own company only | HTTP 200 count=5 companies=[1] | PASS |
| 238 | Tasks | List scoping | Admin lists tasks | Admin | all companies | HTTP 200 count=6 companies=[1,2] | PASS |
| 239 | Company Isolation | Task IDOR | Manager B reads Company A task | Manager B | 403 | HTTP 403 You can access only your company tasks | PASS |
| 240 | Company Isolation | Task IDOR | Manager B updates Company A task | Manager B | 403 | HTTP 403 You can update only your company tasks | PASS |
| 241 | Company Isolation | Task IDOR | Manager B deletes Company A task | Manager B | 403 | HTTP 403 You can delete only your company tasks | PASS |
| 242 | Tasks | Partial update | FIX BUG-012: title-only update preserves description and dates | Manager | description + dates unchanged | title=Alpha Main Task v2 desc="QA main task" start="2026-09-01" due="2026-09-30" LOST=[] | PASS |
| 243 | Tasks | Partial update | Explicitly blank description clears it, dates preserved | Manager | description null, due_date kept | desc=null due="2026-09-30" | PASS |
| 244 | Tasks | Update validation | Invalid task status rejected | Manager | 400 | HTTP 400 Invalid Task Status | PASS |
| 245 | Tasks | Update validation | FIX BUG-011: invalid priority on update rejected | Manager | 400 | HTTP 400 Priority must be one of: Low, Medium, High, Urgent | PASS |
| 246 | Tasks | Assign | Manager A assigns task to Team Lead A | Manager | 201 | HTTP 201 Task Assigned To Team Lead Successfully | PASS |
| 247 | Tasks | Assign | Manager B assigns task to Team Lead B | Manager | 201 | HTTP 201 | PASS |
| 248 | Tasks | Assign validation/authz | Duplicate assignment (same task+lead) | - | HTTP 400 | HTTP 400 This task is already assigned to that Team Lead | PASS |
| 249 | Tasks | Assign validation/authz | Assign to an Employee (not Team Lead) | - | HTTP 400 | HTTP 400 Main task can only be assigned to Team Lead | PASS |
| 250 | Tasks | Assign validation/authz | Assign to an Intern | - | HTTP 400 | HTTP 400 Main task can only be assigned to Team Lead | PASS |
| 251 | Tasks | Assign validation/authz | Assign to a Manager | - | HTTP 400 | HTTP 400 Main task can only be assigned to Team Lead | PASS |
| 252 | Tasks | Assign validation/authz | CROSS-COMPANY: assign A's task to B's Team Lead | - | HTTP 403 | HTTP 403 You can assign tasks only to Team Leads in your company | PASS |
| 253 | Tasks | Assign validation/authz | Non-existing team lead | - | HTTP 404 | HTTP 404 Team Lead Not Found | PASS |
| 254 | Tasks | Assign validation/authz | Non-existing task | - | HTTP 404 | HTTP 404 Task Not Found | PASS |
| 255 | Tasks | Assign validation/authz | Missing employee_id | - | HTTP 400 | HTTP 400 Task ID and Team Lead ID are required | PASS |
| 256 | Tasks | Assign validation/authz | Non-numeric ids | - | HTTP 400 | HTTP 400 Invalid Task ID or Team Lead ID | PASS |
| 257 | Tasks | Assign validation/authz | Team Lead assigns a task | - | HTTP 403 | HTTP 403 Only Manager can assign main tasks | PASS |
| 258 | Tasks | Assign validation/authz | Employee assigns a task | - | HTTP 403 | HTTP 403 Only Manager can assign main tasks | PASS |
| 259 | Tasks | Assigned workers | Manager lists assigned team leads | Manager | 200 count>=1 | HTTP 200 count=1 | PASS |
| 260 | Company Isolation | Assigned workers IDOR | Manager B lists assigned workers of Company A task | Manager B | 403 | HTTP 403 You can access only your company tasks | PASS |
| 261 | Team Leader | Task list | Team Lead A lists own assignments | Team Lead | 200, >=1 | HTTP 200 count=1 | PASS |
| 262 | Company Isolation | Team Lead task list | Team Lead B sees only own assignments | Team Lead B | excludes assignment 1 | assignments=[2] | PASS |
| 263 | Authorization | Team-Lead-only endpoint | Manager calls /task/teamlead-list | Manager | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 264 | Authorization | Team-Lead-only endpoint | Employee calls /task/teamlead-list | Employee | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 265 | Authorization | Team-Lead-only endpoint | Intern calls /task/teamlead-list | Intern | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 266 | Authorization | Team-Lead-only endpoint | Admin calls /task/teamlead-list | Admin | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 267 | Tasks | Assignment status | Owning Team Lead sets assignment In Progress | Team Lead | 200 | HTTP 200 Status Updated Successfully | PASS |
| 268 | Company Isolation | Assignment status IDOR | Team Lead B changes Company A assignment status | Team Lead B | 403 | HTTP 403 You can update only your company assignments | PASS |
| 269 | Authorization | Assignment status | Employee changes assignment status | Employee | 403 | HTTP 403 You are not authorized to update this assignment | PASS |
| 270 | Tasks | Assignment status validation | Invalid assignment status | Team Lead | 400 | HTTP 400 Invalid Task Status | PASS |
| 271 | Tasks | Split create | Team Lead A splits task to Employee A | Team Lead | 201 | HTTP 201 Split Task Created Successfully | PASS |
| 272 | Tasks | Split create | Team Lead A splits task to Intern A | Team Lead | 201 | HTTP 201 | PASS |
| 273 | Tasks | Split create | Team Lead B splits task to Employee B | Team Lead | 201 | HTTP 201 | PASS |
| 274 | Tasks | Split validation/authz | Missing parent_assignment_id | - | HTTP 400 | HTTP 400 Parent Assignment, Title and Employee are required | PASS |
| 275 | Tasks | Split validation/authz | Missing title | - | HTTP 400 | HTTP 400 Parent Assignment, Title and Employee are required | PASS |
| 276 | Tasks | Split validation/authz | Missing employee_id | - | HTTP 400 | HTTP 400 Parent Assignment, Title and Employee are required | PASS |
| 277 | Tasks | Split validation/authz | Assign split to a Team Lead | - | HTTP 400 | HTTP 400 Split task can only be assigned to Employee or Intern | PASS |
| 278 | Tasks | Split validation/authz | Assign split to a Manager | - | HTTP 400 | HTTP 400 Split task can only be assigned to Employee or Intern | PASS |
| 279 | Tasks | Split validation/authz | CROSS-COMPANY: TL A splits to Employee B | - | HTTP 403 | HTTP 403 You can assign work only to members of your company | PASS |
| 280 | Tasks | Split validation/authz | CROSS-COMPANY: TL B splits A's assignment | - | HTTP 403 | HTTP 403 You can split only your assigned tasks | PASS |
| 281 | Tasks | Split validation/authz | Non-existing assignment | - | HTTP 404 | HTTP 404 Task Assignment Not Found | PASS |
| 282 | Tasks | Split validation/authz | Non-numeric ids | - | HTTP 400 | HTTP 400 Invalid Parent Assignment or Employee ID | PASS |
| 283 | Tasks | Split validation/authz | Invalid split status | - | HTTP 400 | HTTP 400 Invalid Split Task Status | PASS |
| 284 | Tasks | Split validation/authz | Status 'Submitted' not TL-assignable | - | HTTP 400 | HTTP 400 Invalid Split Task Status | PASS |
| 285 | Tasks | Split validation/authz | Manager creates a split task | - | HTTP 403 | HTTP 403 Only Team Lead can split tasks | PASS |
| 286 | Tasks | Split validation/authz | Employee creates a split task | - | HTTP 403 | HTTP 403 Only Team Lead can split tasks | PASS |
| 287 | Tasks | Split list | Team Lead A lists own split tasks | Team Lead | 200 count>=2 | HTTP 200 count=2 | PASS |
| 288 | Company Isolation | Split list IDOR | Team Lead B lists Company A split tasks | Team Lead B | 403 | HTTP 403 You can access only your assigned tasks | PASS |
| 289 | Tasks | Split update | Team Lead updates own split task | Team Lead | 200 | HTTP 200 Split Task Updated Successfully | PASS |
| 290 | Company Isolation | Split update IDOR | Team Lead B updates Company A split task | Team Lead B | 403 | HTTP 403 You can update only your split tasks | PASS |
| 291 | Company Isolation | Split status IDOR | Team Lead B cancels Company A split task | Team Lead B | 403 | HTTP 403 You can update only your assigned split tasks | PASS |
| 292 | Employee | Task list | Employee A lists own split tasks | Employee | 200 + own split | HTTP 200 count=1 | PASS |
| 293 | Intern | Task list | Intern A lists own split tasks | Intern | 200 + own split | HTTP 200 count=1 | PASS |
| 294 | Intern | Isolation | Intern A does NOT see Employee A's split task | Intern | excludes 1 | ids=[2] | PASS |
| 295 | Employee | Task details | FIX BUG-001: Employee opens own split task details (was HTTP 500) | Employee | 200 | HTTP 200 ok | PASS |
| 296 | Company Isolation | Worker task IDOR | Employee B opens Company A split task | Employee B | 404 | HTTP 404 Task Not Found | PASS |
| 297 | Authorization | Worker task ownership | Intern A opens Employee A's split task | Intern | 404 | HTTP 404 Task Not Found | PASS |
| 298 | Employee | Start task | Employee A starts own Pending split task | Employee | 200 -> In Progress | HTTP 200 status=In Progress | PASS |
| 299 | Employee | Start task | Employee A starts an already-started task | Employee | 400 | HTTP 400 Only Pending tasks can be started | PASS |
| 300 | Company Isolation | Start task IDOR | Employee B starts Company A split task | Employee B | 403 | HTTP 403 You can start only your assigned tasks | PASS |
| 301 | Intern | Start task | Intern A starts own split task | Intern | 200 | HTTP 200 status=In Progress | PASS |
| 302 | Tasks | Parent roll-up | FIX BUG-029: starting work moves parent task to In Progress | Manager | In Progress | task=In Progress assignment=In Progress | PASS |
| 303 | Task Reports | Submit | FIX BUG-001: Employee submits report (was HTTP 500) | Employee | 201 | HTTP 201 Task Report Submitted Successfully | PASS |
| 304 | Task Reports | Submit | FIX BUG-001: Intern submits report (was HTTP 500) | Intern | 201 | HTTP 201 Task Report Submitted Successfully | PASS |
| 305 | Task Reports | Submit validation/authz | Missing split_task_id | - | HTTP 400 | HTTP 400 Split Task ID and Report are required | PASS |
| 306 | Task Reports | Submit validation/authz | Missing report text | - | HTTP 400 | HTTP 400 Split Task ID and Report are required | PASS |
| 307 | Task Reports | Submit validation/authz | Report shorter than 10 chars | - | HTTP 400 | HTTP 400 Report must be at least 10 characters | PASS |
| 308 | Task Reports | Submit validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Split Task ID and Report are required | PASS |
| 309 | Task Reports | Submit validation/authz | Invalid split_task_id 'abc' | - | HTTP 400 | HTTP 400 Invalid Split Task ID | PASS |
| 310 | Task Reports | Submit validation/authz | Non-existing split task | - | HTTP 404 | HTTP 404 Split Task Not Found | PASS |
| 311 | Task Reports | Submit validation/authz | CROSS-COMPANY: Employee B reports on A's split | - | HTTP 403 | HTTP 403 You can report only your assigned tasks | PASS |
| 312 | Task Reports | Submit validation/authz | Intern A reports on Employee A's split | - | HTTP 403 | HTTP 403 You can report only your assigned tasks | PASS |
| 313 | Task Reports | Submit validation/authz | Team Lead submits a report | - | HTTP 403 | HTTP 403 Only Employee or Intern can submit task report | PASS |
| 314 | Task Reports | Submit validation/authz | Manager submits a report | - | HTTP 403 | HTTP 403 Only Employee or Intern can submit task report | PASS |
| 315 | Task Reports | Submit validation/authz | Duplicate submit while awaiting review | - | HTTP 400 | HTTP 400 A report has already been submitted and is awaiting review | PASS |
| 316 | Task Reports | Team Lead list | FIX BUG-001: Team Lead lists team reports (was HTTP 500) | Team Lead | 200 + both reports | HTTP 200 count=2 | PASS |
| 317 | Company Isolation | Report list | Team Lead B must not see Company A reports | Team Lead B | excludes A's reports | HTTP 200 ids=[] | PASS |
| 318 | Task Reports | Manager list | FIX BUG-014: Manager can list reports produced in their company | Manager | 200 + both reports | HTTP 200 count=2 ids=[2,1] | PASS |
| 319 | Company Isolation | Manager report list | Manager B does NOT see Company A reports | Manager B | excludes A's reports | HTTP 200 ids=[] | PASS |
| 320 | Authorization | Manager-only endpoint | Team Lead calls /task-report/manager | Team Lead | 403 | HTTP 403 Only Manager can view company reports | PASS |
| 321 | Authorization | Manager-only endpoint | Employee calls /task-report/manager | Employee | 403 | HTTP 403 Only Manager can view company reports | PASS |
| 322 | Authorization | Manager-only endpoint | Intern calls /task-report/manager | Intern | 403 | HTTP 403 Only Manager can view company reports | PASS |
| 323 | Authorization | Manager-only endpoint | Admin calls /task-report/manager | Admin | 403 | HTTP 403 Only Manager can view company reports | PASS |
| 324 | Task Reports | Manager details | FIX BUG-014: Manager reads report details (was 403) | Manager | 200 | HTTP 200 report=Completed the assigned QA work | PASS |
| 325 | Company Isolation | Manager details IDOR | Manager B reads Company A report by id | Manager B | 404 | HTTP 404 Report Not Found | PASS |
| 326 | Task Reports | Details (regression) | Team Lead still reads report details | Team Lead | 200 | HTTP 200 | PASS |
| 327 | Company Isolation | Report details IDOR | Team Lead B reads Company A report by id | Team Lead B | 404 | HTTP 404 Report Not Found | PASS |
| 328 | Task Reports | Details authz | Employee calls the Manager/TL details endpoint | Employee | 403 | HTTP 403 Only Manager or Team Lead can view report details | PASS |
| 329 | Company Isolation | Report review IDOR | Team Lead B approves Company A report | Team Lead B | 403 | HTTP 403 You can review only your team reports | PASS |
| 330 | Authorization | Report review | Employee approves their OWN report (self-approval) | Employee | 403 | HTTP 403 Only Team Lead can review reports | PASS |
| 331 | Authorization | Report review | Manager approves a report (review stays with Team Lead) | Manager | 403 | HTTP 403 Only Team Lead can review reports | PASS |
| 332 | Task Reports | Review validation | Invalid review action | Team Lead | 400 | HTTP 400 Action must be Approve or Rework | PASS |
| 333 | Task Reports | Review validation | Rework without remarks | Team Lead | 400 | HTTP 400 Rework remark is required | PASS |
| 334 | Task Reports | Review - Rework | FIX BUG-001: Team Lead sends report back for rework | Team Lead | 200 | HTTP 200 Report Sent Back for Rework | PASS |
| 335 | Task Reports | Rework loop | Split task -> 'Rework' and remark reaches the worker | Employee | Rework + remark visible | status=Rework remark="Please add more evidence." | PASS |
| 336 | Tasks | Parent roll-up | FIX BUG-029: rework keeps the parent task In Progress (not Completed) | Manager | In Progress | task=In Progress | PASS |
| 337 | Task Reports | Attachment upload | FIX BUG-001: resubmit with a .txt attachment | Employee | 201 + attachment recorded | HTTP 201 file=evidence.txt | PASS |
| 338 | Security | Attachment access control | Employee A (submitter) downloads report attachment | Employee A (submitter) | HTTP 200 | HTTP 200 | PASS |
| 339 | Security | Attachment access control | Team Lead A (owner) downloads report attachment | Team Lead A (owner) | HTTP 200 | HTTP 200 | PASS |
| 340 | Security | Attachment access control | Manager A (same company) downloads report attachment | Manager A (same company) | HTTP 200 | HTTP 200 | PASS |
| 341 | Security | Attachment access control | Team Lead B (other company) downloads report attachment | Team Lead B (other company) | HTTP 404 | HTTP 404 | PASS |
| 342 | Security | Attachment access control | Employee B (other company) downloads report attachment | Employee B (other company) | HTTP 404 | HTTP 404 | PASS |
| 343 | Security | Attachment access control | Intern A (same company, not submitter) downloads report attachment | Intern A (same company, not submitter) | HTTP 404 | HTTP 404 | PASS |
| 344 | Security | Attachment access control | Admin (company_id NULL) downloads report attachment | Admin (company_id NULL) | HTTP 404 | HTTP 404 | PASS |
| 345 | Security | Upload file-type whitelist | Upload Executable .exe | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XL | PASS |
| 346 | Security | Upload file-type whitelist | Upload HTML file (stored XSS vector) | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XL | PASS |
| 347 | Security | Upload file-type whitelist | Upload PHP shell | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XL | PASS |
| 348 | Security | Upload file-type whitelist | Upload SVG with script | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XL | PASS |
| 349 | Security | Path traversal | Upload with filename '../../../../server.js' | Employee | 201, stored under a random safe name | HTTP 201 stored_original=server.js | PASS |
| 350 | Security | Upload size limit | Upload 3MB file (limit 2MB) | Employee | 400 too large | HTTP 400 File is too large. Maximum size is 2MB | PASS |
| 351 | Task Reports | Review - Approve | FIX BUG-001: Team Lead approves final report | Team Lead | 200 + task Completed | HTTP 200 Report Approved and Task Completed | PASS |
| 352 | Task Reports | Review | Re-review an already-approved report | Team Lead | 400 | HTTP 400 This report has already been reviewed | PASS |
| 353 | Task Reports | Approval effect | Approved report sets split task Completed + completed_at | Employee | Completed | status=Completed completed_at=true | PASS |
| 354 | Task Reports | Status gate | Submit report on a Completed split task | Employee | 400 | HTTP 400 Task must be In Progress or Rework before submitting a report | PASS |
| 355 | Tasks | Parent roll-up | FIX BUG-029: parent stays In Progress while a sibling split is unfinished | Manager | In Progress | task=In Progress | PASS |
| 356 | Task Reports | Review - Approve | Team Lead approves the Intern's report | Team Lead | 200 | HTTP 200 Report Approved and Task Completed | PASS |
| 357 | Tasks | Parent roll-up | FIX BUG-029: ALL split tasks complete -> parent assignment Completed | Manager | assignment Completed | assignment=Completed completed_at=true | PASS |
| 358 | Tasks | Parent roll-up | FIX BUG-029: ALL split tasks complete -> parent TASK Completed | Manager | Completed | task=Completed | PASS |
| 359 | Tasks | Parent roll-up safety | REGRESSION: a task with NO split tasks is never auto-completed | Manager | Pending | task=Pending assignment=Pending | PASS |
| 360 | Tasks | Parent roll-up safety | REGRESSION: manual assignment status on an unsplit task is not overwritten | Team Lead | assignment stays Completed | HTTP 200 assignment=Completed | PASS |
| 361 | Task Reports | My reports | FIX BUG-001: Employee lists own reports (was HTTP 500) | Employee | 200 | HTTP 200 count=4 | PASS |
| 362 | Task Reports | Employee report list | FIX BUG-001: GET /task-report/employee-list (was HTTP 500) | Employee | 200 | HTTP 200 count=1 | PASS |
| 363 | Intern | Employee report list | Intern lists own reports | Intern | 200 | HTTP 200 count=1 | PASS |
| 364 | Task Reports | Employee report details | Employee reads own report detail | Employee | 200 | HTTP 200 | PASS |
| 365 | Company Isolation | Employee report IDOR | Employee B reads Company A report detail | Employee B | 404 | HTTP 404 Report Not Found | PASS |
| 366 | Authorization | Report ownership | Intern reads Employee's report detail | Intern | 404 | HTTP 404 Report Not Found | PASS |
| 367 | Security | Report ID manipulation | GET /task-report/0 | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 368 | Security | Report ID manipulation | GET /task-report/-1 | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 369 | Security | Report ID manipulation | GET /task-report/abc | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 370 | Security | Report ID manipulation | GET /task-report/999999 | Team Lead | HTTP 404 | HTTP 404 Report Not Found | PASS |
| 371 | Security | Report ID manipulation | GET /task-report/1 OR 1=1 | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 372 | Security | Report ID manipulation | GET /task-report/1;DROP TABLE users | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 373 | Security | Missing token | All 12 protected endpoints with NO Authorization header | Anonymous | 401 on every one | 12/12 returned 401 | PASS |
| 374 | Security | Invalid token | All 12 protected endpoints with a garbage bearer token | Anonymous | 401 on every one (never 500) | 12/12 returned 401 | PASS |
| 375 | Security | JWT forgery | Malformed token (not 3 parts) | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 376 | Security | JWT forgery | Empty bearer value | Attacker | 401 | HTTP 401 Access Token Required | PASS |
| 377 | Security | JWT forgery | alg=none forged token | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 378 | Security | JWT forgery | Valid payload, wrong signature | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 379 | Security | JWT forgery | Expired token (exp in the past) | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 380 | Security | JWT tampering | Employee token with payload rewritten to role=Admin | Employee->Admin | 401 | HTTP 401 Unauthorized | PASS |
| 381 | Security | Auth header parsing | No 'Bearer ' prefix | Employee | 401 | HTTP 401 Invalid Token | PASS |
| 382 | Security | Auth header parsing | Wrong scheme 'Basic' | Employee | 401 | HTTP 401 Invalid Token | PASS |
| 383 | Security | Auth header parsing | Lowercase 'bearer' | Employee | 401 | HTTP 401 Invalid Token | PASS |
| 384 | Security | JWT contents | JWT carries only id/role/company_id/iat/exp | Employee | no secret material | claims=[id,role,company_id,iat,exp] | PASS |
| 385 | Security | Token expiry | Token carries an exp claim | Employee | exp present | exp=2026-08-30T09:57:47.000Z | PASS |
| 386 | Dashboard | Load | admin dashboard loads with expected cards | admin | 200 + all cards | HTTP 200 role=Admin missing=[] | PASS |
| 387 | Dashboard | Data quality | admin dashboard has no null/NaN/undefined counts | admin | all numeric | all numeric | PASS |
| 388 | Dashboard | Load | mgrA dashboard loads with expected cards | mgrA | 200 + all cards | HTTP 200 role=Manager missing=[] | PASS |
| 389 | Dashboard | Data quality | mgrA dashboard has no null/NaN/undefined counts | mgrA | all numeric | all numeric | PASS |
| 390 | Dashboard | Load | tlA dashboard loads with expected cards | tlA | 200 + all cards | HTTP 200 role=Team Lead missing=[] | PASS |
| 391 | Dashboard | Data quality | tlA dashboard has no null/NaN/undefined counts | tlA | all numeric | all numeric | PASS |
| 392 | Dashboard | Load | empA dashboard loads with expected cards | empA | 200 + all cards | HTTP 200 role=Employee missing=[] | PASS |
| 393 | Dashboard | Data quality | empA dashboard has no null/NaN/undefined counts | empA | all numeric | all numeric | PASS |
| 394 | Dashboard | Load | intA dashboard loads with expected cards | intA | 200 + all cards | HTTP 200 role=Intern missing=[] | PASS |
| 395 | Dashboard | Data quality | intA dashboard has no null/NaN/undefined counts | intA | all numeric | all numeric | PASS |
| 396 | Dashboard | Consistency | FIX: Manager 'Team Members' card equals the Team Composition breakdown | Manager | team_size === TL + Employee + Intern | team_size=4 breakdown sum=4 | PASS |
| 397 | Dashboard | Auth | Dashboard without token | Anonymous | 401 | HTTP 401 | PASS |
| 398 | Company Isolation | Dashboard counts | Manager A and Manager B see different, company-scoped counts | Manager | different totals | A.customers=1 B.customers=2 | PASS |
| 399 | Workers | List | Admin lists workers | Admin | HTTP 200 | HTTP 200 count=15 companies=[1,2] | PASS |
| 400 | Security | Data exposure | Admin workers list has no password hashes | Admin | no password field | present=false | PASS |
| 401 | Workers | List | Manager A lists workers | Manager A | HTTP 200 | HTTP 200 count=5 companies=[1] | PASS |
| 402 | Security | Data exposure | Manager A workers list has no password hashes | Manager A | no password field | present=false | PASS |
| 403 | Workers | List | Team Lead A lists workers | Team Lead A | HTTP 200 | HTTP 200 count=5 companies=[1] | PASS |
| 404 | Security | Data exposure | Team Lead A workers list has no password hashes | Team Lead A | no password field | present=false | PASS |
| 405 | Workers | List | Employee A lists workers | Employee A | HTTP 403 | HTTP 403 count=undefined companies=[] | PASS |
| 406 | Workers | List | Intern A lists workers | Intern A | HTTP 403 | HTTP 403 count=undefined companies=[] | PASS |
| 407 | Authorization | Pending users | Team Lead lists pending users | Team Lead | 403 | HTTP 403 You are not authorized to view pending users | PASS |
| 408 | Authorization | Pending users | Employee lists pending users | Employee | 403 | HTTP 403 You are not authorized to view pending users | PASS |
| 409 | Authorization | Pending users | Intern lists pending users | Intern | 403 | HTTP 403 You are not authorized to view pending users | PASS |
| 410 | Profile | View | Admin views own profile | Admin | 200, no password | HTTP 200 email=qa1.admin@qa.test pwLeak=false | PASS |
| 411 | Profile | View | Manager views own profile | Manager | 200, no password | HTTP 200 email=qa1.mgra@qa.test pwLeak=false | PASS |
| 412 | Profile | View | Team Lead views own profile | Team Lead | 200, no password | HTTP 200 email=qa1.tla@qa.test pwLeak=false | PASS |
| 413 | Profile | View | Employee views own profile | Employee | 200, no password | HTTP 200 email=qa1.empa@qa.test pwLeak=false | PASS |
| 414 | Profile | View | Intern views own profile | Intern | 200, no password | HTTP 200 email=qa1.inta@qa.test pwLeak=false | PASS |
| 415 | Profile | Update + persistence | Intern updates last_name, re-read confirms persisted | Intern | 200 + persisted | HTTP 200 last_name=Renamed | PASS |
| 416 | Profile | Update validation | Missing first_name | Intern | HTTP 400 | HTTP 400 First name is required | PASS |
| 417 | Profile | Update validation | Invalid email | Intern | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 418 | Profile | Update validation | Missing phone | Intern | HTTP 400 | HTTP 400 Phone number is required | PASS |
| 419 | Profile | Update validation | Email already used by another user | Intern | HTTP 400 | HTTP 400 Email or phone number is already in use | PASS |
| 420 | Profile | Update validation | Phone already used by another user | Intern | HTTP 400 | HTTP 400 Email or phone number is already in use | PASS |
| 421 | Profile | Update validation | FIX BUG-003: phone with letters | Intern | HTTP 400 | HTTP 400 Phone number must contain digits only | PASS |
| 422 | Profile | Update validation | FIX BUG-003: phone 3 digits | Intern | HTTP 400 | HTTP 400 Phone number must be exactly 10 digits | PASS |
| 423 | Profile | Update validation | FIX BUG-003: phone 15 digits | Intern | HTTP 400 | HTTP 400 Phone number must be exactly 10 digits | PASS |
| 424 | Profile | Update validation | Whitespace-only first_name | Intern | HTTP 400 | HTTP 400 First name is required | PASS |
| 425 | Security | Mass assignment | role:'Admin' in update-profile must be ignored | Intern | role stays Intern | role=Intern company=1 | PASS |
| 426 | Profile | Change password validation | Missing both fields | Intern B | HTTP 400 | HTTP 400 Current and new password are required | PASS |
| 427 | Profile | Change password validation | Missing newPassword | Intern B | HTTP 400 | HTTP 400 Current and new password are required | PASS |
| 428 | Profile | Change password validation | Wrong current password | Intern B | HTTP 400 | HTTP 400 Current Password Incorrect | PASS |
| 429 | Profile | Change password validation | New password too short | Intern B | HTTP 400 | HTTP 400 New password must be at least 8 characters | PASS |
| 430 | Profile | Change password validation | FIX BUG-026: new password with no digit | Intern B | HTTP 400 | HTTP 400 New password must contain at least one letter and one number | PASS |
| 431 | Profile | Change password validation | New password same as current | Intern B | HTTP 400 | HTTP 400 New password must be different from the current password | PASS |
| 432 | Profile | Change password | Intern B changes password successfully | Intern B | 200 | HTTP 200 Password Changed Successfully | PASS |
| 433 | Profile | Change password | Login with OLD password after change | Intern B | 401 | HTTP 401 Invalid Credentials | PASS |
| 434 | Profile | Change password | Login with NEW password after change | Intern B | 200 | HTTP 200 | PASS |
| 435 | Security | Session invalidation | FIX BUG-024: JWT issued BEFORE the password change is now rejected | Intern B | 401 Session Expired | HTTP 401 Session Expired | PASS |
| 436 | Security | Session invalidation | REGRESSION: the NEW token issued after the change still works | Intern B | 200 | HTTP 200 | PASS |
| 437 | Security | Session invalidation | REGRESSION: users who never changed their password are not logged out | Employee | 200 | HTTP 200 | PASS |
| 438 | Password Reset | Forgot password | Forgot password for an existing account | Public | 200 generic | HTTP 200 If an account exists for that email, a password reset link has been generated. | PASS |
| 439 | Password Reset | Token exposure | Forgot-password never returns a token to an anonymous caller | Public | no token in body | token present: false | PASS |
| 440 | Password Reset | Account enumeration | Non-existent account returns the same response | Public | identical | same=true | PASS |
| 441 | Password Reset | Forgot password | Invalid email format returns the same generic response | Public | 200 generic | HTTP 200 | PASS |
| 442 | Password Reset | Token generation | FIX BUG-001/023: forgot-password no longer fails silently (password_resets table exists) | Public | 200 and a row written | HTTP 200 (row count verified separately) | PASS |
| 443 | Password Reset | Reset validation | Missing token | Public | HTTP 400 | HTTP 400 Token and new password are required | PASS |
| 444 | Password Reset | Reset validation | Missing newPassword | Public | HTTP 400 | HTTP 400 Token and new password are required | PASS |
| 445 | Password Reset | Reset validation | Invalid/unknown token | Public | HTTP 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 446 | Password Reset | Reset validation | Short new password | Public | HTTP 400 | HTTP 400 Password must be at least 8 characters | PASS |
| 447 | Password Reset | Reset validation | Empty body | Public | HTTP 400 | HTTP 400 Token and new password are required | PASS |
| 448 | Password Reset | Reset validation | Token as object (type confusion) | Public | HTTP 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 449 | Password Reset | Token delivery | FIX BUG-023: Admin generates a reset link for a user | Admin | 200 + reset_url | HTTP 200 url=true tokenLen=64 | PASS |
| 450 | Authorization | Admin-only reset link | Manager calls /auth/admin-generate-reset-link | Manager | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 451 | Authorization | Admin-only reset link | Team Lead calls /auth/admin-generate-reset-link | Team Lead | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 452 | Authorization | Admin-only reset link | Employee calls /auth/admin-generate-reset-link | Employee | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 453 | Authorization | Admin-only reset link | Intern calls /auth/admin-generate-reset-link | Intern | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 454 | Authorization | Admin-only reset link | Anonymous calls /auth/admin-generate-reset-link | Anonymous | 401 | HTTP 401 | PASS |
| 455 | Password Reset | Admin reset link validation | Missing user_id | Admin | HTTP 400 | HTTP 400 A valid User Id is required | PASS |
| 456 | Password Reset | Admin reset link validation | Non-numeric user_id | Admin | HTTP 400 | HTTP 400 A valid User Id is required | PASS |
| 457 | Password Reset | Admin reset link validation | Non-existing user | Admin | HTTP 404 | HTTP 404 User Not Found | PASS |
| 458 | Password Reset | Reset | FIX BUG-023: reset password with the Admin-issued token | Public | 200 | HTTP 200 Password has been reset. You can now log in. | PASS |
| 459 | Password Reset | Reset effect | Old password rejected after reset | Employee A | 401 | HTTP 401 | PASS |
| 460 | Password Reset | Reset effect | New password works after reset | Employee A | 200 | HTTP 200 | PASS |
| 461 | Password Reset | Single-use token | Reuse the same reset token a second time | Public | 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 462 | Security | Session invalidation | FIX BUG-024: JWT issued before the RESET is now rejected | Employee A | 401 | HTTP 401 Session Expired | PASS |
| 463 | Password Reset | Token rotation | Older reset token invalidated when a newer one is issued | Public | 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 464 | Password Reset | Token rotation | Newest reset token works (password restored) | Public | 200 | HTTP 200 | PASS |
| 465 | Password Reset | Regression | Employee A password restored to the original | Employee A | 200 | HTTP 200 | PASS |
| 466 | API | Health | FIX BUG-021: /health performs a real DB probe | Anonymous | 200 after querying the pool | HTTP 200 db=Connected | PASS |
| 467 | Error Handling | 404 | Unknown route returns JSON 404 | Anonymous | 404 JSON | HTTP 404 Route Not Found | PASS |
| 468 | Security | Information disclosure | FIX BUG-022: 404 no longer reflects the raw request URL | Anonymous | no reflection | Route Not Found | PASS |
| 469 | Error Handling | Wrong HTTP method | PUT on a POST-only route | Anonymous | 404 | HTTP 404 | PASS |
| 470 | Security | Error leakage | Error body must not contain stack trace / SQL / credentials | Manager | generic message only | HTTP 400 body={"success":false,"message":"Invalid Customer Id"} | PASS |
| 471 | Security | SQL injection | SQLi payload stored as literal text | Manager | 201 | HTTP 201 | PASS |
| 472 | Security | SQL injection | customers table intact after SQLi payload | Manager | 200 | HTTP 200 count=2 | PASS |
| 473 | Security | Prototype pollution | Register with __proto__ in the body | Public | no crash | HTTP 201 | PASS |
| 474 | Security | Large payload | 2MB JSON body to /auth/login | Anonymous | 413 or 400 | HTTP 413 | PASS |
| 475 | Security | Brute-force protection | FIX BUG-025: 15 consecutive failed logins are throttled | Attacker | 429 after the attempt limit | statuses=[401,429] 429s=7 | PASS |
| 476 | Security | Brute-force protection | Correct password is ALSO blocked while throttled (no bypass) | Attacker | 429 | HTTP 429 | PASS |
| 477 | Security | Brute-force protection | REGRESSION: throttling one account does not lock out other users | Manager | 200 | HTTP 200 | PASS |
| 478 | Security | Brute-force protection | REGRESSION: 3 mistyped passwords then the right one still logs in | User | 200 | HTTP 200 | PASS |
| 479 | Security | Brute-force protection | REGRESSION: a successful login resets the failure counter | User | 200 (6 failures < limit after reset) | HTTP 200 | PASS |
| 480 | Security | Availability | Server still responsive after all abuse cases | Anonymous | 200 | HTTP 200 | PASS |
| 481 | End-to-End | Workflow 1 | Register -> Login -> Dashboard -> Profile (unassigned user) | New user | reg 201, login ok, dashboard 403, profile 200 | reg=201 login=true dash=403 profile=200 | PASS |
| 482 | End-to-End | Workflow 2 | Admin -> Company -> register User -> assign Manager -> login -> Manager dashboard | Admin/Manager | all steps succeed | company=201 register=201 role=200 dashRole=Manager | PASS |
| 483 | End-to-End | Workflow 3 | Manager: Customer -> Task -> Assign TL | TL: Split | Employee: Start -> Report | Manager: VIEW report | TL: Approve | Multi | every step succeeds, Manager sees the report, task Completed | cust=201 task=201 assign=201 split=201 start=200 report=201 managerSawReport=true review=200 split=Completed | PASS |
| 484 | End-to-End | Workflow 5 | FIX BUG-029: all child split tasks complete -> parent task Completed | Manager | Completed | parent task=Completed assignment=Completed | PASS |
| 485 | End-to-End | Workflow 3 | FIX BUG-013: task dates survive the whole lifecycle unshifted | Manager | 2026-11-01 / 2026-11-30 | start="2026-11-01" due="2026-11-30" | PASS |
| 486 | End-to-End | Workflow 4 | Team Lead forwards a split task from Employee to Intern | Team Lead | 200; Intern gains it, Employee loses it | update=200 internSees=true employeeLost=true | PASS |
| 487 | End-to-End | Workflow 5 | FIX BUG-029: adding a new split task re-opens the completed parent | Manager | not Completed | parent task=In Progress | PASS |
| 488 | End-to-End | Workflow 6 | Change password -> old fails -> new works | User | 200 / 401 / 200 | change=200 old=401 new=200 | PASS |
| 489 | End-to-End | Workflow 7 | Profile -> Update -> re-read -> persisted | User | last_name persisted | update=200 last_name=Persisted | PASS |
| 490 | Company Isolation | Cross-company denial | Company B token -> Company A Customer details | Company B | 403 or 404 | HTTP 403 You can access only your company customers | PASS |
| 491 | Company Isolation | Cross-company denial | Company B token -> Company A Customer update | Company B | 403 or 404 | HTTP 403 You can update only your company customers | PASS |
| 492 | Company Isolation | Cross-company denial | Company B token -> Company A Customer delete | Company B | 403 or 404 | HTTP 403 You can delete only your company customers | PASS |
| 493 | Company Isolation | Cross-company denial | Company B token -> Company A Task details | Company B | 403 or 404 | HTTP 403 You can access only your company tasks | PASS |
| 494 | Company Isolation | Cross-company denial | Company B token -> Company A Task update | Company B | 403 or 404 | HTTP 403 You can update only your company tasks | PASS |
| 495 | Company Isolation | Cross-company denial | Company B token -> Company A Task delete | Company B | 403 or 404 | HTTP 403 You can delete only your company tasks | PASS |
| 496 | Company Isolation | Cross-company denial | Company B token -> Company A Assigned workers | Company B | 403 or 404 | HTTP 403 You can access only your company tasks | PASS |
| 497 | Company Isolation | Cross-company denial | Company B token -> Company A Assignment status | Company B | 403 or 404 | HTTP 403 You can update only your company assignments | PASS |
| 498 | Company Isolation | Cross-company denial | Company B token -> Company A Split list | Company B | 403 or 404 | HTTP 403 You can access only your assigned tasks | PASS |
| 499 | Company Isolation | Cross-company denial | Company B token -> Company A Split update | Company B | 403 or 404 | HTTP 403 You can update only your split tasks | PASS |
| 500 | Company Isolation | Cross-company denial | Company B token -> Company A Split status | Company B | 403 or 404 | HTTP 403 You can update only your assigned split tasks | PASS |
| 501 | Company Isolation | Cross-company denial | Company B token -> Company A Worker task details | Company B | 403 or 404 | HTTP 404 Task Not Found | PASS |
| 502 | Company Isolation | Cross-company denial | Company B token -> Company A Worker start task | Company B | 403 or 404 | HTTP 403 You can start only your assigned tasks | PASS |
| 503 | Company Isolation | Cross-company denial | Company B token -> Company A Report submit | Company B | 403 or 404 | HTTP 403 You can report only your assigned tasks | PASS |
| 504 | Company Isolation | Cross-company denial | Company B token -> Company A Lead details | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 505 | Company Isolation | Cross-company denial | Company B token -> Company A Lead update | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 506 | Company Isolation | Cross-company denial | Company B token -> Company A Lead delete | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 507 | Company Isolation | Cross-company denial | Company B token -> Company A Lead status | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 508 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting details | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 509 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting update | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 510 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting delete | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 511 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting complete | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 512 | Company Isolation | Cross-company denial | Company B token -> Company A Report details (TL B) | Company B | 403 or 404 | HTTP 404 Report Not Found | PASS |
| 513 | Company Isolation | Cross-company denial | Company B token -> Company A Report details (Manager B) | Company B | 403 or 404 | HTTP 404 Report Not Found | PASS |
| 514 | Company Isolation | Cross-company denial | Company B token -> Company A Report review (TL B) | Company B | 403 or 404 | HTTP 403 You can review only your team reports | PASS |
| 515 | Company Isolation | Cross-company denial | Company B token -> Company A Report attachment (Employee B) | Company B | 403 or 404 | HTTP 404 Attachment Not Found | PASS |
| 516 | Company Isolation | Cross-company denial | Company B token -> Company A Employee report details (Employee B) | Company B | 403 or 404 | HTTP 404 Report Not Found | PASS |
| 517 | Company Isolation | Summary | Cross-company denial across 27 endpoints | Company B | 27/27 denied | 27/27 denied | PASS |
| 518 | Data Integrity | Dashboard vs list | Manager dashboard customer count matches /customer/list | Manager | equal | dashboard=3 list=3 | PASS |
| 519 | Data Integrity | Dashboard vs list | Manager dashboard task count matches /task/list | Manager | equal | dashboard=7 list=7 | PASS |
| 520 | Data Integrity | Dashboard vs list | Admin dashboard customer count matches admin-list | Admin | equal | dashboard=5 adminList=5 | PASS |
| 521 | Data Integrity | Soft delete | Soft-deleted customer disappears from details and list | Manager | 404 + absent | details=404 inList=false | PASS |
| 522 | Data Integrity | Soft delete | A soft-deleted customer's phone can be reused | Manager | 201 | HTTP 201 Customer Created Successfully | PASS |
| 523 | UI | Login form | FIX BUG-016: login page now has a <form> and Login is type=submit | Public | form element present, button type submit | hasForm=true; buttons=[eye:button, Login:submit] | PASS |
| 524 | UI | Login form | FIX BUG-016: submitting the form (the Enter-key path) logs in | Admin | navigates to /admin/dashboard | form.requestSubmit() -> url=/admin/dashboard, role=Admin | PASS |
| 525 | UI | Login | Login page renders | Public | fields + Login + Register + Forgot password | all present | PASS |
| 526 | UI | Admin Dashboard | Admin dashboard loads with live counts | Admin | cards + per-company breakdown | Companies 3, Users 21, Customers 6, Tasks 8, per-company table rendered | PASS |
| 527 | UI | Admin Companies | Company Management page lists companies | Admin | table + Add/Edit/Delete | 3 companies listed with actions | PASS |
| 528 | UI | Admin Pending Users | Pending Users page lists unassigned users | Admin | table with Assign action | 10 pending users listed | PASS |
| 529 | UI | Admin Pending Users | FIX BUG-002: no invalid phone data reaches the Admin UI any more | Admin | every phone exactly 10 digits, no blank names | all rows show valid 10-digit phones; the old 'abcdefghij' / '12345' / '123456789012345' / '-123456789' / blank-name rows can no longer be created | PASS |
| 530 | UI | Security | Stored XSS payload renders as inert text | Admin | escaped, not executed | <script>alert(1)</script> shown literally, no execution | PASS |
| 531 | UI | Manager Dashboard | Manager dashboard loads, company scoped | Manager | cards + breakdowns | Customers 4, Leads 1, Tasks 7 - all Company A only | PASS |
| 532 | UI | Manager Dashboard | FIX: 'Team Members' card matches the Team Composition breakdown | Manager | card == TL + Employee + Intern | Team Members 4 == 1 + 2 + 1 | PASS |
| 533 | UI | Manager Dashboard | FIX BUG-029: dashboard now shows completed work | Manager | non-zero Completed | Tasks by Status: Pending 5, In Progress 1, Completed 1 | PASS |
| 534 | UI | Manager Tasks | FIX BUG-013: due dates render as formatted local dates, correct day | Manager | 11/30/2026 and 9/30/2026 | displayed 11/30/2026 (stored 2026-11-30) and 9/30/2026 (stored 2026-09-30); previously '2026-08-31T18:30:00.000Z' | PASS |
| 535 | UI | Manager Tasks | FIX BUG-011: no invalid priority in the task table | Manager | only Low/Medium/High/Urgent | no SUPER_URGENT row; all four valid priorities render | PASS |
| 536 | UI | Manager Tasks | FIX BUG-029: parent task status reflects its split tasks | Manager | Completed / In Progress shown | 'Alpha Main Task v2' = Completed, 'Reg Task' = In Progress | PASS |
| 537 | UI | Manager Leads | FIX BUG-018: lead status filter added | Manager | filter control present | dropdown: Active Pipeline / All Leads / Pending / Meeting Scheduled / Future Business / Converted / Closed | PASS |
| 538 | UI | Manager Leads | FIX BUG-018: a Converted lead is reachable again via 'All Leads' | Manager | Converted lead listed | 'Alpha Lead One' (Converted) appears when the filter is set to All | PASS |
| 539 | UI | Manager Leads | FIX BUG-015: Requirement column shows a stored value | Manager | value displayed | column shows UPDATED-REQUIREMENT-456 | PASS |
| 540 | UI | Manager Leads | FIX BUG-015: full round trip - type Requirement, save, redisplay | Manager | value persists UI -> API -> DB -> UI | typed UI-CANARY-REQUIREMENT-789 -> shown in table -> confirmed in leads.requirement in the database | PASS |
| 541 | UI | Manager Meetings | FIX BUG-019: meeting lead dropdown excludes ineligible leads | Manager | Converted lead not offered | dropdown = [Select Lead, UI Requirement Lead]; the Converted 'Alpha Lead One' is excluded | PASS |
| 542 | UI | Manager Meetings | FIX BUG-017: lead list refreshes after a meeting is created | Manager | lead shows 'Meeting Scheduled' immediately | row updated to Meeting Scheduled without a manual reload | PASS |
| 543 | UI | Manager Meetings | FIX BUG-013: meeting dates render correctly | Manager | 10/15/2026 and 10/18/2026 | displayed 10/15/2026 (stored 2026-10-15) and 10/18/2026 (stored 2026-10-18); previously '2026-10-14T18:30:00.000Z' | PASS |
| 544 | UI | Manager Meetings | Create meeting through the UI | Manager | meeting saved | 'UI Discovery Call' created and listed as Scheduled | PASS |
| 545 | UI | Manager Reports | FIX BUG-014: new Manager Reports page exists and loads | Manager | reports visible to the Manager | 6 reports listed with summary cards (Total 6, Awaiting 0, Approved 3, Rework 3) | PASS |
| 546 | UI | Manager Reports | FIX BUG-014: report detail modal shows the submitted work | Manager | report text visible | modal shows task, parent task, status, submitted-at and the full report text | PASS |
| 547 | UI | Manager Reports | Manager report view is read-only (no permission creep) | Manager | no Approve/Rework controls | no review buttons present; note states review is the Team Lead's | PASS |
| 548 | UI | Navigation | Manager sidebar links to the new Reports page | Manager | link present | /manager/reports reachable from the sidebar | PASS |
| 549 | UI | Team Lead pages | REGRESSION: /teamleader/dashboard loads without error | Team Lead | page renders, no error text | rendered, no Internal Server Error | PASS |
| 550 | UI | Team Lead pages | REGRESSION: /teamleader/task loads without error | Team Lead | page renders, no error text | rendered, no Internal Server Error | PASS |
| 551 | UI | Team Lead pages | REGRESSION: /teamleader/workers loads without error | Team Lead | page renders, no error text | rendered, no Internal Server Error | PASS |
| 552 | UI | Team Lead pages | REGRESSION: /teamleader/report loads without error | Team Lead | page renders, no error text | rendered, no Internal Server Error | PASS |
| 553 | UI | Team Lead pages | REGRESSION: /teamleader/profile loads without error | Team Lead | page renders, no error text | rendered, no Internal Server Error | PASS |
| 554 | UI | Employee pages | REGRESSION: /employee/dashboard loads without error | Employee | page renders, no error text | rendered, no Internal Server Error | PASS |
| 555 | UI | Employee pages | REGRESSION: /employee/task loads without error | Employee | page renders, no error text | rendered, no Internal Server Error | PASS |
| 556 | UI | Employee pages | REGRESSION: /employee/report loads without error | Employee | page renders, no error text | rendered, no Internal Server Error | PASS |
| 557 | UI | Employee pages | REGRESSION: /employee/profile loads without error | Employee | page renders, no error text | rendered, no Internal Server Error | PASS |
| 558 | UI | Intern pages | REGRESSION: /intern/dashboard loads without error | Intern | page renders, no error text | rendered, no Internal Server Error | PASS |
| 559 | UI | Intern pages | REGRESSION: /intern/task loads without error | Intern | page renders, no error text | rendered, no Internal Server Error | PASS |
| 560 | UI | Intern pages | REGRESSION: /intern/report loads without error | Intern | page renders, no error text | rendered, no Internal Server Error | PASS |
| 561 | UI | Intern pages | REGRESSION: /intern/profile loads without error | Intern | page renders, no error text | rendered, no Internal Server Error | PASS |
| 562 | UI | Routing | REGRESSION: Intern is bounced from /admin/dashboard | Intern | redirect to own dashboard | -> /intern/dashboard | PASS |
| 563 | UI | Routing | REGRESSION: Intern is bounced from /manager/reports | Intern | redirect to own dashboard | -> /intern/dashboard | PASS |
| 564 | UI | Routing | REGRESSION: Intern is bounced from /teamleader/task | Intern | redirect to own dashboard | -> /intern/dashboard | PASS |
| 565 | UI | Routing | FIX BUG-020: unknown route while signed in goes to the user's dashboard | Intern | own dashboard, not /login | /totally/unknown/route -> /intern/dashboard | PASS |
| 566 | UI | Routing | FIX BUG-020: '/' while signed in goes to the user's dashboard | Intern | own dashboard | / -> /intern/dashboard | PASS |
| 567 | UI | Routing | REGRESSION: unknown route while signed out goes to /login | Anonymous | /login | -> /login | PASS |
| 568 | UI | Routing | REGRESSION: protected page while signed out goes to /login | Anonymous | /login | /admin/dashboard -> /login | PASS |
| 569 | UI | Console | No JavaScript or React errors in the browser console | All | zero errors | read_console_messages(onlyErrors) returned no logs across the whole sweep | PASS |
| 570 | UI | Console | No failed network requests during normal use | All | no 4xx/5xx on happy paths | only deliberate negative-test responses appeared | PASS |
