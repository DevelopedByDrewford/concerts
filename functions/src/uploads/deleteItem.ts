/**
 * deleteItem – callable Cloud Function (2nd-gen onCall).
 *
 * Called by the client to delete a media item. Server-side re-validates
 * ownership even though Firestore rules also block client direct deletes.
 *
 * Pipeline:
 *   1. Verify caller is authenticated.
 *   2. Fetch the item doc; verify uploaderUid === caller uid.
 *   3. Delete from SmugMug.
 *   4. Delete the Firestore item doc.
 *   5. If this was the caller's last item in the gallery, remove the
 *      userConcerts doc and decrement concertsAttendedCount.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret }       from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";
import { logger }             from "firebase-functions/v2";

import {
  db, itemRef, itemsCollection,
  userRef, userConcertRef,
  type ItemDoc,
} from "../lib/firestore.js";
import { deleteMedia } from "../smugmug/api.js";
import type { OAuthConfig } from "../smugmug/oauthSign.js";

// ── secrets ───────────────────────────────────────────────────────────────────

const smConsumerKey       = defineSecret("SMUGMUG_CONSUMER_KEY");
const smConsumerSecret    = defineSecret("SMUGMUG_CONSUMER_SECRET");
const smAccessToken       = defineSecret("SMUGMUG_ACCESS_TOKEN");
const smAccessTokenSecret = defineSecret("SMUGMUG_ACCESS_TOKEN_SECRET");

// ── request / response types ──────────────────────────────────────────────────

interface DeleteItemRequest {
  itemId:    string;
  galleryId: string;
}

// ── function ──────────────────────────────────────────────────────────────────

export const deleteItem = onCall<DeleteItemRequest>(
  {
    region: "us-central1",
    secrets: [
      smConsumerKey,
      smConsumerSecret,
      smAccessToken,
      smAccessTokenSecret,
    ],
  },
  async (request) => {
    // ── 1. Auth guard ──────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to delete items.");
    }

    const callerUid = request.auth.uid;
    const { itemId, galleryId } = request.data;

    if (!itemId || !galleryId) {
      throw new HttpsError("invalid-argument", "itemId and galleryId are required.");
    }

    logger.info("deleteItem called", { callerUid, galleryId, itemId });

    // ── 2. Fetch item + ownership check ────────────────────────────────────
    const iRef   = itemRef(galleryId, itemId);
    const iSnap  = await iRef.get();

    if (!iSnap.exists) {
      throw new HttpsError("not-found", "Item not found.");
    }

    const item = iSnap.data() as ItemDoc;

    if (item.uploaderUid !== callerUid) {
      throw new HttpsError(
        "permission-denied",
        "You can only delete items you uploaded.",
      );
    }

    const imageKey = item.smugmugImageKey;

    // ── 3. Delete from SmugMug ─────────────────────────────────────────────
    const oauthConfig: OAuthConfig = {
      consumerKey:       smConsumerKey.value(),
      consumerSecret:    smConsumerSecret.value(),
      accessToken:       smAccessToken.value(),
      accessTokenSecret: smAccessTokenSecret.value(),
    };

    try {
      await deleteMedia(oauthConfig, imageKey);
      logger.info("Deleted from SmugMug", { imageKey });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("SmugMug delete failed", { imageKey, error: msg });
      // Surface the error; Firestore doc is untouched so state stays consistent.
      throw new HttpsError("internal", `Failed to delete from SmugMug: ${msg}`);
    }

    // ── 4. Delete Firestore item doc ───────────────────────────────────────
    await iRef.delete();
    logger.info("Item deleted from Firestore", { galleryId, itemId });

    // ── 5. Check if this was the caller's last item in the gallery ─────────
    const remainingSnap = await itemsCollection(galleryId)
      .where("uploaderUid", "==", callerUid)
      .limit(1)
      .get();

    const wasLastItem = remainingSnap.empty;

    if (wasLastItem) {
      const ucRef = userConcertRef(callerUid, galleryId);
      const uRef  = userRef(callerUid);

      await db().runTransaction(async (txn) => {
        const ucSnap = await txn.get(ucRef);
        if (!ucSnap.exists) return; // already gone

        txn.delete(ucRef);
        txn.set(
          uRef,
          { concertsAttendedCount: FieldValue.increment(-1) },
          { merge: true },
        );
      });

      logger.info("Last item removed; userConcerts + counter cleaned up", {
        callerUid, galleryId,
      });
    }

    return { success: true, itemId };
  },
);
