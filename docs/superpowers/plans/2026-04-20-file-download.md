# File Download Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make in-chat file download work reliably — fetch MEGA payload, decrypt two-layer NaCl envelope, save to device, offer Share sheet, support cancel.

**Architecture:** Download pipeline already exists in skeletal form (`useMessages.downloadFile` + `ChatScreen.handleDownload` + `megaStorage.downloadFile`). Broken edges: wrong `expo-file-system` import path (project rule: `/legacy`), cache-only save path, no abort wiring, fragile chunk-flattening heuristic, no guard for malformed metadata. Fix edges, keep pipeline. No megajs rewrite in this plan — confirm/deny via manual test first.

**Tech Stack:** React Native (Expo), `expo-file-system/legacy`, `expo-sharing`, TweetNaCl (`nacl.secretbox`), MEGA (via current `megajs` client), Firebase Firestore message docs, Buffer polyfill.

**Graphify rule:** After any code file change this session, run the graphify rebuild command from `CLAUDE.md` to keep the graph current.

---

## File Structure

Files touched:

- **Modify** `src/hooks/useMessages.js` — fix import, harden chunk flatten, persist to document dir, wire `AbortController` into `downloadFile`.
- **Modify** `src/screens/ChatScreen.js` — add `downloadController` ref, cancel button while downloading, differentiate cancel vs error in `handleDownload`.
- **Modify** `src/services/megaStorage.js` — already exposes `downloadFile(link, onProgress, abortSignal)`. No body change; verify signature stays stable.

No new files. Each task ends with a commit.

---

## Task 1: Fix `expo-file-system` import to legacy API

**Why:** CLAUDE.md rule — legacy exposes `writeAsStringAsync` / `uploadAsync` that the file pipeline depends on. Non-legacy breaks download save silently.

**Files:**

- Modify: `src/hooks/useMessages.js:3`

- [ ] **Step 1: Read current import**

Run: `grep -n "expo-file-system" src/hooks/useMessages.js`
Expected: one line importing from `'expo-file-system'` (no `/legacy`).

- [ ] **Step 2: Swap import to legacy**

Replace:

```js
import * as FileSystem from "expo-file-system";
```

with:

```js
import * as FileSystem from "expo-file-system/legacy";
```

- [ ] **Step 3: Confirm no other bare `expo-file-system` import remains in src**

Run: `grep -rn "from 'expo-file-system'" src/`
Expected: zero matches (only `/legacy` variants).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMessages.js
git commit -m "fix(download): use expo-file-system/legacy in useMessages"
```

---

## Task 2: Harden chunk-array flattening in `downloadFile`

**Why:** Current line `useMessages.js:265-267` has fragile nested fallback that can yield wrong shape for single-chunk files or double-wrapped payloads. `encryptFileAsync` always returns `{ chunks: [{nonce, data}, ...], totalSize }`. Upload serializes `{ chunks, isChunked }`. So after JSON parse we always have `encryptedFileData.chunks` as a flat array of `{nonce, data}`. Replace the heuristic with direct pass-through.

**Files:**

- Modify: `src/hooks/useMessages.js` — inside `downloadFile`

- [ ] **Step 1: Locate the current flatten block**

Run: `grep -n "allChunks" src/hooks/useMessages.js`
Expected: match around line 265-269.

- [ ] **Step 2: Replace heuristic with direct access**

Replace the block:

```js
let decryptedData;
const allChunks =
  encryptedFileData.isChunked && encryptedFileData.chunks.length > 1
    ? encryptedFileData.chunks.flatMap((c) => c.chunks || [c])
    : (encryptedFileData.chunks || [encryptedFileData])[0]?.chunks ||
      encryptedFileData.chunks || [encryptedFileData];

decryptedData = await decryptFileAsync(allChunks, sharedSecret, (p) => {
  if (onProgress) onProgress(50 + p * 0.5);
});
```

with:

```js
if (
  !Array.isArray(encryptedFileData.chunks) ||
  encryptedFileData.chunks.length === 0
) {
  throw new Error("Invalid file payload");
}

const decryptedData = await decryptFileAsync(
  encryptedFileData.chunks,
  sharedSecret,
  (p) => {
    if (onProgress) onProgress(50 + p * 0.5);
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMessages.js
git commit -m "fix(download): simplify chunk unwrap to trust upload schema"
```

---

## Task 3: Persist decrypted file to document dir (not cache)

**Why:** Cache dir can be evicted by OS. User expects downloaded file to survive. Write to `FileSystem.documentDirectory + 'downloads/' + name`, create dir if missing, handle filename collisions by suffixing timestamp.

**Files:**

- Modify: `src/hooks/useMessages.js` — inside `downloadFile`, replace the cache-dir write block.

- [ ] **Step 1: Locate current write block**

Run: `grep -n "cacheDirectory" src/hooks/useMessages.js`
Expected: match inside `downloadFile`.

- [ ] **Step 2: Replace write + share block**

Replace:

```js
// Write to temp file + share
const filePath = FileSystem.cacheDirectory + fileMetadata.name;
await FileSystem.writeAsStringAsync(filePath, decryptedData, {
  encoding: FileSystem.EncodingType.Base64,
});

if (await Sharing.isAvailableAsync()) {
  await Sharing.shareAsync(filePath);
}

if (onProgress) onProgress(100);
```

with:

```js
const downloadsDir = FileSystem.documentDirectory + "downloads/";
const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
if (!dirInfo.exists) {
  await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
}

const dot = fileMetadata.name.lastIndexOf(".");
const stem = dot > 0 ? fileMetadata.name.slice(0, dot) : fileMetadata.name;
const ext = dot > 0 ? fileMetadata.name.slice(dot) : "";
let filePath = downloadsDir + fileMetadata.name;
if ((await FileSystem.getInfoAsync(filePath)).exists) {
  filePath = `${downloadsDir}${stem}_${Date.now()}${ext}`;
}

await FileSystem.writeAsStringAsync(filePath, decryptedData, {
  encoding: FileSystem.EncodingType.Base64,
});

if (await Sharing.isAvailableAsync()) {
  await Sharing.shareAsync(filePath, {
    mimeType: fileMetadata.type,
    dialogTitle: fileMetadata.name,
  });
}

if (onProgress) onProgress(100);
return { path: filePath };
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMessages.js
git commit -m "feat(download): persist to documentDirectory/downloads with collision suffix"
```

---

## Task 4: Wire AbortController through `downloadFile`

**Why:** Large file downloads can take minutes. User needs cancel. `megaStorage.downloadFile` already accepts `abortSignal`. Thread it through.

**Files:**

- Modify: `src/hooks/useMessages.js` — `downloadFile` signature + pass-through.

- [ ] **Step 1: Update signature and internal checks**

Replace the `downloadFile` callback definition:

```js
  const downloadFile = useCallback(async (fileMetadata, onProgress) => {
    if (!canAccessRoom) throw new Error('No room access');

    const downloadResult = await megaStorage.downloadFile(fileMetadata.megaLink, (p) => {
      if (onProgress) onProgress(p * 0.5);
    });
```

with:

```js
  const downloadFile = useCallback(async (fileMetadata, onProgress, abortSignal) => {
    if (!canAccessRoom) throw new Error('No room access');
    if (!fileMetadata?.megaLink) throw new Error('No file link');
    if (abortSignal?.aborted) throw new Error('Download cancelled');

    const downloadResult = await megaStorage.downloadFile(fileMetadata.megaLink, (p) => {
      if (onProgress) onProgress(p * 0.5);
    }, abortSignal);

    if (downloadResult.cancelled) throw new Error('Download cancelled');
```

- [ ] **Step 2: Gate decrypt step on abort**

Right before the `decryptFileAsync` call, insert:

```js
if (abortSignal?.aborted) throw new Error("Download cancelled");
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMessages.js
git commit -m "feat(download): accept AbortSignal for cancel"
```

---

## Task 5: Add download cancel button to ChatScreen

**Why:** Match upload UX — user can bail out mid-download.

**Files:**

- Modify: `src/screens/ChatScreen.js`

- [ ] **Step 1: Add controller ref next to `uploadController`**

Find line (around `ChatScreen.js:24`):

```js
const uploadController = useRef(null);
```

Replace with:

```js
const uploadController = useRef(null);
const downloadController = useRef(null);
```

- [ ] **Step 2: Rewrite `handleDownload` to create + release controller**

Replace the whole `handleDownload` callback (around `ChatScreen.js:92-104`):

```js
const handleDownload = useCallback(
  async (message) => {
    if (downloadingId || !message.file?.megaLink) return;
    setDownloadingId(message.id);
    setDownloadProgress(0);
    try {
      await downloadFile(message.file, (p) =>
        setDownloadProgress(Math.round(p)),
      );
    } catch (e) {
      Alert.alert("Download failed", e.message);
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
    }
  },
  [downloadingId, downloadFile],
);
```

with:

```js
const handleDownload = useCallback(
  async (message) => {
    if (downloadingId || !message.file?.megaLink) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloadingId(message.id);
    setDownloadProgress(0);
    try {
      await downloadFile(
        message.file,
        (p) => setDownloadProgress(Math.round(p)),
        controller.signal,
      );
    } catch (e) {
      if (e.message !== "Download cancelled") {
        Alert.alert("Download failed", e.message);
      }
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
      downloadController.current = null;
    }
  },
  [downloadingId, downloadFile],
);
```

- [ ] **Step 3: Add a cancel affordance on the bubble while that message is downloading**

Find the `TouchableOpacity` block in `renderMessage` (around `ChatScreen.js:127-141`). Replace:

```jsx
{
  item.file && (
    <TouchableOpacity
      onPress={() => handleDownload(item)}
      disabled={!!downloadingId}
      style={styles.fileRow}
    >
      <Text style={[styles.fileInfo, isOwn && styles.fileInfoOwn]}>
        {downloadingId === item.id ? `⬇ ${downloadProgress}%` : "📎"}{" "}
        {item.file.name} ({formatFileSize(item.file.size)})
      </Text>
      {downloadingId !== item.id && (
        <Text style={[styles.downloadHint, isOwn && styles.downloadHintOwn]}>
          Tap to save
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

with:

```jsx
{
  item.file && (
    <View style={styles.fileRow}>
      <TouchableOpacity
        onPress={() => handleDownload(item)}
        disabled={!!downloadingId || !item.file.megaLink}
      >
        <Text style={[styles.fileInfo, isOwn && styles.fileInfoOwn]}>
          {downloadingId === item.id ? `⬇ ${downloadProgress}%` : "📎"}{" "}
          {item.file.name} ({formatFileSize(item.file.size)})
        </Text>
        {downloadingId !== item.id && (
          <Text style={[styles.downloadHint, isOwn && styles.downloadHintOwn]}>
            Tap to save
          </Text>
        )}
      </TouchableOpacity>
      {downloadingId === item.id && (
        <TouchableOpacity
          onPress={() => downloadController.current?.abort()}
          style={styles.dlCancelBtn}
        >
          <Text style={[styles.dlCancelText, isOwn && styles.dlCancelTextOwn]}>
            Cancel
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Add styles for the cancel affordance**

Inside `StyleSheet.create({ ... })` (end of file, before `sendIcon`), add:

```js
  dlCancelBtn: { marginTop: 4, alignSelf: 'flex-start' },
  dlCancelText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  dlCancelTextOwn: { color: '#fecaca' },
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/ChatScreen.js
git commit -m "feat(download): add cancel button and guard missing megaLink"
```

---

## Task 6: Manual verification in Expo Go

**Why:** No test runner configured (CLAUDE.md). Only confirmation path is exercising the feature on a device.

**Files:** none.

- [ ] **Step 1: Start dev server**

Run: `bun start`
Expected: Expo tunnel URL prints, QR code renders.

- [ ] **Step 2: Pair two devices (or one device + web) on same shared code**

- Setup same shared code on both clients.
- Wait for both to reach ChatScreen with green online dot.

- [ ] **Step 3: Send image from device A**

- Tap 📎, pick image, watch three-stage upload complete.
- Confirm the file bubble appears on both sides with `Tap to save` hint.

- [ ] **Step 4: Tap file bubble on device B → verify download**

- Progress counter should tick from ~0% through 100%.
- OS share sheet appears with downloaded file.
- Save / open from share sheet; verify content matches original image.

- [ ] **Step 5: Retry download — test cancel**

- Send a larger file (video ~20 MB) from A.
- On B, tap file → tap `Cancel` mid-way.
- Expected: progress disappears, no `Alert`, bubble returns to `Tap to save`.

- [ ] **Step 6: Verify persistence**

- After a successful download, close and re-open the Share sheet manually later from Files app (iOS) / Files app (Android) — file under `documentDirectory/downloads/`.

- [ ] **Step 7: Log findings**

If download fails with a network/crypto error that points at megajs in RN, stop and open a follow-up plan for the raw-REST rewrite (out of scope for this plan). Otherwise mark verification green.

- [ ] **Step 8: Commit test notes (only if fixes were made)**

If steps 1-6 surfaced bugs requiring code edits, commit each fix with its own commit. No commit if the pass is clean.

---

## Task 7: Rebuild graphify

**Why:** CLAUDE.md rule — after code changes in a session, refresh the knowledge graph.

**Files:** none.

- [ ] **Step 1: Run rebuild**

```bash
python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
```

Expected: `graphify-out/GRAPH_REPORT.md` updated timestamp.

- [ ] **Step 2: Commit regenerated graph if tracked**

Check: `git status graphify-out/`
If files changed and tracked:

```bash
git add graphify-out/
git commit -m "chore: refresh graphify after download feature"
```

If `graphify-out/` is gitignored, skip commit.

---

## Self-Review Notes

- Spec coverage: download = fetch + decrypt + save + share + cancel. Tasks 1-5 cover each; Task 6 verifies.
- No placeholders: every code step shows exact before/after.
- Type consistency: `downloadFile(fileMetadata, onProgress, abortSignal)` matches hook export → ChatScreen consumer → megaStorage passthrough.
- Naming: `downloadController` mirrors `uploadController`. `dlCancelBtn` style parallels `cancelBtn`.
