/**
 * SmugMug API v2 client.
 *
 * All requests are OAuth 1.0a-signed via oauthSign.buildAuthHeader.
 * JSON body params are NOT included in the OAuth signature (SmugMug convention).
 * Binary upload body is NOT included in the OAuth signature.
 *
 * Folder/album hierarchy we maintain:
 *   /Artists/{ArtistUrlName}/{YYYY-MM}_{CityUrlName}_{VenueUrlName}
 *
 * The "create on first use, reuse after" pattern is enforced at the call-site
 * (processUpload.ts) using a Firestore transaction; this module only performs
 * the raw SmugMug operations.
 */

import { Readable } from "node:stream";
import { buildAuthHeader, type OAuthConfig } from "./oauthSign.js";
import type {
  SmugMugApiResponse,
  SmugMugAlbum,
  SmugMugAuthUser,
  SmugMugFolder,
  SmugMugImageSizes,
  SmugMugUploadResponse,
} from "./types.js";

const API_BASE    = "https://api.smugmug.com";
const UPLOAD_URL  = "https://upload.smugmug.com/";
const MAX_URL_LEN = 40;

// ── internal HTTP helper ──────────────────────────────────────────────────────

class SmugMugApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "SmugMugApiError";
  }
}

async function apiRequest<T>(
  method: string,
  url: string,
  body: unknown | null,
  config: OAuthConfig,
): Promise<T> {
  const authHeader = buildAuthHeader(method, url, config);
  const headers: Record<string, string> = {
    Authorization: authHeader,
    Accept:        "application/json",
  };

  const init: RequestInit = { method };
  if (body !== null) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  init.headers = headers;

  const res  = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    throw new SmugMugApiError(
      `SmugMug ${method} ${url} → ${res.status}`,
      res.status,
      text,
    );
  }

  return JSON.parse(text) as T;
}

// ── URL name sanitisation ─────────────────────────────────────────────────────

/**
 * Convert an arbitrary string into a SmugMug-valid UrlName.
 * Rules: alphanumeric + hyphens, 2–40 chars, no leading/trailing/consecutive hyphens.
 */
export function sanitizeUrlName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // strip diacritics
    .replace(/[^a-zA-Z0-9\s-]/g, "") // keep only alnum, space, hyphen
    .trim()
    .replace(/[\s]+/g, "-")           // spaces → hyphens
    .replace(/-{2,}/g, "-")           // collapse consecutive hyphens
    .replace(/^-|-$/g, "")            // strip leading/trailing hyphens
    .slice(0, MAX_URL_LEN)
    || "Gallery";                      // fallback if result is empty
}

// ── auth user ─────────────────────────────────────────────────────────────────

export async function getAuthUser(
  config: OAuthConfig,
): Promise<{ nickname: string }> {
  const res = await apiRequest<SmugMugApiResponse<{ User: SmugMugAuthUser }>>(
    "GET",
    `${API_BASE}/api/v2!authuser`,
    null,
    config,
  );
  return { nickname: res.Response.User.NickName };
}

// ── folder operations ─────────────────────────────────────────────────────────

async function getFolder(
  config: OAuthConfig,
  nickname: string,
  folderPath: string, // e.g. "Artists" or "Artists/Phoebe-Bridgers"
): Promise<SmugMugFolder | null> {
  try {
    const res = await apiRequest<SmugMugApiResponse<{ Folder: SmugMugFolder }>>(
      "GET",
      `${API_BASE}/api/v2/folder/user/${encodeURIComponent(nickname)}/${folderPath}`,
      null,
      config,
    );
    return res.Response.Folder;
  } catch (err) {
    if (err instanceof SmugMugApiError && err.status === 404) return null;
    throw err;
  }
}

async function createFolder(
  config: OAuthConfig,
  nickname: string,
  parentPath: string | null, // null → create under root
  displayName: string,
  urlName: string,
): Promise<SmugMugFolder> {
  const endpoint =
    parentPath === null
      ? `${API_BASE}/api/v2/folder/user/${encodeURIComponent(nickname)}!folders`
      : `${API_BASE}/api/v2/folder/user/${encodeURIComponent(nickname)}/${parentPath}!folders`;

  const res = await apiRequest<SmugMugApiResponse<{ Folder: SmugMugFolder }>>(
    "POST",
    endpoint,
    {
      Name:          displayName,
      UrlName:       urlName,
      Privacy:       "Public",
      SortMethod:    "DateAdded",
      SortDirection: "Descending",
    },
    config,
  );
  return res.Response.Folder;
}

/**
 * Get or create a single-level folder.
 * @param parentPath null for root-level folders, "FolderUrlName" for nested.
 */
async function resolveFolder(
  config: OAuthConfig,
  nickname: string,
  parentPath: string | null,
  displayName: string,
  urlName: string,
): Promise<SmugMugFolder> {
  const lookupPath = parentPath ? `${parentPath}/${urlName}` : urlName;
  const existing   = await getFolder(config, nickname, lookupPath);
  if (existing) return existing;

  // 409 = URL name already taken; retry GET (race between two functions)
  try {
    return await createFolder(config, nickname, parentPath, displayName, urlName);
  } catch (err) {
    if (err instanceof SmugMugApiError && (err.status === 409 || err.status === 422)) {
      const retry = await getFolder(config, nickname, lookupPath);
      if (retry) return retry;
    }
    throw err;
  }
}

// ── album operations ──────────────────────────────────────────────────────────

async function getAlbum(
  config: OAuthConfig,
  nickname: string,
  folderPath: string,
  albumUrlName: string,
): Promise<SmugMugAlbum | null> {
  try {
    const res = await apiRequest<SmugMugApiResponse<{ Album?: SmugMugAlbum[] }>>(
      "GET",
      `${API_BASE}/api/v2/folder/user/${encodeURIComponent(nickname)}/${folderPath}!albums`,
      null,
      config,
    );
    const albums = res.Response.Album ?? [];
    return albums.find((a) => a.UrlName === albumUrlName) ?? null;
  } catch (err) {
    if (err instanceof SmugMugApiError && err.status === 404) return null;
    throw err;
  }
}

async function createAlbum(
  config: OAuthConfig,
  nickname: string,
  folderPath: string,
  displayName: string,
  urlName: string,
): Promise<SmugMugAlbum> {
  const endpoint = `${API_BASE}/api/v2/folder/user/${encodeURIComponent(nickname)}/${folderPath}!albums`;

  const res = await apiRequest<SmugMugApiResponse<{ Album: SmugMugAlbum }>>(
    "POST",
    endpoint,
    {
      Name:          displayName,
      UrlName:       urlName,
      Privacy:       "Public",
      Comments:      true,
      Description:   `Concert gallery: ${displayName}`,
      Keywords:      "concerts",
      SortMethod:    "Date Uploaded",
      SortDirection: "Descending",
    },
    config,
  );
  return res.Response.Album;
}

/**
 * Resolve or create the SmugMug album for a given gallery.
 *
 * Folder hierarchy created:
 *   /Artists/{artistUrlName}/{YYYY-MM}-{cityUrlName}-{venueUrlName}
 */
export async function resolveOrCreateSmugMugAlbum(
  config: OAuthConfig,
  nickname: string,
  gallery: {
    artistName: string;
    city:       string;
    venue:      string;
    monthYear:  string; // "2026-06"
  },
): Promise<{ albumKey: string; albumUri: string }> {
  const artistUrlName = sanitizeUrlName(gallery.artistName);
  const albumUrlName  = sanitizeUrlName(
    `${gallery.monthYear}-${gallery.city}-${gallery.venue}`,
  );
  const albumDisplayName =
    `${gallery.artistName} · ${gallery.monthYear} · ${gallery.venue}, ${gallery.city}`;
  const folderPath = `Artists/${artistUrlName}`;

  // 1. Ensure /Artists exists.
  await resolveFolder(config, nickname, null, "Artists", "Artists");

  // 2. Ensure /Artists/{ArtistName} exists.
  await resolveFolder(config, nickname, "Artists", gallery.artistName, artistUrlName);

  // 3. Get or create the album under /Artists/{ArtistName}.
  const existing = await getAlbum(config, nickname, folderPath, albumUrlName);
  if (existing) {
    return { albumKey: existing.AlbumKey, albumUri: existing.Uri };
  }

  try {
    const album = await createAlbum(
      config, nickname, folderPath, albumDisplayName, albumUrlName,
    );
    return { albumKey: album.AlbumKey, albumUri: album.Uri };
  } catch (err) {
    if (err instanceof SmugMugApiError && (err.status === 409 || err.status === 422)) {
      // Another concurrent function created it first.
      const retry = await getAlbum(config, nickname, folderPath, albumUrlName);
      if (retry) return { albumKey: retry.AlbumKey, albumUri: retry.Uri };
    }
    throw err;
  }
}

// ── image URL fetch ───────────────────────────────────────────────────────────

export async function getImageUrls(
  config: OAuthConfig,
  imageUri: string, // e.g. "/api/v2/image/AbCdEf-0"
): Promise<{ displayUrl: string; thumbnailUrl: string }> {
  const url = `${API_BASE}${imageUri}?_expand=ImageSizes`;

  const res = await apiRequest<
    SmugMugApiResponse<{
      Image: {
        ThumbnailUrl: string;
        Uris: { ImageSizes?: { ImageSizes: SmugMugImageSizes } };
      };
    }>
  >("GET", url, null, config);

  const img   = res.Response.Image;
  const sizes = img.Uris?.ImageSizes?.ImageSizes;

  const displayUrl =
    sizes?.ImageUrlX3Large?.Url ??
    sizes?.ImageUrlX2Large?.Url ??
    sizes?.ImageUrlXLarge?.Url  ??
    sizes?.ImageUrlLarge?.Url   ??
    img.ThumbnailUrl;

  const thumbnailUrl =
    sizes?.ImageUrlThumb?.Url ??
    sizes?.ImageUrlTiny?.Url  ??
    img.ThumbnailUrl;

  return { displayUrl, thumbnailUrl };
}

// ── upload ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  imageKey:     string;
  imageUri:     string;
  displayUrl:   string;
  thumbnailUrl: string;
}

/**
 * Upload a media file to a SmugMug album via the binary upload endpoint.
 *
 * `fileStream` is a Node.js Readable (from GCS createReadStream); we convert
 * it to a Web ReadableStream so native fetch can consume it with `duplex:half`.
 * `contentLength` must be provided (from GCS object metadata) because the
 * streaming body prevents automatic Content-Length detection.
 */
export async function uploadMedia(
  config:        OAuthConfig,
  albumUri:      string,
  fileStream:    NodeJS.ReadableStream,
  contentLength: number,
  fileName:      string,
  contentType:   string,
  keywords:      string[],
): Promise<UploadResult> {
  const authHeader = buildAuthHeader("POST", UPLOAD_URL, config);

  // Convert Node.js ReadStream → Web ReadableStream for native fetch
  const webStream = Readable.toWeb(
    fileStream as import("stream").Readable,
  ) as ReadableStream<Uint8Array>;

  const fetchInit: RequestInit & { duplex: string } = {
    method: "POST",
    duplex: "half",
    headers: {
      Authorization:          authHeader,
      "Content-Type":         contentType,
      "Content-Length":       String(contentLength),
      "X-Smug-AlbumUri":     albumUri,
      "X-Smug-FileName":     fileName,
      "X-Smug-Keywords":     keywords.join(";"),
      "X-Smug-ResponseType": "JSON",
      "X-Smug-Version":      "v2",
    },
    body: webStream,
  };

  const uploadRes = await fetch(UPLOAD_URL, fetchInit);

  const text = await uploadRes.text();
  if (!uploadRes.ok) {
    throw new SmugMugApiError(
      `SmugMug upload failed (${uploadRes.status})`,
      uploadRes.status,
      text,
    );
  }

  const parsed: SmugMugUploadResponse = JSON.parse(text);
  if (parsed.stat !== "ok" || !parsed.Image) {
    throw new Error(`SmugMug upload error: ${parsed.message ?? text}`);
  }

  const imageUri = parsed.Image.ImageUri;
  // imageKey is the last path segment, e.g. "AbCdEf-0" from "/api/v2/image/AbCdEf-0"
  const imageKey = imageUri.split("/").pop()!;

  const { displayUrl, thumbnailUrl } = await getImageUrls(config, imageUri);

  return { imageKey, imageUri, displayUrl, thumbnailUrl };
}

// ── delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a media file from SmugMug.
 * @param imageKey  Full image key including version suffix, e.g. "AbCdEf-0".
 */
export async function deleteMedia(
  config:   OAuthConfig,
  imageKey: string,
): Promise<void> {
  const url = `${API_BASE}/api/v2/image/${imageKey}`;
  await apiRequest<unknown>("DELETE", url, null, config);
}
