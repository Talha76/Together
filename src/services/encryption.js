// src/services/encryption.js
// E2E encryption using TweetNaCl. Pure JS — works in React Native.
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { Buffer } from 'buffer';

const encodeBase64 = naclUtil.encodeBase64;
const decodeBase64 = naclUtil.decodeBase64;

function uint8ArrayToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function base64ToUint8Array(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

export const generateSharedSecret = (mySecretKey, theirPublicKey) => {
  const sharedKey = nacl.box.before(
    decodeBase64(theirPublicKey),
    decodeBase64(mySecretKey)
  );
  return encodeBase64(sharedKey);
};

export const deriveKeyPairFromCode = async (sharedCode) => {
  const encoded = naclUtil.decodeUTF8(sharedCode);
  const seed = nacl.hash(encoded).slice(0, 32);
  const keyPair = nacl.box.keyPair.fromSecretKey(seed);

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
};

export const encryptMessage = (message, sharedSecret) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(message);
  const encrypted = nacl.box.after(messageUint8, nonce, decodeBase64(sharedSecret));

  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encrypted),
  };
};

export const decryptMessage = (encryptedData, sharedSecret) => {
  try {
    const decrypted = nacl.box.open.after(
      decodeBase64(encryptedData.ciphertext),
      decodeBase64(encryptedData.nonce),
      decodeBase64(sharedSecret)
    );

    if (!decrypted) throw new Error('Decryption failed');
    return naclUtil.encodeUTF8(decrypted);
  } catch {
    return null;
  }
};

// Async wrappers — no Web Worker in RN, but keep async API for UI yielding
export async function encryptFileAsync(fileData, sharedSecret, onProgress) {
  return encryptFile(fileData, sharedSecret, onProgress);
}

export async function decryptFileAsync(encryptedChunks, sharedSecret, onProgress) {
  return decryptFile(encryptedChunks, sharedSecret, onProgress);
}

export function encryptFile(fileData, sharedSecret, onProgress) {
  if (!sharedSecret) throw new Error('No encryption key');

  const fileBytes = base64ToUint8Array(fileData);
  const CHUNK_SIZE = 1024 * 1024; // 1MB
  const totalChunks = Math.ceil(fileBytes.length / CHUNK_SIZE);
  const encryptedChunks = [];

  const secretKey = typeof sharedSecret === 'string'
    ? base64ToUint8Array(sharedSecret)
    : new Uint8Array(Object.values(sharedSecret));

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileBytes.length);
    const chunk = fileBytes.slice(start, end);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encrypted = nacl.secretbox(chunk, nonce, secretKey);

    encryptedChunks.push({
      nonce: uint8ArrayToBase64(nonce),
      data: uint8ArrayToBase64(encrypted),
    });

    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
  }

  return { chunks: encryptedChunks, totalSize: fileBytes.length };
}

export function decryptFile(encryptedChunks, sharedSecret, onProgress) {
  if (!sharedSecret) throw new Error('No decryption key');

  const secretKey = typeof sharedSecret === 'string'
    ? base64ToUint8Array(sharedSecret)
    : new Uint8Array(Object.values(sharedSecret));

  const decryptedChunks = [];
  const totalChunks = encryptedChunks.length;

  for (let i = 0; i < totalChunks; i++) {
    const { nonce, data } = encryptedChunks[i];
    const nonceBytes = base64ToUint8Array(nonce);
    const cipherBytes = base64ToUint8Array(data);
    const decrypted = nacl.secretbox.open(cipherBytes, nonceBytes, secretKey);

    if (!decrypted) throw new Error('Decryption failed - invalid key or corrupted data');
    decryptedChunks.push(decrypted);

    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
  }

  const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of decryptedChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return uint8ArrayToBase64(combined);
}
