import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp }  from "firebase-admin/firestore";

const db = () => getFirestore();

// 3-20 chars, letters/numbers/underscore/dot, must start + end with letter/number
const USERNAME_RE = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$|^[a-z0-9]{3}$/;

export const changeUsername = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const uid = request.auth.uid;
  const raw = (request.data.username ?? "").trim().toLowerCase();

  if (!USERNAME_RE.test(raw)) {
    throw new HttpsError(
      "invalid-argument",
      "Username must be 3–20 characters: letters, numbers, _ or . (must start and end with a letter or number)."
    );
  }
  if (/\.{2}|_{2}/.test(raw)) {
    throw new HttpsError("invalid-argument", "Username may not contain consecutive dots or underscores.");
  }

  await db().runTransaction(async (txn) => {
    const claimRef = db().collection("usernames").doc(raw);
    const claimSnap = await txn.get(claimRef);

    if (claimSnap.exists && claimSnap.data()?.uid !== uid) {
      throw new HttpsError("already-exists", "That username is already taken.");
    }

    const userRef = db().collection("users").doc(uid);
    const userSnap = await txn.get(userRef);
    const oldUsername: string | undefined = userSnap.data()?.username;

    if (oldUsername && oldUsername !== raw) {
      txn.set(db().collection("usernameHistory").doc(oldUsername), {
        uid,
        replacedBy: raw,
        replacedAt: Timestamp.now(),
      });
      txn.delete(db().collection("usernames").doc(oldUsername));
    }

    txn.set(claimRef, { uid, claimedAt: Timestamp.now() });
    txn.set(userRef, { username: raw }, { merge: true });
  });

  return { username: raw };
});
