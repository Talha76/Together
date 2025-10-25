# **Checkpoint: Together Chat App - One-Scan QR Implementation**

## **Project Status: Firebase Sync + One-Scan QR Code Exchange**

---

## **What We Built:**

A private, end-to-end encrypted couple chat app with:

- ✅ **Firebase real-time message sync** (messages appear on both devices instantly)
- ✅ **One-scan QR code setup** (only Person A generates, Person B scans, both go to chat)
- ✅ **Shared code method** (alternative to QR)
- ✅ **Clean refactored codebase** (components, hooks, separate concerns)

---

## **Tech Stack:**

- **Frontend:** React + Vite
- **Package Manager:** Bun
- **Database:** Firebase Firestore (real-time sync)
- **Encryption:** TweetNaCl (XSalsa20-Poly1305, X25519 key exchange)
- **QR Code:** html5-qrcode (camera scanning), qrcode (generation)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

---

## **Project Structure:**

```
together-chat/
├── src/
│   ├── App.jsx                    # Main app orchestrator
│   ├── components/
│   │   ├── ChatHeader.jsx         # Chat screen header
│   │   ├── ChatScreen.jsx         # Main chat interface
│   │   ├── ChooseMethodScreen.jsx # QR vs Code selection
│   │   ├── CodeSetupScreen.jsx    # Shared code setup
│   │   ├── MessageInput.jsx       # Message input component
│   │   ├── MessageList.jsx        # Message display
│   │   ├── QRCodeDisplay.jsx      # QR code generator
│   │   ├── QRScanner.jsx          # Camera QR scanner
│   │   ├── QRSetupScreen.jsx      # QR setup flow
│   │   └── WelcomeScreen.jsx      # Landing screen
│   ├── hooks/
│   │   ├── useEncryption.js       # Encryption state hook
│   │   └── useMessages.js         # Message management + Firebase sync
│   ├── encryption.js              # Core encryption functions
│   ├── firebase.js                # Firebase initialization
│   ├── firebaseSync.js            # Firestore message sync
│   ├── qrOneScan.js              # One-scan QR exchange logic
│   ├── config.js                  # Firebase config (env vars)
│   ├── main.jsx                   # App entry point
│   └── index.css                  # Tailwind imports
├── .env                           # Firebase credentials
├── .gitignore
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## **Installed Dependencies:**

```bash
bun add firebase tweetnacl tweetnacl-util qrcode html5-qrcode lucide-react
bun add -d tailwindcss postcss autoprefixer
```

---

## **Key Features Implemented:**

### **1. Firebase Real-Time Message Sync**

- Messages encrypted before sending to Firestore
- Real-time listeners sync messages across devices
- Unique chat room ID derived from shared encryption key
- Messages persist in cloud (not just localStorage)

### **2. One-Scan QR Code Setup (Secure)**

- **Person A:** Generates QR → Creates Firebase exchange document → Waits
- **Person B:** Scans QR → Fetches Person A's public key from Firebase → Sends own public key
- **Both:** Derive same shared secret → Go to chat automatically
- Firebase document auto-deletes after 10 seconds
- Only exchange ID is in QR (not keys) - secure!

### **3. Shared Code Method**

- Both enter same password
- Derives deterministic encryption keys
- Simpler alternative to QR

### **4. End-to-End Encryption**

- TweetNaCl encryption (military-grade)
- Messages encrypted client-side before Firebase
- Only you and partner can decrypt
- Uses native `TextEncoder/TextDecoder`

---

## **Critical Files:**

### **1. `src/qrOneScan.js`** (NEW - One-Scan Logic)

```javascript
import { db } from "./firebase";
import { doc, setDoc, onSnapshot, deleteDoc, getDoc } from "firebase/firestore";

// Person A: Save their public key to Firebase, return exchangeId
export async function createQRExchange(publicKey) {
  const exchangeId =
    "qr_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  try {
    await setDoc(doc(db, "qr_exchange", exchangeId), {
      personA_publicKey: publicKey,
      personB_publicKey: null,
      personB_scanned: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    console.log("✓ QR Exchange created:", exchangeId);
    return { success: true, exchangeId };
  } catch (error) {
    console.error("Error creating QR exchange:", error);
    return { success: false, error };
  }
}

// Person B: Save their public key after scanning
export async function completeQRExchange(exchangeId, myPublicKey) {
  try {
    const docRef = doc(db, "qr_exchange", exchangeId);

    await setDoc(
      docRef,
      {
        personB_publicKey: myPublicKey,
        personB_scanned: true,
        completedAt: Date.now(),
      },
      { merge: true }
    );

    console.log("✓ QR Exchange completed");
    return { success: true };
  } catch (error) {
    console.error("Error completing exchange:", error);
    return { success: false, error };
  }
}

// Person A: Listen for Person B to scan
export function listenForScanComplete(exchangeId, onComplete) {
  const docRef = doc(db, "qr_exchange", exchangeId);

  console.log("👂 Listening for partner to scan:", exchangeId);

  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();

    console.log("Firebase update:", data);

    if (data?.personB_scanned && data?.personB_publicKey) {
      console.log(
        "✓ Partner scanned! Their public key:",
        data.personB_publicKey
      );
      onComplete(data.personB_publicKey);

      // Clean up after 10 seconds
      setTimeout(() => {
        deleteDoc(docRef).catch(console.error);
      }, 10000);
    }
  });

  return unsubscribe;
}

// Get Person A's public key from exchangeId
export async function getPersonAPublicKey(exchangeId) {
  try {
    console.log("📡 Fetching Person A public key for:", exchangeId);

    const docRef = doc(db, "qr_exchange", exchangeId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log("✓ Got Person A public key:", data.personA_publicKey);

      return {
        success: true,
        publicKey: data.personA_publicKey,
      };
    }

    console.error("✗ Exchange not found");
    return { success: false, error: "Exchange not found" };
  } catch (error) {
    console.error("✗ Error fetching public key:", error);
    return { success: false, error: error.message };
  }
}
```

---

### **2. `src/firebaseSync.js`** (Message Sync)

```javascript
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

// Generate unique chat room ID from encryption key
export function getChatRoomId(encryptionKey) {
  // Handle different input types
  let keyBytes;

  if (typeof encryptionKey === "string") {
    keyBytes = Uint8Array.from(atob(encryptionKey), (c) => c.charCodeAt(0));
  } else if (encryptionKey instanceof Uint8Array) {
    keyBytes = encryptionKey;
  } else if (typeof encryptionKey === "object") {
    keyBytes = new Uint8Array(Object.values(encryptionKey));
  } else {
    throw new Error("Invalid encryption key format");
  }

  const keyB64 = btoa(String.fromCharCode(...keyBytes));
  return keyB64.substring(0, 32).replace(/[^a-zA-Z0-9]/g, "");
}

// Send encrypted message to Firestore
export async function sendMessage(
  chatRoomId,
  encryptedMessage,
  encryptedFile = null
) {
  try {
    const messageData = {
      content: {
        ciphertext: encryptedMessage.ciphertext,
        nonce: encryptedMessage.nonce,
      },
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
    };

    if (encryptedFile) {
      messageData.file = {
        data: encryptedFile.data,
        nonce: encryptedFile.nonce,
        name: encryptedFile.name,
        type: encryptedFile.type,
        size: encryptedFile.size,
      };
    }

    await addDoc(collection(db, "chats", chatRoomId, "messages"), messageData);
    return { success: true };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error };
  }
}

// Listen to real-time messages
export function subscribeToMessages(chatRoomId, onMessagesUpdate) {
  const messagesRef = collection(db, "chats", chatRoomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "desc"), limit(100));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      onMessagesUpdate(messages.reverse());
    },
    (error) => {
      console.error("Error listening to messages:", error);
    }
  );

  return unsubscribe;
}
```

---

### **3. `src/hooks/useMessages.js`** (Updated with Firebase)

```javascript
import { useState, useEffect } from "react";
import {
  subscribeToMessages,
  sendMessage,
  getChatRoomId,
} from "../firebaseSync";

export function useMessages(
  sharedSecret,
  encryptMessage,
  decryptMessage,
  encryptFile
) {
  const [messages, setMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState(null);

  // Generate chat room ID from shared secret
  useEffect(() => {
    if (sharedSecret) {
      try {
        const secretBytes =
          typeof sharedSecret === "string"
            ? Uint8Array.from(atob(sharedSecret), (c) => c.charCodeAt(0))
            : new Uint8Array(Object.values(sharedSecret));

        const roomId = getChatRoomId(secretBytes);
        setChatRoomId(roomId);
        console.log("Chat Room ID:", roomId);
      } catch (error) {
        console.error("Error generating chat room ID:", error);
      }
    }
  }, [sharedSecret]);

  // Subscribe to Firebase messages
  useEffect(() => {
    if (!chatRoomId || !sharedSecret) return;

    console.log("Subscribing to messages for room:", chatRoomId);

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      console.log("Received messages:", firebaseMessages.length);

      const decrypted = firebaseMessages.map((msg) => {
        try {
          const decryptedText = decryptMessage({
            ciphertext: msg.content.ciphertext,
            nonce: msg.content.nonce,
          });

          let decryptedFile = null;
          if (msg.file) {
            decryptedFile = {
              ...msg.file,
              decrypted: true,
            };
          }

          return {
            id: msg.id,
            sender: "Partner",
            text: decryptedText,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            file: decryptedFile,
            decrypted: true,
            synced: true,
          };
        } catch (error) {
          console.error("Failed to decrypt message:", error);
          return {
            id: msg.id,
            text: "[Decryption failed]",
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            decrypted: false,
            synced: true,
          };
        }
      });

      setMessages(decrypted);
    });

    return () => unsubscribe();
  }, [chatRoomId, sharedSecret, decryptMessage]);

  const addMessage = async (userName, inputText, selectedFile) => {
    if (!sharedSecret || !chatRoomId) {
      return { success: false, error: "Encryption not set up!" };
    }

    if (!inputText.trim() && !selectedFile) {
      return { success: false, error: "No message or file to send" };
    }

    try {
      let encryptedFileData = null;

      if (selectedFile) {
        const fileBuffer = await selectedFile.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        const base64Data = btoa(String.fromCharCode(...fileBytes));
        const encryptedFile = encryptFile(base64Data);

        encryptedFileData = {
          data: encryptedFile.ciphertext,
          nonce: encryptedFile.nonce,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        };
      }

      const encryptedText = encryptMessage(inputText || "📎 File");

      console.log("Sending message to room:", chatRoomId);

      const result = await sendMessage(
        chatRoomId,
        encryptedText,
        encryptedFileData
      );

      if (!result.success) {
        return { success: false, error: "Failed to send to Firebase" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error sending message:", error);
      return {
        success: false,
        error: "Failed to send message: " + error.message,
      };
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    addMessage,
    clearMessages,
    chatRoomId,
  };
}
```

---

### **4. `src/encryption.js`** (Add these new functions)

```javascript
// Generate QR with just exchangeId (secure!)
export function generateQRDataV2(exchangeId) {
  return JSON.stringify({
    v: 2,
    eid: exchangeId,
    ts: Date.now(),
  });
}

// Parse QR v2
export function parseQRDataV2(qrString) {
  try {
    const data = JSON.parse(qrString);
    if (data.v === 2 && data.eid) {
      return { success: true, exchangeId: data.eid };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}
```

---

### **5. `src/config.js`** (IMPORTANT: Use VITE\_ prefix)

```javascript
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
```

---

### **6. `.env`** (MUST have VITE\_ prefix)

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

### **7. Key parts of `src/App.jsx`**

```javascript
import {
  createQRExchange,
  completeQRExchange,
  listenForScanComplete,
  getPersonAPublicKey,
} from "./qrOneScan";

// Add state
const [qrExchangeId, setQrExchangeId] = useState(null);

// Person A: Generate QR
const handleSetupWithQRGenerate = async () => {
  if (!userName.trim()) {
    alert("Please enter your name first");
    return;
  }

  const keys = encryption.generateQRKeys();
  const result = await createQRExchange(keys.publicKey);

  if (!result.success) {
    alert("Failed to create QR exchange");
    return;
  }

  const exchangeId = result.exchangeId;
  setQrExchangeId(exchangeId);

  const qrData = encryptionUtils.generateQRDataV2(exchangeId);
  encryption.setQrCodeData(qrData);

  localStorage.setItem("togetherUserName", userName);
  localStorage.setItem("togetherMyKeys", JSON.stringify(keys));
  localStorage.setItem("togetherQrExchangeId", exchangeId);
  localStorage.setItem("togetherKeyMethod", "qr");

  setStep("qr-waiting");

  const unsubscribe = listenForScanComplete(exchangeId, (personB_publicKey) => {
    console.log("✓ Partner scanned! Generating shared secret...");

    const secret = encryptionUtils.generateSharedSecret(
      keys.secretKey,
      personB_publicKey
    );
    encryption.setSharedSecret(secret);
    encryption.setTheirPublicKey(personB_publicKey);

    localStorage.setItem("togetherTheirPublicKey", personB_publicKey);
    localStorage.setItem("togetherSharedSecret", secret);

    setStep("chat");
    setEncryptionStatus("🔒 E2E Encrypted");
  });

  window.qrExchangeUnsubscribe = unsubscribe;
};

// Person B: Scan QR
const handleQRScanSuccess = async (scannedText) => {
  console.log("🔍 QR Scanned:", scannedText);

  const parsed = encryptionUtils.parseQRDataV2(scannedText);

  if (!parsed.success) {
    alert("Invalid QR code format");
    setShowQRScanner(false);
    return;
  }

  const exchangeId = parsed.exchangeId;
  setShowQRScanner(false);

  try {
    const result = await getPersonAPublicKey(exchangeId);

    if (!result.success) {
      alert("Failed to get partner info: " + result.error);
      return;
    }

    const personA_publicKey = result.publicKey;

    const myKeys = encryptionUtils.generateKeyPair();
    encryption.setMyKeys(myKeys);

    await completeQRExchange(exchangeId, myKeys.publicKey);

    const secret = encryptionUtils.generateSharedSecret(
      myKeys.secretKey,
      personA_publicKey
    );
    encryption.setSharedSecret(secret);
    encryption.setTheirPublicKey(personA_publicKey);

    localStorage.setItem("togetherUserName", userName);
    localStorage.setItem("togetherMyKeys", JSON.stringify(myKeys));
    localStorage.setItem("togetherTheirPublicKey", personA_publicKey);
    localStorage.setItem("togetherSharedSecret", secret);
    localStorage.setItem("togetherKeyMethod", "qr");

    setStep("chat");
    setEncryptionStatus("🔒 E2E Encrypted");
  } catch (error) {
    console.error("❌ Error during setup:", error);
    alert("Setup failed: " + error.message);
  }
};
```

---

## **Current Issues to Fix:**

1. ❌ **Person B gets stuck after scanning** - Need to verify all imports are correct
2. ⚠️ **Check Firebase console logs** - Look for errors in browser console (F12)
3. ⚠️ **Firestore security rules** - Currently in test mode (expires in 30 days)

---

## **Testing Commands:**

### **Development:**

```bash
bun run dev --host
lt --port 5173 --subdomain together-test
```

### **Production Build:**

```bash
bun run build
bunx serve -s dist -p 5173
```

---

## **Firebase Firestore Structure:**

```txt
firestore/
├── qr_exchange/              # Temporary QR handshake docs
│   └── {exchangeId}/
│       ├── personA_publicKey
│       ├── personB_publicKey
│       ├── personB_scanned
│       ├── createdAt
│       └── expiresAt
│
└── chats/                    # Encrypted messages
    └── {chatRoomId}/
        └── messages/
            └── {messageId}/
                ├── content: { ciphertext, nonce }
                ├── timestamp
                ├── createdAt
                └── file?: { data, nonce, name, type, size }
```

---

## **What's Working:**

✅ Firebase config and initialization  
✅ Encryption/decryption functions  
✅ QR code generation  
✅ Camera QR scanning (html5-qrcode)  
✅ Shared code setup  
✅ Component structure (clean and organized)  
✅ Firebase message sync (real-time)

## **What Needs Debugging:**

❌ Person B stuck after scanning (likely missing import or Firebase read error)  
⚠️ Need to verify `getPersonAPublicKey` is working  
⚠️ Need console logs to see where it's failing

---

## **Next Steps:**

1. Debug the QR scan stuck issue (check console logs)
2. Add Firestore security rules (currently test mode)
3. Add IndexedDB for large files
4. Deploy to Vercel/production
5. Add message read receipts
6. Add typing indicators

---

## **Important Reminders:**

- Always use `VITE_` prefix for env variables
- Restart dev server after changing `.env`
- Never commit `.env` to git
- Use `TextEncoder` not `encodeUTF8` from tweetnacl-util
- Import from `./components/QRScanner` not `.bak`
- Import `getDoc` from `firebase/firestore` in `qrOneScan.js`

---

## **Repository:**

<https://github.com/Talha76/Together>

---

**Copy this entire checkpoint to start your next conversation!** 🚀

All the context, code, and current state is preserved here. Just paste this at the start of your new chat and we can continue debugging the stuck-after-scan issue!
