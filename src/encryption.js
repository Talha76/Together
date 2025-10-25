// src/encryption.js
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

// Import utilities with fallback
const encodeBase64 = naclUtil.encodeBase64;
const decodeBase64 = naclUtil.decodeBase64;
const encodeUTF8 = naclUtil.encodeUTF8;
const decodeUTF8 = naclUtil.decodeUTF8;

// Manual UTF8 encoding fallback (in case util doesn't work)
const stringToUint8Array = (str) => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

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

// Derive key pair from shared code (compatible with all browsers)
export const deriveKeyPairFromCode = async (sharedCode) => {
  console.log('Starting key derivation...');
  console.log('Shared code length:', sharedCode.length);
  
  try {
    // First try Web Crypto API (preferred for better security)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      console.log('Trying Web Crypto API...');
      const encoder = new TextEncoder();
      const data = encoder.encode(sharedCode);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const seed = new Uint8Array(hashBuffer);
      
      console.log('Web Crypto seed type:', seed.constructor.name);
      console.log('Web Crypto seed length:', seed.length);
      
      if (seed.length !== 32) {
        throw new Error('Invalid seed length: ' + seed.length);
      }
      
      const keyPair = nacl.box.keyPair.fromSecretKey(seed);
      
      console.log('✓ Web Crypto API successful!');
      
      return {
        publicKey: encodeBase64(keyPair.publicKey),
        secretKey: encodeBase64(keyPair.secretKey),
      };
    }
  } catch (e) {
    console.log('Web Crypto API failed:', e.message);
  }
  
  // Fallback: Use NaCl's built-in hash
  console.log('Using NaCl fallback...');
  
  try {
    // Use TextEncoder directly instead of encodeUTF8
    const encoder = new TextEncoder();
    const encoded = encoder.encode(sharedCode);
    
    console.log('Encoded type:', encoded.constructor.name);
    console.log('Encoded length:', encoded.length);
    console.log('Is Uint8Array?', encoded instanceof Uint8Array);
    
    if (!(encoded instanceof Uint8Array)) {
      throw new Error('Encoded is not Uint8Array');
    }
    
    const hashed = nacl.hash(encoded);
    console.log('Hashed type:', hashed.constructor.name);
    console.log('Hashed length:', hashed.length);
    
    const seed = hashed.slice(0, 32);
    console.log('Seed type:', seed.constructor.name);
    console.log('Seed length:', seed.length);
    console.log('Is Uint8Array?', seed instanceof Uint8Array);
    
    if (!(seed instanceof Uint8Array)) {
      throw new Error('Seed is not Uint8Array');
    }
    
    if (seed.length !== 32) {
      throw new Error('Seed length is not 32, it is: ' + seed.length);
    }
    
    console.log('About to call nacl.box.keyPair.fromSecretKey...');
    const keyPair = nacl.box.keyPair.fromSecretKey(seed);
    console.log('✓ NaCl fallback successful!');
    
    return {
      publicKey: encodeBase64(keyPair.publicKey),
      secretKey: encodeBase64(keyPair.secretKey),
    };
  } catch (e) {
    console.error('NaCl fallback failed:', e);
    throw e;
  }
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
    console.error('Decryption error:', error);
    return null;
  }
};

// Encrypt file data
export const encryptFile = (fileDataBase64, sharedSecret) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  
  // Decode base64 to Uint8Array
  const fileData = decodeBase64(fileDataBase64);
  
  const encrypted = nacl.box.after(
    fileData,
    nonce,
    decodeBase64(sharedSecret)
  );
  
  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encrypted),
  };
};

// Decrypt file data
export const decryptFile = (encryptedData, sharedSecret) => {
  try {
    const decrypted = nacl.box.open.after(
      decodeBase64(encryptedData.ciphertext),
      decodeBase64(encryptedData.nonce),
      decodeBase64(sharedSecret)
    );
    
    if (!decrypted) {
      throw new Error('File decryption failed');
    }
    
    return encodeBase64(decrypted);
  } catch (error) {
    console.error('File decryption error:', error);
    return null;
  }
};

// Generate QR code data with key exchange info
export const generateQRData = (publicKey) => {
  const qrData = {
    v: 1, // version
    pk: publicKey, // public key
    t: Date.now(), // timestamp
  };
  return JSON.stringify(qrData);
};

// Parse QR code data
export const parseQRData = (qrString) => {
  try {
    const data = JSON.parse(qrString);
    if (!data.pk) {
      throw new Error('Invalid QR code: missing public key');
    }
    return data;
  } catch (error) {
    console.error('QR parse error:', error);
    return null;
  }
};
