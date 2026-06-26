import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey:            "AIzaSyDMrYYPUEMzE_xI9pFj9ugbMMgZXEkHLVw",
  authDomain:        "concerts-dc206.firebaseapp.com",
  databaseURL:       "https://concerts-dc206-default-rtdb.firebaseio.com",
  projectId:         "concerts-dc206",
  storageBucket:     "concerts-dc206.firebasestorage.app",
  messagingSenderId: "796849248681",
  appId:             "1:796849248681:web:0286c5ecbe1faf93daccb8",
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
