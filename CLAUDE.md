# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

## Commands

Always use `bun` instead of `npm`/`npx`.

```bash
bun start           # Expo dev server (tunnel)
bun run android     # Android emulator
bun run ios         # iOS simulator
bun run web         # Browser

node scripts/mega-session.js   # Pre-compute MEGA session tokens (write to .env)
```

No test runner is configured. Check with Expo Go or emulator.

## Environment

Copy `.env` values before running. Required prefixes: `EXPO_PUBLIC_FIREBASE_*` and `EXPO_PUBLIC_MEGA_*`. All vars are read in `src/services/config.js` and passed to Firebase/MEGA at startup.

**MEGA session optimization**: PBKDF2 key derivation takes 10–30s on device. Set `EXPO_PUBLIC_MEGA_SID`, `EXPO_PUBLIC_MEGA_MASTER_KEY`, and `EXPO_PUBLIC_MEGA_ROOT` in `.env` (via `scripts/mega-session.js`) to skip it entirely. Without these, login falls back to full PBKDF2 on first run.

## Architecture

### Data Flow

```
SetupScreen → shared code → deriveKeyPairFromCode() → ECDH → sharedSecret
                                                              ↓
ChatScreen → useMessages(sharedSecret) → Firebase (text) + MEGA (files)
```

### Encryption (two layers)

- **Messages**: NaCl box (`nacl.box.after`) — Curve25519 ECDH + XSalsa20 + Poly1305. `encryptMessage`/`decryptMessage` in `src/services/encryption.js`.
- **Files**: NaCl secretbox chunked at 1MB. `encryptFileAsync`/`decryptFileAsync` yield to UI between chunks for progress. The sharedSecret doubles as the secretbox key.
- **Key exchange**: Both users enter the same "shared code" → SHA-512 hash → deterministic NaCl key pair → ECDH → identical sharedSecret on both devices. No key transmission needed.

### File Send Pipeline

`useMessages.addMessage` → compress (expo-image-manipulator/expo-av) → encrypt chunks → JSON-serialize → base64-encode → upload to MEGA → store link + metadata in Firebase message doc.

### MEGA Storage (`src/services/megaStorage.js`)

Raw MEGA REST API (no megajs — dropped due to RN incompatibility). Key implementation details:
- Binary upload uses `expo-file-system/legacy` `uploadAsync` — React Native cannot send `ArrayBuffer`/`Blob` via `fetch`.
- MEGA-specific AES-CTR encryption (not NaCl) wraps the already-NaCl-encrypted file payload before upload. Download reverses this.
- Login is singleton-guarded (`loginPromise`) to prevent parallel login races.
- Session cached in AsyncStorage after first successful login.

### Firebase Usage

Firestore only — no Firebase Auth, no Firebase Storage. Two collections:
- `chat_rooms/{id}` — participant presence + typing indicators
- `chat_rooms/{id}/messages` — encrypted message docs with optional `file` metadata (MEGA link)

`ChatRoomManager` enforces max 2 participants via heartbeat (30s interval, 60s timeout).

### Polyfills

`src/polyfills.js` **must be the first import** in `index.js`. It installs `globalThis.Buffer` and a fallback `crypto.getRandomValues` needed by TweetNaCl and the MEGA service throughout.

### Import path note

Use `expo-file-system/legacy` (not `expo-file-system`) everywhere — the legacy API exposes `uploadAsync` and `writeAsStringAsync` which the file pipeline depends on.
