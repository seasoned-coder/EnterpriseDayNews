const MB = 1024 * 1024;

export const FILE_SIZE_LIMITS = {
  minImageKb: 10,      // Absolute minimum (blocks corrupted/tiny files)
  warnBelowMb: 3,      // Soft warning threshold
  maxMb: 25,
} as const;

export type SizeCheckResult = "too-small" | "too-large" | "ok";

/**
 * Checks whether a file meets the size requirements for upload.
 *
 * - < 10 KB     → "too-small"   (images only — blocked as corrupted/invalid)
 * - < 3 MB      → "too-small"   (images only — warning, non-blocking)
 * - > 25 MB     → "too-large"   (blocked)
 * - otherwise   → "ok"
 */
export function checkFileSize(file: File): SizeCheckResult {
  const mb = file.size / MB;
  const kb = file.size / 1024;

  // Hard floor: images under 10 KB are almost certainly corrupted/invalid
  if (file.type.startsWith("image/") && kb < FILE_SIZE_LIMITS.minImageKb) {
    return "too-small";
  }

  if (mb > FILE_SIZE_LIMITS.maxMb) return "too-large";
  if (mb < FILE_SIZE_LIMITS.warnBelowMb && file.type.startsWith("image/"))
    return "too-small";
  return "ok";
}

