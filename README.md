# BT Enterprise Day News App

A suite of three web applications designed for school students to upload news article images, staff to vet and manage them, and a projector to display approved images in a rotating slideshow.

> **IMPORTANT: Blank Screen / Branding Issues**: If you experience a blank screen after login or do not see the updated "BT" branding, it is likely due to stale browser cache or a stale Docker build. Please follow these steps:
> 1. **Rebuild Docker**: Run `docker-compose up --build --force-recreate` to ensure the latest frontend changes are compiled.
> 2. **Clear Browser Cache**: Use `Ctrl + F5` (or `Cmd + Shift + R`) to force a hard reload of the page.
> 3. **Incognito Mode**: Try accessing the site in an Incognito/Private window to rule out persistent cache issues.

## Project Overview

The system consists of three main components:
1.  **Student App**: A mobile-friendly web interface for students to upload a single image of a news article.
2.  **Staff App**: A dashboard for staff members to review, approve, or reject uploaded images, manage display order, and add their own images.
3.  **Projector App**: A slideshow application that displays approved images on a rotating basis with configurable intervals.

## Tech Stack

-   **Backend**: Java 25, Spring Boot 3.4
-   **Frontend**: React
-   **Database**: PostgreSQL
-   **Containerization**: Docker, Docker Compose

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

#### Frontend (NPM / Vite)
```bash
cd frontend
npm install
npm run dev   # For development (Hot Reloading)
npm run build # For production build
```

### 2. Run with Docker Compose

The easiest way to run the entire stack is using Docker Compose:

```bash
docker-compose up --build
```

This will start:
-   **PostgreSQL**: Database for image metadata and settings.
-   **Backend (Java)**: REST API accessible at `http://localhost:8080`.
-   **Frontend (Vite Dev)**: Accessible at `http://localhost:5173` (recommended for development).
-   **Frontend (Nginx Prod)**: Accessible at `http://localhost:3000` (built bundle).

### 3. Accessing the Apps

Since the application uses a mock authentication system, you can access different roles by using specific URLs or headers:

-   **Student View**: `http://localhost:5173/student`
-   **Staff View**: `http://localhost:5173/staff`
-   **Projector View**: `http://localhost:5173/projector`

*Note: In the new Lovable UI, routing is handled via `/student`, `/staff`, and `/projector` paths.*

## Authentication (JWT)

The system uses JWT (JSON Web Token) authentication.
1.  **Login**: Users must first authenticate via `POST /api/auth/login` to receive a token.
    -   Body: `{"username": "...", "password": "...", "role": "STUDENT|STAFF"}`
    -   *Note: Currently, any password is accepted as long as it's not empty.*
2.  **Bearer Token**: All protected API requests must include the `Authorization: Bearer <token>` header.

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
-   `GET  /api/staff/new`: List images awaiting review (role: STAFF).
-   `GET  /api/staff/approved`: List approved images.
-   `GET  /api/staff/rejected`: List rejected images.
-   `POST /api/staff/approve/{id}`: Approve an image (auto-displayed).
-   `POST /api/staff/reject/{id}`: Reject an image (auto-hidden).
-   `POST /api/staff/toggle-display/{id}?display=true|false`: Show/hide an approved image.
-   `POST /api/staff/order`: Reorder approved images (JSON body: `[id1, id2, ...]`).
-   `POST /api/staff/upload`: Staff upload (auto-approved).
-   `POST /api/staff/info`: Staff upload of an information message (image).
-   `POST /api/staff/text`: Post a free-text urgent message.
-   `POST /api/staff/toggle-flash/{id}?flash=true|false`: Toggle FLASH mode for an image/message.
-   `DELETE /api/staff/{id}`: Delete an image.
-   `DELETE /api/staff/all`: Delete all images (resets for end of day, preserves staff library items).
-   `GET  /api/projector/images`: List images to display (status=APPROVED & display=true, ordered).
-   `GET  /api/projector/settings`: Current display settings.
-   `POST /api/projector/settings`: Update display settings.

### Configuration

-   `app.jwt.secret` — Secret key for signing JWTs.
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

Tests cover:
- `App.test.tsx` — top-level routing.
- `api.test.ts` — API client logic and header handling.

`axios` or `fetch` is mocked in every test, so no backend is required.

## License

This project is developed for Enterprise Day.
