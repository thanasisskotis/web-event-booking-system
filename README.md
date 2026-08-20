# Εφαρμογή Διαχείρισης Εκδηλώσεων και Ηλεκτρονικών Κρατήσεων στον Παγκόσμιο Ιστό

**Team: Ομάδα Χρηστών 15**
- [Tasos Igglezakis] — AM: [1115202300054]
- [Thanasis Skotis] — AM: [1115202300188]

## Contents

- [Introduction](#introduction)
- [Roles: how they actually work](#roles-how-they-actually-work)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [The recommendation engine](#the-recommendation-engine)
- [Exporting event data](#exporting-event-data)
- [Design decisions & assumptions](#design-decisions--assumptions)
- [Known limitations](#known-limitations)
- [Epilogue](#epilogue)

## Introduction

This is our submission for the ΤΕΔ assignment: build a web app for managing events and handling online ticket bookings, with an admin, organizers, participants and visitors all sharing the same platform. We called it **EventHub**.

It ended up as two halves talking over a REST API: a FastAPI backend on top of PostgreSQL, and a React (Vite) single-page app on top of that. Guests can look around and search published events without an account. Once you're a registered (and admin-approved) user, you can book tickets, run your own events, message organizers/attendees, and get event recommendations based on what you've booked or looked at.

The rest of this document goes: how the four roles from the spec actually map onto the code, what the app can do, how to get it running on your own machine, how the API and the recommender are put together, and the calls/assumptions we made while building it. The epilogue at the very end talks about how the build itself went.

## Roles: how they actually work

The spec talks about four roles — Administrator, Organizer, Participant, Visitor — but we only store **two account types** in the database: `ADMIN` and `USER`. That wasn't us cutting a corner, it was a deliberate call:

- **Visitor** is just anyone without a valid JWT. Guests can browse/search published events and open event pages; anything that writes data (booking, messaging, organizing) needs you to be logged in.
- **Organizer** and **Participant** aren't roles we store anywhere — they're two *modes* of the same `USER` account, worked out per event straight from the data: you're the organizer of whichever events have `Events.organizer_id` pointing at you, and a participant of whichever events you hold a confirmed booking for. Same account, both hats, depending on the event. The UI plays along with this — an event's page shows a "You organize this" or "You're attending" badge based on your relationship to *that specific event*, not some fixed role sitting on your profile.
- **Administrator** is its own account type, seeded when the app is set up. It's strictly administrative — it reviews/approves/rejects registrations and exports event data, and can't organize events or book tickets. That's blocked server-side, not just hidden from the UI.

New registrations start out `PENDING` and can't log in until the built-in admin approves them.

## Features

**Everyone, no account required**
- Welcome page previewing upcoming events, with clear paths to browse or register
- Search/browse published events by free text (title & description), category, city, country, date range and ticket price, paginated
- Full event details, including an OpenStreetMap view of the venue (Leaflet)

**Registered users**
- Book one or more tickets of a given type for any published event, with an explicit confirmation step warning that the booking can't be undone
- Seat reservation is race-safe — two people can't both grab the last seat
- "My bookings" overview
- Message an event's organizer once you hold a confirmed booking for it; organizers can reply
- Inbox/Sent folders with per-user message deletion and a live unread-count badge in the nav
- A personal dashboard with quick links and a "Recommended for you" section

**Organizing events**
- Create an event: title, categories, venue/address/city/country (+ optional coordinates), schedule, capacity, description, one or more ticket types (name/price/quantity), photos
- Ticket quantities can never add up to more than the event's capacity — we check this client-side, in the request schema, and again in the route handler, so it can't be bypassed by just calling the API directly
- Publish a draft, or delete it (only while it's still a draft, and only before anyone's booked it)
- Cancel a published event: existing bookings are kept for the record, no new bookings get accepted, and you can broadcast a cancellation message to everyone with a confirmed booking in the same step
- Manage an event's photos; see everyone who booked it

**Administrator**
- Review pending registrations; approve or reject them
- Browse all registered users and their details
- Export the full event catalogue as JSON or XML (matching the course's DTD)

**Recommendations**
- A "Recommended for you" list personalized from each user's booking/viewing history — see [below](#the-recommendation-engine).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, React Router, TanStack Query, React Hook Form + Zod, Mantine UI, Leaflet / react-leaflet |
| Backend | FastAPI (Python), SQLAlchemy, Pydantic v2 |
| Database | PostgreSQL, Alembic migrations |
| Auth | JWT bearer tokens (`python-jose`), bcrypt password hashing (`passlib`) |
| Recommender | Biased Matrix Factorization, hand-implemented with NumPy |

## Project structure

```
web-event-booking-system/
├── app/                       # FastAPI backend
│   ├── core/                    # settings, JWT + password helpers, role checks
│   ├── models/                  # SQLAlchemy models (users, events, bookings, messages)
│   ├── schemas/                 # Pydantic request/response schemas
│   ├── routers/                 # auth, admin, events, bookings, messages, recommendations
│   ├── services/                 # photo uploads, recommendation orchestration
│   ├── recommender/              # BiasedMatrixFactorization + offline evaluation script
│   └── main.py                    # app setup, CORS, static /uploads mount
├── alembic/                    # DB migrations
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── api/                    # axios client, error helpers
│       ├── components/             # shared UI (layout, protected routes, ...)
│       └── features/                # auth, events, bookings, messaging, admin, dashboard, home
├── scripts/generate_certs.sh    # self-signed TLS cert for a local HTTPS demo
├── schema.sql                    # full PostgreSQL schema + seed data
└── requirements.txt
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 20.19+ (or 22.12+) and npm — required by Vite 8
- PostgreSQL (13+ recommended)

### 1. Database

```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

sudo -u postgres psql
```
```sql
CREATE ROLE <username> WITH LOGIN SUPERUSER PASSWORD '<password>';
\q
```
```bash
createdb -h localhost -U <username> eventapp_db
```

`schema.sql` seeds a built-in admin (plus a sample organizer + event), but ships with **placeholder** password hashes. Generate a real bcrypt one first:

```bash
python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('choose-a-password'))"
```

Paste the result over `$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH` for the `admin` user in `schema.sql` (and for `org_athens` too, if you also want to log into the sample organizer account), then load the schema:

```bash
psql -h localhost -U <username> -d eventapp_db -f schema.sql
```

### 2. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: DATABASE_URL (matches step 1), JWT_SECRET_KEY

alembic stamp head    # schema.sql already created the tables — this just tells
                       # Alembic they're current, so future `alembic upgrade head`
                       # calls only apply migrations written after this point

uvicorn app.main:app --reload
```

The API is now served at `http://localhost:8000` (interactive docs at `/docs`).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL defaults to http://localhost:8000
npm run dev
```

Open `http://localhost:5173` and log in as `admin` with the password you hashed above.

> If Vite starts on a different port because 5173 is taken, add that origin to the `allow_origins` list in `app/main.py` too, or the browser's requests will get blocked by CORS.

From there: register a second account through the UI — it'll sit in `PENDING` until you approve it from `/admin`.

### Optional: running it over HTTPS locally

The spec asks for all client-server traffic to be encrypted. For a local demo:

```bash
./scripts/generate_certs.sh   # writes a self-signed cert to ../certs
```

Set `VITE_HTTPS=true` in `frontend/.env` (Vite picks up the generated cert automatically), and point the backend at the same certificate:

```bash
uvicorn app.main:app --reload --ssl-keyfile=certs/key.pem --ssl-certfile=certs/cert.pem
```

Then use an `https://` URL for `VITE_API_URL`. In a real deployment we'd normally terminate TLS at a reverse proxy (e.g. Nginx) in front of both services instead of handling it in either one directly — the self-signed cert here is just for running the demo locally.

## Environment variables

**Backend — `.env`**

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql://user:pass@localhost/eventapp_db` |
| `JWT_SECRET_KEY` | Signs access tokens — change this | `change-me` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | `1440` (24h) |

**Frontend — `frontend/.env`**

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Base URL the SPA calls | `http://localhost:8000` |
| `VITE_HTTPS` | Serve the Vite dev server over HTTPS using the generated cert | `false` |

## API overview

Everything except `POST /auth/register`, `POST /auth/login`, `GET /events` and `GET /events/{id}` needs a `Bearer` JWT. Full interactive docs come for free from FastAPI at `/docs` once the backend is running.

| Router | Covers |
|---|---|
| `/auth` | register, login, `GET /auth/me` |
| `/events` | search/browse (public), create, update, publish, cancel, delete, photo upload/delete, `GET /events/mine`, `GET /events/{id}/bookings`, cancellation broadcast |
| `/bookings` | create a booking, `GET /bookings/mine` |
| `/messages` | send, inbox, sent, unread count, mark as read, delete |
| `/admin` | list/approve/reject users, `GET /admin/export/events?format=json\|xml` |
| `/recommendations` | `GET /recommendations?top_n=` |

## The recommendation engine

Recommendations come from a **Biased Matrix Factorization** model (`app/recommender/bmf.py`) that we trained ourselves with plain stochastic gradient descent, using nothing but NumPy — no `scikit-learn`/`surprise`/etc. For user *i* and event *j* it predicts

```
x_hat_ij = mu + b_i + c_j + v_i . f_j
```

— a global mean, a bias term per user and per event, plus the dot product of their learned latent-factor vectors — and all of those get fit together via gradient descent with L2 regularization.

**Signals.** There's no explicit star rating anywhere in the app, so we turned implicit behaviour into one instead: a confirmed booking counts as `5.0`, viewing an event's detail page counts as `1.0` (a booking is obviously a stronger signal than a view, and the two don't stack — the stronger one wins). Every event a logged-in user opens gets logged to an `EventViews` table specifically so this has something to work with.

**Serving.** We retrain the model from everyone's signals on a 1-hour cache rather than per request — it fits lazily, the first time it's needed after the cache goes stale, behind a lock so two concurrent requests can't both trigger a retrain. What *does* get recomputed fresh on every request is each user's candidate set: published, not-yet-ended, not-sold-out events that aren't their own and that they haven't already viewed or booked — so you're never recommended something you just interacted with, even between retrains.

**Cold start.** A user with no bookings or views yet isn't in the trained model at all, so their recommendations fall back to the most-viewed events among the eligible ones — the same idea the spec asks for (fall back to view activity when there's no booking history), just applied at the level of overall popularity, since a brand-new user has no view history of their own to fall back on either.

**Offline evaluation.** `app/recommender/evaluate_offline.py` is a separate CLI we wrote to benchmark the algorithm itself against the historical dataset from e-class (`interested` / `not_interested` columns become a 1.0/0.0 label; rows with neither get skipped instead of guessed at). It does a train/validation split, reports RMSE on both, and compares against the trivial "always predict the training mean" baseline, so we could actually see whether the learned factors were helping instead of just assuming they were:

```bash
python -m app.recommender.evaluate_offline --train path/to/train.csv
```

(The dataset itself isn't part of this repo — it's the one distributed through e-class.)

## Exporting event data

From the Admin console, `GET /admin/export/events` returns every event as JSON by default, or as XML with `?format=xml` — built with `lxml` to match the course's DTD (`<Events><Event EventID="…">…</Event></Events>`, including nested `TicketTypes`, `Bookings`, `Organizer` and `Media`), rather than hand-assembled by string templating.

## Design decisions & assumptions

- **Two account types, four experienced roles.** See [Roles](#roles-how-they-actually-work) — Organizer/Participant/Visitor come from context and auth state, not a stored role column.
- **The administrator can't organize or book.** We enforce this server-side (403), not just hide it in the UI, since the spec frames it as a purely administrative role.
- **Capacity vs. ticket quantities gets checked three times** for the same rule — client-side, in the Pydantic schema, and again in the route handler — so it can't be sidestepped by calling the API directly.
- **No overselling under concurrency.** Booking does one conditional `UPDATE … WHERE available >= requested`, which PostgreSQL executes atomically per row, instead of a read-then-write that two simultaneous requests could both slip through.
- **Event lifecycle has no cron job.** A published event only flips to `COMPLETED` once something reads it after its end time — we didn't set up a scheduler for this deployment, so it happens lazily on the read paths that matter (browse, my-events, event detail).
- **Full-text search** uses PostgreSQL's own `tsvector`/`tsquery` (Greek text-search config) with a GIN index rather than pulling in an external search engine — felt proportionate to how much data we're actually dealing with here.
- **Messaging is scoped to organizer ↔ confirmed-attendee pairs for one event**, not open user-to-user messaging. A message is one shared row with independent "deleted" flags per side, physically removed only once both sides have deleted it.
- **Bookings skip a manual pending/confirm step.** We didn't model payment, so a successful `POST /bookings` reserves the seats and goes straight to `CONFIRMED`. The schema still carries `PENDING`/`CANCELLED` booking states for completeness — e.g. an organizer cancelling an event doesn't cancel its individual bookings, they're kept for history under the event's own `CANCELLED` status.
- **TLS.** The spec asks for all traffic to be encrypted. Locally that's a self-signed certificate wired into both the Vite dev server and uvicorn; in a real deployment we'd normally terminate TLS at a reverse proxy in front of both services instead.
- **Uploaded photos** are restricted to JPEG/PNG/WEBP, capped at 5MB, and stored under a random filename instead of the client-supplied one, to avoid path-traversal and name collisions.

## Known limitations

A few things we knowingly left out:

- No payment step — booking a ticket reserves the seats and records the price, without involving any real or simulated payment provider.
- Registration doesn't verify the email address or ΑΦΜ against any external source; it only checks they aren't already used by another account.
- The recommender's implicit-feedback weights (booking = 5, view = 1) were picked by hand, not tuned. `evaluate_offline.py` exists precisely so they — and the other hyperparameters — can actually be checked against the e-class dataset instead of taken on faith.

## Epilogue

Building this took longer than either of us expected going in — a "booking app with four roles" sounds contained right up until you're actually working through everything the spec implies once real concurrency and a real database are involved.

Most of the work went into the backend first: getting the data model right — including working out how to represent four roles with only two stored account types, described above — then wiring up the REST API with proper authorization on every single route, and only after that layering the React frontend on top of it. The recommender was its own separate stretch of work, split between getting a matrix-factorization model to train fast enough to be usable (retraining it on every request would have made the dashboard painfully slow to load, so it's cached and only refreshed hourly instead) and getting the offline evaluation script to actually show it beating a trivial baseline before we trusted it to serve real recommendations.

A couple of concrete things tripped us up along the way. Early on, unhandled backend exceptions were slipping straight past our CORS middleware on their way out, so the browser just showed a generic "Network Error" instead of the real one — even though uvicorn's own logs showed a perfectly normal 500. We tracked it down to a missing `Access-Control-Allow-Origin` header on the error response itself, and fixed it with a catch-all exception handler that always returns a proper JSON response. Booking had its own concurrency problem: two people booking the last ticket at nearly the same moment could both succeed under a naive check-then-update, so we moved to a single atomic `UPDATE ... WHERE available >= requested` that Postgres handles safely per row without us having to hand-roll any locking. On the frontend, Leaflet's default marker icons quietly stopped working once bundled by Vite, which took some digging to track down and fix.

The biggest design question wasn't really a bug at all, though — it was figuring out how to map the spec's four roles onto an actual schema without creating weird edge cases (what happens the moment someone books a ticket to an event they organize themselves?). Deriving Organizer/Participant from the data instead of storing them as separate roles is what we settled on, and once we committed to it, it ended up simplifying a lot of the authorization logic downstream.

Overall we're happy with where it landed. *(Feel free to fill in anything specific about how the two of you split the work, your own timeline, or anything else that gave you trouble that we didn't capture here — this is drafted from what the code itself shows us running into, not from having actually been there.)*
