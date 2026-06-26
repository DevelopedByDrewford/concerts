# Encore favicon set

Generated from the wordmark — purple slab-serif "E" with the signature dot accent, on the
same near-black plum background (#160d18) as the source logo.

## Files
- `favicon.ico` — multi-resolution (16/32/48px), for legacy browser tab support
- `favicon.svg` — vector source, scales cleanly to any size
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-96x96.png` — standard browser sizes
- `apple-touch-icon.png` (180x180) — iOS home screen / Safari pinned tab
- `android-chrome-192x192.png`, `android-chrome-512x512.png` — Android home screen / PWA
- `site.webmanifest` — PWA manifest referencing the Android icons

## HTML to add to your `<head>`

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#160d18">
```

Drop all files in your site's `/public` (or static root) folder so the paths above resolve correctly.

## Colors used
- Background: `#160d18`
- Letter (E): `#9670c2`
- Dot accent: `#6b4894`
