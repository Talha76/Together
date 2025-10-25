import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// Person A: Save their public key to Firebase, return exchangeId
export async function createQRExchange(publicKey) {
  const exchangeId = 'qr_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  
  try {
    await setDoc(doc(db, 'qr_exchange', exchangeId), {
      personA_publicKey: publicKey,
      personB_publicKey: null,
      personB_scanned: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
    });
    
    return { success: true, exchangeId };
  } catch (error) {
    console.error('Error creating QR exchange:', error);
    return { success: false, error };
  }
}

// Person B: Save their public key after scanning
export async function completeQRExchange(exchangeId, myPublicKey) {
  try {
    const docRef = doc(db, 'qr_exchange', exchangeId);
    
    await setDoc(docRef, {
      personB_publicKey: myPublicKey,
      personB_scanned: true,
      completedAt: Date.now()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error completing exchange:', error);
    return { success: false, error };
  }
}

// Person A: Listen for Person B to scan
export function listenForScanComplete(exchangeId, onComplete) {
  const docRef = doc(db, 'qr_exchange', exchangeId);
  
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    
    if (data?.personB_scanned && data?.personB_publicKey) {
      console.log('✓ Partner scanned! Their public key:', data.personB_publicKey);
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
    const docRef = doc(db, 'qr_exchange', exchangeId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return {
        success: true,
        publicKey: snapshot.data().personA_publicKey
      };
    }
    
    return { success: false, error: 'Exchange not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
