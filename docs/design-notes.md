# Design Notes

How the system is meant to work and why. Read this before changing behaviour. The user guides in this folder describe the same rules from each user's point of view, so keep them in step.

## The event and its audiences

BT Enterprise Day is a school event where students (aged 13–14) run small companies. Each company advertises on a big screen, paying with **virtual event money**.

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

The cost shown is `priorityCost + durationCost` (priority 5/10/15/20, duration 5/10/15). The backend stores `priority`, `durationSeconds` and `totalCost` on the image record. **Paid choices must translate exactly into screen time**, because that is what students are buying.

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

## Moderation and visibility

-   Student uploads start as **NEW** and are invisible to everyone except staff and the uploader. **Approving** sets `display = true`, so it goes live within one refresh. There is no separate publish step.
-   **Hide/Display** (approved items only) and **Reject** take an item off screen. Items can't go back to NEW.
-   Staff content is auto-approved and **hidden by default**. Ticking **Flash Mode** makes it take over immediately, which is why the checkbox is unticked by default.
-   **Clear Down** (End of Day) deletes every student upload and its file. It keeps staff content and all accounts.
-   The in-browser image checker (NSFWJS) is a helper, not a gate: it **fails open** if the model can't run. Staff approval is the real control.

## Security model

The repository is **public**, and the users are children, so:

-   **No secrets in source, and as little to remember as possible.** The login-signing secret is generated randomly on first start and kept in the database (`app_secrets`), unless `APP_JWT_SECRET` is set, in which case it must be strong and never a value published here. The only thing a new deployment must supply is the first staff login, via an untracked `.env`. The database password deliberately defaults to `password`: the database port is only reachable from the server itself, and the organiser runs the event once a year.
-   **Accounts:** students and staff each have database accounts with BCrypt hashes, the same 5-attempt / 15-minute lockout, and login time and IP recording. The first staff account is bootstrapped from `.env` only while none exist. Old built-in accounts with published passwords are locked at startup.
-   **Sessions:** a stateless JWT per role, stored separately in the browser (`session.STUDENT`, `session.STAFF`), so one browser can be signed in to both apps.
-   **Images:** only projector-visible items are public under `/uploads`. Everything else needs an HMAC-signed, expiring link (derived from the JWT secret, stable per hour for caching), which the API only gives to staff and to the uploading student.
-   **Errors:** intentional API errors return a plain-text, user-safe message. The frontend never shows raw status codes or HTML error pages.
-   **Network:** backend and database ports are bound to localhost. nginx resolves the real client IP, only trusting `X-Forwarded-For` from the Docker network, so phones on the event Wi-Fi can't fake the recorded IP. CORS is off unless `APP_CORS_ALLOWED_ORIGINS` is set.

## Upload rules

10 MB maximum (Spring multipart limit, nginx `client_max_body_size` and the frontend `FILE_SIZE_LIMITS.maxMb` must match). JPEG, PNG, GIF or WebP only. Images under 3 MB get a "may look blurry" warning; under 10 KB are rejected as corrupt.

## History

-   `.lovable/plan.md` is the original visual-redesign brief (Lovable). It predates most of the above.
-   Issues #11 and #29–#33 (October 2026) introduced the account management, secrets handling, access control, student-portal wording and projector scheduling described here.
