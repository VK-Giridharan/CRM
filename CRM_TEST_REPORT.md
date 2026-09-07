# CRM A-Z COMPLETE TEST REPORT

> **Scope of this document:** a full black-box + grey-box QA pass over the Enterprise CRM.
> **No application code, configuration, schema or UI was modified at any point.** The git
> working tree was clean before and after testing (`725c99c`, `git status` empty).

---

## 1. Test Environment

| Item | Value |
|---|---|
| **Project** | `D:\CRM` — "Enterprise CRM" (Prodigit CRM) |
| **Frontend** | React 19 + Vite 8.1.5 + Tailwind CSS 4, React Router 7, axios 1.19 |
| **Backend** | Node.js v24.15.0, Express 5, CommonJS, raw `pg` Pool (no ORM) |
| **Database** | PostgreSQL 18.4 (x86_64-windows), database `enterprise_crm` |
| **OS / Shell** | Windows 11 Home Single Language 10.0.26200 |
| **Browser** | Chromium (in-app browser pane), viewport 1280x720 |
| **Date** | 2026-08-29 |
| **Git commit** | `725c99c` — "Complete CRM Project" (working tree clean, before and after) |
| **Backend under test** | `node server.js` (a second, isolated instance on port 5099) |
| **Frontend under test** | `vite --port 5199` with `VITE_API_URL` pointed at the isolated backend |

### 1.1 Test isolation strategy (important)

The live `enterprise_crm` database contains **real user data** (3 real users, 1 real company).
A previous session's migration file (`999_cleanup_accidental_test_data.sql`) documents that an
earlier agent accidentally wrote test data into that live database.

To make destructive CRUD testing possible **without touching any real data**, testing was
performed against a throwaway database, `enterprise_crm_qa`, created as an **exact structural
clone** of the live schema (`pg_dump --schema-only`, a read-only operation against live). The
application binaries, source code and `.env` were used unmodified; only `PORT` and `DB_NAME`
were supplied as launch-time environment variables (dotenv does not override pre-set env vars,
so **no file was edited**).

Consequences and honesty notes:

* The sandbox reproduced the live schema **exactly, including its defects** — see BUG-001.
* Because the clone was faithful, every result below is valid for the live deployment.
* Mid-run, migration `001` was applied **to the sandbox only**, to separate "broken code" from
  "unapplied migration". Those re-tests are explicitly labelled.
* **The live database was never written to.** Verified before and after: 1 company, 3 users,
  0 customers/leads/meetings/tasks/assignments/split_tasks/task_reports — byte-identical.
* The user's own running instances (backend :5000, vite :5173) were left running and untouched.
* Two test files created in `Backend/uploads/` during upload testing were removed afterwards;
  the directory is back to just `.gitkeep`.
* The sandbox database was dropped at the end of the run.

---

## 2. Overall Result

| Metric | Count |
|---|---:|
| **Total Tests** | **473** |
| **PASS** | **409** |
| **FAIL** | **48** |
| **BLOCKED** | **15** |
| **NOT TESTED** | **1** |
| **NOT APPLICABLE** | 0 |

**Pass Percentage: 86.5 %** (409 / 473)

**Overall Status: NOT READY**

The single decisive reason is **BUG-001**: database migration `001` has never been applied to
the live database, so the entire **Task Report module — the core business workflow of this CRM —
returns HTTP 500 on every call in the live deployment.** Employees and Interns cannot open a
task, cannot submit a report; Team Leads cannot list or review anything.

The good news, established by direct experiment: **the report code itself is correct.** After
applying migration 001 to the sandbox, all 47 re-tests of that module passed. This is a
deployment gap, not a rewrite.

---

## 3. Complete Feature Test Matrix

Every one of the 473 executed tests, in execution order.

| # | Module | Feature | Test | Role | Expected | Actual | Status |
|---|---|---|---|---|---|---|---|
| 1 | Registration | Register | Valid registration (all fields) | Public | 201 created | 201 User Registered Successfully | PASS |
| 2 | Registration | Register | New user created with NO role (awaits promotion) | Public | response carries no role/company_id | role field present: false | PASS |
| 3 | Registration | Register | Bulk register 10 test accounts | Public | 10 x 201 | 10/10 created | PASS |
| 4 | Registration | Register validation | Missing first_name | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 5 | Registration | Register validation | Missing last_name (optional field) | Public | HTTP 201 | HTTP 201 User Registered Successfully | PASS |
| 6 | Registration | Register validation | Missing email | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 7 | Registration | Register validation | Invalid email format | Public | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 8 | Registration | Register validation | Missing phone | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 9 | Registration | Register validation | Phone below 10 digits | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 10 | Registration | Register validation | Phone above 10 digits | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 11 | Registration | Register validation | Non-numeric phone | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 12 | Registration | Register validation | Missing password | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 13 | Registration | Register validation | Weak password (7 chars) | Public | HTTP 400 | HTTP 400 Password must be at least 8 characters | PASS |
| 14 | Registration | Register validation | Password with no complexity (12345678) | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 15 | Registration | Register validation | Duplicate email | Public | HTTP 400 | HTTP 400 Email already exists | PASS |
| 16 | Registration | Register validation | Duplicate phone | Public | HTTP 400 | HTTP 400 Phone number already exists | PASS |
| 17 | Registration | Register validation | Duplicate email, different case | Public | HTTP 400 | HTTP 400 Email already exists | PASS |
| 18 | Registration | Register validation | Empty request body {} | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 19 | Registration | Register validation | Whitespace-only first_name | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 20 | Registration | Register validation | SQL injection in email | Public | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 21 | Registration | Register validation | XSS payload stored in first_name | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 22 | Registration | Register validation | Leading/trailing spaces in email | Public | HTTP 201 | HTTP 201 User Registered Successfully | PASS |
| 23 | Registration | Register validation | Negative-number phone | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 24 | Registration | Register validation | null first_name | Public | HTTP 400 | HTTP 400 All required fields are mandatory | PASS |
| 25 | Registration | Register validation | Numeric first_name (wrong type) | Public | HTTP 400 | HTTP 201 User Registered Successfully | FAIL |
| 26 | Security | Mass assignment | Register with role:'Admin' + company_id in body (privilege escalation attempt) | Public | 201 but role IGNORED | HTTP 201; response exposes role: false | PASS |
| 27 | Validation | Input size | 50k-char first_name (no max-length validation) | Public | 400 rejected by length validation | HTTP 500 Internal Server Error | FAIL |
| 28 | Error Handling | Malformed request | Malformed JSON body | Public | 400, no stack trace leaked | HTTP 400 Expected property name or '}' in JSON at position 1 (line 1 column 2) | PASS |
| 29 | Login | Login | Valid login by email | Public | 200 + JWT | HTTP 200 token=true | PASS |
| 30 | Login | Login | Valid login by phone number | Public | 200 + JWT | HTTP 200 token=true | PASS |
| 31 | Login | Login | Login email is case-insensitive | Public | 200 | HTTP 200 | PASS |
| 32 | Login | Login validation / injection | Wrong password | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 33 | Login | Login validation / injection | Non-existing account | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 34 | Login | Login validation / injection | Empty identifier | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 35 | Login | Login validation / injection | Empty password | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 36 | Login | Login validation / injection | Both fields empty | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 37 | Login | Login validation / injection | Missing body {} | Public | HTTP 400 | HTTP 400 Email/Phone and Password are required | PASS |
| 38 | Login | Login validation / injection | SQLi: ' OR '1'='1 | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 39 | Login | Login validation / injection | SQLi: DROP TABLE attempt | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 40 | Login | Login validation / injection | SQLi in password field | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 41 | Login | Login validation / injection | Type confusion: password as array | Public | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 42 | Login | Login validation / injection | Type confusion: identifier as object | Public | HTTP 401 | HTTP 401 Invalid Credentials | PASS |
| 43 | Security | User enumeration | Wrong-password vs unknown-account response identical | Public | identical status + message | 401:Invalid Credentials vs 401:Invalid Credentials | PASS |
| 44 | Security | Data exposure | Login response must not contain password hash | Public | no password field | password field present: false | PASS |
| 45 | Authentication | First-Admin bootstrap | Fresh DB: role=NULL user tries to promote someone (only path to create first Admin) | role=NULL | 403 - proving no API path exists to create the first Admin | HTTP 403 You are not authorized to perform this action | PASS |
| 46 | Authorization | requireRole | role=NULL user calls POST /company/create | role=NULL | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 47 | Dashboard | Unassigned user | role=NULL user requests dashboard | role=NULL | 403 awaiting role assignment | HTTP 403 Your account is awaiting role assignment | PASS |
| 48 | Admin | Login | Admin login after role assignment | Admin | 200 + token with role=Admin | token=true | PASS |
| 49 | Admin | GET /auth/me | Admin fetches own profile | Admin | 200, role=Admin, no password | HTTP 200 role=Admin pwLeak=false | PASS |
| 50 | Company | Create | Admin creates Company A | Admin | 201 | HTTP 201 Company Created Successfully | PASS |
| 51 | Company | Create | Admin creates Company B | Admin | 201 | HTTP 201 | PASS |
| 52 | Company | Create validation | Missing company_name | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 53 | Company | Create validation | Missing company_code | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 54 | Company | Create validation | Empty body {} | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 55 | Company | Create validation | Duplicate company_code | Admin | HTTP 400 | HTTP 400 Company already exists | PASS |
| 56 | Company | Create validation | Duplicate company_name | Admin | HTTP 400 | HTTP 400 Company already exists | PASS |
| 57 | Company | Create validation | Duplicate code, different case | Admin | HTTP 400 | HTTP 400 Company already exists | PASS |
| 58 | Company | Create validation | Whitespace-only name | Admin | HTTP 400 | HTTP 400 Company Name and Company Code are required | PASS |
| 59 | Company | List | Admin lists all companies | Admin | 200, >=2 companies | HTTP 200 count=2 | PASS |
| 60 | Company | Details | Admin reads Company A details | Admin | 200 | HTTP 200 name=QA Alpha Corp | PASS |
| 61 | Company | Details validation | Details with no id | Admin | 400 | HTTP 400 Company Id is required | PASS |
| 62 | Company | Details validation | Details with non-existing id 999999 | Admin | 404 | HTTP 404 Company Not Found | PASS |
| 63 | Company | Details validation | Details with non-numeric id 'abc' | Admin | 400 (not 500) | HTTP 500 Internal Server Error | FAIL |
| 64 | Company | Update | Admin updates Company B city | Admin | 200 + only city changed | HTTP 200 name=QA Beta Ltd city=Coimbatore | PASS |
| 65 | Company | Update validation | Update Company B to a code already used by A | Admin | 400 | HTTP 400 Another company already uses that name or code | PASS |
| 66 | Company | Update validation | Update non-existing company | Admin | 404 | HTTP 404 | PASS |
| 67 | Company | Delete | Admin deletes an empty company | Admin | 200 | HTTP 200 Company Deleted Successfully | PASS |
| 68 | Company | Delete | Delete same company twice | Admin | 404 | HTTP 404 Company Not Found | PASS |
| 69 | Admin | Pending users | Admin lists pending (role=NULL) users | Admin | 200 + list | HTTP 200 count=20 | PASS |
| 70 | Admin | Change role | Admin promotes user to Manager of Company A | Admin | 200 | HTTP 200 Manager Assigned Successfully | PASS |
| 71 | Admin | Change role | Admin promotes user to Manager of Company B | Admin | 200 | HTTP 200 | PASS |
| 72 | Admin | Change role validation | Admin assigns 'Employee' (only Manager allowed) | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 73 | Admin | Change role validation | Admin assigns 'Admin' role | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 74 | Admin | Change role validation | Admin assigns 'Team Lead' | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 75 | Admin | Change role validation | Admin assigns invalid role string | Admin | HTTP 400 | HTTP 400 Admin can assign only Manager role | PASS |
| 76 | Admin | Change role validation | Manager role without company_id | Admin | HTTP 400 | HTTP 400 Company is required | PASS |
| 77 | Admin | Change role validation | Manager role with non-existing company | Admin | HTTP 404 | HTTP 404 Company Not Found | PASS |
| 78 | Admin | Change role validation | Missing user_id | Admin | HTTP 400 | HTTP 400 User Id and Role are required | PASS |
| 79 | Admin | Change role validation | Missing role | Admin | HTTP 400 | HTTP 400 User Id and Role are required | PASS |
| 80 | Admin | Change role validation | Non-existing target user | Admin | HTTP 404 | HTTP 404 Target User Not Found | PASS |
| 81 | Admin | Change role validation | Admin changes own role (self) | Admin | HTTP 400 | HTTP 400 You cannot change your own role | PASS |
| 82 | Admin | Change role validation | Empty body {} | Admin | HTTP 400 | HTTP 400 User Id and Role are required | PASS |
| 83 | Manager | Login | Manager A login after promotion | Manager | token | token=true | PASS |
| 84 | Manager | Change role | Manager A assigns Team Lead to tlA | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 85 | Manager | Change role | Manager A assigns Employee to empA | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 86 | Manager | Change role | Manager A assigns Intern to intA | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 87 | Manager | Change role | Manager B assigns Team Lead to tlB | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 88 | Manager | Change role | Manager B assigns Employee to empB | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 89 | Manager | Change role | Manager B assigns Intern to intB | Manager | 200 | HTTP 200 Role Assigned Successfully | PASS |
| 90 | Authorization | Manager role limits | Manager tries to grant 'Manager' | Manager | HTTP 400 | HTTP 400 Invalid Role | PASS |
| 91 | Authorization | Manager role limits | Manager tries to grant 'Admin' | Manager | HTTP 400 | HTTP 400 Invalid Role | PASS |
| 92 | Authorization | Manager role limits | Manager A tries to demote the Admin | Manager | HTTP 403 | HTTP 403 You cannot change this user's role | PASS |
| 93 | Authorization | Manager role limits | Manager A tries to change Manager B's role | Manager | HTTP 403 | HTTP 403 You can manage only users in your own company | PASS |
| 94 | Authorization | Manager role limits | Manager A tries to steal Company B's Team Lead | Manager | HTTP 403 | HTTP 403 You can manage only users in your own company | PASS |
| 95 | Authorization | Manager role limits | Manager A changes own role | Manager | HTTP 400 | HTTP 400 You cannot change your own role | PASS |
| 96 | Security | Company isolation | Manager A grants role with company_id=B in body (tenant injection) | Manager | 200 but user lands in Company A, NOT B | HTTP 200 Role Assigned Successfully (DB verified separately) | PASS |
| 97 | Customers | Create | Manager A creates customer | Manager | 201 | HTTP 201 Customer Created Successfully | PASS |
| 98 | Customers | Create | Manager B creates customer | Manager | 201 | HTTP 201 | PASS |
| 99 | Customers | Create validation/authz | Missing customer_name | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 100 | Customers | Create validation/authz | Missing phone | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 101 | Customers | Create validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 102 | Customers | Create validation/authz | Whitespace-only name | - | HTTP 400 | HTTP 400 Customer Name and Phone are required | PASS |
| 103 | Customers | Create validation/authz | Invalid email format accepted? | - | HTTP 400 | HTTP 201 Customer Created Successfully | FAIL |
| 104 | Customers | Create validation/authz | Phone with letters accepted? | - | HTTP 400 | HTTP 201 Customer Created Successfully | FAIL |
| 105 | Customers | Create validation/authz | Phone 25 digits accepted? | - | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 106 | Customers | Create validation/authz | Duplicate customer (same name+phone) | - | HTTP 400 | HTTP 201 Customer Created Successfully | FAIL |
| 107 | Customers | Create validation/authz | Team Lead tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 108 | Customers | Create validation/authz | Employee tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 109 | Customers | Create validation/authz | Intern tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 110 | Customers | Create validation/authz | Admin tries to create customer | - | HTTP 403 | HTTP 403 Only Manager can create customers | PASS |
| 111 | Customers | List scoping | Manager A lists customers -> expects only Company A | Manager A | only Company A | HTTP 200 count=4 companies=[1] | PASS |
| 112 | Customers | List scoping | Manager B lists customers -> expects only Company B | Manager B | only Company B | HTTP 200 count=1 companies=[2] | PASS |
| 113 | Customers | List scoping | Team Lead A lists customers -> expects only Company A | Team Lead A | only Company A | HTTP 200 count=4 companies=[1] | PASS |
| 114 | Customers | List scoping | Employee A lists customers -> expects only Company A | Employee A | only Company A | HTTP 200 count=4 companies=[1] | PASS |
| 115 | Customers | List scoping | Intern A lists customers -> expects only Company A | Intern A | only Company A | HTTP 200 count=4 companies=[1] | PASS |
| 116 | Customers | List scoping | Admin lists customers -> expects all companies | Admin | all companies | HTTP 200 count=5 companies=[1,2] | PASS |
| 117 | Customers | Admin global list | Admin cross-company customer list | Admin | 200 + both companies | HTTP 200 count=5 companies=2 | PASS |
| 118 | Authorization | Admin-only endpoint | Manager calls /customer/admin-list | Manager | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 119 | Authorization | Admin-only endpoint | Team Lead calls /customer/admin-list | Team Lead | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 120 | Authorization | Admin-only endpoint | Employee calls /customer/admin-list | Employee | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 121 | Authorization | Admin-only endpoint | Intern calls /customer/admin-list | Intern | 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 122 | Company Isolation | Customer IDOR | Manager B reads Company A customer by id | Manager B | 403 | HTTP 403 You can access only your company customers | PASS |
| 123 | Company Isolation | Customer IDOR | Manager B updates Company A customer | Manager B | 403 | HTTP 403 You can update only your company customers | PASS |
| 124 | Company Isolation | Customer IDOR | Manager B deletes Company A customer | Manager B | 403 | HTTP 403 You can delete only your company customers | PASS |
| 125 | Authorization | Customer update role check | Employee (same company) updates a customer | Employee | 403 - only Manager should edit customers | HTTP 200 Customer Updated Successfully | FAIL |
| 126 | Authorization | Customer update role check | Intern (same company) updates a customer | Intern | 403 | HTTP 200 Customer Updated Successfully | FAIL |
| 127 | Authorization | Customer delete role check | Intern (same company) deletes a customer | Intern | 403 | HTTP 200 Customer Deleted Successfully | FAIL |
| 128 | Authorization | Customer read | Intern reads own-company customer details | Intern | 200 (read allowed) or 403 | HTTP 404 | FAIL |
| 129 | Customers | Recovery | Re-create Company A customer after unauthorised delete | Manager | 201 | HTTP 201 newId=6 | PASS |
| 130 | Customers | Update + persistence | Manager updates customer, re-reads to confirm persisted | Manager | name+city persisted | upd=true name=Alpha Customer Updated city=Salem | PASS |
| 131 | Customers | Partial update | Update with only name+id: are unrelated fields wiped? | Manager | city preserved | city now = null | FAIL |
| 132 | Customers | Details validation | Non-existing customer id | Manager | 404 | HTTP 404 | PASS |
| 133 | Customers | Details validation | Non-numeric customer id 'abc' | Manager | 400 not 500 | HTTP 500 Internal Server Error | FAIL |
| 134 | Customers | Details validation | Missing customer_id | Manager | 400 | HTTP 400 | PASS |
| 135 | Leads | Create | Manager A creates lead | Manager | 201 | HTTP 201 Lead Created Successfully | PASS |
| 136 | Leads | Create | Manager B creates lead | Manager | 201 | HTTP 201 | PASS |
| 137 | Leads | Create validation/authz | Missing lead_name | - | HTTP 400 | HTTP 400 Lead Name and Phone Number are Required | PASS |
| 138 | Leads | Create validation/authz | Missing phone | - | HTTP 400 | HTTP 400 Lead Name and Phone Number are Required | PASS |
| 139 | Leads | Create validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Lead Name and Phone Number are Required | PASS |
| 140 | Leads | Create validation/authz | Duplicate phone within own company | - | HTTP 400 | HTTP 400 Phone Number Already Exists | PASS |
| 141 | Leads | Create validation/authz | Duplicate email within own company | - | HTTP 400 | HTTP 400 Email Already Exists | PASS |
| 142 | Leads | Create validation/authz | Team Lead creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 143 | Leads | Create validation/authz | Employee creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 144 | Leads | Create validation/authz | Intern creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 145 | Leads | Create validation/authz | Admin creates lead | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 146 | Company Isolation | Lead duplicate check leaks across tenants | Manager B creates lead with a phone that exists ONLY in Company A | Manager B | 201 (A's data must not affect B) | HTTP 400 Phone Number Already Exists | FAIL |
| 147 | Company Isolation | Lead duplicate check leaks across tenants | Manager B creates lead with an email that exists ONLY in Company A | Manager B | 201 | HTTP 400 Email Already Exists | FAIL |
| 148 | Leads | List | Manager A lists leads (company scoped) | Manager | 200, only own company | HTTP 200 count=1 | PASS |
| 149 | Company Isolation | Lead IDOR | Manager B reads Company A lead by id | Manager B | 404/403 | HTTP 404 Lead Not Found | PASS |
| 150 | Company Isolation | Lead IDOR | Manager B updates Company A lead | Manager B | 404/403 | HTTP 404 Lead Not Found | PASS |
| 151 | Company Isolation | Lead IDOR | Manager B deletes Company A lead | Manager B | 404/403 | HTTP 404 Lead Not Found | PASS |
| 152 | Leads | Status | Manager updates lead status to valid value | Manager | 200 | HTTP 200 status=Future Business | PASS |
| 153 | Leads | Status validation | Invalid lead status rejected | Manager | 400 | HTTP 400 Invalid Lead Status | PASS |
| 154 | Meetings | Create | Manager A creates meeting for own lead | Manager | 201 | HTTP 201 Meeting Created Successfully | PASS |
| 155 | Meetings | Business logic | Creating a meeting flips lead status to 'Meeting Scheduled' | Manager | Meeting Scheduled | lead status = Meeting Scheduled | PASS |
| 156 | Meetings | Create validation/authz | Missing lead_id | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 157 | Meetings | Create validation/authz | Missing title | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 158 | Meetings | Create validation/authz | Missing date | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 159 | Meetings | Create validation/authz | Missing time | - | HTTP 400 | HTTP 400 Lead, Title, Date and Time are Required | PASS |
| 160 | Meetings | Create validation/authz | Invalid date '2026-13-45' | - | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 161 | Meetings | Create validation/authz | Invalid date 'notadate' | - | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 162 | Meetings | Create validation/authz | Invalid time '99:99' | - | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 163 | Meetings | Create validation/authz | Past date (2020-01-01) allowed? | - | HTTP 400 | HTTP 201 Meeting Created Successfully | FAIL |
| 164 | Meetings | Create validation/authz | Non-existing lead_id | - | HTTP 404 | HTTP 404 Lead Not Found | PASS |
| 165 | Meetings | Create validation/authz | Cross-company lead (B's lead by A) | - | HTTP 404 | HTTP 404 Lead Not Found | PASS |
| 166 | Meetings | Create validation/authz | Team Lead creates meeting | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 167 | Meetings | Create validation/authz | Employee creates meeting | - | HTTP 403 | HTTP 403 You are not authorized to perform this action | PASS |
| 168 | Meetings | List | Manager A lists meetings | Manager | 200 | HTTP 200 count=2 | PASS |
| 169 | Company Isolation | Meeting IDOR | Manager B reads Company A meeting | Manager B | 404/403 | HTTP 404 Meeting Not Found | PASS |
| 170 | Company Isolation | Meeting IDOR | Manager B updates Company A meeting | Manager B | 404/403 | HTTP 404 Meeting Not Found | PASS |
| 171 | Company Isolation | Meeting IDOR | Manager B deletes Company A meeting | Manager B | 404/403 | HTTP 404 Meeting Not Found | PASS |
| 172 | Meetings | Update | Manager A updates own meeting | Manager | 200 | HTTP 200 title=Alpha Kickoff v2 | PASS |
| 173 | Meetings | Complete validation | Complete with 'Future Business' but no next_meeting_date | Manager | 400 | HTTP 400 Next Meeting Date is Required | PASS |
| 174 | Meetings | Complete validation | Complete with invalid meeting_result | Manager | 400 | HTTP 400 Invalid Meeting Result | PASS |
| 175 | Meetings | Complete | Manager completes meeting as 'Converted' | Manager | 200 | HTTP 200 Meeting Completed Successfully | PASS |
| 176 | Meetings | Business logic | Completing meeting as 'Converted' flips lead to Converted | Manager | Converted | lead status = Converted | PASS |
| 177 | Meetings | Complete | Complete an already-completed meeting | Manager | 400 | HTTP 400 Meeting Already Completed | PASS |
| 178 | Meetings | Update | Update a completed meeting | Manager | 400 | HTTP 400 Completed or Cancelled Meeting Cannot Be Updated | PASS |
| 179 | Meetings | Delete | Delete a completed meeting | Manager | 400 | HTTP 400 Completed Meeting Cannot Be Deleted | PASS |
| 180 | Meetings | Business logic | Create meeting for a 'Converted' lead | Manager | 400 blocked | HTTP 400 Meeting Cannot Be Created For This Lead | PASS |
| 181 | Tasks | Create | Manager A creates main task for own customer | Manager | 201 | HTTP 201 Task Created Successfully | PASS |
| 182 | Tasks | Create | Manager B creates main task | Manager | 201 | HTTP 201 | PASS |
| 183 | Tasks | Create validation/authz | Missing customer_id | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 184 | Tasks | Create validation/authz | Missing title | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 185 | Tasks | Create validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 186 | Tasks | Create validation/authz | Whitespace-only title | - | HTTP 400 | HTTP 400 Customer and Title are required | PASS |
| 187 | Tasks | Create validation/authz | Non-existing customer | - | HTTP 404 | HTTP 404 Customer Not Found | PASS |
| 188 | Tasks | Create validation/authz | CROSS-COMPANY: Manager A uses Company B customer | - | HTTP 403 | HTTP 403 You can create tasks only for your company customers | PASS |
| 189 | Tasks | Create validation/authz | Team Lead creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 190 | Tasks | Create validation/authz | Employee creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 191 | Tasks | Create validation/authz | Intern creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 192 | Tasks | Create validation/authz | Admin creates main task | - | HTTP 403 | HTTP 403 Only Manager can create tasks | PASS |
| 193 | Tasks | Create validation/authz | Invalid priority value | - | HTTP 400 | HTTP 201 Task Created Successfully | FAIL |
| 194 | Tasks | Create validation/authz | Invalid due_date 'notadate' | - | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 195 | Tasks | Create validation/authz | due_date before start_date | - | HTTP 400 | HTTP 201 Task Created Successfully | FAIL |
| 196 | Tasks | List scoping | Manager A lists tasks | Manager A | own company only | HTTP 200 count=3 companies=[1] | PASS |
| 197 | Tasks | List scoping | Manager B lists tasks | Manager B | own company only | HTTP 200 count=1 companies=[2] | PASS |
| 198 | Tasks | List scoping | Team Lead A lists tasks | Team Lead A | own company only | HTTP 200 count=3 companies=[1] | PASS |
| 199 | Tasks | List scoping | Employee A lists tasks | Employee A | own company only | HTTP 200 count=3 companies=[1] | PASS |
| 200 | Tasks | List scoping | Admin lists tasks | Admin | all companies | HTTP 200 count=4 companies=[1,2] | PASS |
| 201 | Company Isolation | Task IDOR | Manager B reads Company A task by id | Manager B | 403 | HTTP 403 You can access only your company tasks | PASS |
| 202 | Company Isolation | Task IDOR | Manager B updates Company A task | Manager B | 403 | HTTP 403 You can update only your company tasks | PASS |
| 203 | Company Isolation | Task IDOR | Manager B deletes Company A task | Manager B | 403 | HTTP 403 You can delete only your company tasks | PASS |
| 204 | Tasks | Update + persistence | Manager updates task, re-read confirms | Manager | title+priority persisted | HTTP 200 title=Alpha Main Task v2 prio=Low | PASS |
| 205 | Tasks | Partial update | Update without description/dates: are they wiped? | Manager | description preserved | description now = null due_date=null | FAIL |
| 206 | Tasks | Update validation | Invalid task status rejected | Manager | 400 | HTTP 400 Invalid Task Status | PASS |
| 207 | Tasks | Assign | Manager A assigns task to Team Lead A | Manager | 201 | HTTP 201 Task Assigned To Team Lead Successfully | PASS |
| 208 | Tasks | Assign | Manager B assigns task to Team Lead B | Manager | 201 | HTTP 201 | PASS |
| 209 | Tasks | Assign validation/authz | Duplicate assignment (same task+lead) | - | HTTP 400 | HTTP 400 This task is already assigned to that Team Lead | PASS |
| 210 | Tasks | Assign validation/authz | Assign to an Employee (not Team Lead) | - | HTTP 400 | HTTP 400 Main task can only be assigned to Team Lead | PASS |
| 211 | Tasks | Assign validation/authz | Assign to an Intern | - | HTTP 400 | HTTP 400 Main task can only be assigned to Team Lead | PASS |
| 212 | Tasks | Assign validation/authz | Assign to a Manager | - | HTTP 400 | HTTP 400 Main task can only be assigned to Team Lead | PASS |
| 213 | Tasks | Assign validation/authz | CROSS-COMPANY: assign A's task to B's Team Lead | - | HTTP 403 | HTTP 403 You can assign tasks only to Team Leads in your company | PASS |
| 214 | Tasks | Assign validation/authz | Non-existing team lead | - | HTTP 404 | HTTP 404 Team Lead Not Found | PASS |
| 215 | Tasks | Assign validation/authz | Non-existing task | - | HTTP 404 | HTTP 404 Task Not Found | PASS |
| 216 | Tasks | Assign validation/authz | Missing employee_id | - | HTTP 400 | HTTP 400 Task ID and Team Lead ID are required | PASS |
| 217 | Tasks | Assign validation/authz | Team Lead assigns a task | - | HTTP 403 | HTTP 403 Only Manager can assign main tasks | PASS |
| 218 | Tasks | Assign validation/authz | Employee assigns a task | - | HTTP 403 | HTTP 403 Only Manager can assign main tasks | PASS |
| 219 | Tasks | Assigned workers | Manager lists assigned team leads | Manager | 200 count>=1 | HTTP 200 count=1 | PASS |
| 220 | Company Isolation | Assigned workers IDOR | Manager B lists assigned workers of Company A task | Manager B | 403 | HTTP 403 You can access only your company tasks | PASS |
| 221 | Team Leader | Task list | Team Lead A lists own assignments | Team Lead | 200, >=1 | HTTP 200 count=1 | PASS |
| 222 | Company Isolation | Team Lead task list | Team Lead B sees only own assignments (not A's) | Team Lead B | not containing assignment 1 | assignments=[2] | PASS |
| 223 | Authorization | Team-Lead-only endpoint | Manager calls /task/teamlead-list | Manager | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 224 | Authorization | Team-Lead-only endpoint | Employee calls /task/teamlead-list | Employee | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 225 | Authorization | Team-Lead-only endpoint | Intern calls /task/teamlead-list | Intern | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 226 | Authorization | Team-Lead-only endpoint | Admin calls /task/teamlead-list | Admin | 403 | HTTP 403 Only Team Lead can access this page | PASS |
| 227 | Tasks | Assignment status | Owning Team Lead sets assignment In Progress | Team Lead | 200 | HTTP 200 Status Updated Successfully | PASS |
| 228 | Company Isolation | Assignment status IDOR | Team Lead B changes status of Company A assignment | Team Lead B | 403 | HTTP 403 You can update only your company assignments | PASS |
| 229 | Authorization | Assignment status | Employee changes assignment status | Employee | 403 | HTTP 403 You are not authorized to update this assignment | PASS |
| 230 | Tasks | Assignment status validation | Invalid assignment status | Team Lead | 400 | HTTP 400 Invalid Task Status | PASS |
| 231 | Authorization | Assignment status | Admin changes assignment status (company_id is NULL) | Admin | 403 | HTTP 403 You can update only your company assignments | PASS |
| 232 | Tasks | Split create | Team Lead A splits task to Employee A | Team Lead | 201 | HTTP 201 Split Task Created Successfully | PASS |
| 233 | Tasks | Split create | Team Lead A splits task to Intern A | Team Lead | 201 | HTTP 201 Split Task Created Successfully | PASS |
| 234 | Tasks | Split create | Team Lead B splits task to Employee B | Team Lead | 201 | HTTP 201 | PASS |
| 235 | Tasks | Split validation/authz | Missing parent_assignment_id | - | HTTP 400 | HTTP 400 Parent Assignment, Title and Employee are required | PASS |
| 236 | Tasks | Split validation/authz | Missing title | - | HTTP 400 | HTTP 400 Parent Assignment, Title and Employee are required | PASS |
| 237 | Tasks | Split validation/authz | Missing employee_id | - | HTTP 400 | HTTP 400 Parent Assignment, Title and Employee are required | PASS |
| 238 | Tasks | Split validation/authz | Assign split to a Team Lead | - | HTTP 400 | HTTP 400 Split task can only be assigned to Employee or Intern | PASS |
| 239 | Tasks | Split validation/authz | Assign split to a Manager | - | HTTP 400 | HTTP 400 Split task can only be assigned to Employee or Intern | PASS |
| 240 | Tasks | Split validation/authz | CROSS-COMPANY: TL A splits to Employee B | - | HTTP 403 | HTTP 403 You can assign work only to members of your company | PASS |
| 241 | Tasks | Split validation/authz | CROSS-COMPANY: TL B splits A's assignment | - | HTTP 403 | HTTP 403 You can split only your assigned tasks | PASS |
| 242 | Tasks | Split validation/authz | Non-existing assignment | - | HTTP 404 | HTTP 404 Task Assignment Not Found | PASS |
| 243 | Tasks | Split validation/authz | Invalid split status | - | HTTP 400 | HTTP 400 Invalid Split Task Status | PASS |
| 244 | Tasks | Split validation/authz | Status 'Submitted' not TL-assignable | - | HTTP 400 | HTTP 400 Invalid Split Task Status | PASS |
| 245 | Tasks | Split validation/authz | Manager creates a split task | - | HTTP 403 | HTTP 403 Only Team Lead can split tasks | PASS |
| 246 | Tasks | Split validation/authz | Employee creates a split task | - | HTTP 403 | HTTP 403 Only Team Lead can split tasks | PASS |
| 247 | Tasks | Split list | Team Lead A lists own split tasks | Team Lead | 200 count>=2 | HTTP 200 count=2 | PASS |
| 248 | Company Isolation | Split list IDOR | Team Lead B lists Company A split tasks | Team Lead B | 403 | HTTP 403 You can access only your assigned tasks | PASS |
| 249 | Tasks | Split update | Team Lead updates own split task | Team Lead | 200 | HTTP 200 Split Task Updated Successfully | PASS |
| 250 | Company Isolation | Split update IDOR | Team Lead B updates Company A split task | Team Lead B | 403 | HTTP 403 You can update only your split tasks | PASS |
| 251 | Company Isolation | Split status IDOR | Team Lead B cancels Company A split task | Team Lead B | 403 | HTTP 403 You can update only your assigned split tasks | PASS |
| 252 | Employee | Task list | Employee A lists own split tasks | Employee | 200, contains own split | HTTP 200 count=1 ids=[1] | PASS |
| 253 | Intern | Task list | Intern A lists own split tasks (Intern must NOT be rejected) | Intern | 200, contains own split | HTTP 200 count=1 ids=[2] | PASS |
| 254 | Intern | Isolation | Intern A does NOT see Employee A's split task | Intern | not containing 1 | ids=[2] | PASS |
| 255 | Employee | Task details | Employee A opens own split task details (selects attachment_* columns) | Employee | 200 | HTTP 500 Internal Server Error | FAIL |
| 256 | Company Isolation | Worker task IDOR | Employee B opens Company A split task | Employee B | 404 | HTTP 404 Task Not Found | PASS |
| 257 | Authorization | Worker task ownership | Intern A opens Employee A's split task (same company) | Intern | 404 | HTTP 404 Task Not Found | PASS |
| 258 | Employee | Start task | Employee A starts own Pending split task | Employee | 200 -> In Progress | HTTP 200 status=In Progress | PASS |
| 259 | Employee | Start task | Employee A starts an already-started task | Employee | 400 | HTTP 400 Only Pending tasks can be started | PASS |
| 260 | Company Isolation | Start task IDOR | Employee B starts Company A split task | Employee B | 403 | HTTP 403 You can start only your assigned tasks | PASS |
| 261 | Intern | Start task | Intern A starts own split task | Intern | 200 | HTTP 200 status=In Progress | PASS |
| 262 | Task Reports | Submit | Employee A submits report (JSON, no attachment) | Employee | 201 | HTTP 500 Internal Server Error | FAIL |
| 263 | Task Reports | Submit | Intern A submits report | Intern | 201 | HTTP 500 Internal Server Error | FAIL |
| 264 | Task Reports | Submit validation/authz | Missing split_task_id | - | HTTP 400 | HTTP 400 Split Task ID and Report are required | PASS |
| 265 | Task Reports | Submit validation/authz | Missing report text | - | HTTP 400 | HTTP 400 Split Task ID and Report are required | PASS |
| 266 | Task Reports | Submit validation/authz | Report shorter than 10 chars | - | HTTP 400 | HTTP 400 Report must be at least 10 characters | PASS |
| 267 | Task Reports | Submit validation/authz | Empty body {} | - | HTTP 400 | HTTP 400 Split Task ID and Report are required | PASS |
| 268 | Task Reports | Submit validation/authz | Invalid split_task_id 'abc' | - | HTTP 400 | HTTP 400 Invalid Split Task ID | PASS |
| 269 | Task Reports | Submit validation/authz | Non-existing split task | - | HTTP 404 | HTTP 404 Split Task Not Found | PASS |
| 270 | Task Reports | Submit validation/authz | CROSS-COMPANY: Employee B reports on A's split | - | HTTP 403 | HTTP 403 You can report only your assigned tasks | PASS |
| 271 | Task Reports | Submit validation/authz | Intern A reports on Employee A's split | - | HTTP 403 | HTTP 403 You can report only your assigned tasks | PASS |
| 272 | Task Reports | Submit validation/authz | Team Lead submits a report | - | HTTP 403 | HTTP 403 Only Employee or Intern can submit task report | PASS |
| 273 | Task Reports | Submit validation/authz | Manager submits a report | - | HTTP 403 | HTTP 403 Only Employee or Intern can submit task report | PASS |
| 274 | Task Reports | Submit validation/authz | Duplicate submit while awaiting review | - | HTTP 400 | HTTP 500 Internal Server Error | FAIL |
| 275 | Task Reports | Team Lead list | Team Lead A sees reports from own team | Team Lead | 200, contains both reports | HTTP 500 count=undefined ids=[] | FAIL |
| 276 | Company Isolation | Report list | Team Lead B does NOT see Company A reports | Team Lead B | not containing undefined | ids=[] | PASS |
| 277 | Task Reports | Details | Team Lead A reads report details | Team Lead | 200 | HTTP 400 Invalid Report ID | BLOCKED |
| 278 | Company Isolation | Report details IDOR | Team Lead B reads Company A report by id | Team Lead B | 404 | HTTP 400 Invalid Report ID | BLOCKED |
| 279 | Task Reports | Manager visibility | Manager A reads a report from own company | Manager | 403 (Team-Lead-only) - Manager has NO report view | HTTP 400 Invalid Report ID | BLOCKED |
| 280 | Company Isolation | Report review IDOR | Team Lead B approves Company A report | Team Lead B | 403 | HTTP 400 Invalid Report ID | BLOCKED |
| 281 | Task Reports | Review validation | Invalid review action | Team Lead | 400 | HTTP 400 Invalid Report ID | BLOCKED |
| 282 | Task Reports | Review validation | Rework without remarks | Team Lead | 400 | HTTP 400 Invalid Report ID | BLOCKED |
| 283 | Task Reports | Review - Rework | Team Lead A sends report back for rework | Team Lead | 200 | HTTP 400 Invalid Report ID | BLOCKED |
| 284 | Task Reports | Rework loop | Split task moves to 'Rework' and worker sees the remark | Employee | status=Rework + remark visible | status=undefined remark=undefined | BLOCKED |
| 285 | Task Reports | Resubmit | Employee A resubmits after rework | Employee | 201 | HTTP 500 Internal Server Error | FAIL |
| 286 | Task Reports | Review - Approve | Team Lead A approves the resubmitted report | Team Lead | 200 + split task Completed | HTTP 400 Invalid Report ID | BLOCKED |
| 287 | Task Reports | Review | Re-review an already-reviewed report | Team Lead | 400 | HTTP 400 Invalid Report ID | BLOCKED |
| 288 | Task Reports | Approval effect | Approved report sets split task to Completed with completed_at | Employee | Completed | status=undefined completed_at=false | BLOCKED |
| 289 | Task Reports | My reports | Employee A lists own submitted reports | Employee | 200 count>=2 | HTTP 500 count=undefined | FAIL |
| 290 | Task Reports | Employee report list | GET /task-report/employee-list (route-order regression check) | Employee | 200, not treated as /:id | HTTP 500 count=undefined Internal Server Error | FAIL |
| 291 | Task Reports | Employee report details | Employee A reads own report detail | Employee | 200 | HTTP 400 Invalid Report ID | BLOCKED |
| 292 | Company Isolation | Employee report IDOR | Employee B reads Company A report detail | Employee B | 404 | HTTP 400 Invalid Report ID | BLOCKED |
| 293 | Authorization | Report ownership | Intern A reads Employee A's report detail (same company) | Intern | 404 | HTTP 400 Invalid Report ID | BLOCKED |
| 294 | Task Reports | Attachment | Download attachment when none exists | Employee | 404 | HTTP 400 Invalid Report ID | BLOCKED |
| 295 | Employee | Task details | Employee opens split task details [re-tested AFTER applying migration 001 to the sandbox] | Employee | 200 | HTTP 200 | PASS |
| 296 | Task Reports | Submit | Employee A submits report [re-tested AFTER applying migration 001 to the sandbox] | Employee | 201 | HTTP 201 Task Report Submitted Successfully | PASS |
| 297 | Task Reports | Submit | Intern A submits report [re-tested AFTER applying migration 001 to the sandbox] | Intern | 201 | HTTP 201 Task Report Submitted Successfully | PASS |
| 298 | Task Reports | Submit | Duplicate submit while awaiting review | Employee | 400 | HTTP 400 A report has already been submitted and is awaiting review | PASS |
| 299 | Task Reports | Team Lead list | Team Lead A lists team reports [re-tested AFTER applying migration 001 to the sandbox] | Team Lead | 200 containing both reports | HTTP 200 count=2 ids=[2,1] | PASS |
| 300 | Company Isolation | Report list | Team Lead B must not see Company A reports | Team Lead B | excludes A's reports | HTTP 200 ids=[] | PASS |
| 301 | Task Reports | Details | Team Lead A reads report details | Team Lead | 200 | HTTP 200 | PASS |
| 302 | Company Isolation | Report details IDOR | Team Lead B reads Company A report by id | Team Lead B | 404 | HTTP 404 Report Not Found | PASS |
| 303 | Task Reports | Manager visibility | Manager A tries to read a report of their own company | Manager | 403 - no Manager report view exists in the API | HTTP 403 Only Team Lead can view report details | PASS |
| 304 | Task Reports | Details authz | Employee A calls the Team-Lead details endpoint for own report | Employee | 403 | HTTP 403 Only Team Lead can view report details | PASS |
| 305 | Company Isolation | Report review IDOR | Team Lead B approves Company A report | Team Lead B | 403 | HTTP 403 You can review only your team reports | PASS |
| 306 | Authorization | Report review | Employee approves their OWN report (self-approval) | Employee | 403 | HTTP 403 Only Team Lead can review reports | PASS |
| 307 | Authorization | Report review | Manager approves a report | Manager | 403 | HTTP 403 Only Team Lead can review reports | PASS |
| 308 | Task Reports | Review validation | Invalid review action | Team Lead | 400 | HTTP 400 Action must be Approve or Rework | PASS |
| 309 | Task Reports | Review validation | Rework without remarks | Team Lead | 400 | HTTP 400 Rework remark is required | PASS |
| 310 | Task Reports | Review - Rework | Team Lead A sends report back for rework | Team Lead | 200 | HTTP 200 Report Sent Back for Rework | PASS |
| 311 | Task Reports | Rework loop | Split task -> 'Rework' and the remark reaches the worker | Employee | Rework + remark visible | status=Rework remark="Please add more evidence." | PASS |
| 312 | Task Reports | Attachment upload | Employee resubmits with a .txt attachment (multipart) | Employee | 201 + attachment recorded | HTTP 201 Task Report Submitted Successfully file=evidence.txt | PASS |
| 313 | Security | Attachment access control | Employee A (submitter) downloads report attachment | Employee A (submitter) | HTTP 200 | HTTP 200 application/octet-stream | PASS |
| 314 | Security | Attachment access control | Team Lead A (owner) downloads report attachment | Team Lead A (owner) | HTTP 200 | HTTP 200 application/octet-stream | PASS |
| 315 | Security | Attachment access control | Manager A (same company) downloads report attachment | Manager A (same company) | HTTP 200 | HTTP 200 application/octet-stream | PASS |
| 316 | Security | Attachment access control | Team Lead B (other company) downloads report attachment | Team Lead B (other company) | HTTP 404 | HTTP 404 application/json; charset=utf-8 | PASS |
| 317 | Security | Attachment access control | Employee B (other company) downloads report attachment | Employee B (other company) | HTTP 404 | HTTP 404 application/json; charset=utf-8 | PASS |
| 318 | Security | Attachment access control | Intern A (same company, not submitter) downloads report attachment | Intern A (same company, not submitter) | HTTP 404 | HTTP 404 application/json; charset=utf-8 | PASS |
| 319 | Security | Attachment access control | Admin (company_id NULL) downloads report attachment | Admin (company_id NULL) | HTTP 404 | HTTP 404 application/json; charset=utf-8 | PASS |
| 320 | Security | Upload file-type whitelist | Upload Executable .exe (application/x-msdownload) | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX | PASS |
| 321 | Security | Upload file-type whitelist | Upload HTML file (stored XSS vector) | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX | PASS |
| 322 | Security | Upload file-type whitelist | Upload PHP shell | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX | PASS |
| 323 | Security | Upload file-type whitelist | Upload SVG with script | Employee | 400 rejected | HTTP 400 Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, TXT, CSV, DOC, DOCX, XLS, XLSX | PASS |
| 324 | Security | Path traversal | Upload with filename '../../../../server.js' | Employee | 201 but stored under a random safe name | HTTP 201 stored_original=server.js | PASS |
| 325 | Security | Upload size limit | Upload 3MB file (limit is 2MB) | Employee | 400 too large | HTTP 400 File is too large. Maximum size is 2MB | PASS |
| 326 | Task Reports | Review - Approve | Team Lead A approves final report | Team Lead | 200 + task Completed | HTTP 200 Report Approved and Task Completed | PASS |
| 327 | Task Reports | Review | Re-review an already-approved report | Team Lead | 400 | HTTP 400 This report has already been reviewed | PASS |
| 328 | Task Reports | Approval effect | Approved report sets split task Completed + completed_at | Employee | Completed | status=Completed completed_at=true | PASS |
| 329 | Task Reports | Status gate | Submit report on a Completed split task | Employee | 400 | HTTP 400 Task must be In Progress or Rework before submitting a report | PASS |
| 330 | Task Reports | My reports | Employee A lists own reports [re-tested AFTER applying migration 001 to the sandbox] | Employee | 200 | HTTP 200 count=4 | PASS |
| 331 | Task Reports | Employee report list | GET /task-report/employee-list (literal route before /:id) [re-tested AFTER applying migration 001 to the sandbox] | Employee | 200 | HTTP 200 count=1 | PASS |
| 332 | Intern | Employee report list | Intern A lists own reports | Intern | 200 | HTTP 200 count=1 | PASS |
| 333 | Task Reports | Employee report details | Employee A reads own report detail | Employee | 200 | HTTP 200 | PASS |
| 334 | Company Isolation | Employee report IDOR | Employee B reads Company A report detail | Employee B | 404 | HTTP 404 Report Not Found | PASS |
| 335 | Authorization | Report ownership | Intern A reads Employee A's report detail | Intern | 404 | HTTP 404 Report Not Found | PASS |
| 336 | Security | Report ID manipulation | GET /task-report/0 | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 337 | Security | Report ID manipulation | GET /task-report/-1 | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 338 | Security | Report ID manipulation | GET /task-report/abc | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 339 | Security | Report ID manipulation | GET /task-report/999999 | Team Lead | HTTP 404 | HTTP 404 Report Not Found | PASS |
| 340 | Security | Report ID manipulation | GET /task-report/1 OR 1=1 | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 341 | Security | Report ID manipulation | GET /task-report/1;DROP TABLE users | Team Lead | HTTP 400 | HTTP 400 Invalid Report ID | PASS |
| 342 | Security | Missing token | All 10 protected endpoints called with NO Authorization header | Anonymous | 401 on every one | 10/10 returned 401 | PASS |
| 343 | Security | Invalid token | All 10 protected endpoints with a garbage bearer token | Anonymous | 401 on every one (never 500) | 10/10 returned 401 | PASS |
| 344 | Security | JWT forgery | Malformed token (not 3 parts) | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 345 | Security | JWT forgery | Empty bearer value | Attacker | 401 | HTTP 401 Access Token Required | PASS |
| 346 | Security | JWT forgery | alg=none forged token | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 347 | Security | JWT forgery | Valid payload, wrong signature | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 348 | Security | JWT forgery | Expired token (exp in the past) | Attacker | 401 | HTTP 401 Unauthorized | PASS |
| 349 | Security | JWT tampering | Real Employee token with payload rewritten to role=Admin | Employee->Admin | 401 (signature check fails) | HTTP 401 Unauthorized | PASS |
| 350 | Security | Auth header parsing | No 'Bearer ' prefix | Employee | HTTP 401 | HTTP 401 Invalid Token | PASS |
| 351 | Security | Auth header parsing | Wrong scheme 'Basic' | Employee | HTTP 401 | HTTP 401 Invalid Token | PASS |
| 352 | Security | Auth header parsing | Lowercase 'bearer' | Employee | HTTP 401 | HTTP 401 Invalid Token | PASS |
| 353 | Security | JWT contents | JWT payload carries id/role/company_id and no secret material | Employee | only id, role, company_id, iat, exp | claims=[id,role,company_id,iat,exp] | PASS |
| 354 | Security | Token expiry | Token carries an exp claim (JWT_EXPIRES_IN honoured) | Employee | exp present | exp=2026-08-30T08:05:29.000Z | PASS |
| 355 | Dashboard | Load | admin dashboard loads with expected cards | admin | 200 + cards total_companies,total_users,total_customers,total_tasks | HTTP 200 role=Admin missing=[] cards={"total_companies":2,"active_companies":2,"inactive_companies":0,"total_users":21,"pending_users":11,"total_custo | PASS |
| 356 | Dashboard | Data quality | admin dashboard has no null/NaN/undefined counts | admin | all numeric | all numeric | PASS |
| 357 | Dashboard | Load | mgrA dashboard loads with expected cards | mgrA | 200 + cards total_customers,total_leads,total_meetings,total_tasks,team_size | HTTP 200 role=Manager missing=[] cards={"total_customers":4,"total_leads":1,"total_meetings":2,"upcoming_meetings":0,"total_tasks":3,"unassigned_tasks | PASS |
| 358 | Dashboard | Data quality | mgrA dashboard has no null/NaN/undefined counts | mgrA | all numeric | all numeric | PASS |
| 359 | Dashboard | Load | tlA dashboard loads with expected cards | tlA | 200 + cards assigned_tasks,split_tasks,reports_awaiting_review | HTTP 200 role=Team Lead missing=[] cards={"assigned_tasks":1,"assignments_in_progress":1,"assignments_completed":0,"split_tasks":2,"reports_awaiting_r | PASS |
| 360 | Dashboard | Data quality | tlA dashboard has no null/NaN/undefined counts | tlA | all numeric | all numeric | PASS |
| 361 | Dashboard | Load | empA dashboard loads with expected cards | empA | 200 + cards assigned_tasks,pending_work,completed_work,submitted_reports | HTTP 200 role=Employee missing=[] cards={"assigned_tasks":1,"pending_work":0,"in_progress":0,"awaiting_review":0,"rework":0,"completed_work":1,"submit | PASS |
| 362 | Dashboard | Data quality | empA dashboard has no null/NaN/undefined counts | empA | all numeric | all numeric | PASS |
| 363 | Dashboard | Load | intA dashboard loads with expected cards | intA | 200 + cards assigned_tasks,pending_work,completed_work,submitted_reports | HTTP 200 role=Intern missing=[] cards={"assigned_tasks":1,"pending_work":0,"in_progress":0,"awaiting_review":1,"rework":0,"completed_work":0,"submitte | PASS |
| 364 | Dashboard | Data quality | intA dashboard has no null/NaN/undefined counts | intA | all numeric | all numeric | PASS |
| 365 | Dashboard | Auth | Dashboard without token | Anonymous | 401 | HTTP 401 | PASS |
| 366 | Company Isolation | Dashboard counts | Manager A and Manager B see different, company-scoped counts | Manager | different totals | A.customers=4 B.customers=1 | PASS |
| 367 | Workers | List | Admin lists workers | Admin | HTTP 200 | HTTP 200 count=21 companies=[1,2] | PASS |
| 368 | Security | Data exposure | Admin workers list must not contain password hashes | Admin | no password field | present=false | PASS |
| 369 | Workers | List | Manager A lists workers | Manager A | HTTP 200, own company only | HTTP 200 count=5 companies=[1] | PASS |
| 370 | Security | Data exposure | Manager A workers list must not contain password hashes | Manager A | no password field | present=false | PASS |
| 371 | Workers | List | Team Lead A lists workers | Team Lead A | HTTP 200, own company only | HTTP 200 count=5 companies=[1] | PASS |
| 372 | Security | Data exposure | Team Lead A workers list must not contain password hashes | Team Lead A | no password field | present=false | PASS |
| 373 | Workers | List | Employee A lists workers | Employee A | HTTP 403 | HTTP 403 count=undefined companies=[] | PASS |
| 374 | Workers | List | Intern A lists workers | Intern A | HTTP 403 | HTTP 403 count=undefined companies=[] | PASS |
| 375 | Authorization | Pending users | Team Lead lists pending users | Team Lead | HTTP 403 | HTTP 403 You are not authorized to view pending users | PASS |
| 376 | Authorization | Pending users | Employee lists pending users | Employee | HTTP 403 | HTTP 403 You are not authorized to view pending users | PASS |
| 377 | Authorization | Pending users | Intern lists pending users | Intern | HTTP 403 | HTTP 403 You are not authorized to view pending users | PASS |
| 378 | Profile | View | Admin views own profile | Admin | 200 + own data, no password | HTTP 200 email=qa1.admin@qa.test pwLeak=false | PASS |
| 379 | Profile | View | Manager views own profile | Manager | 200 + own data, no password | HTTP 200 email=qa1.mgra@qa.test pwLeak=false | PASS |
| 380 | Profile | View | Team Lead views own profile | Team Lead | 200 + own data, no password | HTTP 200 email=qa1.tla@qa.test pwLeak=false | PASS |
| 381 | Profile | View | Employee views own profile | Employee | 200 + own data, no password | HTTP 200 email=qa1.empa@qa.test pwLeak=false | PASS |
| 382 | Profile | View | Intern views own profile | Intern | 200 + own data, no password | HTTP 200 email=qa1.inta@qa.test pwLeak=false | PASS |
| 383 | Profile | Update + persistence | Intern updates last_name, re-read confirms persisted | Intern | 200 + persisted | HTTP 200 last_name=Renamed | PASS |
| 384 | Profile | Update validation | Missing first_name | Intern | HTTP 400 | HTTP 400 First name is required | PASS |
| 385 | Profile | Update validation | Invalid email | Intern | HTTP 400 | HTTP 400 Please enter a valid email address | PASS |
| 386 | Profile | Update validation | Missing phone | Intern | HTTP 400 | HTTP 400 Phone number is required | PASS |
| 387 | Profile | Update validation | Email already used by another user | Intern | HTTP 400 | HTTP 400 Email or phone number is already in use | PASS |
| 388 | Profile | Update validation | Phone already used by another user | Intern | HTTP 400 | HTTP 400 Email or phone number is already in use | PASS |
| 389 | Profile | Update validation | Phone with letters (backend validation?) | Intern | HTTP 400 | HTTP 400 Email or phone number is already in use | PASS |
| 390 | Profile | Update validation | Phone 3 digits | Intern | HTTP 400 | HTTP 200 Profile Updated Successfully | FAIL |
| 391 | Profile | Update validation | Role escalation via profile update | Intern | HTTP 200 | HTTP 200 Profile Updated Successfully | PASS |
| 392 | Security | Mass assignment | After sending role:'Admin' in update-profile, did the role change? | Intern | role stays Intern | role=Intern company=1 | PASS |
| 393 | Profile | Change password validation | Missing both fields | Intern B | HTTP 400 | HTTP 400 Current and new password are required | PASS |
| 394 | Profile | Change password validation | Missing newPassword | Intern B | HTTP 400 | HTTP 400 Current and new password are required | PASS |
| 395 | Profile | Change password validation | Wrong current password | Intern B | HTTP 400 | HTTP 400 Current Password Incorrect | PASS |
| 396 | Profile | Change password validation | New password too short | Intern B | HTTP 400 | HTTP 400 New password must be at least 8 characters | PASS |
| 397 | Profile | Change password validation | New password same as current | Intern B | HTTP 400 | HTTP 400 New password must be different from the current password | PASS |
| 398 | Profile | Change password | Intern B changes password successfully | Intern B | 200 | HTTP 200 Password Changed Successfully | PASS |
| 399 | Profile | Change password | Login with OLD password after change | Intern B | 401 | HTTP 401 Invalid Credentials | PASS |
| 400 | Profile | Change password | Login with NEW password after change | Intern B | 200 | HTTP 200 | PASS |
| 401 | Security | Session invalidation | Old JWT still valid after the password was changed | Intern B | 401 ideally - tokens should be revoked on password change | HTTP 200 (old token still WORKS) | FAIL |
| 402 | Password Reset | Forgot password | Forgot password for an existing account | Public | 200 generic message | HTTP 200 If an account exists for that email, a password reset link has been generated. | PASS |
| 403 | Password Reset | Account enumeration | Forgot password for a non-existent account returns the same response | Public | identical to existing-account response | HTTP 200 same=true | PASS |
| 404 | Password Reset | Forgot password | Forgot password with invalid email format | Public | 200 generic (no format oracle) | HTTP 200 If an account exists for that email, a password reset link has been generated. | PASS |
| 405 | Password Reset | Forgot password | Forgot password with empty body | Public | 200 generic | HTTP 200 | PASS |
| 406 | Password Reset | Token delivery | Is a reset token ever delivered to the user? | Public | email or another delivery channel | no email infrastructure exists; token only echoed when ALLOW_RESET_TOKEN_IN_RESPONSE=true (not set in .env) | FAIL |
| 407 | Password Reset | Reset validation | Missing token | Public | HTTP 400 | HTTP 400 Token and new password are required | PASS |
| 408 | Password Reset | Reset validation | Missing newPassword | Public | HTTP 400 | HTTP 400 Token and new password are required | PASS |
| 409 | Password Reset | Reset validation | Invalid/unknown token | Public | HTTP 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 410 | Password Reset | Reset validation | Short new password | Public | HTTP 400 | HTTP 400 Password must be at least 8 characters | PASS |
| 411 | Password Reset | Reset validation | Empty body | Public | HTTP 400 | HTTP 400 Token and new password are required | PASS |
| 412 | API | Health | GET /health (public) | Anonymous | 200 | HTTP 200 db=Connected | PASS |
| 413 | API | Health accuracy | Health endpoint reports DB status without querying the DB | Anonymous | real DB probe | hardcoded "Connected" - healthController never queries the pool | FAIL |
| 414 | Error Handling | 404 | Unknown route returns JSON 404 | Anonymous | 404 JSON | HTTP 404 Route Not Found - /api/v1/no-such-route | PASS |
| 415 | Security | Information disclosure | 404 body reflects the raw request URL | Anonymous | no reflection of user input | Route Not Found - /api/v1/no-such-route | FAIL |
| 416 | Error Handling | Wrong HTTP method | PUT on a POST-only route | Anonymous | 404 | HTTP 404 | PASS |
| 417 | Error Handling | Wrong HTTP method | GET on POST-only /auth/login | Anonymous | 404 | HTTP 404 | PASS |
| 418 | Security | Error leakage | 500 response body must not contain stack trace / SQL / credentials | Manager | generic message only | HTTP 500 body={"success":false,"message":"Internal Server Error"} | PASS |
| 419 | Security | Stored XSS | Create customer with an XSS payload as the name | Manager | stored escaped or rejected | HTTP 201 - payload accepted, stored raw (React escapes on render) | FAIL |
| 420 | Security | SQL injection | Create customer with a SQLi payload as the name | Manager | stored as literal text, tables intact | HTTP 201 | PASS |
| 421 | Security | SQL injection | customers table still exists after SQLi payload | Manager | 200 list still works | HTTP 200 count=6 | PASS |
| 422 | Security | Prototype pollution | Register with __proto__ / constructor keys in the body | Public | no crash, no pollution | HTTP 201 | PASS |
| 423 | Security | Large payload | 2MB JSON body to /auth/login (express.json default 100kb limit) | Anonymous | 413 or 400, not a crash | HTTP 413 request entity too large | PASS |
| 424 | Security | Availability | Server still responsive after all abuse cases | Anonymous | 200 | HTTP 200 | PASS |
| 425 | Security | Brute-force protection | 30 consecutive failed logins for one account | Attacker | 429 / lockout after N attempts | no throttling - statuses seen: [401] | FAIL |
| 426 | Authentication | Disabled account | Login blocked when users.is_active = false | - | 403 Account Disabled | verified via direct DB flag toggle in the sandbox (see separate run) | NOT TESTED |
| 427 | Authentication | Disabled account | Login with is_active = false | Intern B | 403 Account Disabled | HTTP 403 Account Disabled | PASS |
| 428 | Password Reset | Disabled account | Forgot-password for a disabled account issues no token | Public | generic 200, no dev token | HTTP 200 token_issued=false | PASS |
| 429 | Password Reset | Token generation | Forgot-password issues a reset token (dev echo enabled) | Public | token returned | HTTP 200 token_len=64 ttl=30min | PASS |
| 430 | Password Reset | Token validation | Reset with a tampered token | Public | 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 431 | Password Reset | Reset | Reset password with a valid token | Public | 200 | HTTP 200 Password has been reset. You can now log in. | PASS |
| 432 | Password Reset | Reset effect | Old password rejected after reset | Employee B | 401 | HTTP 401 Invalid Credentials | PASS |
| 433 | Password Reset | Reset effect | New password works after reset | Employee B | 200 | HTTP 200 | PASS |
| 434 | Password Reset | Single-use token | Reuse the same reset token a second time | Public | 400 | HTTP 400 This reset link is invalid or has expired | PASS |
| 435 | Password Reset | Token rotation | Older reset token invalidated when a newer one is requested | Public | 400 for the older token | HTTP 400 This reset link is invalid or has expired | PASS |
| 436 | Password Reset | Token rotation | Newest reset token still works (password restored) | Public | 200 | HTTP 200 Password has been reset. You can now log in. | PASS |
| 437 | Password Reset | Regression | Employee B password restored to the original | Employee B | 200 | HTTP 200 | PASS |
| 438 | Security | Session invalidation | JWT issued before the password reset still works | Employee B | 401 ideally | HTTP 200 (old token STILL VALID) | FAIL |
| 439 | Password Reset | Token storage | Only the SHA-256 hash of the token is stored | - | raw token absent from password_resets | verified by direct DB inspection | PASS |
| 440 | End-to-End | Workflow 1 | Register -> Login -> Dashboard -> Profile (unassigned user) | New user | register 201, login 200, dashboard 403 (no role), profile 200 | reg=201 login=true dash=403 profile=200 | PASS |
| 441 | End-to-End | Workflow 1 | Logout = client-side token discard only (no server session to revoke) | New user | no /logout endpoint exists | POST /auth/logout -> 404 (404) | PASS |
| 442 | End-to-End | Workflow 2 | Admin -> create Company -> register User -> assign Manager -> user logs in and sees Manager dashboard | Admin/Manager | all steps succeed, dashboard role=Manager | company=201 register=201 role=200 login=true dashRole=Manager | PASS |
| 443 | End-to-End | Workflow 3 | Manager: Customer -> Task -> Assign TL | TL: Split | Employee: Start -> Report | TL: Approve -> Completed | Multi | every step succeeds, task ends Completed | cust=201 task=201 assign=201 split=201 start=200 report=201 review=200 final=Completed | PASS |
| 444 | End-to-End | Workflow 4 | Team Lead forwards (reassigns) a split task from Employee to Intern | Team Lead | 200; Intern now sees it, Employee no longer does | update=200 internSees=true employeeLost=true | PASS |
| 445 | End-to-End | Workflow 5 | After ALL child split tasks complete, does the parent task/assignment auto-update? | Manager | parent reflects completion | parent task status = Pending; assignment status = Pending | FAIL |
| 446 | End-to-End | Workflow 6 | Change password -> old password fails -> new password works | User | change 200, old 401, new 200 | change=200 old=401 new=200 | PASS |
| 447 | Company Isolation | Cross-company denial | Company B token -> Company A Customer details | Company B | 403 or 404 | HTTP 403 You can access only your company customers | PASS |
| 448 | Company Isolation | Cross-company denial | Company B token -> Company A Customer update | Company B | 403 or 404 | HTTP 403 You can update only your company customers | PASS |
| 449 | Company Isolation | Cross-company denial | Company B token -> Company A Customer delete | Company B | 403 or 404 | HTTP 403 You can delete only your company customers | PASS |
| 450 | Company Isolation | Cross-company denial | Company B token -> Company A Task details | Company B | 403 or 404 | HTTP 403 You can access only your company tasks | PASS |
| 451 | Company Isolation | Cross-company denial | Company B token -> Company A Task update | Company B | 403 or 404 | HTTP 403 You can update only your company tasks | PASS |
| 452 | Company Isolation | Cross-company denial | Company B token -> Company A Task delete | Company B | 403 or 404 | HTTP 403 You can delete only your company tasks | PASS |
| 453 | Company Isolation | Cross-company denial | Company B token -> Company A Assigned workers | Company B | 403 or 404 | HTTP 403 You can access only your company tasks | PASS |
| 454 | Company Isolation | Cross-company denial | Company B token -> Company A Assignment status | Company B | 403 or 404 | HTTP 403 You can update only your company assignments | PASS |
| 455 | Company Isolation | Cross-company denial | Company B token -> Company A Split list | Company B | 403 or 404 | HTTP 403 You can access only your assigned tasks | PASS |
| 456 | Company Isolation | Cross-company denial | Company B token -> Company A Split update | Company B | 403 or 404 | HTTP 403 You can update only your split tasks | PASS |
| 457 | Company Isolation | Cross-company denial | Company B token -> Company A Split status | Company B | 403 or 404 | HTTP 403 You can update only your assigned split tasks | PASS |
| 458 | Company Isolation | Cross-company denial | Company B token -> Company A Worker task details | Company B | 403 or 404 | HTTP 404 Task Not Found | PASS |
| 459 | Company Isolation | Cross-company denial | Company B token -> Company A Worker start task | Company B | 403 or 404 | HTTP 403 You can start only your assigned tasks | PASS |
| 460 | Company Isolation | Cross-company denial | Company B token -> Company A Report submit | Company B | 403 or 404 | HTTP 403 You can report only your assigned tasks | PASS |
| 461 | Company Isolation | Cross-company denial | Company B token -> Company A Lead details | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 462 | Company Isolation | Cross-company denial | Company B token -> Company A Lead update | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 463 | Company Isolation | Cross-company denial | Company B token -> Company A Lead delete | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 464 | Company Isolation | Cross-company denial | Company B token -> Company A Lead status | Company B | 403 or 404 | HTTP 404 Lead Not Found | PASS |
| 465 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting details | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 466 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting update | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 467 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting delete | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 468 | Company Isolation | Cross-company denial | Company B token -> Company A Meeting complete | Company B | 403 or 404 | HTTP 404 Meeting Not Found | PASS |
| 469 | Company Isolation | Summary | Cross-company write/read denial across 22 endpoints | Company B | 22/22 denied | 22/22 denied | PASS |
| 470 | Data Integrity | Dashboard vs list | Manager dashboard customer count matches /customer/list count | Manager | equal | dashboard=7 list=7 | PASS |
| 471 | Data Integrity | Dashboard vs list | Manager dashboard task count matches /task/list count | Manager | equal | dashboard=4 list=4 | PASS |
| 472 | Data Integrity | Dashboard vs list | Admin dashboard customer count matches admin-list count | Admin | equal | dashboard=8 adminList=8 | PASS |
| 473 | Data Integrity | Soft delete | Soft-deleted customer disappears from details and list | Manager | 404 + absent from list | details=404 inList=false | PASS |

---

## 4. Module Summary

| Module | Total | Pass | Fail | Blocked | Not Tested | Status |
|---|---:|---:|---:|---:|---:|---|
| Authentication | 3 | 2 | 0 | 0 | 1 | PASS |
| Registration | 25 | 17 | 8 | 0 | 0 | FAIL |
| Login | 14 | 13 | 1 | 0 | 0 | FAIL |
| Password Reset | 21 | 20 | 1 | 0 | 0 | FAIL |
| Admin | 16 | 16 | 0 | 0 | 0 | PASS |
| Manager | 7 | 7 | 0 | 0 | 0 | PASS |
| Team Leader | 1 | 1 | 0 | 0 | 0 | PASS |
| Employee | 5 | 4 | 1 | 0 | 0 | FAIL |
| Intern | 4 | 4 | 0 | 0 | 0 | PASS |
| Company | 19 | 18 | 1 | 0 | 0 | FAIL |
| Customers | 27 | 21 | 6 | 0 | 0 | FAIL |
| Leads | 14 | 14 | 0 | 0 | 0 | PASS |
| Meetings | 24 | 20 | 4 | 0 | 0 | FAIL |
| Tasks | 55 | 51 | 4 | 0 | 0 | FAIL |
| Task Reports | 47 | 29 | 7 | 11 | 0 | FAIL |
| Dashboard | 12 | 12 | 0 | 0 | 0 | PASS |
| Profile | 22 | 21 | 1 | 0 | 0 | FAIL |
| Workers | 5 | 5 | 0 | 0 | 0 | PASS |
| API | 2 | 1 | 1 | 0 | 0 | FAIL |
| Data Integrity | 4 | 4 | 0 | 0 | 0 | PASS |
| Authorization | 29 | 24 | 4 | 1 | 0 | FAIL |
| Company Isolation | 54 | 49 | 2 | 3 | 0 | FAIL |
| Security | 51 | 46 | 5 | 0 | 0 | FAIL |
| Validation | 1 | 0 | 1 | 0 | 0 | FAIL |
| Error Handling | 4 | 4 | 0 | 0 | 0 | PASS |
| End-to-End | 7 | 6 | 1 | 0 | 0 | FAIL |
| **TOTAL** | **473** | **409** | **48** | **15** | **1** | |

---

## 5. Role Permission Matrix

Verified by calling each endpoint with a real, freshly-minted JWT for each role.
**PASS** = behaved as it should. **FAIL** = permission was wrong (too permissive).
"Allowed"/"Denied" describes the *observed and correct* behaviour.

| Feature | Admin | Manager | Team Lead | Employee | Intern |
|---|---|---|---|---|---|
| Login | PASS (allowed) | PASS (allowed) | PASS (allowed) | PASS (allowed) | PASS (allowed) |
| View own dashboard | PASS | PASS | PASS | PASS | PASS |
| View own profile / update / change password | PASS | PASS | PASS | PASS | PASS |
| Create company | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Update / delete company | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| List all companies | PASS (all) | PASS (own only) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Assign Manager role | PASS (allowed) | PASS (denied 400) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Assign worker roles (TL/Emp/Intern) | PASS (denied 400) | PASS (allowed, own company) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| View pending users | PASS | PASS | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| List workers | PASS (all) | PASS (own co.) | PASS (own co.) | PASS (denied 403) | PASS (denied 403) |
| Global cross-company customer list | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Create customer | PASS (denied 403) | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Read customer list | PASS (all) | PASS (own co.) | PASS (own co.) | PASS (own co.) | PASS (own co.) |
| **Update customer** | PASS | PASS (allowed) | **FAIL (allowed — should be denied)** | **FAIL (allowed)** | **FAIL (allowed)** |
| **Delete customer** | PASS | PASS (allowed) | **FAIL (allowed)** | **FAIL (allowed)** | **FAIL (allowed — CRITICAL)** |
| Lead CRUD | PASS (denied 403) | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Meeting CRUD | PASS (denied 403) | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Create / update / delete main task | PASS (denied 403) | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Assign main task to Team Lead | PASS (denied 403) | PASS (allowed) | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) |
| Change assignment status | PASS (denied 403) | PASS (allowed) | PASS (own only) | PASS (denied 403) | PASS (denied 403) |
| Team Lead task list | PASS (denied 403) | PASS (denied 403) | PASS (own only) | PASS (denied 403) | PASS (denied 403) |
| Create / update split task | PASS (denied 403) | PASS (denied 403) | PASS (own assignment) | PASS (denied 403) | PASS (denied 403) |
| Worker task list / details / start | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) | PASS (own only) | PASS (own only) |
| Submit task report | PASS (denied 403) | PASS (denied 403) | PASS (denied 403) | PASS (own only) | PASS (own only) |
| Review (approve/rework) report | PASS (denied 403) | PASS (denied 403) | PASS (own team only) | PASS (denied 403) | PASS (denied 403) |
| **View task reports at all** | denied | **denied — see BUG-014** | PASS (own team) | PASS (own) | PASS (own) |
| Download report attachment | PASS (denied 404) | PASS (own company) | PASS (own team) | PASS (submitter only) | PASS (denied 404) |

**Intern is correctly treated as a first-class worker role**, not silently mapped to Employee:
Interns can be assigned split tasks, start them, submit reports and view their own reports —
all verified working (INT-073, INT-081, MIG-003, MIG-038).

---

## 6. API Test Report

All 25 endpoints were discovered from the route files and every one was exercised.
"Auth" = missing/invalid/forged JWT handling. "Isolation" = cross-company attempt.

| Method | Endpoint | Roles tested | Expected | Actual | Status |
|---|---|---|---|---|---|
| GET | `/api/v1/health` | anonymous | 200 | 200 (but DB status hardcoded — BUG-021) | PARTIAL |
| GET | `/` | anonymous | 200 | 200 | PASS |
| POST | `/api/v1/auth/register` | public | 201 / 400 | 201; **no phone validation** (BUG-002) | FAIL |
| POST | `/api/v1/auth/login` | public | 200 / 401 / 400 | correct; 500 on array password (BUG-009) | FAIL |
| POST | `/api/v1/auth/forgot-password` | public | 200 generic | 200 generic, no enumeration | PASS |
| POST | `/api/v1/auth/reset-password` | public | 200 / 400 | correct (post-migration) | PASS |
| GET | `/api/v1/auth/me` | all 5 roles + forged | 200 / 401 | correct | PASS |
| POST | `/api/v1/auth/profile` | all 5 roles | 200 | correct | PASS |
| POST | `/api/v1/auth/update-profile` | all 5 roles | 200 / 400 | correct; **no phone validation** (BUG-003) | FAIL |
| POST | `/api/v1/auth/change-password` | all roles | 200 / 400 | correct | PASS |
| POST | `/api/v1/auth/workers` | all 5 roles | 200 Admin/Mgr/TL, 403 rest | correct, company-scoped | PASS |
| POST | `/api/v1/auth/change-role` | Admin, Mgr, worker, null | 200 / 400 / 403 | correct, tenant injection blocked | PASS |
| POST | `/api/v1/auth/pending-users` | all 5 roles | 200 Admin/Mgr, 403 rest | correct | PASS |
| POST | `/api/v1/company/create` | all 5 roles | 201 Admin, 403 rest | correct | PASS |
| POST | `/api/v1/company/list` | all 5 roles | 200 Admin/Mgr, 403 rest | correct | PASS |
| POST | `/api/v1/company/details` | Admin, Mgr | 200 / 400 / 404 | 500 on non-numeric id (BUG-010) | FAIL |
| POST | `/api/v1/company/update` | Admin + others | 200 / 400 / 404 / 403 | correct | PASS |
| POST | `/api/v1/company/delete` | Admin + others | 200 / 400 / 404 | correct, FK-guarded | PASS |
| POST | `/api/v1/customer/create` | all 5 roles | 201 Mgr, 403 rest | correct; **no phone/email validation** (BUG-004) | FAIL |
| POST | `/api/v1/customer/list` | all 5 roles | 200, company-scoped | correct | PASS |
| POST | `/api/v1/customer/admin-list` | all 5 roles | 200 Admin, 403 rest | correct | PASS |
| POST | `/api/v1/customer/details` | all roles + cross-co | 200 / 403 / 404 | 500 on non-numeric id (BUG-010) | FAIL |
| POST | `/api/v1/customer/update` | all roles + cross-co | 200 Mgr, 403 rest | **200 for Employee/Intern (BUG-005)**; wipes fields (BUG-006) | FAIL |
| POST | `/api/v1/customer/delete` | all roles + cross-co | 200 Mgr, 403 rest | **200 for Employee/Intern (BUG-005)** | FAIL |
| POST | `/api/v1/lead/create` | all 5 roles | 201 Mgr, 403 rest | correct; **cross-tenant dup leak (BUG-007)** | FAIL |
| POST | `/api/v1/lead/list` | Mgr + others | 200 / 403 | correct, company-scoped | PASS |
| POST | `/api/v1/lead/details` | Mgr + cross-co | 200 / 404 | correct | PASS |
| POST | `/api/v1/lead/update` | Mgr + cross-co | 200 / 404 | correct | PASS |
| POST | `/api/v1/lead/delete` | Mgr + cross-co | 200 / 404 | correct | PASS |
| POST | `/api/v1/lead/status` | Mgr + cross-co | 200 / 400 / 404 | correct, status whitelisted | PASS |
| POST | `/api/v1/meeting/create` | all 5 roles | 201 Mgr, 403 rest | **500 on invalid date/time (BUG-008)** | FAIL |
| POST | `/api/v1/meeting/list` | Mgr + others | 200 / 403 | correct | PASS |
| POST | `/api/v1/meeting/details` | Mgr + cross-co | 200 / 404 | correct | PASS |
| POST | `/api/v1/meeting/update` | Mgr + cross-co | 200 / 400 / 404 | correct | PASS |
| POST | `/api/v1/meeting/delete` | Mgr + cross-co | 200 / 400 / 404 | correct | PASS |
| POST | `/api/v1/meeting/complete` | Mgr + cross-co | 200 / 400 / 404 | correct, lead status cascade works | PASS |
| POST | `/api/v1/task/create` | all 5 roles | 201 Mgr, 403 rest | **no priority/date validation (BUG-011)** | FAIL |
| POST | `/api/v1/task/list` | all 5 roles | 200, scoped | correct | PASS |
| POST | `/api/v1/task/details` | all roles + cross-co | 200 / 403 / 404 | correct | PASS |
| POST | `/api/v1/task/update` | Mgr + cross-co | 200 / 400 / 403 | **wipes description & dates (BUG-012)** | FAIL |
| POST | `/api/v1/task/delete` | Mgr + cross-co | 200 / 403 / 404 | correct (soft delete) | PASS |
| POST | `/api/v1/task/assign` | all roles + cross-co | 201 / 400 / 403 / 404 | correct | PASS |
| POST | `/api/v1/task/assigned-workers` | Mgr + cross-co | 200 / 403 / 404 | correct | PASS |
| POST | `/api/v1/task/change-status` | all roles + cross-co | 200 / 400 / 403 | correct | PASS |
| POST | `/api/v1/task/teamlead-list` | all 5 roles | 200 TL, 403 rest | correct | PASS |
| POST | `/api/v1/task/split-list` | TL + cross-co | 200 / 403 / 404 | correct | PASS |
| POST | `/api/v1/task/split-create` | all roles + cross-co | 201 / 400 / 403 / 404 | correct | PASS |
| POST | `/api/v1/task/split-update` | TL + cross-co | 200 / 403 / 404 | correct | PASS |
| POST | `/api/v1/task/split-change-status` | TL + cross-co | 200 / 400 / 403 | correct | PASS |
| POST | `/api/v1/task/employee/tasks` | Emp, Intern + others | 200 / 403 | correct | PASS |
| POST | `/api/v1/task/employee/task-details` | Emp, Intern + cross-co | 200 / 403 / 404 | **500 in live schema (BUG-001)** | FAIL |
| POST | `/api/v1/task/employee/start-task` | Emp, Intern + cross-co | 200 / 400 / 403 | correct | PASS |
| POST | `/api/v1/task-report/submit` | Emp, Intern + others | 201 / 400 / 403 / 404 | **500 in live schema (BUG-001)** | FAIL |
| GET | `/api/v1/task-report/team-lead` | TL + others | 200 / 403 | **500 in live schema (BUG-001)** | FAIL |
| GET | `/api/v1/task-report/my` | workers | 200 | **500 in live schema (BUG-001)** | FAIL |
| GET | `/api/v1/task-report/employee-list` | Emp, Intern | 200 | **500 in live schema (BUG-001)** | FAIL |
| GET | `/api/v1/task-report/employee-details/:id` | Emp, Intern + cross-co | 200 / 400 / 404 | correct post-migration | PASS |
| GET | `/api/v1/task-report/:id` | TL + others + cross-co | 200 / 400 / 403 / 404 | correct post-migration | PASS |
| POST | `/api/v1/task-report/:id/review` | TL + others + cross-co | 200 / 400 / 403 / 404 | correct post-migration | PASS |
| GET | `/api/v1/task-report/:id/attachment` | all 5 roles | 200 / 404 | correct post-migration | PASS |
| GET | `/api/v1/dashboard` | all 5 roles + anon | 200 / 401 / 403 | correct, scoped | PASS |
| ANY | unknown route | anonymous | 404 JSON | 404, but reflects raw URL (BUG-022) | PARTIAL |

**Route-order regression check:** `GET /task-report/employee-list` correctly resolves to the
literal route and is not swallowed by the `/:id` wildcard (verified post-migration, MIG-037).

---

## 7. Database Test Report

### 7.1 Schema issues

| # | Finding | Severity |
|---|---|---|
| 1 | **Table `password_resets` does not exist in the live database.** Migration `001` was never applied. | **CRITICAL** |
| 2 | **Columns `task_reports.attachment_path` / `attachment_original_name` / `attachment_mime` / `attachment_size` do not exist in the live database.** Same unapplied migration. | **CRITICAL** |
| 3 | `leads` table has **no `requirement` column**, yet the Manager UI has a "Requirement" input, table column and detail field. Data typed there is silently discarded. | HIGH |
| 4 | No `CHECK` constraints on any status/priority column — the vocabulary in `utils/status.js` is enforced only in application code, and only on some paths. Invalid value `SUPER_URGENT` was successfully persisted into `tasks.priority`. | MEDIUM |
| 5 | `users.phone` is `varchar(20)` with no format constraint; `customers.phone` is `varchar(20)`. Values longer than 20 chars raise a raw driver error surfaced as HTTP 500. | MEDIUM |
| 6 | `users` has both a `status` boolean and an `is_active` boolean. Only `is_active` is used by the application; `status` is dead. | LOW |
| 7 | `tasks` has no `company_id`; tenancy is resolved through `tasks -> customers.company_id` on every query. This works correctly but is done via a 3–4 table join on every check. | LOW (design note) |

### 7.2 Constraint / relationship verification — all PASS

* Primary keys present on all 9 tables.
* All foreign keys present and enforced as documented in `DATABASE_SCHEMA.md`.
* `users_email_key` (UNIQUE) and `users_phone_key` (UNIQUE) confirmed enforced — duplicate
  registration correctly rejected, including case-insensitive email.
* `companies_company_code_key` (UNIQUE) confirmed enforced.
* `chk_task_report_parent` CHECK (`task_assignment_id IS NOT NULL OR split_task_id IS NOT NULL`)
  present and satisfied.
* `user_role` ENUM contains exactly `Admin, Manager, Team Lead, Employee, Intern`.
* Company delete is correctly blocked when dependent users/customers/leads/meetings exist,
  returning an actionable 400 rather than a FK-violation 500.

### 7.3 Data integrity — all PASS

Run against the full post-test dataset (2 companies, 21 users, 8 customers, 5 tasks,
2 assignments, 6 split tasks, 7 reports):

| Check | Result |
|---|---|
| Orphan `tasks` -> `customers` | 0 |
| Orphan `task_assignments` -> `tasks` | 0 |
| Orphan `split_tasks` -> `task_assignments` | 0 |
| Orphan `task_reports` -> `split_tasks` | 0 |
| Orphan `users` -> `companies` | 0 |
| Orphan `customers` -> `companies` | 0 |
| Split tasks assigned to a worker **outside** the task's company | **0** |
| Assignments given to a Team Lead **outside** the task's company | **0** |
| Duplicate user emails / phones / company codes | 0 / 0 / 0 |
| Duplicate `task_assignments` (task + team lead) | 0 |
| Non-Admin users with `company_id IS NULL` | 0 (only Admin and unassigned users) |
| Status values outside the documented vocabulary | 0 |
| Soft-deleted customer still visible in list/details | No — correctly hidden |
| Dashboard counts vs. list endpoint counts (Manager, Admin) | Match exactly |

**No orphan records, no duplicates, no wrong `company_id`, no wrong `user_id`, no incorrect
assignments.** Relational integrity is genuinely solid.

### 7.4 Company isolation at the data layer — PASS

Cross-tenant contamination queries returned zero rows. Tenant assignment cannot be injected:
a Manager sending `company_id` of another company in `change-role` had it ignored, and the
target user landed in the Manager's own company (verified in the DB).

---

## 8. Security Test Report

### 8.1 Strong — verified working

| Area | Result |
|---|---|
| **SQL injection** | **Not exploitable.** Every controller uses parameterised `$1,$2` placeholders. Payloads `' OR '1'='1`, `x'; DROP TABLE users; --`, `Robert'); DROP TABLE customers;--` were stored as literal text; tables intact and queries still working afterwards. |
| **JWT forgery** | `alg=none` token, valid-payload/wrong-signature token, and a real Employee token with the payload rewritten to `role:"Admin"` were **all rejected with 401**. |
| **Missing / invalid token** | 10/10 protected endpoints returned 401 with no token; 10/10 returned 401 with a garbage token. Never 500. |
| **Auth header parsing** | `Basic` scheme, lowercase `bearer`, and bare token (no scheme) all rejected 401. |
| **Token contents** | Payload carries only `id, role, company_id, iat, exp`. No secret material. `exp` present and honoured. |
| **Role is re-read from the DB** | `requireRole` / `getAuthContext` re-fetch role and company on every request, so a stale JWT minted before a demotion cannot retain privileges. |
| **Mass assignment** | `role`, `company_id`, `is_active` sent in register and update-profile bodies were **ignored** — verified in the database. |
| **IDOR / cross-company** | **22/22 cross-company write and read attempts denied** (403/404) across customers, tasks, assignments, split tasks, reports, leads and meetings. |
| **Password storage** | bcrypt, 10 rounds. Password hash never appears in any response (login, `/me`, profile, workers list all verified). |
| **User enumeration (login)** | Wrong password and unknown account return byte-identical `401 Invalid Credentials`. |
| **User enumeration (forgot password)** | Identical generic 200 for existing, non-existing and malformed addresses. |
| **Reset token storage** | Only the SHA-256 hash (64 hex chars) is stored; raw token never persisted. |
| **Reset token lifecycle** | Single-use enforced; requesting a new token invalidates the older one; tampered token rejected; disabled accounts get no token. |
| **File upload whitelist** | `.exe`, `.html`, `.php`, `.svg` all rejected 400 by MIME whitelist. |
| **Path traversal** | Filename `../../../../server.js` was stored as a random hex name inside `uploads/`. `Backend/server.js` verified untouched. |
| **Upload size limit** | 3 MB upload rejected with a clean 400 (2 MB limit). |
| **Attachment access control** | Submitter, owning Team Lead and same-company Manager get 200; other-company Team Lead/Employee, same-company non-submitter Intern, and Admin all get 404. |
| **Disabled account** | `is_active = false` blocks login with 403 "Account Disabled". |
| **Large payload** | 2 MB JSON body rejected 413 by Express's body limit; server stayed responsive. |
| **Prototype pollution** | `__proto__` / `constructor` keys in the body caused no crash and no pollution. |
| **Error leakage** | 500 responses return only `{"success":false,"message":"Internal Server Error"}` — no stack traces, no SQL, no credentials, no driver codes. |
| **Security headers** | `helmet` active: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, COOP/CORP all present. |
| **CORS** | Restricted to configured origins via `CORS_ORIGIN`. |
| **Stored XSS execution** | Payloads `<script>alert(1)</script>` and `<img src=x onerror=alert(1)>` render as **inert literal text** in the Admin UI — React escapes by default. No execution observed. |

### 8.2 Weak — findings

| # | Finding | Severity |
|---|---|---|
| S1 | **Employee and Intern can update and delete any customer in their company** (BUG-005). | **CRITICAL** |
| S2 | **No brute-force protection.** 30 consecutive failed logins for one account produced 30 plain 401s — no lockout, no throttling, no 429, no delay. | **HIGH** |
| S3 | **JWT is not revoked on password change or password reset.** A token minted before the change kept working (PWD-060, RST-012). There is no server-side session store, no token version/`jti`, and no `/auth/logout` endpoint — logout only clears `localStorage`. | MEDIUM |
| S4 | **Cross-tenant existence oracle in leads** (BUG-007): the duplicate phone/email check queries `leads` globally, so Company B can determine whether a phone or email exists in Company A. | MEDIUM |
| S5 | Backend accepts XSS/HTML payloads unsanitised into `users.first_name`, `customers.customer_name`, etc. Currently harmless because React escapes on render, but any future non-React consumer, PDF/email export, or `dangerouslySetInnerHTML` would become vulnerable. | LOW |
| S6 | 404 body reflects the raw request URL (`Route Not Found - /api/v1/<input>`). Minor reflected-input surface. | LOW |
| S7 | No password complexity policy — `12345678` is an accepted password (only length >= 8 is checked). | MEDIUM |
| S8 | No rate limiting on `/auth/forgot-password`; unbounded reset rows can be generated per account. | LOW |

---

## 9. UI Test Report

Every page in `AppRoutes.jsx` was opened in a real browser and exercised.

### 9.1 Pages verified working

| Role | Pages loaded and rendering real data |
|---|---|
| Public | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Admin | Dashboard, Companies, Pending Users, Workers, Customers, Profile |
| Manager | Dashboard, Pending Users, Workers, Customers, Tasks, Meetings (Leads + Meetings tabs), Profile |
| Team Lead | Dashboard, Tasks, Workers, Reports, Profile |
| Employee | Dashboard, Tasks, Reports, Profile |
| Intern | Dashboard, Tasks, Reports, Profile |

### 9.2 UI behaviour verified — PASS

* **Role-based routing works.** Logged in as Admin, navigating to `/manager/dashboard` and
  `/employee/task` both bounced back to `/admin/dashboard`.
* **Unauthenticated access blocked.** After logout, `/admin/dashboard` redirects to `/login`.
* **Logout works** — clears storage and returns to login.
* **Login error states render** ("Email/Phone and Password are required", "Invalid Credentials").
* **Frontend phone validation is correct**: typing `abcde12345678901234` into Register's phone
  field yields `1234567890` (non-digits stripped, capped at 10), and a 5-digit entry blocks
  submission with "Phone number must be exactly 10 digits".
* **Report submit modal validates client-side** — live character counter and
  "Report must be at least 10 characters" block a short report.
* **Dashboards show correct, company-scoped numbers** with no `undefined`, `NaN` or nulls,
  for all five roles. Empty states render ("No upcoming meetings scheduled", "No Leads Found").
* **Full end-to-end UI workflow confirmed**: Employee started a task, submitted a report through
  the modal, the Team Lead saw it in Reports, opened the detail modal, clicked
  "Approve & Complete", and the row flipped to Approved — frontend → API → database → frontend.
* **Stored XSS/SQLi payloads render as inert text.**
* **Browser console is clean** — no React errors, no JavaScript exceptions, no failed asset
  loads. The only console errors observed were the 400/401 responses from deliberately invalid
  login attempts.

### 9.3 UI defects found

| # | Defect | Severity |
|---|---|---|
| U1 | Login form has **no `<form>` element** — pressing **Enter does not submit**. The user must click the button. (BUG-016) | MEDIUM |
| U2 | Meeting dates render as **raw ISO strings shifted one day back**: a meeting stored as `2026-10-15` displays as `2026-10-14T18:30:00.000Z`. (BUG-013) | **HIGH** |
| U3 | Task due dates render as raw ISO strings (`2026-08-31T18:30:00.000Z`). (BUG-013) | HIGH |
| U4 | "Requirement" field on the Lead form is **silently discarded** — no such column exists. (BUG-015) | HIGH |
| U5 | After creating a meeting, the Leads tab **does not refresh** — the lead still shows "Pending" while the database already says "Meeting Scheduled". (BUG-017) | MEDIUM |
| U6 | Leads tab filters to `Pending` / `Future Business` only, with **no "All" filter**. Once a lead becomes Converted / Closed / Meeting Scheduled it **disappears permanently from the UI** and can never be viewed or edited again, even though the dashboard still counts it. (BUG-018) | MEDIUM |
| U7 | The Schedule Meeting modal's lead dropdown lists **Converted/Closed leads**, which the backend then rejects with 400. (BUG-019) | LOW |
| U8 | An unknown URL while logged in redirects to `/login` rather than the user's dashboard, making an authenticated user look logged out. (BUG-020) | LOW |
| U9 | `/login` is reachable while already authenticated and renders the login form instead of redirecting to the dashboard. | LOW |
| U10 | Invalid data from the backend surfaces directly in the UI — the Admin Pending Users page displays phones `abcdefghij`, `123456789012345`, `12345`, `-123456789` and a blank name. Symptom of BUG-002. | (see BUG-002) |
| U11 | Manager dashboard "Team Members: 5" counts the Manager themselves while "Team Composition" below totals only 4 (TL 1 + Emp 2 + Intern 1) — the two figures appear to disagree. | LOW |

**Note on test-harness artifacts:** synthetic mouse clicks occasionally failed to register on
the Login button during automation. This was confirmed to be an automation artifact, **not an
application defect** — a programmatic `.click()` on the same button fired the handler correctly.
It is recorded here only for transparency and is **not** counted as a bug.

---

## 10. Failed Tests

### BUG-001

* **Module:** Task Reports / Database
* **Feature:** Report submission, listing, review, attachments; worker task details
* **Role:** Employee, Intern, Team Lead (all affected)
* **Severity:** **CRITICAL — blocks the core business workflow**
* **Test:** Submit a task report; open a split task; list team reports
* **Steps to reproduce:**
  1. Log in as an Employee who has a split task in `In Progress`.
  2. Open the task (`POST /api/v1/task/employee/task-details`).
  3. Or submit a report (`POST /api/v1/task-report/submit`).
* **Expected:** 200 / 201 with the report created.
* **Actual:** **HTTP 500 `{"success":false,"message":"Internal Server Error"}`** on every call.
* **API:** `POST /task-report/submit`, `GET /task-report/team-lead`, `GET /task-report/my`,
  `GET /task-report/employee-list`, `POST /task/employee/task-details`
* **Request:** `{"split_task_id":1,"report":"Completed the assigned QA work end to end."}`
* **Response:** `{"success":false,"message":"Internal Server Error"}`
* **Browser error:** the Employee task page cannot open a task; Team Lead Reports page is empty.
* **Backend log:**
  ```
  SUBMIT TASK REPORT ERROR: column "attachment_path" of relation "task_reports" does not exist
  TEAM LEAD REPORT LIST ERROR: column tr.attachment_original_name does not exist
  WORKER TASK DETAILS ERROR: column "attachment_original_name" does not exist
  MY TASK REPORTS ERROR: column tr.attachment_original_name does not exist
  EMPLOYEE REPORT LIST ERROR: column tr.attachment_original_name does not exist
  ```
* **Database observation:** `information_schema.columns` for `task_reports` in the live
  `enterprise_crm` database returns exactly 10 columns — `id, task_assignment_id, split_task_id,
  submitted_by, report, review_status, review_remarks, reviewed_by, submitted_at, reviewed_at`.
  **None of the four `attachment_*` columns exist.** `SELECT to_regclass('public.password_resets')`
  returns NULL — **the table does not exist either.**
* **Possible root cause:** `Backend/src/database/migrations/001_password_reset_and_report_attachments.sql`
  has never been executed against the live database. The file header states it must be applied
  manually. The application code was written against the post-migration schema.
* **Impact:** The entire Task Report module — the CRM's central workflow — is non-functional in
  the live deployment. Employees and Interns cannot open or report on tasks; Team Leads cannot
  see or review any work. Forgot/Reset Password is also silently broken by the same migration
  (see BUG-023).
* **Confirmation that the code is correct:** applying migration 001 to the sandbox clone made
  **all 47 re-tests of this module pass**, including submit, resubmit, rework loop, approve,
  attachment upload/download and every authorisation check.

---

### BUG-002

* **Module:** Registration / Validation
* **Feature:** Phone number validation on register
* **Role:** Public
* **Severity:** HIGH
* **Test:** Register with phones of the wrong length, wrong type and negative numbers
* **Steps to reproduce:** `POST /api/v1/auth/register` with `phone` = `"12345"`, or
  `"123456789012345"`, or `"abcdefghij"`, or `"-123456789"`.
* **Expected:** 400 — the frontend rule is "exactly 10 digits".
* **Actual:** **HTTP 201 in all four cases**, values stored verbatim.
* **Database observation:**
  ```
  id | first_name | phone           | len
  12 | X          | 12345           |   5
  13 | X          | 123456789012345 |  15
  14 | X          | abcdefghij      |  10
  19 | X          | -123456789      |  10
  ```
* **Possible root cause:** `authController.register` validates `first_name`, `email` and password
  length, but performs **no validation whatsoever on `phone`** — it only trims it.
  `Frontend/src/utils/phoneValidation.js` enforces the rule client-side only.
* **Impact:** Classic "backend trusts the frontend" failure. Anyone calling the API directly
  (curl/Postman) can poison the `users` table with unusable phone numbers, which then surface in
  the Admin UI. Since phone is also a **login identifier**, malformed values pollute the login
  namespace.
* **Related failing tests:** REG-009, REG-010, REG-011, REG-023.

---

### BUG-003

* **Module:** Profile / Validation
* **Feature:** Phone validation on profile update
* **Role:** All authenticated roles
* **Severity:** HIGH
* **Test:** `POST /api/v1/auth/update-profile` with `phone: "123"`
* **Expected:** 400
* **Actual:** **HTTP 200 "Profile Updated Successfully"**
* **Possible root cause:** `updateProfile` checks only that `phone` is non-empty.
* **Impact:** Same as BUG-002, and it lets a user overwrite a valid phone with garbage,
  potentially locking themselves out of phone-based login.
* **Related failing test:** PROF-049.

---

### BUG-004

* **Module:** Customers / Validation
* **Feature:** Customer email and phone validation
* **Role:** Manager
* **Severity:** HIGH
* **Test:** Create a customer with `email: "not-an-email"`, `phone: "abcdefghij"`, and a 25-digit phone
* **Expected:** 400 for all three
* **Actual:** 201 for the invalid email, 201 for the alphabetic phone, and **HTTP 500** for the
  25-digit phone.
* **Backend log:** `CREATE CUSTOMER ERROR: value too long for type character varying(20)`
* **Possible root cause:** `createCustomer` validates only that `customer_name` and `phone` are
  present. There is no format check and no length check, so an over-length value reaches
  PostgreSQL and the driver error becomes a generic 500.
* **Impact:** Invalid contact data enters the CRM (visible in the Admin Customers UI as
  `not-an-email` and `abcdefghij`), and an over-length value produces a 500 instead of a
  helpful 400.
* **Related failing tests:** CUS-007, CUS-008, CUS-009.

---

### BUG-005

* **Module:** Authorization / Customers
* **Feature:** Customer update and delete permissions
* **Role:** Employee, Intern, Team Lead
* **Severity:** **CRITICAL**
* **Test:** With an Employee token, and then an Intern token, update and delete a customer
  belonging to their own company.
* **Steps to reproduce:**
  1. Log in as an Intern (`qa1.intA@qa.test`).
  2. `POST /api/v1/customer/update` `{"customer_id":6,"customer_name":"Changed By Intern"}`
  3. `POST /api/v1/customer/delete` `{"customer_id":6}`
* **Expected:** 403 — only a Manager may modify customers (`createCustomer` explicitly enforces
  `Only Manager can create customers`).
* **Actual:**
  * Employee update -> **200 "Customer Updated Successfully"**
  * Intern update -> **200 "Customer Updated Successfully"**
  * Intern delete -> **200 "Customer Deleted Successfully"**
* **API:** `POST /customer/update`, `POST /customer/delete`
* **Database observation:** the customer row was genuinely soft-deleted (`deleted_at` set); a
  subsequent read by the Manager returned 404, and the record vanished from the customer list.
  The test had to re-create the customer to continue.
* **Possible root cause:** `customerController.updateCustomer` and `deleteCustomer` check
  **company membership only** (`sameCompany(...)`), never `authUser.role`. `createCustomer`
  does check the role — the guard was simply not carried over to update/delete.
* **Impact:** The lowest-privileged roles in the system can silently destroy or corrupt the
  company's entire customer book. This is a genuine privilege-escalation and data-loss path,
  reachable by any authenticated Intern with a customer id. Customer ids are sequential and
  the customer list is readable by every role, so ids are trivially discoverable.
* **Related failing tests:** AUTHZ-029, AUTHZ-030, AUTHZ-031. (AUTHZ-032 is a downstream
  consequence — the Intern's own read returned 404 because the delete had succeeded.)

---

### BUG-006

* **Module:** Customers / Data Integrity
* **Feature:** Partial customer update wipes unrelated fields
* **Role:** Manager
* **Severity:** HIGH
* **Test:** Update a customer sending only `customer_id` and `customer_name`.
* **Steps to reproduce:**
  1. Create a customer with `city: "Salem"`, email, GST, website, address.
  2. `POST /customer/update` `{"customer_id":X,"customer_name":"New Name"}`
  3. Re-read the customer.
* **Expected:** only the name changes.
* **Actual:** `city` became `null`. `email`, `alternate_phone`, `gst_number`, `website`,
  `address`, `state`, `country`, `pincode` are all nulled the same way.
* **Possible root cause:** the UPDATE uses `COALESCE` only for `customer_name`, `phone` and
  `status`. Every other column is assigned directly (`company_name = $2, email = $3, ...`) with
  `value ?? null`, so any omitted field is overwritten with NULL.
* **Impact:** Silent data loss on every partial update. Any API consumer or future UI that
  submits a subset of fields destroys the rest of the customer record.
* **Related failing test:** CUS-035.

---

### BUG-007

* **Module:** Company Isolation / Leads
* **Feature:** Lead duplicate check is global, not per company
* **Role:** Manager (any tenant)
* **Severity:** MEDIUM (security: cross-tenant information disclosure; functional: blocks legitimate work)
* **Test:** As Manager B, create a lead using a phone/email that exists **only in Company A**.
* **Expected:** 201 — Company A's data must have no effect on Company B.
* **Actual:** **HTTP 400 "Phone Number Already Exists"** and **400 "Email Already Exists"**.
* **Possible root cause:** `leadController.createLead` runs
  `SELECT id FROM leads WHERE phone = $1` and `WHERE email = $1` with **no `company_id` filter**.
  `updateLead` has the same flaw.
* **Impact:** Two distinct problems. (1) **Information disclosure** — Company B can probe
  whether any phone number or email address exists as a lead in any other tenant, an existence
  oracle across the tenant boundary. (2) **Functional** — two companies can never both hold the
  same prospect, which is normal in a real sales pipeline; the second company is permanently
  blocked from creating that lead.
* **Related failing tests:** ISO-050, ISO-051.

---

### BUG-008

* **Module:** Meetings / Error Handling
* **Feature:** Date and time validation
* **Role:** Manager
* **Severity:** MEDIUM
* **Test:** Create a meeting with `meeting_date: "2026-13-45"`, `"notadate"`, or `meeting_time: "99:99"`
* **Expected:** 400 with a clear message
* **Actual:** **HTTP 500 Internal Server Error** in all three cases
* **Backend log:**
  ```
  error: date/time field value out of range: "2026-13-45"
  error: invalid input syntax for type date: "notadate"
  error: date/time field value out of range: "99:99"
  ```
* **Possible root cause:** `createMeeting` checks only that the fields are present, then passes
  them straight into the INSERT. PostgreSQL raises a cast error that becomes a generic 500.
* **Impact:** Bad input produces a server error instead of a validation message; the user gets
  no actionable feedback and the error is logged as an unhandled failure.
* **Related failing tests:** MEET-064, MEET-065, MEET-066.

---

### BUG-009

* **Module:** Login / Error Handling
* **Feature:** Type confusion on password field
* **Role:** Public
* **Severity:** MEDIUM
* **Test:** `POST /auth/login` with `{"emailOrPhone":"...","password":["a","b"]}`
* **Expected:** 400
* **Actual:** **HTTP 500 Internal Server Error**
* **Possible root cause:** the password is passed to `bcrypt.compare()` without a type check;
  bcrypt throws on a non-string, and the catch block returns a generic 500.
* **Impact:** Unauthenticated users can reliably trigger 500s on the login endpoint. No data is
  exposed, but it is noise in the logs and a trivially reachable unhandled path.
* **Related failing test:** LOGIN-041.

---

### BUG-010

* **Module:** Error Handling (Company, Customers)
* **Feature:** Non-numeric ID handling
* **Role:** Admin, Manager
* **Severity:** MEDIUM
* **Test:** `POST /company/details` and `POST /customer/details` with `id: "abc"`
* **Expected:** 400 "Invalid ID"
* **Actual:** **HTTP 500 Internal Server Error**
* **Backend log:** `CUSTOMER DETAILS ERROR: invalid input syntax for type integer: "abc"`
* **Possible root cause:** ids are checked for presence but never coerced/validated as integers
  before being used as query parameters. The Task Report controllers do this correctly
  (`Number.isInteger(report_id)` -> clean 400), so the pattern exists but was not applied here.
* **Impact:** Inconsistent error contract; 500s where 400s belong.
* **Related failing tests:** CO-016, CUS-037.

---

### BUG-011

* **Module:** Tasks / Validation
* **Feature:** Task priority and date validation
* **Role:** Manager
* **Severity:** MEDIUM
* **Test:** Create a task with `priority: "SUPER_URGENT"`; with `due_date: "notadate"`;
  with `due_date` earlier than `start_date`
* **Expected:** 400 for all three
* **Actual:** `SUPER_URGENT` -> **201, persisted**; `notadate` -> **500**;
  backwards dates -> **201 accepted**
* **Database observation:**
  ```
  priority     | count
  Medium       |     2
  High         |     1
  SUPER_URGENT |     1
  Low          |     1
  ```
* **Possible root cause:** `createTask` whitelists neither `priority` (it only defaults to
  `"Medium"`) nor validates dates, and there is no CHECK constraint on the column.
* **Impact:** Invalid priorities render directly in the Manager Tasks table
  (confirmed visually), break any priority-based sorting or filtering, and the invalid date
  produces a 500 instead of a 400.
* **Related failing tests:** TASK-013, TASK-014, TASK-015.

---

### BUG-012

* **Module:** Tasks / Data Integrity
* **Feature:** Partial task update wipes description and dates
* **Role:** Manager
* **Severity:** HIGH
* **Test:** Update a task sending only `task_id`, `title` and `priority`
* **Expected:** `description`, `start_date` and `due_date` preserved
* **Actual:** `description` became `null`, `due_date` became `null`
* **Possible root cause:** same pattern as BUG-006 — `updateTask` uses `COALESCE` for `title`,
  `priority` and `status`, but assigns `description = $2`, `start_date = $4`, `due_date = $5`
  directly with `value || null`.
* **Impact:** Silent data loss. The Manager Tasks UI "Edit" flow will destroy a task's
  description and schedule unless every field is resubmitted. Directly visible in testing:
  the task "Alpha Main Task v2" lost its description and due date after a title-only edit.
* **Related failing test:** TASK-025.

---

### BUG-013

* **Module:** UI / Meetings / Tasks
* **Feature:** Date rendering
* **Role:** Manager
* **Severity:** HIGH
* **Test:** Schedule a meeting for `2026-10-15` via the UI, then view the Meetings tab
* **Expected:** `15/10/2026` or similar formatted local date
* **Actual:** **`2026-10-14T18:30:00.000Z`** — a raw ISO string, showing **the day before**
* **Database observation:** `meetings.meeting_date = 2026-10-15` (correct in the DB)
* **Other instances:** meeting `2026-09-18` renders as `2026-09-17T18:30:00.000Z`;
  meeting `2020-01-01` renders as `2019-12-31T18:30:00.000Z`; task due date `2026-09-01`
  renders as `2026-08-31T18:30:00.000Z` in the Manager Tasks table.
* **Possible root cause:** the `DATE` column arrives as a JS `Date` at local midnight and is
  rendered without formatting; serialisation to UTC shifts it back by the IST offset (+05:30),
  producing both the raw string and the off-by-one day.
* **Impact:** **Every date in the CRM is displayed one day early.** Users will attend meetings
  on the wrong day and miss deadlines. This is user-visible on the two busiest Manager screens.

---

### BUG-014

* **Module:** Task Reports / Workflow
* **Feature:** Manager visibility of task reports
* **Role:** Manager
* **Severity:** HIGH (functional gap, by design but incomplete)
* **Test:** As the Manager who created the task, read a report submitted under it
* **Expected:** the Manager who owns the task should be able to see the resulting work reports
* **Actual:** **HTTP 403 "Only Team Lead can view report details"**
* **API:** `GET /task-report/:id`, `GET /task-report/team-lead`
* **Possible root cause:** every report-reading endpoint is gated to
  `authUser.role !== ROLES.TEAM_LEAD -> 403`. There is **no Manager-facing report endpoint and
  no Manager Reports page** in the frontend.
* **Impact:** The workflow described in the requirements — "Manager/Team Leader views Report" —
  is only half implemented. A Manager can create and assign work but can never see the reports
  it produces. Note the inconsistency: a Manager **can** download a report *attachment*
  (`downloadReportAttachment` explicitly allows `isCompanyManager`) but cannot read the report
  text it belongs to.
* **Related test:** MIG-009 (recorded PASS against the code's actual intent, reported here as a
  workflow gap).

---

### BUG-015

* **Module:** Leads / UI
* **Feature:** "Requirement" field is a phantom
* **Role:** Manager
* **Severity:** HIGH (silent data loss)
* **Test:** Create a lead through the UI, typing `REQUIREMENT-CANARY-123` into "Requirement"
* **Expected:** the value is stored and displayed
* **Actual:** the Requirement column renders **blank**; the value is nowhere in the database
* **Database observation:**
  ```
  id | lead_name    | company_name | phone      | email          | source | remarks | status
   3 | UI Test Lead | UI LeadCo    | 9700005555 | uilead@qa.test |        |         | Pending
  ```
  No column holds `REQUIREMENT-CANARY-123`.
* **Possible root cause:** `Frontend/src/pages/manager/Meetings.jsx` has `requirement` in
  `leadForm` (line 61), an input bound to it (line 1477), a table column (line 956) and a detail
  field (line 1676). But `leads` has **no `requirement` column**, and `leadController` never
  reads or writes it. Confirmed: `grep -rn "requirement" Backend/src/` returns nothing.
* **Impact:** Sales staff type the most important qualifying information about a prospect into a
  field that throws it away, with no error. The column then always displays empty, which looks
  like a rendering bug rather than data loss.

---

### BUG-016

* **Module:** UI / Login
* **Feature:** Enter key does not submit the login form
* **Role:** Public
* **Severity:** MEDIUM
* **Test:** Type credentials, press Enter
* **Expected:** login submits
* **Actual:** nothing happens; the previous error message remains and no network request is made
* **Possible root cause:** `Login.jsx` has no `<form>` element — the fields are loose `<input>`s
  and the Login button is `<button onClick={handleLogin}>` with no `type="submit"`.
* **Impact:** Breaks the single most common interaction in the whole application. Also disables
  browser password-manager autofill heuristics that rely on a form element.

---

### BUG-017

* **Module:** UI / Leads
* **Feature:** Lead list not refreshed after creating a meeting
* **Role:** Manager
* **Severity:** MEDIUM
* **Test:** Create a meeting from a lead, then look at the Leads tab
* **Expected:** the lead shows "Meeting Scheduled"
* **Actual:** it still shows "Pending"
* **Database observation:** `leads.status = 'Meeting Scheduled'` — the backend did its job
* **Possible root cause:** the meeting-save handler refreshes the meeting list but not the lead
  list.
* **Impact:** The Manager sees stale pipeline state and may schedule duplicate meetings.

---

### BUG-018

* **Module:** UI / Leads
* **Feature:** Converted / Closed leads become permanently invisible
* **Role:** Manager
* **Severity:** MEDIUM
* **Test:** Convert a lead, then look for it in the Leads tab
* **Expected:** findable, e.g. via a status filter
* **Actual:** "No Leads Found", **Total 0** — while the Manager Dashboard simultaneously
  reports "Leads: 1"
* **Possible root cause:** `Meetings.jsx` filters the table to
  `status === "Pending" || status === "Future Business"`, and the page offers no other filter.
* **Impact:** Once a lead reaches Meeting Scheduled, Converted or Closed it can never be viewed,
  edited or reactivated from the UI again — the backend endpoints exist but are unreachable.
  The contradiction with the dashboard count also looks like a data bug to users.

---

### BUG-019

* **Module:** UI / Meetings
* **Feature:** Meeting modal offers ineligible leads
* **Role:** Manager
* **Severity:** LOW
* **Test:** Open Schedule Meeting and inspect the Lead dropdown
* **Expected:** only leads eligible for a meeting
* **Actual:** the dropdown lists Converted leads (e.g. "Alpha Lead One"), and selecting one
  produces backend `400 "Meeting Cannot Be Created For This Lead"`
* **Possible root cause:** the dropdown is populated from `allLeads`, not the filtered
  `activeLeads`.
* **Impact:** Avoidable dead-end error.

---

### BUG-020

* **Module:** UI / Routing
* **Feature:** Unknown route while authenticated
* **Role:** All
* **Severity:** LOW
* **Test:** As a logged-in Admin, visit `/totally/unknown/route`
* **Expected:** redirect to the user's own dashboard, or a 404 page
* **Actual:** redirected to `/login`, which makes an authenticated user appear logged out
* **Possible root cause:** the catch-all route is `<Route path="*" element={<Navigate to="/login" />} />`
  with no auth awareness.

---

### BUG-021

* **Module:** API / Health
* **Feature:** Health check does not check anything
* **Role:** Anonymous
* **Severity:** LOW
* **Test:** `GET /api/v1/health`
* **Expected:** the reported database status reflects a real probe
* **Actual:** always returns `"database":"Connected"`
* **Possible root cause:** `healthController.healthCheck` is a synchronous function returning a
  hardcoded object; it never touches the `pg` pool.
* **Impact:** The endpoint cannot be used for monitoring or load-balancer health checks — it
  would report "Connected" during a total database outage.

---

### BUG-022

* **Module:** Security / Error Handling
* **Feature:** 404 reflects raw request URL
* **Role:** Anonymous
* **Severity:** LOW
* **Test:** `GET /api/v1/no-such-route`
* **Actual:** `{"success":false,"message":"Route Not Found - /api/v1/no-such-route"}`
* **Impact:** Minor reflected-input surface; harmless as JSON but poor practice.

---

### BUG-023

* **Module:** Password Reset
* **Feature:** No token delivery mechanism
* **Role:** Public
* **Severity:** HIGH
* **Test:** Complete the Forgot Password -> Reset Password journey as a real user
* **Expected:** the user receives a reset link/token
* **Actual:** `/forgot-password` returns the generic success message, but **there is no email
  infrastructure**. The token is only returned in the response when
  `ALLOW_RESET_TOKEN_IN_RESPONSE=true`, which is **not set in `Backend/.env`**. The
  `/reset-password` page requires the user to **type a "Reset Token"** they have no way to obtain.
* **Compounding factor:** in the live database the `password_resets` table does not exist
  (BUG-001), and `forgotPassword` swallows the resulting error and still returns 200 — so a real
  user gets "a password reset link has been generated" while **nothing was generated at all**.
* **Impact:** Password reset is completely non-functional for real users, and fails silently
  with a success message. Verified working end-to-end only in the sandbox with the migration
  applied and the dev flag enabled.
* **Related failing test:** RESET-065.

---

### BUG-024

* **Module:** Security / Session management
* **Feature:** JWT not revoked on password change or reset
* **Role:** All
* **Severity:** MEDIUM
* **Test:** Capture a JWT, change the password, then reuse the old JWT
* **Expected:** 401 — changing a password should end other sessions
* **Actual:** **HTTP 200**, the old token still works until its natural `exp` (1 day)
* **Possible root cause:** stateless JWTs with no server-side session store, no token version
  column, no `jti` denylist, and no `/auth/logout` endpoint (confirmed: `POST /auth/logout`
  returns 404). Logout only clears `localStorage`.
* **Impact:** A user who changes their password because they believe it is compromised does
  **not** evict the attacker — the stolen token stays valid for up to 24 hours.
* **Related failing tests:** PWD-060, RST-012.

---

### BUG-025

* **Module:** Security / Authentication
* **Feature:** No brute-force protection
* **Role:** Anonymous
* **Severity:** HIGH
* **Test:** 30 consecutive failed logins against one account
* **Expected:** throttling, lockout or 429 after N attempts
* **Actual:** 30 plain `401`s, no delay, no lockout, no 429
* **Impact:** Passwords can be attacked at full network speed. Combined with BUG-026 (no
  complexity policy, `12345678` accepted) this is a realistic account-takeover path.
* **Related failing test:** SEC-084.

---

### BUG-026

* **Module:** Registration / Security
* **Feature:** No password complexity policy
* **Role:** Public
* **Severity:** MEDIUM
* **Test:** Register with password `12345678`
* **Expected:** 400
* **Actual:** **201 accepted**
* **Possible root cause:** only `length >= 8` is checked (`MIN_PASSWORD_LENGTH`).
* **Related failing test:** REG-014.

---

### BUG-027

* **Module:** Registration / Validation
* **Feature:** Name field validation
* **Role:** Public
* **Severity:** MEDIUM
* **Test:** Register with `first_name: "   "`, `first_name: 12345`,
  `first_name: "<script>alert(1)</script>"`, `first_name` of 50 000 characters
* **Actual:** whitespace-only -> **201, stored as an empty name** (visible as a blank row in the
  Admin Pending Users UI); numeric -> 201; XSS payload -> 201 stored raw;
  50 000 chars -> **HTTP 500**
* **Possible root cause:** `!first_name` is checked **before** trimming, so `"   "` passes; there
  is no type check, no maximum length and no sanitisation.
* **Impact:** Nameless users in the UI, and a 500 instead of a 400 on oversized input.
* **Related failing tests:** REG-019, REG-021, REG-025, REG-027.

---

### BUG-028

* **Module:** Customers
* **Feature:** No duplicate-customer detection
* **Role:** Manager
* **Severity:** MEDIUM
* **Test:** Create the same customer (identical name and phone) twice
* **Expected:** 400 or a warning
* **Actual:** 201 both times — two identical live customers
* **Impact:** Duplicate customer records accumulate silently; note the contrast with leads,
  where duplicate detection is *too* aggressive (BUG-007). The two modules are inconsistent.
* **Related failing test:** CUS-010.

---

### BUG-029

* **Module:** End-to-End / Tasks
* **Feature:** No parent-task roll-up
* **Role:** Manager, Team Lead
* **Severity:** MEDIUM
* **Test:** Complete every child split task under an assignment, then inspect the parent
* **Expected:** the parent task and/or the assignment reflect completion
* **Actual:** parent task status = `Pending`, assignment status = `Pending`
* **Possible root cause:** approving a report sets `split_tasks.status = 'Completed'` but nothing
  propagates upward to `task_assignments.status` or `tasks.status`.
* **Impact:** The Manager's task board and dashboard never show work as finished — the Manager
  dashboard reported `Tasks by Status: Pending 3, Completed 0` while split tasks underneath were
  fully completed and approved. Someone must update the parent by hand, and there is no UI
  prompt to do so.
* **Related failing test:** WF-006.

---

### BUG-030

* **Module:** Authentication / Deployment
* **Feature:** No way to create the first Admin
* **Role:** N/A (fresh install)
* **Severity:** HIGH (deployment blocker)
* **Test:** On an empty database, attempt to obtain an Admin account through the application
* **Steps to reproduce:**
  1. Start with an empty `users` table.
  2. Register a user — they are always created with `role = NULL`, `company_id = NULL`.
  3. `POST /auth/change-role` requires the caller to already be an Admin or Manager.
* **Expected:** a seed script, bootstrap endpoint, or documented procedure
* **Actual:** **403 "You are not authorized to perform this action"** — no path exists.
  There is no seed script in the repository and `npm test` is a stub.
* **Impact:** The application **cannot be deployed from scratch** without manually running
  `UPDATE users SET role='Admin' WHERE id=1;` directly in PostgreSQL. This is undocumented.
  (Testing had to do exactly this in the sandbox to proceed.)
* **Related test:** BOOT-045 (recorded PASS — the 403 is correct security behaviour; the
  *absence of any alternative* is the defect).

---

## 11. Critical Issues

| ID | Issue | Why it is critical |
|---|---|---|
| **BUG-001** | **Task Report module is 100 % non-functional in the live database** — migration `001` never applied; `task_reports.attachment_*` columns and the `password_resets` table do not exist. | Kills the CRM's core workflow. Employees/Interns cannot open or report on tasks; Team Leads cannot review. Every affected endpoint returns HTTP 500. Also silently breaks password reset. |
| **BUG-005** | **Employee and Intern can update and delete any customer in their company.** | Privilege escalation + irreversible data loss, reachable by the lowest-privileged authenticated role using guessable sequential ids. Verified: an Intern successfully soft-deleted a Manager's customer. |

**No authentication bypass, no authorization bypass across companies, and no cross-company data
leak were found.** Multi-tenant isolation held on 22/22 cross-company attempts and in every
database-level integrity check.

---

## 12. High Priority Issues

| ID | Issue |
|---|---|
| BUG-002 | Backend performs **no phone validation at all** on registration (frontend-only rule). |
| BUG-003 | Same missing phone validation on profile update. |
| BUG-004 | No email/phone format validation on customer creation; over-length phone -> 500. |
| BUG-006 | Partial customer update **nulls out every unsupplied field** (silent data loss). |
| BUG-012 | Partial task update **nulls out description and dates** (silent data loss). |
| BUG-013 | **Every date renders one day early**, as a raw ISO string, in Meetings and Tasks. |
| BUG-014 | Manager cannot view task reports anywhere — the "Manager views Report" workflow is unimplemented. |
| BUG-015 | Lead "Requirement" field is a phantom — user input silently discarded. |
| BUG-023 | Password reset has **no token delivery**, and currently fails silently with a success message. |
| BUG-025 | No brute-force protection on login (30 failed attempts, no throttling). |
| BUG-030 | **No way to create the first Admin** — fresh deployment is impossible without manual SQL. |

---

## 13. Medium Priority Issues

| ID | Issue |
|---|---|
| BUG-007 | Lead duplicate check is global -> cross-tenant existence oracle + blocks legitimate leads. |
| BUG-008 | Invalid meeting date/time -> HTTP 500 instead of 400. |
| BUG-009 | Non-string password -> HTTP 500 on the login endpoint. |
| BUG-010 | Non-numeric IDs -> HTTP 500 on company/customer details. |
| BUG-011 | No task priority whitelist (`SUPER_URGENT` persisted); invalid due date -> 500; backwards date range accepted. |
| BUG-016 | Enter key does not submit the login form. |
| BUG-017 | Lead list not refreshed after creating a meeting (stale status shown). |
| BUG-018 | Converted/Closed leads permanently invisible in the UI; contradicts the dashboard count. |
| BUG-024 | JWT not revoked on password change or reset; no logout endpoint. |
| BUG-026 | No password complexity policy (`12345678` accepted). |
| BUG-027 | Whitespace-only / numeric names accepted; 50 000-char name -> 500. |
| BUG-028 | No duplicate-customer detection. |
| BUG-029 | No parent-task roll-up when all child split tasks complete. |

---

## 14. Low Priority Issues

| ID | Issue |
|---|---|
| BUG-019 | Meeting modal lists ineligible (Converted/Closed) leads. |
| BUG-020 | Unknown route while authenticated redirects to `/login`. |
| BUG-021 | `/health` reports a hardcoded `"database":"Connected"` without probing the pool. |
| BUG-022 | 404 body reflects the raw request URL. |
| — | Past-dated meetings are accepted (`2020-01-01`) — may be intentional for back-dating. |
| — | XSS payloads stored unsanitised (currently inert because React escapes on render). |
| — | `/login` renders while already authenticated instead of redirecting. |
| — | Manager dashboard "Team Members: 5" vs. "Team Composition" totalling 4 (manager counted in one, not the other). |
| — | `users.status` column is dead — only `is_active` is used. |
| — | No rate limiting on `/auth/forgot-password`. |

---

## 15. Blocked / Not Tested

| ID | Module | What could not be tested | Status | Why / dependency | What is required |
|---|---|---|---|---|---|
| RPT-097 | Task Reports | Team Lead reads report details | BLOCKED | No report could be created (BUG-001) | Apply migration 001 |
| ISO-098 | Company Isolation | Team Lead B reads Company A report | BLOCKED | Same | Apply migration 001 |
| RPT-099 | Task Reports | Manager reads a report | BLOCKED | Same | Apply migration 001 |
| ISO-100 | Company Isolation | Team Lead B approves Company A report | BLOCKED | Same | Apply migration 001 |
| RPT-101 | Task Reports | Invalid review action | BLOCKED | Same | Apply migration 001 |
| RPT-102 | Task Reports | Rework without remarks | BLOCKED | Same | Apply migration 001 |
| RPT-103 | Task Reports | Send report back for rework | BLOCKED | Same | Apply migration 001 |
| RPT-104 | Task Reports | Rework status reaches the worker | BLOCKED | Same | Apply migration 001 |
| RPT-106 | Task Reports | Approve a resubmitted report | BLOCKED | Same | Apply migration 001 |
| RPT-107 | Task Reports | Re-review an already-reviewed report | BLOCKED | Same | Apply migration 001 |
| RPT-108 | Task Reports | Approval sets split task Completed | BLOCKED | Same | Apply migration 001 |
| RPT-111 | Task Reports | Employee reads own report detail | BLOCKED | Same | Apply migration 001 |
| ISO-112 | Company Isolation | Employee B reads Company A report detail | BLOCKED | Same | Apply migration 001 |
| AUTHZ-113 | Authorization | Intern reads Employee's report detail | BLOCKED | Same | Apply migration 001 |
| RPT-114 | Task Reports | Download attachment when none exists | BLOCKED | Same | Apply migration 001 |
| SEC-085 | Authentication | Disabled-account login (in the main suite) | NOT TESTED (in that suite) | Needed a DB flag toggle | **Subsequently tested and PASSED** as DIS-001 on the second instance |

**All 15 BLOCKED tests were later executed successfully against the sandbox with migration 001
applied** (tests MIG-001 … MIG-047, all PASS). They are recorded as BLOCKED because they could
not be exercised against the schema as it exists in the live database today.

### Not covered by this test pass (declared honestly)

* **Load / performance / concurrency testing** — not requested and not performed. No connection-pool
  exhaustion, race-condition or throughput testing was done.
* **Email delivery** — no email infrastructure exists in the project (BUG-023).
* **Real database-outage behaviour** — not simulated, as it would require stopping the user's
  PostgreSQL service.
* **Mobile/responsive layout and accessibility** — not in the requested scope.
* **Screenshots** — the browser pane could not composite frames in this environment, so UI
  verification was done via accessibility-tree reads and page-text extraction (which is in fact
  stricter for verifying text and structure).
* **The 3 real users in the live database** — their passwords are unknown, so no test was
  performed using a real account. All testing used purpose-created accounts.

---

## 16. End-to-End Workflow Results

| # | Workflow | Result | Notes |
|---|---|---|---|
| 1 | Registration -> Login -> Dashboard -> Profile -> Logout | **PASS** | New users correctly land with no role; dashboard returns 403 "awaiting role assignment"; profile readable. Logout is client-side only (no `/auth/logout` endpoint — BUG-024). |
| 2 | Admin -> create Company -> register User -> assign Manager role -> user logs in | **PASS** | End-to-end verified; the new Manager received a correctly scoped Manager dashboard. |
| 3 | Manager: Customer -> Task -> assign Team Lead; TL: split; Employee: start -> report; TL: approve | **PASS** (post-migration) / **FAIL** (live schema) | Every step verified. **In the live database this fails at "Employee submits report" with HTTP 500** (BUG-001). |
| 4 | Manager assigns task -> Team Lead forwards/reassigns -> new worker receives it | **PASS** | Reassigning a split task from Employee to Intern worked; the Intern gained it and the Employee lost it. |
| 5 | Task -> split -> complete child tasks -> parent task behaviour | **FAIL** | Child tasks completed and approved, but the parent task and assignment both remained `Pending`. No roll-up logic exists (BUG-029). |
| 6 | Password change -> old password fails -> new password works | **PASS** | Correct. But the **old JWT remains valid** (BUG-024). |
| 7 | Company A creates a customer -> Company B attempts access | **PASS — ACCESS DENIED** | 403 on details, update and delete. |
| 8 | Company A creates a task -> Company B attempts access | **PASS — ACCESS DENIED** | 403 on details, update, delete, assigned-workers, assignment status, split list/update/status, worker details, start, report submit. |
| 9 | Full UI workflow: Employee starts task -> submits report in the modal -> TL views -> approves | **PASS** (post-migration) | Verified in the browser: status went Pending -> In Progress -> Submitted -> Approved, with the Team Lead's detail modal showing the submitted text. |
| 10 | Cross-company denial sweep across 22 endpoints | **PASS** | **22/22 denied** (403 or 404). |
| 11 | Forgot password -> reset -> old password fails -> new works -> token single-use | **PASS** (sandbox, migration + dev flag) / **FAIL** (live) | Logic is correct and secure, but unusable in production (BUG-001, BUG-023). |
| 12 | Regression re-run of all major workflows after full test suite | **PASS** | All previously working functionality still worked; data integrity checks all clean. |

---

## 17. Final Verdict

# NOT READY — CRITICAL ISSUES

### Basis for this decision — actual test results only

**What blocks release:**

1. **BUG-001 (CRITICAL).** Migration `001` has never been applied to the live `enterprise_crm`
   database. Verified directly: `task_reports` has 10 columns and none of the four
   `attachment_*` columns; `to_regclass('public.password_resets')` returns NULL. As a result
   **five endpoints return HTTP 500 on every call in the live deployment**, and the CRM's central
   workflow — Employee/Intern submits a report, Team Lead reviews it — cannot run at all.
   Password reset is broken by the same cause and, worse, **fails silently while telling the user
   it succeeded**.

2. **BUG-005 (CRITICAL).** Employees and Interns can update and delete any customer in their
   company. Demonstrated, not theorised: an Intern's API call returned
   `200 "Customer Deleted Successfully"` and the record was genuinely removed from the Manager's
   view.

Plus **11 HIGH** issues, including two independent silent-data-loss defects on partial update
(BUG-006, BUG-012), a date display that is **wrong by one day everywhere** (BUG-013), a lead
field that discards user input (BUG-015), absent backend phone validation (BUG-002/003/004),
no brute-force protection (BUG-025), and **no way to create the first Admin on a fresh install**
(BUG-030).

### What is genuinely good — and should be said plainly

This application is **not** in poor shape overall. 409 of 473 tests passed, and the areas that
usually fail hardest in a CRM held up under deliberate attack:

* **Multi-tenant isolation is solid.** 22/22 cross-company write/read attempts denied. Zero
  cross-tenant contamination at the database level. `company_id` is always derived from the
  authenticated user's row, never from the request body — tenant injection was attempted and
  blocked.
* **Authentication and JWT handling are strong.** `alg=none`, wrong-signature, expired and
  payload-tampered tokens were all rejected 401. Roles are re-read from the database on every
  request, so a stale token cannot retain revoked privileges.
* **SQL injection is not exploitable** anywhere — parameterised queries throughout.
* **Mass assignment is blocked** — `role`, `company_id` and `is_active` sent in request bodies
  were verified ignored at the database level.
* **File upload security is well built** — MIME whitelist, random generated filenames,
  size limits, and path traversal (`../../../../server.js`) confirmed neutralised.
* **Relational integrity is clean** — zero orphans, zero duplicates, correct FK relationships.
* **Dashboard figures are real counts** and match the list endpoints exactly.
* **Intern is correctly implemented as a distinct role**, not silently aliased to Employee.

### The most important conclusion

**The Task Report module's code is correct.** This was established experimentally, not assumed:
after applying migration `001` to the sandbox clone, **all 47 re-tests of that module passed**,
including the rework loop, approval cascade, attachment upload/download and every authorisation
and isolation check.

So the single highest-impact item standing between this build and a working system is not a
rewrite — it is **applying one migration file that is already written and sitting in the
repository**: `Backend/src/database/migrations/001_password_reset_and_report_attachments.sql`.

That, plus a role check on two customer endpoints, would move this application from
"core workflow dead" to "working, with a list of fixable defects."

---

## Appendix A — Environment restoration

Confirmed after testing completed:

* `git status --porcelain` -> empty. `git log -1` -> `725c99c`. **No source file was modified.**
* Live `enterprise_crm`: 1 company, 3 users, 0 customers, 0 leads, 0 meetings, 0 tasks,
  0 task_assignments, 0 split_tasks, 0 task_reports — **identical to the pre-test state.**
* Sandbox database `enterprise_crm_qa` dropped.
* Test files removed from `Backend/uploads/` (directory back to `.gitkeep` only).
* All test server processes stopped.
* The user's own backend (port 5000) and frontend (port 5173) were left running and untouched,
  both verified responding HTTP 200 afterwards.

## Appendix B — Recommended fix order (informational only; nothing was changed)

1. Apply `001_password_reset_and_report_attachments.sql` to `enterprise_crm` — unblocks BUG-001
   and BUG-023, and restores the core workflow.
2. Add a Manager-only role check to `customerController.updateCustomer` and `deleteCustomer` —
   closes BUG-005.
3. Fix the two partial-update statements to use `COALESCE` consistently — closes BUG-006 and BUG-012.
4. Format dates on render — closes BUG-013.
5. Add backend phone/email/date/priority validation — closes BUG-002/003/004/008/011.
6. Document (or script) first-Admin creation — closes BUG-030.
