# Contacts App

A full-stack CRUD app: React UI, Express REST API, PostgreSQL/SQLite database, deployed
to Google Cloud Run via GitHub Actions CI/CD.

**Live URLs:** the API and client are deployed to Cloud Run. The Cloud SQL database is
paused between demos to avoid idle billing — see [Deployment](#deployment) to wake it.

## Features

- Create, read, update, delete contacts (`firstName`, `lastName`, `email`, `phone`, `tags`)
- Paginated, searchable, sortable list view
- Client + server-side validation, structured error responses
- Delete confirmation, success/error toasts
- Data persists through page refresh — sourced from the API, not browser storage

## Stack

React (Vite) · Node.js / Express · PostgreSQL (Cloud SQL) / SQLite (`node:sqlite`) ·
Docker · GitHub Actions · Google Cloud Run

## Run locally

```bash
# API
cd server
npm install && npm run migrate && npm run seed
npm run dev          # http://localhost:8080

# UI (separate terminal)
cd client
npm install && npm run dev   # http://localhost:5173
```

Requires Node.js 22+. Full step-by-step walkthrough:
[`docs/LOCAL_SETUP_WALKTHROUGH.md`](./docs/LOCAL_SETUP_WALKTHROUGH.md).

## Run with Docker

```bash
docker compose up --build
```

Then visit `http://localhost:5173`. Seed sample data:
```bash
docker compose exec api node --no-warnings src/db/seed.js
```

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/contacts` | Create |
| GET | `/api/contacts?q=&page=&pageSize=&sort=&order=` | List, search, paginate |
| GET | `/api/contacts/:id` | Get one |
| PUT / PATCH | `/api/contacts/:id` | Update (full / partial) |
| DELETE | `/api/contacts/:id` | Delete |
| GET | `/api/health` | Liveness check |

## Testing

```bash
cd server && npm test
```

## Deployment

Pushes to `main` trigger [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
build → push images to Artifact Registry → deploy to Cloud Run (API connects to Cloud
SQL via a private Unix socket; credentials via Google Secret Manager, never hardcoded).

Wake the database before testing the live deployment:
```bash
gcloud sql instances patch contacts-db --activation-policy=ALWAYS
```