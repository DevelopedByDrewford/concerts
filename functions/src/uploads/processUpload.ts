/**
 * processUpload – Cloud Storage trigger (2nd-gen onObjectFinalized).
 *
 * Triggered when a file lands at:
 *   staging/{uid}/{galleryId}/{fileId}
 *
 * Full pipeline:
 *   1. Parse path components.
 *   2. Server-side validate (size + MIME).
 *   3. Create / update uploadJobs/{fileId} status → "processing".
 *   4. Look up galleries/{galleryId} in Firestore.
 *   5. Resolve or create the SmugMug album (Firestore transaction + pending lock).
 *   6. Stream the file from GCS → SmugMug binary upload endpoint.
 *   7. Write galleries/{galleryId}/items/{itemId} to Firestore.
 *   8. Upsert userConcerts/{uid}_{galleryId}; increment concertsAttendedCount
 *      only on first contribution to this gallery.
 *   9. Move/delete staging file (controlled by KEEP_STAGING_BACKUP env var).
 *  10. Mark uploadJobs/{fileId} → "done".
 *
 * On any error: mark uploadJobs/{fileId} → "failed" so the client can react.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { defineSecret }      from "firebase-functions/params";
import { getStorage }        from "firebase-admin/storage";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger }            from "firebase-functions/v2";

import { validateUpload }                  from "../lib/validate.js";
import {
  db, galleryRef, itemsCollection,
  userRef, userConcertRef, uploadJobRef,
  ALBUM_PENDING,
  type GalleryDoc,
} from "../lib/firestore.js";
import {
  resolveOrCreateSmugMugAlbum,
  uploadMedia,
} from "../smugmug/api.js";
import type { OAuthConfig } from "../smugmug/oauthSign.js";

// ── secrets ───────────────────────────────────────────────────────────────────

const smConsumerKey        = defineSecret("SMUGMUG_CONSUMER_KEY");
const smConsumerSecret     = defineSecret("SMUGMUG_CONSUMER_SECRET");
const smAccessToken        = defineSecret("SMUGMUG_ACCESS_TOKEN");
const smAccessTokenSecret  = defineSecret("SMUGMUG_ACCESS_TOKEN_SECRET");
const smSiteNickname       = defineSecret("SMUGMUG_SITE_NICKNAME");

// ── helpers ───────────────────────────────────────────────────────────────────

/** True when KEEP_STAGING_BACKUP=true (default). */
function keepBackup(): boolean {
  return process.env.KEEP_STAGING_BACKUP !== "false";
}

async function markJobFailed(fileId: string, error: string): Promise<void> {
  try {
    await uploadJobRef(fileId).set(
      { status: "failed", uploadError: error, completedAt: Timestamp.now() },
      { merge: true },
    );
  } catch (e) {
    logger.error("Failed to write job failure status", { fileId, error: e });
  }
}

/**
 * Resolve or create the SmugMug album using a Firestore pending-lock pattern
 * to prevent concurrent uploads to a new gallery from creating duplicate albums.
 *
 * States of galleries/{galleryId}.smugmugAlbumKey:
 *   null          → no album yet; this function should create it
 *   "__pending__" → another function is creating it; wait and poll
 *   "real-key"    → album exists; reuse it
 */
async function resolveAlbumWithLock(
  galleryId: string,
  gallery:   GalleryDoc,
  config:    OAuthConfig,
  nickname:  string,
): Promise<{ albumKey: string; albumUri: string }> {
  const gRef = galleryRef(galleryId);

  // Phase 1: read current state and try to claim the creation slot.
  let claimed   = false;
  let albumKey: string | null = null;
  let albumUri: string | null = null;

  await db().runTransaction(async (txn) => {
    const snap = await txn.get(gRef);
    const data = snap.data() as GalleryDoc | undefined;

    const currentKey = data?.smugmugAlbumKey ?? null;

    if (currentKey && currentKey !== ALBUM_PENDING) {
      albumKey = currentKey;
      albumUri = data?.smugmugAlbumUri ?? null;
      return;
    }

    if (!currentKey) {
      // Claim creation slot.
      txn.update(gRef, {
        smugmugAlbumKey: ALBUM_PENDING,
        smugmugAlbumUri: null,
      });
      claimed = true;
    }
    // If currentKey === ALBUM_PENDING, another function claimed it; we'll poll.
  });

  if (albumKey && albumUri) {
    logger.info("SmugMug album already exists", { galleryId, albumKey });
    return { albumKey, albumUri };
  }

  if (claimed) {
    // We own album creation.
    logger.info("Creating SmugMug album", { galleryId });
    try {
      const result = await resolveOrCreateSmugMugAlbum(config, nickname, gallery);
      await gRef.update({
        smugmugAlbumKey: result.albumKey,
        smugmugAlbumUri: result.albumUri,
      });
      logger.info("SmugMug album created", { galleryId, albumKey: result.albumKey });
      return result;
    } catch (err) {
      // Release the lock so a subsequent retry can try again.
      await gRef.update({ smugmugAlbumKey: null, smugmugAlbumUri: null });
      throw err;
    }
  }

  // Poll for the pending album (another function is creating it).
  logger.info("Waiting for pending SmugMug album", { galleryId });
  const POLL_INTERVAL_MS = 2_000;
  const MAX_POLLS        = 15; // 30 s total

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const snap = await gRef.get();
    const data = snap.data() as GalleryDoc | undefined;
    const key  = data?.smugmugAlbumKey ?? null;
    if (key && key !== ALBUM_PENDING) {
      return { albumKey: key, albumUri: data!.smugmugAlbumUri! };
    }
  }

  throw new Error("Timed out waiting for SmugMug album creation (lock held too long).");
}

// ── function ──────────────────────────────────────────────────────────────────

export const processUpload = onObjectFinalized(
  {
    bucket:        "concerts-dc206.firebasestorage.app",
    region:        "us-central1",
    memory:        "4GiB",
    timeoutSeconds: 540,
    secrets: [
      smConsumerKey,
      smConsumerSecret,
      smAccessToken,
      smAccessTokenSecret,
      smSiteNickname,
    ],
  },
  async (event) => {
    const obj  = event.data;
    const path = obj.name ?? "";

    // ── 1. Parse staging path ──────────────────────────────────────────────
    // Expected: staging/{uid}/{galleryId}/{fileId}
    const parts = path.split("/");
    if (parts.length < 4 || parts[0] !== "staging") {
      logger.warn("Object is not in staging path, skipping", { path });
      return;
    }
    const [, uid, galleryId, fileIdWithExt] = parts;
    // fileId is everything before the last "." (extension)
    const dotIdx = fileIdWithExt.lastIndexOf(".");
    const fileId = dotIdx > 0 ? fileIdWithExt.slice(0, dotIdx) : fileIdWithExt;
    const fileName = fileIdWithExt;

    // Compute backup path here so we can reference it before step 9.
    const backupPath = path.replace(/^staging\//, "backup/");

    logger.info("Processing upload", { uid, galleryId, fileId, path });

    // ── 2. Server-side validation ──────────────────────────────────────────
    const sizeBytes   = Number(obj.size ?? 0);
    const contentType = obj.contentType;
    const validation  = validateUpload(contentType, sizeBytes);

    if (!validation.valid) {
      logger.warn("Upload failed validation", { fileId, error: validation.error });
      await markJobFailed(fileId, validation.error!);
      // Delete the invalid staging file immediately.
      await getStorage().bucket(obj.bucket).file(path).delete().catch(() => null);
      return;
    }

    const mediaType = validation.mediaType!; // "image" | "video"

    // ── 3. Create uploadJobs doc (status: processing) ──────────────────────
    await uploadJobRef(fileId).set({
      uid,
      galleryId,
      fileId,
      status:    "processing",
      startedAt: Timestamp.now(),
    });

    try {
      // ── 4. Load gallery ────────────────────────────────────────────────
      const gallerySnap = await galleryRef(galleryId).get();
      if (!gallerySnap.exists) {
        throw new Error(`Gallery ${galleryId} not found in Firestore.`);
      }
      const gallery = gallerySnap.data() as GalleryDoc;

      // ── 5. Resolve / create SmugMug album ──────────────────────────────
      const oauthConfig: OAuthConfig = {
        consumerKey:       smConsumerKey.value(),
        consumerSecret:    smConsumerSecret.value(),
        accessToken:       smAccessToken.value(),
        accessTokenSecret: smAccessTokenSecret.value(),
      };
      const nickname = smSiteNickname.value();

      const { albumKey: _albumKey, albumUri } = await resolveAlbumWithLock(
        galleryId, gallery, oauthConfig, nickname,
      );

      // ── 6. Stream file → SmugMug ───────────────────────────────────────
      logger.info("Uploading to SmugMug", { galleryId, fileId, albumUri, sizeBytes });

      const bucket    = getStorage().bucket(obj.bucket);
      const fileStream = bucket.file(path).createReadStream();

      const keywords = [
        `uploader:${uid}`,
        `gallery:${galleryId}`,
        // app-item-id will be set after we have the itemId
      ];

      const uploadResult = await uploadMedia(
        oauthConfig,
        albumUri,
        fileStream,
        sizeBytes,
        fileName,
        contentType!,
        keywords,
      );

      // ── 7. Write Firestore item doc ────────────────────────────────────
      const itemRef = itemsCollection(galleryId).doc(); // auto-ID
      const itemId  = itemRef.id;

      // For video files, prefer a Firebase Storage download URL over SmugMug's
      // LargestVideo URL. The download token is set by the client SDK on upload
      // and is preserved when the file is moved to backup/. This URL works
      // immediately without waiting for SmugMug video transcoding to finish.
      const downloadToken = (obj.metadata as Record<string, string> | undefined)
        ?.firebaseStorageDownloadTokens;
      const storageVideoUrl = (mediaType === "video" && downloadToken && keepBackup())
        ? `https://firebasestorage.googleapis.com/v0/b/${obj.bucket}/o/${encodeURIComponent(backupPath)}?alt=media&token=${downloadToken}`
        : null;

      const itemDoc = {
        uploaderUid:     uid,
        type:            mediaType,
        smugmugImageKey: uploadResult.imageKey,
        smugmugImageUri: uploadResult.imageUri,
        displayUrl:      uploadResult.displayUrl,
        thumbnailUrl:    uploadResult.thumbnailUrl,
        videoUrl:        storageVideoUrl ?? uploadResult.videoUrl ?? null,
        caption:         null,
        uploadedAt:      Timestamp.now(),
      };

      await itemRef.set(itemDoc);
      logger.info("Item written to Firestore", { galleryId, itemId });

      // ── 8. Upsert userConcerts + conditionally increment counter ───────
      const ucRef  = userConcertRef(uid, galleryId);
      const uRef   = userRef(uid);

      await db().runTransaction(async (txn) => {
        const ucSnap = await txn.get(ucRef);
        const isFirstContribution = !ucSnap.exists;

        if (isFirstContribution) {
          txn.set(ucRef, {
            uid,
            galleryId,
            attendedAt: Timestamp.now(),
          });
          txn.set(
            uRef,
            { concertsAttendedCount: FieldValue.increment(1) },
            { merge: true },
          );
        } else {
          // Touch attendedAt so the list stays fresh.
          txn.update(ucRef, { attendedAt: Timestamp.now() });
        }
      });

      logger.info("UserConcerts upserted", { uid, galleryId });

      // ── 9. Stage-file cleanup ──────────────────────────────────────────
      if (keepBackup()) {
        // Move to /backup/ instead of deleting (preserves original for safety).
        // backupPath was computed at the top so we could use the token URL above.
        await bucket.file(path).move(backupPath);
        logger.info("Staging file moved to backup", { backupPath });
      } else {
        await bucket.file(path).delete();
        logger.info("Staging file deleted", { path });
      }

      // ── 10. Mark job done ─────────────────────────────────────────────
      await uploadJobRef(fileId).update({
        status:      "done",
        itemId,
        completedAt: Timestamp.now(),
      });

      logger.info("Upload pipeline complete", { uid, galleryId, itemId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Upload pipeline failed", { uid, galleryId, fileId, error: msg });
      await markJobFailed(fileId, msg);
    }
  },
);
