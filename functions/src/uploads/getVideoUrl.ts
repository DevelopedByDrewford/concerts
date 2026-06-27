/**
 * getVideoUrl – callable Cloud Function.
 *
 * Fetches the playable MP4 URL for an existing video item that was uploaded
 * before videoUrl was stored in Firestore. Caches the result back to the
 * item doc so subsequent calls are a single Firestore read.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret }       from "firebase-functions/params";
import { logger }             from "firebase-functions/v2";

import { itemRef, type ItemDoc } from "../lib/firestore.js";
import { getLargestVideoUrl }    from "../smugmug/api.js";
import type { OAuthConfig }      from "../smugmug/oauthSign.js";

const smConsumerKey       = defineSecret("SMUGMUG_CONSUMER_KEY");
const smConsumerSecret    = defineSecret("SMUGMUG_CONSUMER_SECRET");
const smAccessToken       = defineSecret("SMUGMUG_ACCESS_TOKEN");
const smAccessTokenSecret = defineSecret("SMUGMUG_ACCESS_TOKEN_SECRET");

interface GetVideoUrlRequest {
  galleryId: string;
  itemId:    string;
}

export const getVideoUrl = onCall<GetVideoUrlRequest>(
  {
    region: "us-central1",
    secrets: [smConsumerKey, smConsumerSecret, smAccessToken, smAccessTokenSecret],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { galleryId, itemId } = request.data;
    if (!galleryId || !itemId) {
      throw new HttpsError("invalid-argument", "galleryId and itemId are required.");
    }

    const iRef = itemRef(galleryId, itemId);
    const snap = await iRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Item not found.");

    const item = snap.data() as ItemDoc;
    if (item.type !== "video") {
      throw new HttpsError("invalid-argument", "Item is not a video.");
    }

    // Return cached URL if we already stored it.
    if (item.videoUrl) return { videoUrl: item.videoUrl };

    logger.info("Fetching LargestVideo URL from SmugMug", { galleryId, itemId });

    const oauthConfig: OAuthConfig = {
      consumerKey:       smConsumerKey.value(),
      consumerSecret:    smConsumerSecret.value(),
      accessToken:       smAccessToken.value(),
      accessTokenSecret: smAccessTokenSecret.value(),
    };

    const videoUrl = await getLargestVideoUrl(oauthConfig, item.smugmugImageUri);

    // Cache for future calls.
    await iRef.update({ videoUrl });

    logger.info("Video URL fetched and cached", { galleryId, itemId });
    return { videoUrl };
  },
);
