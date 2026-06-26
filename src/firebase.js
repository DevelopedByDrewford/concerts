import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
