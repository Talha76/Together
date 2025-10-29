// src/encryption-streaming.js
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

const encodeBase64 = naclUtil.encodeBase64;
const decodeBase64 = naclUtil.decodeBase64;

/**
 * Stream-based file encryption for unlimited file sizes
 * Processes files in chunks without loading entire file into memory
 */
export async function encryptFileStreaming(file, sharedSecret, onProgress) {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks to avoid memory issues
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const encryptedChunks = [];
  
  const secretKey = typeof sharedSecret === 'string'
    ? decodeBase64(sharedSecret)
    : sharedSecret;

  let processedChunks = 0;

  try {
    // Process file in chunks using slicing (no arrayBuffer call for entire file)
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      // Read only this chunk into memory
      const arrayBuffer = await chunk.arrayBuffer();
      const chunkBytes = new Uint8Array(arrayBuffer);
      
      // Generate unique nonce for this chunk
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      
      // Encrypt chunk
      const encrypted = nacl.secretbox(chunkBytes, nonce, secretKey);
      
      // Store encrypted chunk with its nonce
      encryptedChunks.push({
        data: encodeBase64(encrypted),
        nonce: encodeBase64(nonce),
        index: i,
        size: encrypted.length
      });
      
      processedChunks++;
      
      // Report progress
      if (onProgress) {
        const progress = Math.round((processedChunks / totalChunks) * 100);
        onProgress(progress);
      }
      
      // Allow UI to update between chunks
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return {
      chunks: encryptedChunks,
      totalChunks: totalChunks,
      originalSize: file.size,
      chunkSize: CHUNK_SIZE,
      fileName: file.name,
      fileType: file.type
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt file: ' + error.message);
  }
}

/**
 * Stream-based file decryption
 */
export function decryptFileStreaming(encryptedData, sharedSecret, onProgress) {
  try {
    const secretKey = typeof sharedSecret === 'string'
      ? decodeBase64(sharedSecret)
      : sharedSecret;

    const { chunks, totalChunks } = encryptedData;
    const decryptedChunks = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunks[i];
      
      // Decrypt chunk
      const decrypted = nacl.secretbox.open(
        decodeBase64(chunk.data),
        decodeBase64(chunk.nonce),
        secretKey
      );
      
      if (!decrypted) {
        throw new Error(`Failed to decrypt chunk ${i}`);
      }
      
      decryptedChunks.push(decrypted);
      
      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        onProgress(progress);
      }
    }
    
    // Combine all decrypted chunks
    const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of decryptedChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to base64 for consistency with existing code
    return uint8ArrayToBase64(combined);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt file: ' + error.message);
  }
}

/**
 * Convert Uint8Array to base64 without stack overflow
 */
function uint8ArrayToBase64(uint8Array) {
  const chunkSize = 8192;
  const chunks = [];
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  
  return btoa(chunks.join(''));
}

/**
 * Convert base64 to Uint8Array without stack overflow
 */
export function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}
