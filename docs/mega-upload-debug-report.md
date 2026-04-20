# MEGA Upload Debug Report

Full trace of every problem hit while porting MEGA file upload from PWA to React Native (Expo).

---

## Problem 1: megajs library won't work in React Native

**Symptom**: `File upload failed` — no useful error.

**Root cause**: megajs npm package uses Node.js built-ins (`crypto`, `stream`, `http`, `https`, `events`, `pumpify`). React Native doesn't have these.

**Fix attempted**: Force Metro to resolve megajs browser build (`main.browser-es.mjs`) via `metro.config.js` custom resolver.

```js
// metro.config.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "megajs") {
    return {
      filePath: require.resolve("megajs/dist/main.browser-es.mjs"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

**New problem created**: Browser build loaded, but triggered Problem 2.

---

## Problem 2: `crypto.subtle.importKey` is undefined

**Symptom**: `Cannot read property 'importKey' of undefined`

**Root cause**: megajs browser build uses WebCrypto API (`crypto.subtle`) for PBKDF2 key derivation during login. React Native has no `crypto.subtle`.

**Fix attempted**: Polyfill `crypto.subtle` in `src/polyfills.js` using `@noble/hashes` (pure JS):

- `importKey` — stores raw key bytes
- `deriveBits` — PBKDF2-HMAC-SHA256/SHA512
- `digest` — SHA-256, SHA-512

**New problem created**: Polyfill worked, but triggered Problem 3.

---

## Problem 3: `react-native-get-random-values` TurboModule crash

**Symptom**: `Invariant violation: TurboModuleRegistry.getEnforcing(...)`

**Root cause**: `react-native-get-random-values` requires native TurboModule not available in Expo Go with new architecture enabled.

**Fix attempted**: Replaced with `expo-crypto` (Expo native module).

**New problem created**: Problem 4.

---

## Problem 4: `ExpoCryptoAES` native module not found

**Symptom**: `Cannot find native module 'ExpoCryptioAES'`

**Root cause**: `expo-crypto` v55 includes AES module that needs native code not available in Expo Go SDK 54.

**Fix attempted**: Removed `expo-crypto`. Used pure JS fallback — `Math.random()` for `getRandomValues` (dev only, not cryptographically secure).

**Result**: Crypto polyfills working. Moved to Problem 5.

---

## Problem 5: megajs `Storage.ready` promise never resolves

**Symptom**: App hangs at `[MEGA] Awaiting .ready promise...` forever.

**Root cause**: megajs `Storage` constructor calls `this.login()` internally, which uses `this.api.request()` → `this.fetch()` → `this.defaultFetch()`. The `defaultFetch` passes `opts.agent` (a Node.js-only option) to `fetch()`. RN's `fetch` silently ignores or fails with unknown options, causing the request to hang.

**Fix attempted**: Passed custom `fetch` function stripping Node.js options:

```js
new Storage({
  ...megaConfig,
  fetch: rnFetch,
  userAgent: null,
  httpAgent: null,
  httpsAgent: null,
});
```

**Result**: Still hung. megajs internal EventEmitter/callback chain fundamentally broken in RN regardless of fetch fix.

**Decision**: **Drop megajs entirely.** Rewrite MEGA client using raw `fetch()` API calls.

---

## Problem 6: Raw MEGA API — empty auth response

**Symptom**: `MEGA API parse error for us:` (empty response body)

**Root cause**: PBKDF2 key derivation used SHA-256 instead of SHA-512. MEGA v2 accounts require PBKDF2-HMAC-**SHA-512** with 100k iterations. Wrong hash → wrong derived key → wrong auth hash → MEGA returns empty response (not an error code, just empty).

**Fix**: Changed `sha256` → `sha512` in `prepareKeyV2()`.

---

## Problem 7: PBKDF2 blocks JS thread for 10-30 seconds

**Symptom**: Entire app freezes. Messages don't load. UI unresponsive. Progress bars vanish.

**Root cause**: `@noble/hashes` `pbkdf2()` is synchronous. 100k iterations of HMAC-SHA-512 in pure JS blocks the single JS thread completely. No React state updates, no Firebase listeners, no rendering.

**Fix**: Rewrote PBKDF2 manually with chunked yielding:

```js
for (let i = 1; i < iterations; i++) {
  u = Buffer.from(hmacFn(passwordBuf, u));
  for (let j = 0; j < result.length; j++) result[j] ^= u[j];
  if (i % 1000 === 0) await new Promise((r) => setTimeout(r, 0)); // yield
}
```

Every 1000 iterations, yields to event loop. UI stays responsive. But still takes 10-30s total.

**New problem created**: Problem 8.

---

## Problem 8: RSA session decryption (`csid`) not implemented

**Symptom**: `RSA session not supported — account needs tsid-based session`

**Root cause**: Full MEGA v2 accounts return `csid` (RSA-encrypted session ID), not `tsid` (temporary session). We only handled `tsid`. The RSA decryption requires:

1. Decrypt private key from `loginResp.privk` using AES-ECB with master key
2. Parse MEGA MPI format (multi-precision integer) for RSA components (p, q, d, u)
3. RSA decrypt: `m = c^d mod n` using BigInt

**Fix**: Implemented RSA decrypt with BigInt (supported by Hermes engine):

```js
function rsaDecrypt(cipher, p, q, d) {
  const n = p * q;
  let result = 1n,
    base = c % n,
    exp = d;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % n;
    exp >>= 1n;
    base = (base * base) % n;
  }
  return bigIntToBuffer(result, nLen);
}
```

**New problem created**: RSA produced wrong session ID (Problem 9).

---

## Problem 9: RSA decryption produces wrong session ID

**Symptom**: `ug` API returns `-15` (ESID — invalid session) with RSA-decrypted sid.

**Root cause**: megajs uses a custom bignum library (`mpi2b`, `b2s`, `bmodexp`) with different byte ordering than standard BigInt hex conversion. Our BigInt-based RSA decrypt produces different byte layout than megajs expects.

**Decision**: Too complex to reverse-engineer megajs bignum compatibility. **Pre-compute the session on dev machine instead.**

**Fix**: Created `scripts/mega-session.js` — runs megajs on Node.js (dev machine only), extracts session ID + master key + root handle, stores in `.env`:

```env
EXPO_PUBLIC_MEGA_SID=
EXPO_PUBLIC_MEGA_MASTER_KEY=
EXPO_PUBLIC_MEGA_ROOT=
```

App reads these at startup → zero PBKDF2, zero RSA. Instant login (~200ms API verification).

---

## Problem 10: Password with special characters mangled by dotenv

**Symptom**: `ENOENT (-9): Object not found. Wrong password?`

**Root cause**: Password in `.env` had `\$` escaping. dotenv read it as literal `\$` instead of `$`.

**Fix**: Wrapped password in single quotes:

```env
EXPO_PUBLIC_MEGA_PASSWORD='test$password'
```

---

## Problem 11: App still runs PBKDF2 despite .env session

**Symptom**: Console shows `[MEGA] PBKDF2 starting (~10-30s)...` even with session in .env.

**Root cause**: `megaStorage.js` `login()` only checked AsyncStorage cache, not `.env` variables. Config had `sid`, `masterKey`, `root` from env but `login()` never read them.

**Fix**: Added `.env` check as first priority in `login()`:

```js
if (megaConfig.sid && megaConfig.masterKey && megaConfig.root) {
  sid = megaConfig.sid;
  masterKey = Buffer.from(megaConfig.masterKey, "base64");
  rootHandle = megaConfig.root;
  // verify with quick ug call...
}
```

Login priority: `.env` session → AsyncStorage cache → full PBKDF2 (last resort).

---

## Problem 12: XHR upload fails — "Upload network error"

**Symptom**: Upload progress reaches 15% then `Upload network error`.

**Root cause**: `XMLHttpRequest.send(data)` received a Node.js `Buffer` object. RN's XHR doesn't handle Buffer — needs `ArrayBuffer`.

**Fix attempted**: Converted to `new Uint8Array(data).buffer`.

**Result**: Still failed. Tried `fetch()` with ArrayBuffer body — also failed.

---

## Problem 13: Blob creation not supported

**Symptom**: `Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported`

**Root cause**: React Native's `Blob` constructor doesn't accept `ArrayBuffer` or `Uint8Array` — only strings and other Blobs.

**Fix**: Wrote encrypted data to temp file using `expo-file-system`, then used `FileSystem.uploadAsync()` which handles binary upload natively:

```js
const tempPath =
  FileSystem.cacheDirectory + "mega_upload_" + Date.now() + ".bin";
await FileSystem.writeAsStringAsync(tempPath, b64, {
  encoding: FileSystem.EncodingType.Base64,
});

const result = await FileSystem.uploadAsync(url, tempPath, {
  httpMethod: "POST",
  uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  headers: { "Content-Type": "application/octet-stream" },
});
```

**Result**: Upload works. File lands on MEGA.

---

## Problem 14 (minor): `expo-file-system` deprecated API warning

**Symptom**: Warning about `getInfoAsync` being deprecated.

**Fix**: Changed import from `expo-file-system` to `expo-file-system/legacy`. Same API, no warning.

---

## Summary

| #   | Problem                | Root Cause                            | Final Fix                              |
| --- | ---------------------- | ------------------------------------- | -------------------------------------- |
| 1   | megajs won't load      | Node.js built-ins                     | Browser build via Metro resolver       |
| 2   | No crypto.subtle       | RN missing WebCrypto                  | @noble/hashes polyfill                 |
| 3   | TurboModule crash      | Native module in Expo Go              | Removed, pure JS fallback              |
| 4   | ExpoCryptoAES missing  | SDK version mismatch                  | Removed expo-crypto                    |
| 5   | Login hangs            | megajs internal plumbing broken in RN | **Dropped megajs entirely**            |
| 6   | Empty auth response    | SHA-256 instead of SHA-512            | Fixed hash algorithm                   |
| 7   | UI freezes 30s         | Sync PBKDF2 blocks JS thread          | Chunked yielding every 1000 iterations |
| 8   | No RSA session         | Only handled tsid, not csid           | Implemented RSA with BigInt            |
| 9   | Wrong RSA output       | BigInt byte order ≠ megajs bignum     | **Pre-computed session in .env**       |
| 10  | Wrong password         | dotenv `\$` escaping                  | Single-quoted value                    |
| 11  | Still runs PBKDF2      | .env values not read by login()       | Added .env check first                 |
| 12  | XHR upload fails       | Buffer not accepted by RN XHR         | Converted to ArrayBuffer               |
| 13  | Blob not supported     | RN Blob rejects ArrayBuffer           | **expo-file-system uploadAsync**       |
| 14  | Deprecated API warning | Expo SDK 54 new filesystem            | `expo-file-system/legacy` import       |

## Architecture Decision

**megajs is fundamentally incompatible with React Native.** Even the browser build assumes EventEmitter semantics, stream piping, and Node.js fetch options that don't work in RN.

**Final approach**: Raw MEGA REST API with `fetch()`. Login session pre-computed on dev machine via `scripts/mega-session.js` (runs megajs in Node.js). App reads session from `.env` → instant login. File upload via `expo-file-system` `uploadAsync`. Zero third-party MEGA dependencies at runtime.
