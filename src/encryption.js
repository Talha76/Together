// src/encryption.js
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { uint8ArrayToBase64 } from './utils/encoding';

const encodeBase64 = naclUtil.encodeBase64;
const decodeBase64 = naclUtil.decodeBase64;

// Generate a new key pair for asymmetric encryption
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

// Generate shared secret from your secret key and their public key
export const generateSharedSecret = (mySecretKey, theirPublicKey) => {
  const sharedKey = nacl.box.before(
    decodeBase64(theirPublicKey),
    decodeBase64(mySecretKey)
  );
  return encodeBase64(sharedKey);
};

// Derive key pair from shared code
// Primary: crypto.subtle SHA-512 (secure contexts). Fallback: nacl.hash SHA-512.
// Both produce identical output — nacl.hash IS SHA-512.
export const deriveKeyPairFromCode = async (sharedCode) => {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(sharedCode);

  let seed;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-512', encoded);
    seed = new Uint8Array(hashBuffer).slice(0, 32);
  } else {
    seed = nacl.hash(encoded).slice(0, 32);
  }

  const keyPair = nacl.box.keyPair.fromSecretKey(seed);

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

// Encrypt message using shared secret
export const encryptMessage = (message, sharedSecret) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // Use TextEncoder directly for reliability
  const encoder = new TextEncoder();
  const messageUint8 = encoder.encode(message);

  const encrypted = nacl.box.after(
    messageUint8,
    nonce,
    decodeBase64(sharedSecret)
  );

  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encrypted),
  };
};

// Decrypt message using shared secret
export const decryptMessage = (encryptedData, sharedSecret) => {
  try {
    const decrypted = nacl.box.open.after(
      decodeBase64(encryptedData.ciphertext),
      decodeBase64(encryptedData.nonce),
      decodeBase64(sharedSecret)
    );

    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    // Use TextDecoder directly for reliability
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    return null;
  }
};

// Create Web Worker instance (singleton)
let cryptoWorker = null;
let workerCallbacks = new Map();
let messageId = 0;

function getCryptoWorker() {
  if (!cryptoWorker) {
    // Create worker from the cryptoWorker.js file
    cryptoWorker = new Worker(new URL('./workers/cryptoWorker.js', import.meta.url), {
      type: 'module'
    });

    // Handle messages from worker
    cryptoWorker.onmessage = (e) => {
      const { type, id, result, progress, error } = e.data;
      const callbacks = workerCallbacks.get(id);

      if (!callbacks) return;

      switch (type) {
        case 'progress':
          if (callbacks.onProgress) {
            callbacks.onProgress(progress);
          }
          break;

        case 'complete':
          workerCallbacks.delete(id);
          if (callbacks.onComplete) {
            callbacks.onComplete(result);
          }
          break;

        case 'error':
          workerCallbacks.delete(id);
          if (callbacks.onError) {
            callbacks.onError(error);
          }
          break;
      }
    };

    cryptoWorker.onerror = (error) => {
      // Notify all pending callbacks
      workerCallbacks.forEach((callbacks) => {
        if (callbacks.onError) {
          callbacks.onError('Worker error: ' + error.message);
        }
      });
      workerCallbacks.clear();
    };
  }

  return cryptoWorker;
}

// Encrypt file using Web Worker (non-blocking)
export function encryptFileAsync(fileData, sharedSecret, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = getCryptoWorker();
    const id = messageId++;

    workerCallbacks.set(id, {
      onProgress,
      onComplete: (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      },
      onError: (error) => {
        reject(new Error(error));
      }
    });

    worker.postMessage({
      type: 'encrypt',
      id,
      payload: {
        fileData,
        sharedSecret
      }
    });
  });
}

// Decrypt file using Web Worker (non-blocking)
export function decryptFileAsync(encryptedChunks, sharedSecret, onProgress) {
  return new Promise((resolve, reject) => {
    const worker = getCryptoWorker();
    const id = messageId++;

    workerCallbacks.set(id, {
      onProgress,
      onComplete: (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      },
      onError: (error) => {
        reject(new Error(error));
      }
    });

    worker.postMessage({
      type: 'decrypt',
      id,
      payload: {
        encryptedChunks,
        sharedSecret
      }
    });
  });
}

// Synchronous versions for backward compatibility (use with caution for large files)
export function encryptFile(fileData, sharedSecret, onProgress) {
  try {
    if (!sharedSecret) throw new Error('No encryption key');

    // Convert base64 file data to bytes
    const fileBytes = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // For large files, encrypt in chunks
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(fileBytes.length / CHUNK_SIZE);
    const encryptedChunks = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBytes.length);
      const chunk = fileBytes.slice(start, end);

      // Generate unique nonce per chunk
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

      // Encrypt chunk
      const secretKey = typeof sharedSecret === 'string'
        ? Uint8Array.from(atob(sharedSecret), c => c.charCodeAt(0))
        : new Uint8Array(Object.values(sharedSecret));

      const encrypted = nacl.secretbox(chunk, nonce, secretKey);

      encryptedChunks.push({
        nonce: uint8ArrayToBase64(nonce),
        data: uint8ArrayToBase64(encrypted),
      });

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
    }

    return {
      chunks: encryptedChunks,
      totalSize: fileBytes.length,
    };
  } catch (error) {
    throw error;
  }
}

// Decrypt file (synchronous - use with caution for large files)
export function decryptFile(encryptedChunks, sharedSecret, onProgress) {
  try {
    if (!sharedSecret) throw new Error('No decryption key');

    const decryptedChunks = [];
    const totalChunks = encryptedChunks.length;

    for (let i = 0; i < totalChunks; i++) {
      const { nonce, data } = encryptedChunks[i];

      const nonceBytes = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
      const cipherBytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));

      const secretKey = typeof sharedSecret === 'string'
        ? Uint8Array.from(atob(sharedSecret), c => c.charCodeAt(0))
        : new Uint8Array(Object.values(sharedSecret));

      const decrypted = nacl.secretbox.open(cipherBytes, nonceBytes, secretKey);

      if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      decryptedChunks.push(decrypted);

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
    }

    // Combine all chunks
    const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of decryptedChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64
    return uint8ArrayToBase64(combined);
  } catch (error) {
    throw error;
  }
}
