# BT Enterprise Day News App

A suite of three web applications designed for school students to upload news article images, staff to vet and manage them, and a projector to display approved images in a rotating slideshow.

> **IMPORTANT: Blank Screen / Branding Issues**: If you experience a blank screen after login or do not see the updated "BT" branding, it is likely due to stale browser cache or a stale Docker build. Please follow these steps:
> 1. **Rebuild Docker**: Run `docker-compose up --build --force-recreate` to ensure the latest frontend changes are compiled.
> 2. **Clear Browser Cache**: Use `Ctrl + F5` (or `Cmd + Shift + R`) to force a hard reload of the page.
> 3. **Incognito Mode**: Try accessing the site in an Incognito/Private window to rule out persistent cache issues.

## Project Overview

The system consists of three main components, each with a different audience:
1.  **Student App** (`/student`) — used by 13/14-year-old students, mostly on phones and tablets. A simple, mobile-friendly interface for each student company to upload images of its adverts/news articles. Nothing a student uploads is shown until an adult has approved it.
2.  **Staff App** (`/staff`) — used by adult staff to vet and check student uploads and to add their own content. It has two dashboards, switched from the top banner:
    -   **Advert Dashboard**: review, approve, or reject uploaded images, manage display order, and add staff images and information messages.
    -   **Student Account Dashboard**: list the company/student accounts, add or delete accounts, lock/unlock them, reset passwords, and see when (and from which IP address) each account last signed in.
3.  **Projector App** (`/projector`) — runs unattended on a machine plugged into the event's screen projector. A full-screen slideshow of approved images on a rotating basis with configurable intervals.

### User Guides

-   [Student Guide](docs/student-guide.md): for students uploading adverts.
-   [Staff Guide](docs/staff-guide.md): the Advert Dashboard, Event Communications, End of Day and the Student Account Dashboard.
-   [Projector Guide](docs/projector-guide.md): setting up and running the big screen.

Keep these guides up to date whenever a change affects what users see or do.

## Tech Stack

### How the pieces fit together

```
Browser (student phone / staff laptop / projector PC)
   │  HTTPS
   ▼
Caddy  ── TLS certificates + reverse proxy (hosted deployment only)
   │
   ▼
Nginx (frontend container) ── serves the built React app
   │   /api/*  and  /uploads/*  are proxied to ▼
   ▼
Spring Boot (backend container) ── REST API, auth, image storage
   │                       │
   ▼                       ▼
PostgreSQL (db container)  "uploads" Docker volume (image files)
```

All three apps (`/student`, `/staff`, `/projector`) are routes in **one** React single-page app, backed by **one** Spring Boot API.

### Backend (`/src`)
| Technology | How it's used |
|---|---|
| **Java 25 + Spring Boot 3.4** | REST API under `/api/*` (auth, student uploads, staff moderation, projector feed). |
| **Spring Web** | Controllers in `controller/`; responses go through DTOs in `dto/` rather than exposing JPA entities directly. |
| **Spring Security + JJWT** | Stateless JWT auth. `POST /api/auth/login` issues a token carrying the user's role (`STUDENT` or `STAFF`); `JwtAuthenticationFilter` checks it on every request and `SecurityConfig` restricts each URL to a role. Student passwords are hashed with BCrypt. |
| **Spring Data JPA (Hibernate)** | Entities in `model/` (`ImageMetadata`, `StudentAccount`, settings) with repositories in `repository/`. |
| **PostgreSQL 16** | Main database in Docker. |
| **Flyway** | Versioned schema migrations in `src/main/resources/db/migration` (`V1__…`, `V2__…`). Hibernate only *validates* the schema; any schema change needs a new migration file. |
| **Lombok** | Generates boilerplate (getters/setters, builders, constructors) on entities and services. |
| **Local disk / Docker volume** | Uploaded images are written to `app.upload-dir` (the `uploads` volume, mounted only into the backend) and served from `/uploads/*`. Only items currently on the projector are public; everything else needs a signed link (see [Image access](#image-access)). |
| **JUnit 5, MockMvc, Mockito, H2, JaCoCo** | Backend tests run against an in-memory H2 database; JaCoCo produces the coverage report. |

### Frontend (`/frontend`)
| Technology | How it's used |
|---|---|
| **React 18 + TypeScript** | UI for all three apps; pages live in `src/pages`. |
| **Vite** | Dev server (`npm run dev`) and production build. The build is stamped with `APP_VERSION`, which is shown at the bottom of the main screen. |
| **React Router** | Routes `/student`, `/staff`, `/staff/students`, `/projector` and their login pages. |
| **Tailwind CSS + shadcn/ui (Radix UI) + lucide-react** | Styling, accessible UI components, and icons. |
| **TanStack Query** | Fetching and caching API data. `src/lib/api.ts` is the single API client and attaches the JWT. |
| **TensorFlow.js + NSFWJS** | In-browser image checker. Student uploads are scanned on the device *before* they are sent, as an extra safeguard on top of staff approval. |
| **sonner** | Toast notifications. |
| **Vitest + Testing Library + jsdom** | Frontend unit and component tests. |

### Infrastructure
| Technology | How it's used |
|---|---|
| **Docker + Docker Compose** | Runs `db`, `backend`, `frontend` (and `caddy` when hosted) as containers. Multi-stage Dockerfiles build the Java JAR and the React bundle. |
| **Nginx** | Inside the frontend container: serves the static React build and proxies `/api` and `/uploads` to the backend, adding the client IP to `X-Forwarded-For`. The backend only trusts that header from internal (Docker-network) proxies (`server.forward-headers-strategy=native`). |
| **Caddy** | Hosted deployment only: automatic HTTPS and reverse proxy in front of the frontend. Not used for local testing. |
| **GitHub Container Registry (ghcr.io)** | Stores built images (`news-backend`, `news-frontend`) pushed by `build-and-push.ps1` / `.sh`. |
| **GitHub Actions** | `.github/workflows/test-and-coverage.yml` runs the tests on each push. |

## Prerequisites

-   **Java 25** (if running locally)
-   **Maven 3.9+** (if building locally)
-   **Node.js & npm** (if developing frontend locally)
-   **Docker & Docker Compose** (recommended for running the full stack)

## Getting Started

### 1. Build the Project

You can build the backend and frontend separately or let Docker Compose handle it.

#### Backend (Maven)
```bash
mvn clean package
```
To run the backend outside Docker, set `APP_JWT_SECRET` (and the datasource settings) in the environment first, as described in [Secrets](#secrets-env-required).

#### Frontend (NPM / Vite)
```bash
cd frontend
npm install
npm run dev   # For development (Hot Reloading)
npm run build # For production build
```

### 2. Run with Docker Compose

#### Secrets (`.env`), required

Docker Compose reads secrets from an untracked `.env` file next to `docker-compose.yml`, and won't start without it. **This repository is public: never commit real secrets.**

1. Copy `.env.example` to `.env`.
2. Fill in random values (the file explains how to generate them):
   - `APP_JWT_SECRET`: signs login tokens; at least 32 characters. The backend refuses to start if it's missing, too short, or a value that has appeared in this repo.
   - `POSTGRES_PASSWORD`: the database password.
   - `APP_STAFF_BOOTSTRAP_USERNAME` / `APP_STAFF_BOOTSTRAP_PASSWORD`: creates the first staff account (see [Authentication](#authentication-jwt)).
   - `FREEDNS_UPDATE_KEY`: hosted server only, used by `auto-deploy-docker.sh`.

`POSTGRES_PASSWORD` only takes effect when the database volume is **first created**. To change the password on an existing database without losing data, change it inside the database first, then update `.env` and restart:

```bash
docker compose exec -T db psql -U user -d enterpriseday -c "ALTER USER \"user\" WITH PASSWORD 'new-password-here';"
# then set POSTGRES_PASSWORD=new-password-here in .env
docker compose up -d
```

Changing `APP_JWT_SECRET` signs everyone out; they just sign in again.

#### Starting the stack

The easiest way to run the entire stack is using Docker Compose:

```bash
export CR_PAT=your_github_pat_here  # Set this if you want to pull the latest frontend image from GitHub Packages
echo $CR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker-compose up --build
```
```powershell
# Set your token as a variable in the current session
$env:CR_PAT = "YOUR_GITHUB_TOKEN_HERE"

# Pipe the token into docker login
$env:CR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Build both the frontend and backend images
docker compose build

# Push them both to GitHub Container Registry
docker compose push
```

### 2.1 Versioned Local Build + Push (Recommended)

If you build from your laptop, use the helper scripts in the repo root. They:
- stamp `APP_VERSION` as `YYYY.MM.DD-HHMMSS-<git-sha>`
- run `docker compose build`
- tag backend/frontend images with both `latest` and the stamped version
- push only if build succeeds

```powershell
# Windows PowerShell
cd C:\code\EnterpriseDayNews
.\build-and-push.ps1
```

```bash
# macOS / Linux
cd /path/to/EnterpriseDayNews
./build-and-push.sh
```

Optional flags:

```powershell
.\build-and-push.ps1 -BuildOnly
.\build-and-push.ps1 -Version 2026.05.14-120000-ab12cd3
.\build-and-push.ps1 -DryRun
```

```bash
./build-and-push.sh --build-only
./build-and-push.sh --version 2026.05.14-120000-ab12cd3
./build-and-push.sh --dry-run
```

This will start:
-   **PostgreSQL**: Database for image metadata, student accounts and settings.
-   **Backend (Java)**: REST API at `http://localhost:8080`, reachable from this machine only. The PostgreSQL port (`5432`) is too. Everyone else goes through the frontend.
-   **Frontend (Nginx Prod)**: Accessible at `http://localhost:3000` (built bundle).
-   **Caddy**: HTTPS reverse proxy for the public hosted domain only (see below).

### 2.2 Local Testing with Docker

Testing is done locally with Docker Desktop. Create your `.env` first (see [Secrets](#secrets-env-required)). The `caddy` service is configured for the public hosted domain and needs ports 80/443, so leave it out locally:

```bash
docker compose up --build db backend frontend
```

-   Always pass `--build`, otherwise Compose may pull the published `:latest` images from GitHub Container Registry instead of testing your local changes.
-   The database lives in the `db` container; `docker compose down -v` wipes it (and uploaded images) for a clean start.

### 3. Accessing the Apps

-   **Student View**: `http://localhost:3000/student`
-   **Staff View**: `http://localhost:3000/staff`
-   **Projector View**: `http://localhost:3000/projector`

When running the Vite dev server (`npm run dev`) instead, use `http://localhost:5173` with the same paths.

## Authentication (JWT)

The system uses JWT (JSON Web Token) authentication.
1.  **Login**: Users must first authenticate via `POST /api/auth/login` to receive a token.
    -   Body: `{"username": "...", "password": "...", "role": "STUDENT|STAFF"}`
2.  **Bearer Token**: All protected API requests must include the `Authorization: Bearer <token>` header.

**Student accounts** are stored in the database and managed by staff from the Student Account Dashboard:
-   Usernames are case-insensitive and may contain letters, numbers, dots, dashes and underscores.
-   Passwords are stored as bcrypt hashes and must be at least 6 characters with an uppercase letter and a number; common passwords are rejected.
-   Five failed sign-ins temporarily lock an account for 15 minutes. Staff can also lock an account indefinitely; unlocking clears any temporary lock.
-   The time and IP address of each successful sign-in are recorded.

**Staff accounts** are stored in the database too (BCrypt-hashed, same 5-attempt / 15-minute lockout). Staff passwords must be at least 10 characters with a capital letter and a number.
-   **First staff account:** set `APP_STAFF_BOOTSTRAP_USERNAME` and `APP_STAFF_BOOTSTRAP_PASSWORD` in `.env` and start the stack. The account is created **only if there are no staff accounts yet**, and is never reset from `.env` afterwards, so you can delete the password line once you've signed in. If no staff account exists and these are not set, the backend logs a warning and nobody can sign in to `/staff`.
-   Adding and managing further staff accounts from the staff app is tracked in #12.

**No built-in accounts.** Older versions created `student` and `guest` student accounts with passwords published in this repository. They are no longer created. On startup, any existing account still using one of those passwords is **locked automatically** (logged as a warning). To reuse it, set a new password and unlock it from the Student Account Dashboard.

The frontend automatically handles login and token management when navigating to `/student` or `/staff`.

## Project Structure

-   `/src`: Spring Boot backend source code.
-   `/frontend`: React + Vite + Tailwind source code.
-   `docker-compose.yml`: Orchestration for the database, backend, and frontend.
-   `Dockerfile`: Docker configuration for the Java backend.
-   `frontend/Dockerfile`: Multi-stage Docker configuration for the frontend (Dev & Prod).

## API Endpoints

-   `POST /api/auth/login`: Authenticate and receive a JWT token.
-   `POST /api/student/upload`: Upload an image (role: STUDENT).
-   `GET  /api/student/uploads`: List current user's uploads.
-   `DELETE /api/student/uploads/{id}`: Delete one of the current user's own uploads.
-   `GET  /api/staff/new`: List images awaiting review (role: STAFF).
-   `GET  /api/staff/approved`: List approved images.
-   `GET  /api/staff/rejected`: List rejected images.
-   `POST /api/staff/approve/{id}`: Approve an image (auto-displayed).
-   `POST /api/staff/reject/{id}`: Reject an image (auto-hidden).
-   `POST /api/staff/toggle-display/{id}?display=true|false`: Show/hide an approved image.
-   `POST /api/staff/order`: Reorder approved images (JSON body: `[id1, id2, ...]`).
-   `POST /api/staff/upload`: Staff upload (auto-approved).
-   `GET  /api/staff/info`: List information messages.
-   `POST /api/staff/info/upload?flash=true|false`: Staff upload of an information message (image).
-   `POST /api/staff/info/free-text?flash=true|false`: Post a free-text urgent message.
-   `POST /api/staff/toggle-flash/{id}?flash=true|false`: Toggle FLASH mode for an image/message.
-   `DELETE /api/staff/{id}`: Delete an image.
-   `DELETE /api/staff/all`: Delete all images (resets for end of day, preserves staff library items).
-   `GET  /api/staff/students`: List student accounts (incl. lock state, last login time and IP).
-   `POST /api/staff/students`: Create a student account (JSON body: `{"username": "...", "password": "..."}`).
-   `POST /api/staff/students/{id}/lock?locked=true|false`: Lock or unlock a student account.
-   `PUT  /api/staff/students/{id}/password`: Reset a student's password (JSON body: `{"password": "..."}`).
-   `DELETE /api/staff/students/{id}`: Delete a student account.
-   `GET  /api/projector/images`: List images to display (FLASH items if any, otherwise status=APPROVED & display=true, ordered). Public.
-   `GET  /api/projector/settings`: Current display settings. Public.
-   `POST /api/projector/settings`: Update display settings (role: STAFF).
-   `GET  /uploads/{file}`: An image file. Public only for items on the projector; otherwise use the signed `imageUrl` from the API.

Every image in API responses includes an `imageUrl` field. Always load images from it rather than building a URL from `filePath`.

### Image access

-   **Public:** items the projector shows (approved and set to display, or in FLASH).
-   **Everything else** (awaiting review, hidden, rejected) is only served through a **signed link**. The API includes it in `imageUrl` for staff, and for the student who uploaded the item. Links are signed with a key derived from `APP_JWT_SECRET` and stay the same for an hour (so polling dashboards don't re-download images), then expire after 1–2 hours.
-   Requests without a valid link, and files with no database record, get a 404.

### Network exposure

-   The backend (`8080`) and database (`5432`) ports are bound to `127.0.0.1`. The frontend (`3000`) is published on all interfaces so phones on the same network can test it. In the hosted deployment, Caddy (`80`/`443`) is the public entry point.
-   **Client IPs** (shown on the Student Account Dashboard) are read from `X-Forwarded-For` only when the request comes from an internal proxy, walking the header right-to-left. Behind Caddy this records the real visitor address. When testing from your own machine with Docker Desktop, your browser also appears to come from an internal Docker address, so a faked header can't be told apart from a real one. That only affects locally recorded IPs.
-   **CORS:** off by default, because the frontend and API share an origin. If you host the frontend elsewhere (`VITE_API_BASE_URL`), set `APP_CORS_ALLOWED_ORIGINS` to a comma-separated list of allowed origins.

### Configuration

-   `app.jwt.secret` (env: `APP_JWT_SECRET`): secret key for signing JWTs. **Required, no default.** Tests use their own test-only value in `src/test/resources/application.properties`.
-   `spring.datasource.password` (env: `SPRING_DATASOURCE_PASSWORD`): set from `POSTGRES_PASSWORD` in `.env` when run with Docker Compose.
-   `app.jwt.expiration-ms` — Token expiration time (default: 1 hour).
-   `app.upload-dir` (env: `APP_UPLOAD_DIR`) — directory where uploaded images are stored. Defaults to `./uploads`.

## Running Tests

### Backend (JUnit + JaCoCo)
```bash
mvn clean test
```
Coverage report: `target/site/jacoco/index.html` (currently >90% instruction coverage).

### Frontend (Vitest)
```bash
cd frontend
npm install
npm test
```
This runs Vitest for the new frontend structure. For watch mode use `npm run test:watch`.

For coverage, run `npm run test:coverage`. It prints a summary and writes an HTML report to `frontend/coverage/index.html`. Generated shadcn/ui components (`src/components/ui`) are excluded.

Tests cover:
- `api.test.ts` — API client logic and header handling.
- `fileSizeCheck.test.ts` — upload size limits.
- `useNsfwCheck.test.ts` — the in-browser image scanner.
- `StudentUpload.test.tsx` — the student upload page.

`axios` or `fetch` is mocked in every test, so no backend is required.

## License

This project is developed for Enterprise Day.
