// /src/hooks/useEncryption.js
import { useState, useEffect } from 'react';
import * as encryption from '../encryption';

export function useEncryption() {
  const [myKeys, setMyKeys] = useState(null);
  const [theirPublicKey, setTheirPublicKey] = useState(null);
  const [sharedSecret, setSharedSecret] = useState(null);
  const [keyExchangeMethod, setKeyExchangeMethod] = useState(null);

  // Load encryption state from localStorage on mount
  useEffect(() => {
    const savedMyKeys = localStorage.getItem('togetherMyKeys');
    const savedTheirPublicKey = localStorage.getItem('togetherTheirPublicKey');
    const savedSharedSecret = localStorage.getItem('togetherSharedSecret');
    const savedMethod = localStorage.getItem('togetherKeyMethod');
    
    if (savedMyKeys && savedSharedSecret) {
      setMyKeys(JSON.parse(savedMyKeys));
      setTheirPublicKey(savedTheirPublicKey);
      setSharedSecret(savedSharedSecret);
      setKeyExchangeMethod(savedMethod);
    }
  }, []);

  // Setup with shared code
  const setupWithCode = async (sharedCode) => {
    if (sharedCode.length < 6) {
      return { success: false, error: 'Shared code must be at least 6 characters for security' };
    }
    
    try {
      // Derive deterministic keys from shared code
      const keys = await encryption.deriveKeyPairFromCode(sharedCode);
      setMyKeys(keys);
      
      // For shared code method, both users have same keys
      setTheirPublicKey(keys.publicKey);
      
      // Generate shared secret
      const secret = encryption.generateSharedSecret(keys.secretKey, keys.publicKey);
      setSharedSecret(secret);
      
      setKeyExchangeMethod('code');
      
      return { success: true, keys, secret };
    } catch (error) {
      return { success: false, error: 'Error setting up encryption: ' + error.message };
    }
  };

  // Save encryption keys to localStorage
  const saveEncryptionKeys = (userName) => {
    localStorage.setItem('togetherUserName', userName);
    localStorage.setItem('togetherMyKeys', JSON.stringify(myKeys));
    localStorage.setItem('togetherTheirPublicKey', theirPublicKey);
    localStorage.setItem('togetherSharedSecret', sharedSecret);
    localStorage.setItem('togetherKeyMethod', keyExchangeMethod);
  };

  // Clear encryption data
  const clearEncryptionData = () => {
    localStorage.removeItem('togetherUserName');
    localStorage.removeItem('togetherMyKeys');
    localStorage.removeItem('togetherTheirPublicKey');
    localStorage.removeItem('togetherSharedSecret');
    localStorage.removeItem('togetherKeyMethod');
    setMyKeys(null);
    setTheirPublicKey(null);
    setSharedSecret(null);
    setKeyExchangeMethod(null);
  };

  // Encrypt message
  const encryptMessage = (text) => {
    if (!sharedSecret) return null;
    return encryption.encryptMessage(text, sharedSecret);
  };

  // Decrypt message
  const decryptMessage = (encryptedData) => {
    if (!sharedSecret) return null;
    try {
      return encryption.decryptMessage(encryptedData, sharedSecret);
    } catch {
      return '[Decryption failed]';
    }
  };

  // Encrypt file
  const encryptFile = (base64Data) => {
    if (!sharedSecret) return null;
    return encryption.encryptFile(base64Data, sharedSecret);
  };

  // Decrypt file
  const decryptFile = (encryptedData) => {
    if (!sharedSecret) return null;
    try {
      return encryption.decryptFile(encryptedData, sharedSecret);
    } catch {
      return null;
    }
  };

  return {
    myKeys,
    theirPublicKey,
    sharedSecret,
    keyExchangeMethod,
    setMyKeys,
    setTheirPublicKey,
    setSharedSecret,
    setKeyExchangeMethod,
    setupWithCode,
    saveEncryptionKeys,
    clearEncryptionData,
    encryptMessage,
    decryptMessage,
    encryptFile,
    decryptFile,
    isEncrypted: !!sharedSecret
  };
}
