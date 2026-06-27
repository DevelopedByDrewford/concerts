import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, limit, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
const functions        = getFunctions(app);

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

export async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function uploadAvatar(uid, file) {
  const avatarRef = ref(storage, `avatars/${uid}`);
  await uploadBytes(avatarRef, file, { contentType: file.type });
  return getDownloadURL(avatarRef);
}

export async function uploadBanner(uid, file) {
  const bannerRef = ref(storage, `banners/${uid}`);
  await uploadBytes(bannerRef, file, { contentType: file.type });
  return getDownloadURL(bannerRef);
}

/** Returns true if the username is unclaimed (or already owned by uid). */
export async function checkUsernameAvailable(username, uid) {
  const snap = await getDoc(doc(db, "usernames", username));
  if (!snap.exists()) return true;
  return snap.data()?.uid === uid;
}

/** Calls the changeUsername Cloud Function atomically. */
export async function callChangeUsername(username) {
  const fn = httpsCallable(functions, "changeUsername");
  const result = await fn({ username });
  return result.data;
}

// ── follows ───────────────────────────────────────────────────────────────────

function followDocId(currentUid, targetUid) {
  return `${currentUid}_${targetUid}`;
}

export async function getFollowStatus(currentUid, targetUid) {
  const snap = await getDoc(doc(db, 'follows', followDocId(currentUid, targetUid)));
  return snap.exists();
}

export async function followUser(currentUid, targetUid) {
  await setDoc(doc(db, 'follows', followDocId(currentUid, targetUid)), {
    followerId: currentUid,
    followedId: targetUid,
    followedAt: serverTimestamp(),
  });
}

export async function unfollowUser(currentUid, targetUid) {
  await deleteDoc(doc(db, 'follows', followDocId(currentUid, targetUid)));
}

export async function getFollowCounts(uid) {
  const [followersSnap, followingSnap] = await Promise.all([
    getDocs(query(collection(db, 'follows'), where('followedId', '==', uid))),
    getDocs(query(collection(db, 'follows'), where('followerId', '==', uid))),
  ]);
  return { followerCount: followersSnap.size, followingCount: followingSnap.size };
}

async function _fetchProfiles(uids) {
  if (!uids.length) return [];
  const results = await Promise.all(
    uids.map(async uid => {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? { uid, ...snap.data() } : null;
    })
  );
  return results.filter(Boolean);
}

export async function getFollowersList(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('followedId', '==', uid)));
  return _fetchProfiles(snap.docs.map(d => d.data().followerId));
}

export async function getFollowingList(uid) {
  const snap = await getDocs(query(collection(db, 'follows'), where('followerId', '==', uid)));
  return _fetchProfiles(snap.docs.map(d => d.data().followedId));
}

// ── search ────────────────────────────────────────────────────────────────────

export async function searchUsers(term) {
  const q = term.toLowerCase().trim();
  // Fetch a capped set and filter client-side — Firestore has no substring query
  const snap = await getDocs(query(collection(db, 'users'), limit(200)));
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(u =>
      (u.name     || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
}

// ── media uploads ─────────────────────────────────────────────────────────────

export function uploadToStaging(uid, galleryId, fileId, file, onProgress) {
  const ext  = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `staging/${uid}/${galleryId}/${fileId}.${ext}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
  if (onProgress) task.on('state_changed', snap => onProgress(snap.bytesTransferred / snap.totalBytes));
  return task;
}

export function watchUploadJob(fileId, callback) {
  return onSnapshot(doc(db, 'uploadJobs', fileId), callback);
}

export async function loadGalleryItems(galleryId) {
  const snap = await getDocs(collection(db, 'galleries', galleryId, 'items'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function callDeleteItem(itemId, galleryId) {
  return httpsCallable(functions, 'deleteItem')({ itemId, galleryId });
}

export async function callGetVideoUrl(galleryId, itemId) {
  const result = await httpsCallable(functions, 'getVideoUrl')({ galleryId, itemId });
  return result.data.videoUrl;
}

// ── galleries ─────────────────────────────────────────────────────────────────

export async function getUserGalleries(uid) {
  const snap = await getDocs(query(collection(db, 'galleries'), where('createdBy', '==', uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function loadAllGalleries() {
  const snap = await getDocs(collection(db, 'galleries'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getGalleryCoverItem(galleryId) {
  const snap = await getDocs(
    query(collection(db, 'galleries', galleryId, 'items'), where('type', '==', 'image'), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function loadGalleryStats(galleryId) {
  const snap = await getDocs(collection(db, 'galleries', galleryId, 'items'));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const photos = items.filter(i => i.type === 'image');
  const uids = new Set(items.map(i => i.uploaderUid).filter(Boolean));
  return {
    photoCount:  photos.length,
    videoCount:  items.filter(i => i.type === 'video').length,
    contribCount: Math.max(1, uids.size),
    coverItem:   photos[0] || null,
  };
}

export async function searchGalleries(term) {
  const q = term.toLowerCase().trim();
  const snap = await getDocs(query(collection(db, 'galleries'), limit(200)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(g =>
      (g.artistName || '').toLowerCase().includes(q) ||
      (g.city       || '').toLowerCase().includes(q) ||
      (g.venue      || '').toLowerCase().includes(q)
    );
}

export async function findGalleryBySlug(slug) {
  const slugify = s => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const snap = await getDocs(query(collection(db, 'galleries'), limit(200)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .find(g => {
      const [month = '', year = ''] = (g.monthYear || '').split(' ');
      const p = `/g/${slugify(g.artistName)}/${slugify(g.venue)}/${slugify(g.city)}/${slugify(month)}-${slugify(year)}`;
      return p === slug;
    }) || null;
}

export async function findDuplicateGallery(artistName, venue, city, monthYear) {
  const q = query(
    collection(db, 'galleries'),
    where('artistName', '==', artistName),
    where('venue', '==', venue),
    where('city', '==', city),
    where('monthYear', '==', monthYear),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function setGalleryCover(galleryId, coverUrl) {
  await updateDoc(doc(db, 'galleries', galleryId), { coverUrl });
}

export async function updateGalleryDetails(galleryId, details) {
  await updateDoc(doc(db, 'galleries', galleryId), details);
}

// ── attendances ───────────────────────────────────────────────────────────────

export async function attendGallery(uid, galleryId) {
  await setDoc(doc(db, 'attendances', `${uid}_${galleryId}`), {
    uid,
    galleryId,
    attendedAt: serverTimestamp(),
  });
}

export async function unattendGallery(uid, galleryId) {
  await deleteDoc(doc(db, 'attendances', `${uid}_${galleryId}`));
}

export async function getUserAttendances(uid) {
  const snap = await getDocs(query(collection(db, 'attendances'), where('uid', '==', uid)));
  return snap.docs.map(d => d.data().galleryId);
}

export async function createGallery(uid, { artistName, venue, city, monthYear }) {
  const newRef = doc(collection(db, 'galleries'));
  await setDoc(newRef, {
    artistName,
    venue,
    city,
    monthYear,
    createdBy: uid,
    smugmugAlbumKey: null,
    smugmugAlbumUri: null,
    createdAt: serverTimestamp(),
  });
  return newRef.id;
}

// ── username lookup ───────────────────────────────────────────────────────────

/**
 * Looks up a user by username. Checks usernameHistory for old handles that
 * were changed, returning { uid, redirectTo } when a redirect applies.
 */
export async function getUserByUsername(username) {
  const claimSnap = await getDoc(doc(db, "usernames", username));
  if (claimSnap.exists()) {
    const { uid } = claimSnap.data();
    const userSnap = await getDoc(doc(db, "users", uid));
    return userSnap.exists() ? { uid, ...userSnap.data() } : null;
  }
  // Check history for renamed usernames
  const histSnap = await getDoc(doc(db, "usernameHistory", username));
  if (histSnap.exists()) {
    return { redirectTo: histSnap.data().replacedBy };
  }
  return null;
}
