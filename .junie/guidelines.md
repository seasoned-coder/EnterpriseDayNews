# Project Learnings and Guidelines

See also `docs/design-notes.md` for how the product is meant to behave (audiences, advert economics, projector scheduling, security model, offline event).

## Ground rules
- **The repository is PUBLIC.** Never commit secrets, real passwords, hostnames, IPs or personal data. Deployment settings come from an untracked `.env` (see `.env.example`); the signing secret is generated and stored in the database if unset.
- **Audiences:** students are 13–14 and mostly on phones; keep their UI simple, friendly and touch-friendly. Staff are adults. The projector runs unattended.
- **The event is offline** (private Wi-Fi, no internet). Don't add runtime dependencies on external URLs (CDNs, web fonts, remote models).
- With every change: add tests, check coverage (JaCoCo + Vitest), and update the README and the user guides in `docs/`.
- **Imports, never fully qualified class names** in Java code (e.g. `ApplicationContext`, not `org.springframework.context.ApplicationContext`; `List.of`, not `java.util.List.of`).
- **Don't duplicate code** within an app. Extract reusable classes/components instead, e.g. `AccountService<T>`, `AccountManagementController<T>` and `LoginAccountRepository<T>` serve both student and staff accounts, and the frontend `AccountsDashboard` component serves both account pages.

## Environment - Windows PowerShell 5.1
- Use PowerShell syntax (`;` to chain; `&&`/`||` are not available). Prefer direct tool output over `Select-String` where possible.
- Native commands lose embedded double quotes and empty-string arguments. Pass SQL/JSON via stdin or files rather than inline.
- Write multi-line commit messages to a file and use `git commit -F <file>`.
- **Never edit source files with `Get-Content`/`Set-Content`** in Windows PowerShell 5.1: it reads UTF-8 as the ANSI code page and writes a BOM, so "…" becomes "â€¦" on screen. Use an editor or `[IO.File]::ReadAllText`/`WriteAllText` with `UTF8Encoding($false)`. `frontend/src/test/encoding.test.ts` catches garbled characters.
- Large outputs are truncated; filter them. Delete temporary files (tokens, test images) when done.

## Java 25 / Spring Boot 3.4
- The default `java` on PATH may be Java 8. Run Maven with `JAVA_HOME` pointing at a JDK 25 (e.g. Amazon Corretto 25).
- Use `MockitoBean` instead of `MockBean` (deprecated in Spring Boot 3.4+).
- **JaCoCo** 0.8.14+ for Java 25. **Spring Boot** 3.4.13+. **Lombok** 1.18.42+ as an `annotationProcessorPath`. **Byte Buddy** pinned to 1.17.8+ for Mockito on JDK 25.
- Schema changes need a Flyway migration (`src/main/resources/db/migration/V<n>__*.sql`); Hibernate only validates. Note that `docker-compose.yml` sets `SPRING_JPA_HIBERNATE_DDL_AUTO=update`, which hides a missing migration on existing databases (`display_settings` had none until V10). The screenshot demo stack (`tools/screenshots/`) starts from an empty database with validation, so it doubles as a fresh-install check.
- `src/test/resources/application.properties` **replaces** the main one in tests, so repeat any security-relevant settings there (e.g. `server.forward-headers-strategy`, a test-only `app.jwt.secret`).
- Tests share one in-memory H2 database per Spring context, so use unique usernames per test.
- MockMvc doesn't run Tomcat valves. Test forwarded-header/IP behaviour with `@SpringBootTest(webEnvironment = RANDOM_PORT)`.

## Testing Strategy
- Backend: aim for >90% instruction coverage. Use `MockMvc` for controllers and security rules, and service tests for business rules; cover success and error paths.
- Report coverage from `target/site/jacoco/jacoco.csv` after `mvn test`.

## Frontend Testing (React + Vite)
- **Vitest + Testing Library + jsdom.** Tests sit next to the code as `*.test.ts(x)`; setup is in `src/test/setup.ts`.
- `npm test` runs once; `npm run test:coverage` prints coverage and writes `frontend/coverage/`.
- Stack (Oct 2026): Vite 8, Vitest 4, React Router 7 (still imported from `react-router-dom`), ESLint 10. Vitest 4 counts coverage more strictly than v3, so compare against its own baseline (49% statements / 54% branches at the upgrade), not older numbers.
- Tailwind is still v3 on purpose: v4 changes the config model. `npm audit` flags its build-time file-watching deps (`braces`, `chokidar`, `micromatch`, `fast-glob`) and the dev-only `lovable-tagger`; none of these ship in the built app.
- Mock `@/lib/api` (and `@/hooks/use-toast`) per test with `vi.mock`, and keep pure logic (e.g. `lib/projectorSchedule.ts`) in plain functions so it can be unit-tested.
- Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` inside `act` for timer-driven pages like the projector. React renders once per `act`, so advance in small steps when each intermediate state matters (e.g. counting failed refreshes). Clear `localStorage` in `beforeEach`: the projector saves its last feed there.
- jsdom doesn't navigate on `window.location.href = …`. Go through `navigation.go()` in `lib/api.ts` and spy on it.
- `npx tsc --noEmit -p tsconfig.json` reports pre-existing TS5097 errors (`.tsx` import extensions in `App.tsx`/`main.tsx`); treat any *other* error as new.

## Local testing
- `docker compose up --build -d db backend frontend` (always `--build`; skip `caddy`). A fresh database needs the staff bootstrap login in `.env`.
- Chrome autofill on the login pages can overwrite typed values; set fields directly or use the API to get a token.
- **Load testing** (`loadtest/`, issue #36): k6 runs in Docker on the compose network (`enterprisedaynews_default`) against `http://frontend`. The default is 52 teams; set `TEAMS=26` for a normal event. `find-limit.ps1` steps the team count up until the targets are missed. It creates `loadteam*`/`loadstaff*` accounts and adverts, so never point it at the event database. Write k6 output to a file (`*> file`): run directly, PowerShell treats k6's stderr lines as errors.

- **README screenshots** (`docs/screenshots/`): regenerate with `tools/screenshots/make-screenshots.ps1` (`-Build` for this checkout, `-KeepRunning` to inspect the demo at http://127.0.0.1:3100). Only made-up demo data: the repo is public.

## Printing (login slips, #37)
- Print from the browser with print CSS, not raw printer commands: it works with any driver (Epson TM-T88 via its Windows driver, or A4). Reuse `components/PrintArea.tsx`:
    - `PrintArea` renders what to print in a portal straight under `<body>`.
    - `printPages(layout)` sets the `@page` size and `body.printing`. Layouts: `receipt` (one per page), `receipt-roll`, `a4-cards`, `a4-sheet`.
    - `index.css` hides everything else when printing.
    - Printed items use the shared `.ticket` styles (login slips, results receipts).
- Till paper is 80 mm wide (72 mm printable): size slips in `mm`, black only (no greys or light colours, which fade on thermal paper), no web fonts.
- Check a print layout without a printer: puppeteer `page.pdf({ preferCSSPageSize: true })` after triggering the print set-up with `window.print` stubbed (see `tools/screenshots`).

## Concurrency
- Show `api.thumbnailUrl(item)` (small preview, #42) on cards and lists; keep `api.imageUrl(item)` for the large preview and the projector.
- Many phones poll at once, so keep request work small. Add an index (Flyway) for any new list query. Never `findAll()` and filter in Java on a polled path. Don't hold explicit locks.
- `spring.jpa.open-in-view=false`: anything an endpoint returns must be fully loaded inside the service (there are no lazy relations today; keep it that way or fetch eagerly).
- Unique-constraint races surface as `DataIntegrityViolationException` → 409 (`ApiExceptionHandler`). Use `saveAndFlush` where the clash must be caught inside the request.

## Known Issues
- ESLint has no flat config (`eslint.config.js`), so `npm run lint` doesn't run.
- Locally (Docker Desktop) the browser appears to come from a Docker address, so recorded login IPs can be faked. This doesn't apply on a Linux server.
