npm icd fro# Enterprise Day News App

A suite of three web applications designed for school students to upload news article images, staff to vet and manage them, and a projector to display approved images in a rotating slideshow.

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

## Authentication (Mocked)

The system is designed to integrate with an external authentication API. Currently, it uses a mock filter that looks for the following HTTP headers:
-   `X-User`: Username/ID of the user.
-   `X-Role`: Role of the user (`STUDENT` or `STAFF`).

In development mode (Vite), the frontend automatically sends these headers based on the page you are on (e.g., "staff" for the staff dashboard).

## Project Structure

-   `/src`: Spring Boot backend source code.
-   `/frontend`: React + Vite + Tailwind source code.
-   `docker-compose.yml`: Orchestration for the database, backend, and frontend.
-   `Dockerfile`: Docker configuration for the Java backend.
-   `frontend/Dockerfile`: Multi-stage Docker configuration for the frontend (Dev & Prod).

## API Endpoints

-   `POST /api/student/upload`: Upload an image (role: STUDENT).
-   `GET  /api/staff/new`: List images awaiting review (role: STAFF).
-   `GET  /api/staff/approved`: List approved images.
-   `GET  /api/staff/rejected`: List rejected images.
-   `POST /api/staff/approve/{id}`: Approve an image (auto-displayed).
-   `POST /api/staff/reject/{id}`: Reject an image (auto-hidden).
-   `POST /api/staff/toggle-display/{id}?display=true|false`: Show/hide an approved image.
-   `POST /api/staff/order`: Reorder approved images (JSON body: `[id1, id2, ...]`).
-   `POST /api/staff/upload`: Staff upload (auto-approved).
-   `GET  /api/projector/images`: List images to display (status=APPROVED & display=true, ordered).
-   `GET  /api/projector/settings`: Current display settings.
-   `POST /api/projector/settings`: Update display settings.

### Configuration

-   `app.upload-dir` (env: `APP_UPLOAD_DIR`) — directory where uploaded images are stored. Defaults to `./uploads`.
-   `spring.profiles.active` — `dev` (default) and `test` enable the mock auth filter; in `prod` the mock filter is disabled and a real auth provider must be configured.

## Running Tests

### Backend (JUnit + JaCoCo)
```bash
mvn clean test
```
Coverage report: `target/site/jacoco/index.html` (currently ~92% instruction coverage).

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
