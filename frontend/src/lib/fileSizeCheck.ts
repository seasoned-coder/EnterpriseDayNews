const MB = 1024 * 1024;

/**
 * Upload rules. `maxMb` must match the server limits (spring.servlet.multipart.max-file-size and
 * nginx client_max_body_size), otherwise files pass here and fail on upload.
 */
export const FILE_SIZE_LIMITS = {
  minImageKb: 10,      // Absolute minimum (blocks corrupted/tiny files)
  warnBelowMb: 3,      // Soft warning threshold
  maxMb: 10,
} as const;

/** Image types the server accepts (ImageService.ALLOWED_CONTENT_TYPES). */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

/** Value for a file input's `accept` attribute. */
export const ACCEPTED_FILE_TYPES = ALLOWED_IMAGE_TYPES.join(",");

export type SizeCheckResult = "too-small" | "too-large" | "ok";

/** True if the server will accept this file type (pickers can be bypassed by drag-and-drop). */
export function isAllowedImageType(file: File): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase());
}

/**
 * Checks whether a file meets the size requirements for upload.
 *
 * - < 10 KB     → "too-small"   (images only — blocked as corrupted/invalid)
 * - < 3 MB      → "too-small"   (images only — warning, non-blocking)
 * - > 10 MB     → "too-large"   (blocked)
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
