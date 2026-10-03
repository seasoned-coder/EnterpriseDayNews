/**
 * The release this build is: the release tag (e.g. v2026.10.04) when built by the Release images workflow
 * (issue #46), a date-and-commit stamp from build-and-push.ps1, or "dev" for a local build.
 */
export const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || "dev";
