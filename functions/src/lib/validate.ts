/**
 * Server-side file validation for staged uploads.
 * Client validation is a UX guard; this is the authoritative gate.
 */

const PHOTO_MAX_BYTES  = 50  * 1024 * 1024;       // 50 MB
const VIDEO_MAX_BYTES  = 3   * 1024 * 1024 * 1024; // 3 GB

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
]);

const ACCEPTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",   // .mov
  "video/avi",
  "video/mpeg",
  "video/x-m4v",
  "video/mts",
  "video/avchd",
]);

export interface ValidationResult {
  valid:       boolean;
  error?:      string;
  mediaType?:  "image" | "video";
}

export function validateUpload(
  contentType:   string | undefined,
  sizeBytes:     number,
): ValidationResult {
  if (!contentType) {
    return { valid: false, error: "Missing Content-Type." };
  }

  const mime = contentType.split(";")[0].trim().toLowerCase();

  if (ACCEPTED_IMAGE_TYPES.has(mime)) {
    if (sizeBytes > PHOTO_MAX_BYTES) {
      return {
        valid: false,
        error: `Photo exceeds 50 MB limit (received ${(sizeBytes / 1024 / 1024).toFixed(1)} MB).`,
      };
    }
    return { valid: true, mediaType: "image" };
  }

  if (ACCEPTED_VIDEO_TYPES.has(mime)) {
    if (sizeBytes > VIDEO_MAX_BYTES) {
      return {
        valid: false,
        error: `Video exceeds 3 GB limit (received ${(sizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB).`,
      };
    }
    return { valid: true, mediaType: "video" };
  }

  return {
    valid: false,
    error: `Unsupported file type: ${mime}. Accepted: JPEG/PNG/WEBP/HEIC for photos; MP4/MOV/AVI/MPEG/M4V/MTS for videos.`,
  };
}
