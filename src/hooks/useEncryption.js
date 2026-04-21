import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as encryption from '../services/encryption';
import { STORAGE_KEYS } from '../constants';

export function useEncryption() {
  const [myKeys, setMyKeys] = useState(null);
  const [theirPublicKey, setTheirPublicKey] = useState(null);
  const [sharedSecret, setSharedSecret] = useState(null);
  const [keyExchangeMethod, setKeyExchangeMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedMyKeys, savedTheirPK, savedSecret, savedMethod] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.MY_KEYS),
          AsyncStorage.getItem(STORAGE_KEYS.THEIR_PUBLIC_KEY),
          AsyncStorage.getItem(STORAGE_KEYS.SHARED_SECRET),
          AsyncStorage.getItem(STORAGE_KEYS.KEY_EXCHANGE_METHOD),
        ]);

        if (savedMyKeys && savedSecret) {
          setMyKeys(JSON.parse(savedMyKeys));
          setTheirPublicKey(savedTheirPK);
          setSharedSecret(savedSecret);
          setKeyExchangeMethod(savedMethod);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setupWithCode = async (sharedCode) => {
    if (sharedCode.length < 6) {
      return { success: false, error: 'Shared code must be at least 6 characters' };
    }

    try {
      const keys = await encryption.deriveKeyPairFromCode(sharedCode);
      setMyKeys(keys);
      setTheirPublicKey(keys.publicKey);

      const secret = encryption.generateSharedSecret(keys.secretKey, keys.publicKey);
      setSharedSecret(secret);
      setKeyExchangeMethod('code');

      return { success: true, keys, secret };
    } catch (error) {
      return { success: false, error: 'Encryption setup failed: ' + error.message };
    }
  };

  const saveEncryptionKeys = async (userName, phoneNumber) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, userName),
      AsyncStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, phoneNumber),
      AsyncStorage.setItem(STORAGE_KEYS.MY_KEYS, JSON.stringify(myKeys)),
      AsyncStorage.setItem(STORAGE_KEYS.THEIR_PUBLIC_KEY, theirPublicKey),
      AsyncStorage.setItem(STORAGE_KEYS.SHARED_SECRET, sharedSecret),
      AsyncStorage.setItem(STORAGE_KEYS.KEY_EXCHANGE_METHOD, keyExchangeMethod),
    ]);
  };

  const clearEncryptionData = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_NAME),
      AsyncStorage.removeItem(STORAGE_KEYS.PHONE_NUMBER),
      AsyncStorage.removeItem(STORAGE_KEYS.MY_KEYS),
      AsyncStorage.removeItem(STORAGE_KEYS.THEIR_PUBLIC_KEY),
      AsyncStorage.removeItem(STORAGE_KEYS.SHARED_SECRET),
      AsyncStorage.removeItem(STORAGE_KEYS.KEY_EXCHANGE_METHOD),
    ]);
    setMyKeys(null);
    setTheirPublicKey(null);
    setSharedSecret(null);
    setKeyExchangeMethod(null);
  };

  const encryptMessage = (text) => {
    if (!sharedSecret) return null;
    return encryption.encryptMessage(text, sharedSecret);
  };

  const decryptMessage = (encryptedData) => {
    if (!sharedSecret) return null;
    try { return encryption.decryptMessage(encryptedData, sharedSecret); }
    catch { return '[Decryption failed]'; }
  };

  return {
    myKeys, theirPublicKey, sharedSecret, keyExchangeMethod,
    setupWithCode, saveEncryptionKeys, clearEncryptionData,
    encryptMessage, decryptMessage,
    isEncrypted: !!sharedSecret,
    loading,
  };
}
