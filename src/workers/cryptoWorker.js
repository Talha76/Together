// src/workers/cryptoWorker.js
// Web Worker for non-blocking encryption/decryption

import nacl from 'tweetnacl';

// Utility: Convert Uint8Array to base64 (avoiding stack overflow)
function uint8ArrayToBase64(uint8Array) {
  const chunkSize = 8192;
  const chunks = [];
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk));
  }
  
  return btoa(chunks.join(''));
}

// Utility: Convert base64 to Uint8Array
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}

// Encrypt file in chunks with progress reporting
function encryptFile(fileData, sharedSecret, onProgress) {
  try {
    if (!sharedSecret) throw new Error('No encryption key');

    // Convert base64 file data to bytes
    const fileBytes = base64ToUint8Array(fileData);
    
    // For large files, encrypt in chunks
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(fileBytes.length / CHUNK_SIZE);
    const encryptedChunks = [];

    // Convert sharedSecret to Uint8Array
    const secretKey = typeof sharedSecret === 'string'
      ? base64ToUint8Array(sharedSecret)
      : new Uint8Array(Object.values(sharedSecret));

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBytes.length);
      const chunk = fileBytes.slice(start, end);

      // Generate unique nonce per chunk
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
      
      // Encrypt chunk
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
      success: true,
      data: {
        chunks: encryptedChunks,
        totalSize: fileBytes.length,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Decrypt file in chunks with progress reporting
function decryptFile(encryptedChunks, sharedSecret, onProgress) {
  try {
    if (!sharedSecret) throw new Error('No decryption key');

    const decryptedChunks = [];
    const totalChunks = encryptedChunks.length;

    // Convert sharedSecret to Uint8Array
    const secretKey = typeof sharedSecret === 'string'
      ? base64ToUint8Array(sharedSecret)
      : new Uint8Array(Object.values(sharedSecret));

    for (let i = 0; i < totalChunks; i++) {
      const { nonce, data } = encryptedChunks[i];

      const nonceBytes = base64ToUint8Array(nonce);
      const cipherBytes = base64ToUint8Array(data);

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
    const result = uint8ArrayToBase64(combined);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Message handler
self.onmessage = function(e) {
  const { type, id, payload } = e.data;

  try {
    switch (type) {
      case 'encrypt': {
        const { fileData, sharedSecret } = payload;
        
        const result = encryptFile(fileData, sharedSecret, (progress) => {
          // Send progress updates
          self.postMessage({
            type: 'progress',
            id,
            progress
          });
        });

        // Send final result
        self.postMessage({
          type: 'complete',
          id,
          result
        });
        break;
      }

      case 'decrypt': {
        const { encryptedChunks, sharedSecret } = payload;
        
        const result = decryptFile(encryptedChunks, sharedSecret, (progress) => {
          // Send progress updates
          self.postMessage({
            type: 'progress',
            id,
            progress
          });
        });

        // Send final result
        self.postMessage({
          type: 'complete',
          id,
          result
        });
        break;
      }

      default:
        throw new Error('Unknown message type: ' + type);
    }
  } catch (error) {
    // Send error
    self.postMessage({
      type: 'error',
      id,
      error: error.message
    });
  }
};
