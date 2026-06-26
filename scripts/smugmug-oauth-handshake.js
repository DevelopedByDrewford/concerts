#!/usr/bin/env node
/**
 * SmugMug OAuth 1.0a – one-time 3-legged handshake.
 *
 * Run this locally once to obtain your Access Token + Secret, then store
 * those values with `firebase functions:secrets:set` (see BACKEND_SETUP.md).
 *
 * Usage:
 *   SMUGMUG_CONSUMER_KEY=xxx SMUGMUG_CONSUMER_SECRET=yyy node scripts/smugmug-oauth-handshake.js
 *
 * The script will:
 *   1. Obtain a request token from SmugMug.
 *   2. Print an authorization URL for you to open in a browser.
 *   3. Wait for you to paste the verifier code back.
 *   4. Exchange the verifier for an access token + secret.
 *   5. Print the final values to copy into Firebase Secret Manager.
 */

"use strict";

const https   = require("node:https");
const crypto  = require("node:crypto");
const url     = require("node:url");
const readline = require("node:readline");

const CONSUMER_KEY    = process.env.SMUGMUG_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.SMUGMUG_CONSUMER_SECRET;

if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error(
    "Error: SMUGMUG_CONSUMER_KEY and SMUGMUG_CONSUMER_SECRET must be set as environment variables.",
  );
  process.exit(1);
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

function pct(s) {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function buildOAuthHeader(method, requestUrl, extraOAuth, tokenSecret = "") {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce     = crypto.randomBytes(16).toString("hex");

  const oauthParams = {
    oauth_consumer_key:     CONSUMER_KEY,
    oauth_nonce:            nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        timestamp,
    oauth_version:          "1.0",
    ...extraOAuth,
  };

  const [baseUrl, qs] = requestUrl.split("?");
  const qParams = {};
  if (qs) {
    qs.split("&").forEach((p) => {
      const [k, v = ""] = p.split("=");
      qParams[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  }

  const allParams = { ...qParams, ...oauthParams };
  const paramString = Object.entries(allParams)
    .map(([k, v]) => [pct(k), pct(v)])
    .sort(([ka, va], [kb, vb]) =>
      ka !== kb ? ka.localeCompare(kb) : va.localeCompare(vb),
    )
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const sigBase = [method.toUpperCase(), pct(baseUrl), pct(paramString)].join("&");
  const sigKey  = `${pct(CONSUMER_SECRET)}&${pct(tokenSecret)}`;
  const sig     = crypto.createHmac("sha1", sigKey).update(sigBase).digest("base64");

  oauthParams.oauth_signature = sig;

  return (
    "OAuth " +
    Object.entries(oauthParams)
      .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
      .join(", ")
  );
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpsPost(targetUrl, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(targetUrl);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path:     parsed.pathname + (parsed.search || ""),
        method:   "POST",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function parseOAuthResponse(body) {
  return Object.fromEntries(
    body.split("&").map((p) => p.split("=").map(decodeURIComponent)),
  );
}

// ── Handshake ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== SmugMug OAuth 1.0a Handshake ===\n");

  // Step 1 – Request token
  const requestTokenUrl = "https://api.smugmug.com/services/oauth/1.0a/getRequestToken";
  const rt_auth = buildOAuthHeader("POST", requestTokenUrl, {
    oauth_callback: "oob",
  });

  console.log("Requesting token from SmugMug...");
  const rtBody   = await httpsPost(requestTokenUrl, { Authorization: rt_auth });
  const rtParams = parseOAuthResponse(rtBody);

  if (!rtParams.oauth_token) {
    console.error("Failed to obtain request token:\n", rtBody);
    process.exit(1);
  }

  const requestToken       = rtParams.oauth_token;
  const requestTokenSecret = rtParams.oauth_token_secret;

  // Step 2 – Direct user to authorize
  const authorizeUrl =
    `https://api.smugmug.com/services/oauth/1.0a/authorize` +
    `?oauth_token=${encodeURIComponent(requestToken)}&Access=Full&Permissions=Modify`;

  console.log("\nOpen this URL in your browser and authorize the app:\n");
  console.log("  " + authorizeUrl + "\n");

  // Step 3 – Collect the verifier
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const verifier = await new Promise((resolve) => {
    rl.question("Paste the 6-digit verifier code SmugMug shows you: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  // Step 4 – Exchange for access token
  const accessTokenUrl = "https://api.smugmug.com/services/oauth/1.0a/getAccessToken";
  const at_auth = buildOAuthHeader("POST", accessTokenUrl, {
    oauth_token:    requestToken,
    oauth_verifier: verifier,
  }, requestTokenSecret);

  console.log("\nExchanging verifier for access token...");
  const atBody   = await httpsPost(accessTokenUrl, { Authorization: at_auth });
  const atParams = parseOAuthResponse(atBody);

  if (!atParams.oauth_token) {
    console.error("Failed to obtain access token:\n", atBody);
    process.exit(1);
  }

  // Step 5 – Print results
  console.log("\n✅  Success! Store these values in Firebase Secret Manager:\n");
  console.log("  SMUGMUG_CONSUMER_KEY       =", CONSUMER_KEY);
  console.log("  SMUGMUG_CONSUMER_SECRET    =", CONSUMER_SECRET);
  console.log("  SMUGMUG_ACCESS_TOKEN       =", atParams.oauth_token);
  console.log("  SMUGMUG_ACCESS_TOKEN_SECRET=", atParams.oauth_token_secret);
  console.log(
    "\nSee BACKEND_SETUP.md for the firebase functions:secrets:set commands.\n",
  );
}

main().catch((err) => {
  console.error("\nHandshake failed:", err.message);
  process.exit(1);
});
