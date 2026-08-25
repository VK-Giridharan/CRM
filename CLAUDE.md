# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is an "Enterprise CRM" with two independent apps and no root package.json/workspace — install and run each separately:

- `Backend/` — Express 5 REST API (CommonJS)
- `Frontend/` — React 19 + Vite + Tailwind CSS 4 SPA

## Commands

### Backend (run from `Backend/`)
```
npm run dev     # start with nodemon (auto-restart)
npm start       # start with node
```
There is no test suite configured (`npm test` is a stub that exits 1) and no linter config in the repo.

### Frontend (run from `Frontend/`)
```
npm run dev       # Vite dev server
npm run build     # production build
npm run preview   # preview the production build
```
No test suite or linter is configured here either.

### Database
Backend expects a running PostgreSQL instance matching `Backend/.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=enterprise_crm`). There are no migration files or a Prisma schema in the repo — the `users`, `companies`, `customers`, `leads`, tasks/split-tasks, and meetings tables are assumed to already exist in that database. `@prisma/client` and `multer` are listed as backend dependencies but are unused in `src/` — all DB access goes through a raw `pg.Pool` (see below), and there's no file-upload route despite the `uploads/` folder.

## Backend architecture

**Request flow:** `server.js` loads env vars, tests the DB connection, then starts `src/app.js` (the Express app: `cors`, `helmet`, `morgan("dev")`, JSON/urlencoded body parsing, then routes, then `notFoundMiddleware`, then `errorMiddleware` — in that order, always last).

**No ORM.** `src/database/connection.js` exports a single `pg.Pool`. Every controller does `pool.query(sql, params)` with parameterized `$1, $2, ...` placeholders directly — there is no query builder or model layer. Follow this pattern for new controllers rather than introducing an ORM.

**Route → Controller pairing.** Each resource has one `routes/xRoutes.js` + one `controllers/xController.js` (auth, company, customer, task, lead, meeting, taskReport, health). Almost all endpoints are `POST` with action-style paths rather than REST verbs/resource-ids — e.g. `POST /task/create`, `POST /task/list`, `POST /task/details`, `POST /task/update`, `POST /task/delete`, `POST /task/change-status`. `taskReportRoutes.js` is the one exception using `GET`/`:id` params. Match the existing style for the resource you're editing (check the sibling routes file) rather than mixing conventions within one resource.

**Two auth middlewares that do the same thing:** `middleware/authMiddleware.js` and `middleware/verifyToken.js` both verify the `Authorization: Bearer <token>` JWT and set `req.user = decoded`. `authRoutes.js`/`companyRoutes.js` use `authMiddleware`; `customerRoutes.js`/`leadRoutes.js`/`meetingRoutes.js`/`taskRoutes.js`/`taskReportRoutes.js` use `verifyToken`. When adding routes to a given resource file, match whichever one that file already imports rather than picking either arbitrarily.

**No role-checking middleware.** Roles (`Admin`, `Manager`, `Team Lead`, `Employee`, `Intern`) are stored on the `users` row and embedded in the JWT (`id`, `role`, `company_id`) at login (`authController.login`), but authorization logic is written ad hoc inside each controller (e.g. `authController.changeRole` branches on `currentUser.role === "Admin" | "Manager"`). There's no reusable `requireRole()` helper — add one if you're introducing a new role check in more than one place, otherwise follow the inline-branch pattern used in `authController.js`.

**Multi-tenancy via `company_id`.** Most non-admin queries scope data by `company_id`. Controllers re-fetch the logged-in user's `company_id` from the `users` table on every request (`SELECT company_id FROM users WHERE id = $1`) rather than trusting the `company_id` embedded in the JWT — preserve this re-fetch pattern in new controllers so a role/company change takes effect without requiring re-login.

**Controller response shape.** Handlers return `{ success, message, data }` (or `{ success, count, data }` for lists) directly via `res.status(...).json(...)`; `utils/response.js` (`successResponse`/`errorResponse`) exists but is only used by `healthController.js` so far — prefer it for new controllers if you want consistency, but don't refactor existing controllers to use it unless asked.

## Frontend architecture

**Role-driven routing.** `src/routes/AppRoutes.jsx` defines one route subtree per role — `/admin`, `/manager`, `/teamleader`, `/employee`, `/intern` — each wrapped in `ProtectedRoute` (only checks a token exists in `localStorage`, does **not** check role) around `DashboardLayout` (`Sidebar` + `Header` + `<Outlet/>`). `src/components/layout/Sidebar.jsx` reads `user` from `localStorage` and conditionally renders nav links per `user.role`. **These two files must be kept in sync manually** — adding a page for a role means adding both the `<Route>` in `AppRoutes.jsx` and the `<Link>` in `Sidebar.jsx`; nothing enforces the pairing.

**Auth state** is plain `localStorage` (`token` + JSON-stringified `user`), no context/store. `src/services/api.js` is a single axios instance (`baseURL: "http://localhost:5000/api/v1"`, hardcoded — no env var) with a request interceptor that attaches `Authorization: Bearer <token>` from `localStorage` automatically.

**Services layer:** one file per backend resource under `src/services/` (`authService.js`, `taskService.js`, etc.), each just a thin wrapper that calls `api.post(...)`/`api.get(...)` and returns `response.data`. Pages call these service functions directly — there's no additional state-management or data-fetching layer (no React Query/Redux).

**Pages are organized by role**, not by feature: `src/pages/{admin,manager,teamleader,employee,intern}/*.jsx`. When a feature exists for multiple roles (e.g. Profile, Tasks), each role gets its own page component rather than one shared component with role-conditional rendering — follow this when adding a page rather than trying to unify them.
