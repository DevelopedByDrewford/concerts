/**
 * OAuth 1.0a HMAC-SHA1 signing helper for SmugMug API v2.
 *
 * SmugMug uses 3-legged OAuth 1.0a with a single service-account credential
 * set (consumer key/secret + access token/secret). Every API call and the
 * binary upload endpoint are signed with this helper.
 *
 * Signature base string construction follows RFC 5849 §3.4.1:
 *   1. Collect OAuth params + any request query params (NOT json body, NOT
 *      binary body, NOT request headers other than Authorization).
 *   2. Percent-encode each key and value per §3.6.
 *   3. Sort by encoded key, then by encoded value.
 *   4. Join as "key=value&key=value...".
 *   5. Base string = METHOD + "&" + pct(baseUrl) + "&" + pct(paramString).
 *   6. Signing key = pct(consumerSecret) + "&" + pct(tokenSecret).
 *   7. HMAC-SHA1(signingKey, baseString), then base64-encode.
 */

import * as crypto from "node:crypto";

export interface OAuthConfig {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/** RFC 3986 percent-encoding (stricter than encodeURIComponent). */
function pct(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/**
 * Build an OAuth 1.0a Authorization header value.
 *
 * @param method      HTTP method (GET, POST, PATCH, DELETE, PUT).
 * @param url         Full request URL, including any query string.
 *                    Query params are parsed and included in the signature.
 * @param config      Consumer + access token credential set.
 * @returns           Value for the Authorization header (starts with "OAuth ").
 */
export function buildAuthHeader(
  method: string,
  url: string,
  config: OAuthConfig,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     config.consumerKey,
    oauth_nonce:            nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp:        timestamp,
    oauth_token:            config.accessToken,
    oauth_version:          "1.0",
  };

  // Parse query string params so they're included in the signature.
  const [baseUrl, queryString] = url.split("?");
  const queryParams: Record<string, string> = {};
  if (queryString) {
    for (const part of queryString.split("&")) {
      const [k, v = ""] = part.split("=");
      queryParams[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  // Merge OAuth params + query params, then sort and build the param string.
  const allParams: Record<string, string> = { ...queryParams, ...oauthParams };

  const paramString = Object.entries(allParams)
    .map(([k, v]): [string, string] => [pct(k), pct(v)])
    .sort(([ka, va], [kb, vb]) =>
      ka !== kb ? ka.localeCompare(kb) : va.localeCompare(vb),
    )
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    pct(baseUrl),
    pct(paramString),
  ].join("&");

  const signingKey = `${pct(config.consumerSecret)}&${pct(config.accessTokenSecret)}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  // Build Authorization header value – only OAuth params go here, not query.
  const headerValue =
    "OAuth " +
    Object.entries(oauthParams)
      .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
      .join(", ");

  return headerValue;
}
