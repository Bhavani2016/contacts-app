# Local Setup Walkthrough — Database → API → UI → Docker → Deployment

Work through these in order. Each section has: **what to run**, **what just happened**,
and **how to explain it in an interview**.

Prerequisite: Node.js 22+ installed (`node -v` should show v22.x or higher — this
matters because the API uses Node's built-in SQLite module, which needs 22+).

---

## STEP 1: The Database

### What to run

```bash
cd server
npm install
npm run migrate
npm run seed
```

### What just happened

- `npm install` downloaded the server's dependencies (Express, pg, etc.) into `node_modules`.
- `npm run migrate` ran `src/db/migrate.js`, which connects to the database and runs
  `CREATE TABLE IF NOT EXISTS contacts (...)`. This is the **schema** — the shape of
  your data — being created.
- `npm run seed` ran `src/db/seed.js`, which inserts 12 sample contacts (Ada Lovelace,
  Grace Hopper, etc.) so you have data to look at immediately.

By default this uses **SQLite** via Node's built-in `node:sqlite` module, and writes a
file at `server/data/contacts.db`. You can open that file with any SQLite viewer if
you want to literally see your rows.

```bash
# optional: peek at the raw data
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('./data/contacts.db'); console.log(db.prepare('SELECT first_name,last_name,email FROM contacts').all());"
```

### How to explain this in an interview

> "I separated the database layer behind a repository interface — `create`, `findById`,
> `list`, `update`, `remove`. There are two implementations of that interface: one for
> SQLite, one for Postgres. The rest of the app — the routes, the validation — doesn't
> know or care which one is active. That's the **repository pattern**: it decouples
> business logic from the specific database technology, so swapping Postgres for SQLite,
> or SQLite for MongoDB later, only touches one file."

**Why SQLite for local dev, Postgres for production?**
> "SQLite is a single file, zero setup, perfect for local development and the take-home
> demo. Postgres is what you'd actually run in production because it's a real client-server
> database — it handles concurrent writes properly, supports managed cloud hosting (RDS,
> Cloud SQL, Azure Database for PostgreSQL), and gives you proper backups, replication, and
> connection pooling. I designed the repository interface so switching between them is a
> one-line environment variable change (`DB_DRIVER=sqlite` vs `DB_DRIVER=postgres`), not a
> code change."

**What's the schema?**
> "One table, `contacts`: id (UUID primary key), first_name, last_name, email (unique
> constraint — the database itself rejects duplicate emails, not just my application
> code), phone, tags (stored as JSON), created_at and updated_at (both UTC timestamps,
> set by the server, never by the client)."

**Why UTC timestamps?**
> "If you store local time, you get ambiguity — which timezone? Daylight saving shifts?
> UTC is unambiguous and is the standard for anything that might be read by clients in
> different timezones. The UI can convert to local time for display, but storage stays
> in UTC."

---

## STEP 2: The API

### What to run

```bash
cd server
npm test        # run the automated test suite first
npm run dev      # start the API on http://localhost:8080
```

Leave that running, then in a **second terminal**:

```bash
curl http://localhost:8080/healthz
curl "http://localhost:8080/api/contacts?page=1&pageSize=5"
curl -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com"}'
```

### What just happened

- `npm test` runs 11 integration tests (in `test/contacts.test.js`) that spin up the
  real Express app in-memory and hit every route — create, list, search, pagination,
  update, patch, delete, and the validation/conflict error paths. They should all pass.
- `npm run dev` starts the actual server, listening on port 8080.
- The `curl` commands are you, acting as a "client," sending real HTTP requests:
  - `GET /healthz` → a simple liveness check (cloud platforms ping this to know if
    your container is alive).
  - `GET /api/contacts` → list contacts with pagination.
  - `POST /api/contacts` → create a new contact. Try sending an invalid one (e.g. missing
    email) and see the structured `422` error response.

### How to explain this in an interview

**What's the API's job?**
> "It's a REST API over one resource, Contact. Five operations map to five HTTP
> verbs: POST to create, GET to read (both list and single), PUT for a full update,
> PATCH for a partial update, and DELETE. That's standard REST resource modeling."

**Where does validation happen, and why twice (client + server)?**
> "Client-side validation is for *user experience* — instant feedback before a network
> round-trip. Server-side validation is for *correctness and security* — the client can
> be bypassed entirely with a raw curl request or Postman, so the server must enforce
> the same rules independently. I kept the validation rules — name length, email format,
> E.164 phone format — identical on both sides so a user never sees the client say 'looks
> good' and then the server reject it for a different reason."

**Why return 422 vs 400 vs 409?**
> "400 is a malformed request — like invalid JSON. 422 is 'the request was well-formed
> but the data fails validation rules' — used for field-level errors like a bad email
   format. 409 is a conflict — specifically here, a duplicate email, which is a business
   rule about state, not just an input problem. Splitting these makes it possible for the
   client to handle each case differently — e.g. showing a duplicate-email message inline
   versus a generic form error."

**Why the structured error shape `{ code, message, details }`?**
> "It gives the frontend something machine-readable (`code`) to branch logic on, a
> `message` that's safe to show a human, and `details` — an array of field-level errors —
> so the UI can highlight exactly which form fields are wrong, not just show one generic
> banner."

**How does pagination work?**
> "The list endpoint takes `page` and `pageSize` query params, defaults to page 1 size 10,
> and caps `pageSize` at 100 so nobody can request the whole table in one shot. It returns
> `{ items, page, pageSize, total }so the client always knows how many pages exist without
> a second request."

**How is SQL injection prevented?**
> "All queries use parameterized statements — values are passed separately from the SQL
> string, never concatenated into it. The one place that takes user input to build a query
   dynamically is the `sort` field, and that's whitelisted against a fixed list of column
   names before it touches SQL, so a user can't inject arbitrary column names or SQL
   fragments through it."

---

## STEP 3: The UI

### What to run

```bash
cd client
npm install
npm run dev      # starts on http://localhost:5173
```

Make sure the API from Step 2 is still running on port 8080 — the Vite dev server is
configured to proxy `/api/*` requests to `http://localhost:8080` automatically (see
`vite.config.js`), so the browser only ever talks to one origin.

Open `http://localhost:5173` in a browser. Try:
- Searching for "grace" — the list filters.
- Clicking a row — the detail panel slides in.
- Clicking "New contact" — fill the form, submit, watch the success toast.
- Trying to save a contact with an invalid email — see inline validation.
- Deleting a contact — note the confirmation step before it actually deletes.
- Refreshing the page — the data is still there, because it lives in the database,
  not in browser storage.

### What just happened

You're running a **React single-page app** built with Vite. It never talks to the
database directly — it only calls the REST API you started in Step 2, the same way
your `curl` commands did, just through `fetch()` in the browser instead.

### How to explain this in an interview

**Why does refreshing the page not lose data?**
> "Because the UI has no source of truth of its own — it's a thin layer over the API.
> Every list, search, and detail view is fetched fresh from the server. There's
> deliberately no localStorage involved for contact data, only in-memory React state,
> which is what the requirement to 'persist state through page refresh via the API, not
> localStorage' is asking for."

**How does search work without hammering the API on every keystroke?**
> "I debounce the search input — wait 350ms after the user stops typing before firing
> the request. That's a `useDebouncedValue` hook wrapping a `setTimeout`. It cuts request
> volume dramatically on fast typers without making the UI feel laggy."

**Why a slide-in panel instead of a separate page or full-screen modal?**
> "It keeps the list visible as context while you create or edit, and it's the same
> component pattern for create, edit, and view — just three different content states. It
> also makes the delete-confirmation flow simpler: it's a dialog stacked on top, not a
> navigation."

**How does client validation mirror server validation?**
> "Literally the same regex and length rules live in `client/src/validation.js` and
> `server/src/utils/validation.js`. If the server ever rejects something the client
> thought was fine — say, a duplicate email, which the client can't know about until
> it asks the server — the form surfaces the server's error inline on the right field,
> using the `details` array from the structured error response."

**What's the loading/error/empty state strategy?**
> "Three distinct states for the list: loading (skeleton/spinner text), error (with a
> retry button, since a fetch can fail for any number of transient reasons), and empty
> (a message instead of just a blank table, so the user isn't confused about whether
   something broke)."

---

## STEP 4: Docker

*(We'll build this together next — Dockerfiles exist for the API; the client one and
docker-compose are still in progress. Come back to this section once those are finished.)*

### What it will let you do

```bash
docker compose up --build
```

...and have the whole stack — API, and eventually a Postgres container — running with
one command, no local Node install required.

### How to explain this in an interview (preview)

> "Docker packages the app and everything it needs to run — the Node runtime, the exact
> dependency versions — into one image, so 'works on my machine' becomes 'works anywhere
> this image runs.' I used a multi-stage build: one stage installs dependencies, a second,
> smaller stage just copies in the built app and runs it as a non-root user. That keeps
> the final image lean and reduces attack surface."

---

## STEP 5: Cloud Deployment

*(Comes after Docker — we'll deploy the containers to a managed cloud service and discuss
the tradeoffs between a managed database and a containerized one.)*

---

## Quick reference: why each technology choice

| Choice | Why |
|---|---|
| Express | Minimal, unopinionated, the most common Node API framework — easy to read in a review |
| node:sqlite (dev) / Postgres (prod) | Zero-setup local dev, production-grade relational DB in the cloud, same interface for both |
| UUID primary keys | No coordination needed to generate unique IDs across distributed instances, unlike auto-increment |
| React + Vite | Fast dev server, simple static build output for cheap/easy deployment |
| Repository pattern | Decouples business logic from a specific database technology |
| Structured error bodies | Lets the frontend branch on `code`, show `message`, and highlight fields from `details` |
