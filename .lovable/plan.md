# BT Enterprise Day News — Visual Redesign

Restyle all three pages while keeping current functionality and routes intact. Two distinct moods sit on top of one shared design system so the app feels coherent.

## Design system (shared foundation)

- Define semantic tokens in `index.css` and `tailwind.config.ts`: brand accent, surface, surface-elevated, ink, muted, success, danger, plus gradient + glow utilities.
- Typography: a bold display face (e.g. Space Grotesk / Bricolage) for headings, Inter for body. Loaded via Google Fonts in `index.html`.
- Reusable building blocks: `AppShell` (page wrapper + nav), `Brand` (logo mark), restyled top nav replacing the current bullet list of links.
- Active route highlighting; mobile-friendly nav.

## 1. Student Upload — "Modern & cool (Gen-Z)"

Energy: bold, confident, a little playful — think Discord/TikTok submit screen.

- Dark canvas with a soft animated gradient blob background and subtle noise texture.
- Oversized headline ("Drop your story.") with a gradient text treatment and a one-line hype subtitle.
- Big rounded **drag-and-drop zone** as the hero element:
  - Dashed neon border, hover/drag-over glow, file icon that animates on hover.
  - Click-to-browse fallback (keeps existing file input working).
  - Shows selected file name, size, and an image thumbnail preview when applicable.
- Name field restyled as a large pill input with floating label.
- Primary "Send it" button: full-width, gradient fill, subtle press animation.
- Upload state: progress bar + success toast with a celebratory micro-animation; clear error state if upload fails.
- Keeps existing upload logic and endpoint untouched.

## 2. Staff Dashboard — "Professional light"

Energy: calm admin panel a teacher would trust on a projector-lit classroom screen.

- Light surface, single restrained accent color, generous spacing, crisp dividers.
- Header row: page title, short description, and a search box for filtering submissions by student name.
- Tabs (New / Approved / Rejected) restyled as a segmented control with **count badges** per tab.
- Submissions shown as a **responsive card grid**:
  - Image thumbnail, student name, timestamp, status pill.
  - Approve / Reject buttons with clear iconography and confirmation toast.
  - Click card → larger preview dialog using existing shadcn `dialog`.
- Empty states with friendly illustrations/copy ("No new submissions yet").
- Loading skeletons while data fetches.

## 3. Projector page

Energy: full-screen display piece for a classroom screen.

- Full-bleed dark stage, no chrome, large auto-advancing carousel of approved submissions.
- Student name + caption overlaid bottom-left in large display type.
- Subtle Ken Burns zoom + crossfade between items.
- Keyboard controls (←/→ to navigate, space to pause) and a small auto-hiding control bar.
- Graceful empty state ("Waiting for approved stories…").

## Navigation

Replace the current bulleted link list with a top bar:
- Left: brand mark + name.
- Right: Student Upload · Staff Dashboard · Projector, with active state.
- Hidden on the Projector route for full-screen display.

## Technical notes

- Tailwind tokens + shadcn components (`button`, `card`, `tabs`, `badge`, `dialog`, `toast`, `progress`, `skeleton`, `input`).
- Routes added in `App.tsx` for `/student`, `/staff`, `/projector`; `/` redirects to `/student`.
- New files: `src/components/AppShell.tsx`, `src/components/BrandNav.tsx`, `src/components/UploadDropzone.tsx`, `src/components/SubmissionCard.tsx`, `src/pages/StudentUpload.tsx`, `src/pages/StaffDashboard.tsx`, `src/pages/Projector.tsx`.
- Existing data-fetching / upload logic from the current repo is preserved; only presentation changes.
- Fully responsive down to 360px; honors `prefers-reduced-motion` for the animated backgrounds.

## Out of scope

- Auth, roles, backend changes, or new data fields.
- Any change to upload/approval API contracts.
