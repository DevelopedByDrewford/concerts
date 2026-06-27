/**
 * Typed Firestore collection / document references.
 *
 * All server-side writes use the Admin SDK (bypasses security rules).
 * These refs are used by processUpload and deleteItem to read/write data.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

export { Timestamp, FieldValue };

// ── document shapes ───────────────────────────────────────────────────────────

export interface UserDoc {
  username:             string;
  profilePhotoUrl:      string;
  bio:                  string;
  concertsAttendedCount: number;
  favoriteItemIds:      string[];
}

export interface GalleryDoc {
  artistName:      string;
  city:            string;
  venue:           string;
  monthYear:       string; // "YYYY-MM"
  createdBy:       string;
  smugmugAlbumKey: string | null;  // null → album not yet created
  smugmugAlbumUri: string | null;
  createdAt:       Timestamp;
}

/** Sentinel written during concurrent album creation to act as a lock. */
export const ALBUM_PENDING = "__pending__";

export interface ItemDoc {
  uploaderUid:     string;
  type:            "image" | "video";
  smugmugImageKey: string;
  smugmugImageUri: string;
  displayUrl:      string;
  thumbnailUrl:    string;
  videoUrl?:       string | null;
  caption:         string | null;
  uploadedAt:      Timestamp;
}

export interface UserConcertDoc {
  uid:        string;
  galleryId:  string;
  attendedAt: Timestamp;
}

export interface UploadJobDoc {
  uid:          string;
  galleryId:    string;
  fileId:       string;
  status:       "processing" | "done" | "failed";
  itemId?:      string;   // populated on success
  uploadError?: string;   // populated on failure
  startedAt:    Timestamp;
  completedAt?: Timestamp;
}

// ── typed collection helpers ──────────────────────────────────────────────────

export function db() {
  return getFirestore();
}

export function userRef(uid: string) {
  return db().collection("users").doc(uid);
}

export function galleryRef(galleryId: string) {
  return db().collection("galleries").doc(galleryId);
}

export function itemRef(galleryId: string, itemId: string) {
  return db().collection("galleries").doc(galleryId).collection("items").doc(itemId);
}

export function itemsCollection(galleryId: string) {
  return db().collection("galleries").doc(galleryId).collection("items");
}

export function userConcertRef(uid: string, galleryId: string) {
  return db().collection("userConcerts").doc(`${uid}_${galleryId}`);
}

export function uploadJobRef(fileId: string) {
  return db().collection("uploadJobs").doc(fileId);
}
