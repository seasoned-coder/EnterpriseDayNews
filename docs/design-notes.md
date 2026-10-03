# Design Notes

How the system is meant to work and why. Read this before changing behaviour. The user guides in this folder describe the same rules from each user's point of view, so keep them in step.

## The event and its audiences

BT Enterprise Day is an event where students (aged 13–14) from **several schools** run small companies. Wording should talk about "the event", not "the school". Each company advertises on a big screen, paying with **virtual event money**.

| App | Route | Who uses it | Design consequences |
|---|---|---|---|
| Student portal | `/student` | 13–14-year-old students, mostly on **phones/tablets** | Plain, friendly wording ("advert", "Waiting for approval"); big touch targets; no technical error text; phone keyboards must not auto-capitalise usernames. |
| Staff app | `/staff` | Adult staff | Vet every upload before it's public; add staff content; manage student accounts; tune the projector. Also used on phones (#15), so banner links must stay visible at phone width. |
| Projector | `/projector` | Nobody: it runs **unattended** on a PC plugged into the projector | Full-screen, no sign-in, keeps working through brief network drops, never needs a click. |

The event runs on a **private Wi-Fi network with no internet** (see "Event Setup" in the README). The apps must work fully offline: no CDNs, no external fonts, and the image-checker model is bundled into the build.

## Advert economics

When uploading, a student chooses (and pays for):

-   **Priority 1–4:** how *often* the advert appears.
-   **Duration 10 / 20 / 30 s:** how *long* each appearance lasts.

The cost is `priorityCost + durationCost` (priority 5/10/15/20, duration 5/10/15). **The only copy of the price list is the backend's `PriceList`** (#35): it calculates the stored `totalCost`, refuses any priority or duration that isn't on the list, and is served to the student page (`GET /api/student/prices`), which builds its sliders and total from it. **Paid choices must translate exactly into screen time**, because that is what students are buying.

## Projector scheduling

Implemented in `frontend/src/lib/projectorSchedule.ts` (pure functions, unit-tested) and driven by `pages/Projector.tsx`.

**Inputs:**
-   `GET /api/projector/images`: approved and displayed items in staff order (`displayOrder`), or only FLASH items while any are active.
-   `GET /api/projector/settings`: three staff-tunable values (Projector tab on the Advert Dashboard).

**Item kinds:**
-   **Student adverts:** `isInfoMessage = false`.
-   **Staff content:** `isInfoMessage = true` (Event Communications images, and text messages with FLASH off).
-   **FLASH items:** any item with `isFlashMode = true`. These override everything.

**Rules:**

1.  **Advert rotation.** Adverts keep the staff's order. In each rotation an advert appears **once per priority point**. Slots are spread evenly: advert *i* of *n* with priority *w* gets positions `(j + (i + 0.5)/n) / w` for `j = 0..w-1`, sorted, with ties going to the earlier advert. Equal priorities give exactly the staff order, and repeats don't land next to each other where avoidable, including across the wrap into the next rotation.
2.  **Duration.** An advert stays up for its paid `durationSeconds`. A staff item stays up for the **staff item display time** (`displayDurationSeconds`).
3.  **Staff content interval** (`intervalSpeedSeconds`). Staff items slip in *between* adverts. Once at least this many seconds of adverts have played since the last staff item, the next staff item is shown (round-robin). `0` means after every advert. Two staff items never run back-to-back while adverts are waiting. With no adverts, staff items simply rotate.
4.  **FLASH.** While any FLASH item exists, only FLASH items are shown (rotating). Normal scheduling resumes when FLASH ends.
5.  **Refresh** (`imageRefreshSeconds`). How often the feed is re-read. If the slide on screen has been hidden, rejected or deleted (or FLASH starts), the projector **moves on immediately**. That's a safeguarding requirement: staff must be able to pull something off screen at once.
6.  The scheduler decides the next slide on the fly. Nothing is shuffled, and feed refreshes don't disturb the slide currently showing.

Settings are validated server-side (`DisplaySettingsService`: interval 0–3600, staff item 3–120, refresh 2–60) and the same ranges are used in the staff UI. Fresh installs default to 60 / 10 / 3. Existing databases keep their stored values.

### When the connection drops (#39)

The projector runs unattended, so it never shows an error to the room:

-   **Keeps playing:** it carries on with its last feed. The query keeps its data on failure, and the last good feed and settings are also saved in `localStorage` (`lib/projectorCache.ts`), so a reload during an outage carries on too.
-   **Pictures ready in advance:** every slide's picture is preloaded when the feed changes, so it's already in the browser cache (`/uploads` is cacheable, #36). A picture that still won't load is skipped, not shown broken. Skipped pictures are retried once the server answers again.
-   **Failures are noticed quickly:** each feed check gives up after 5 s (`withTimeout`), and nginx's `proxy_connect_timeout` is 5 s. Otherwise a dead link or a stopped backend leaves the request hanging for a minute or more, and no new check starts meanwhile. The library's own retries are off for the feed: its back-off is longer than one refresh interval, so retries would restart forever. The refresh interval is the retry.
-   **Staff can tell:** a subtle **OFFLINE MODE** label shows at the top middle after 2 failed checks in a row (1 if there's nothing to play, with a calm "Back shortly" screen). The projector keeps polling even when its window isn't in front (`refetchIntervalInBackground`).
-   **Limit:** if the server is down and the page has never been loaded in that browser, there's nothing to show ("Back shortly"). There's no service worker. The page itself is served by the frontend container, so it still loads if only the backend is down.

## Moderation and visibility

-   Student uploads start as **NEW** and are invisible to everyone except staff and the uploader. The student chooses at upload whether it goes **on screen as soon as it's approved** (`publishOnApproval`, the default) or **waits for them to publish it** (#9, e.g. for timed offers). Approving sets `display = publishOnApproval`.
-   **Students control `display` on their own approved adverts** (Publish now / Withdraw); before approval they can change `publishOnApproval`. Rejected adverts can't be published. Staff Hide/Display still works, but a student can re-publish a hidden advert, so **Reject** is the way to keep something off screen.
-   **Hide/Display** (approved items only) and **Reject** take an item off screen. Items can't go back to NEW.
-   **Rejection reasons** (#38): rejecting asks for a reason. Staff can pick a preset (`lib/rejectionReasons.ts`, worded kindly for 13–14-year-olds) or write their own, up to 200 characters. The student sees it as a "Teacher's note". It's optional; approving later clears it (`ImageService.updateStatus`).
-   Staff content is auto-approved and **hidden by default**. Ticking **Flash Mode** makes it take over immediately, which is why the checkbox is unticked by default.
-   **Reset the event** (End of Day, #34) deletes every student advert and its file and restores the default projector settings, in one transaction (`EventResetService`). It keeps staff content and all accounts. In the staff app it takes three deliberate steps: an "ARE YOU SURE?" switch enables the Clear Down button, which then asks for "clear down" to be typed before confirming.
-   The in-browser image checker (NSFWJS) is a helper, not a gate: it **fails open** if the model can't run. Staff approval is the real control.

## Security model

The repository is **public**, and the users are children, so:

-   **No secrets in source, and as little to remember as possible.** The login-signing secret is generated randomly on first start and kept in the database (`app_secrets`), unless `APP_JWT_SECRET` is set, in which case it must be strong and never a value published here. The only thing a new deployment must supply is the first staff login, via an untracked `.env`. The database password deliberately defaults to `password`: the database port is only reachable from the server itself, and the organiser runs the event once a year.
-   **Accounts:** students and staff each have database accounts with BCrypt hashes, the same 5-attempt / 15-minute lockout, and login time and IP recording. All of this lives in one generic `AccountService<T>` / `AccountManagementController<T>` / `LoginAccountRepository<T>` (backend) and one `AccountsDashboard` component (frontend), configured per account type. The first staff account is bootstrapped from `.env` only while none exist; after that staff manage each other on the Staff Account Dashboard, and nobody can lock or delete themselves (so a working staff login always remains). Old built-in accounts with published passwords are locked at startup.
-   **Tokens are checked against the account on every request.** A locked, renamed or deleted student or staff account stops working immediately, not when its token expires. Such requests get `401` (not `403`), so the frontend returns to the sign-in page.
-   **Team setup and login slips** (#37):
    -   **Generated passwords:** staff create team accounts in bulk with passwords like `Tiger-Maple-47` (`FriendlyPasswords`). These meet the student rules, avoid digits that look like letters, and have about 200,000 combinations, which is plenty with the 5-attempt lockout on a private network.
    -   **Shown once:** a password is only returned when it's set, then printed. It's never stored readably. A lost slip means a new password (`/generated-password`), not a lookup.
    -   **Slip details:** the Wi-Fi details printed on slips are kept in the database (`event_details`, staff-only), never in the repo.
    -   **QR codes:** made in the browser (`qrcode.react`), with no internet needed. The app QR code links to `/student/login?team=<name>`, which pre-fills the username. It never includes the password.
-   **Renaming** (#15) uses the same validation as creating, and the new name must be unused by any account of that kind, active or locked. Uploads (and, for staff, "approved by") are linked by username, so they move with the account (`AccountService.onRenamed`).
-   **Sessions:** a stateless JWT per role, stored separately in the browser (`session.STUDENT`, `session.STAFF`), so one browser can be signed in to both apps.
-   **Images:** only projector-visible items are public under `/uploads`. Everything else needs an HMAC-signed, expiring link (derived from the JWT secret, stable per hour for caching), which the API only gives to staff and to the uploading student.
-   **Errors:** intentional API errors return a plain-text, user-safe message. The frontend never shows raw status codes or HTML error pages.
-   **Network:** backend and database ports are bound to localhost. nginx resolves the real client IP, only trusting `X-Forwarded-For` from the Docker network, so phones on the event Wi-Fi can't fake the recorded IP. CORS is off unless `APP_CORS_ALLOWED_ORIGINS` is set.

## Many people at once (#36)

Sizing: up to 26 teams normally, 52 at a big event. Each team has two students, each on a phone, sharing the team's account. Add 3 staff and the projector, all refreshing every few seconds for 5 hours.

-   **No locks held.** The code never locks rows or tables explicitly. Every transaction is one short request: read a row, change it, save. Nothing waits on another person.
-   **Clashes are expected and friendly.**
    -   **Two staff review the same advert:** the second gets a 409 saying someone else already did, and the dashboard refreshes.
    -   **Two staff create or rename to the same username at the same moment:** the database's unique constraint refuses one. `ApiExceptionHandler` turns that into a 409 "refresh and try again" instead of a 500.
-   **Polling stays cheap.**
    -   Each list is one indexed query (V9: uploader, status/display, flash, info-message, file name). The projector feed no longer loads the whole table.
    -   `open-in-view` is off, so a database connection is released when the request's work is done, not after the response has trickled out to a slow phone.
-   **Images are cached.** Upload file names are random and never reused, so `/uploads` responses carry `Cache-Control: private, max-age=3600`. The projector and dashboards don't download the same advert over the Wi-Fi again and again.
-   **Sign-in is the slowest step, on purpose.** BCrypt is deliberately slow. A burst where every phone signs in at once shows up as a second or two of slower responses, not errors.
-   **Tested:** `ConcurrencyTests` (backend) runs uploads, reviews and projector reads on many threads at once, plus a same-name account race. The k6 simulation in `loadtest/` runs the whole event; see `loadtest/README.md` for how to run it and the results.

## Upload rules

10 MB maximum (Spring multipart limit, nginx `client_max_body_size` and the frontend `FILE_SIZE_LIMITS.maxMb` must match). JPEG, PNG, GIF or WebP only. Images under 3 MB get a "may look blurry" warning; under 10 KB are rejected as corrupt.

## History

-   `.lovable/plan.md` is the original visual-redesign brief (Lovable). It predates most of the above.
-   Issues #11 and #29–#33 (October 2026) introduced the account management, secrets handling, access control, student-portal wording and projector scheduling described here.
