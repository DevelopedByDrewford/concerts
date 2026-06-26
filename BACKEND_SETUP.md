# Backend Setup

Firebase + SmugMug concert media platform. All SmugMug credentials live in
Firebase Secret Manager — never in code or env files.

---

## Prerequisites

```
node >= 20
npm >= 10
firebase-tools >= 13   (npm install -g firebase-tools)
```

Log in and select the project:

```bash
firebase login
firebase use concerts-dc206
```

---

## 1. One-time SmugMug OAuth handshake

Run this once to exchange your Consumer Key/Secret for a long-lived Access Token:

```bash
SMUGMUG_CONSUMER_KEY=<your-key> \
SMUGMUG_CONSUMER_SECRET=<your-secret> \
node scripts/smugmug-oauth-handshake.js
```

The script prints four values:
- `SMUGMUG_CONSUMER_KEY`
- `SMUGMUG_CONSUMER_SECRET`
- `SMUGMUG_ACCESS_TOKEN`
- `SMUGMUG_ACCESS_TOKEN_SECRET`

It also prints your SmugMug **nickname** (use it as `SMUGMUG_SITE_NICKNAME` in the next step).

---

## 2. Store credentials in Firebase Secret Manager

Run each command and paste the value when prompted. No values go in code or git.

```bash
firebase functions:secrets:set SMUGMUG_CONSUMER_KEY
firebase functions:secrets:set SMUGMUG_CONSUMER_SECRET
firebase functions:secrets:set SMUGMUG_ACCESS_TOKEN
firebase functions:secrets:set SMUGMUG_ACCESS_TOKEN_SECRET
firebase functions:secrets:set SMUGMUG_SITE_NICKNAME
```

Verify all five are set:

```bash
firebase functions:secrets:access SMUGMUG_CONSUMER_KEY
firebase functions:secrets:access SMUGMUG_CONSUMER_SECRET
firebase functions:secrets:access SMUGMUG_ACCESS_TOKEN
firebase functions:secrets:access SMUGMUG_ACCESS_TOKEN_SECRET
firebase functions:secrets:access SMUGMUG_SITE_NICKNAME
```

---

## 3. Enable required GCP APIs

These must be enabled on the `concerts-dc206` project before deploy:

```bash
gcloud config set project concerts-dc206
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable eventarc.googleapis.com
gcloud services enable run.googleapis.com
```

---

## 4. Build and deploy

```bash
# Build TypeScript
cd functions && npm run build && cd ..

# Deploy everything (rules + indexes + functions + hosting)
firebase deploy

# Or deploy components individually:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
firebase deploy --only functions
firebase deploy --only hosting
```

---

## 5. Environment variables (optional)

`processUpload` checks `KEEP_STAGING_BACKUP` at runtime:

| Value | Behavior |
|---|---|
| unset / `true` | Move processed staging files to `backup/` (default — safe) |
| `false` | Delete staging files immediately after upload |

Set per-function in `firebase.json` under `functions[].environmentVariables` if
you want to change the default without redeploying secrets.

---

## 6. Firestore indexes

Indexes are in `firestore.indexes.json` and are deployed with `firebase deploy
--only firestore:indexes`. Allow 5–10 minutes for large collections to backfill.

---

## 7. First-run checklist

- [ ] `firebase login` completed
- [ ] Project set: `firebase use concerts-dc206`
- [ ] OAuth handshake script run; four values captured
- [ ] All 5 secrets set in Secret Manager
- [ ] GCP APIs enabled
- [ ] `functions/` TypeScript builds clean: `cd functions && npm run build`
- [ ] `firebase deploy` succeeds
- [ ] Test upload: drop a JPEG into `staging/{uid}/{galleryId}/{filename}` in Storage
      and watch `uploadJobs/{fileId}` transition `processing → done` in Firestore

---

## Architecture reference

```
Client (React)
  │
  ├─ Firebase Auth  (sign-in)
  ├─ Firestore      (read galleries, items, upload job status)
  └─ Firebase Storage  (PUT file to staging/{uid}/{galleryId}/{fileId})
         │
         └─ onObjectFinalized trigger (processUpload Cloud Function)
                │
                ├─ validate MIME + size
                ├─ resolve/create SmugMug album (Firestore lock)
                ├─ stream GCS file → SmugMug upload API
                ├─ write galleries/{id}/items/{id} to Firestore
                ├─ upsert userConcerts + increment counter
                ├─ move staging file → backup/ (or delete)
                └─ mark uploadJobs/{fileId} → "done"

Client delete flow:
  Client calls deleteItem(itemId, galleryId) [onCall]
    → ownership check → SmugMug DELETE → Firestore item delete
    → if last item: remove userConcerts + decrement counter
```
