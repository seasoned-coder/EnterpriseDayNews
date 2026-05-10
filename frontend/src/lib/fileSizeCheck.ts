const MB = 1024 * 1024;

export const FILE_SIZE_LIMITS = {
  maxMb: 25,
  warnBelowMb: 3,
} as const;

export type SizeCheckResult = "too-large" | "too-small" | "ok";

/**
 * Checks whether a file meets the size requirements for upload.
 *
 * - > 25 MB → "too-large"   (blocked)
 * - < 3 MB  → "too-small"   (warning, images only — videos/PDFs skipped)
 * - otherwise → "ok"
 */
export function checkFileSize(file: File): SizeCheckResult {
  const mb = file.size / MB;
  if (mb > FILE_SIZE_LIMITS.maxMb) return "too-large";
  if (mb < FILE_SIZE_LIMITS.warnBelowMb && file.type.startsWith("image/"))
    return "too-small";
  return "ok";
}

