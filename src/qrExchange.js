import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Generate a temporary exchange ID for this QR session
export function generateExchangeId() {
  return 'qr_' + Date.now() + '_' + Math.random().toString(36).substring(7);
}

// Person A: Save their QR data to Firebase
export async function saveQRForPartner(exchangeId, qrData) {
  try {
    await setDoc(doc(db, 'qr_exchange', exchangeId), {
      personA_qr: qrData,
      personA_ready: true,
      personB_ready: false,
      createdAt: Date.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving QR:', error);
    return { success: false, error };
  }
}

// Person B: Mark that they scanned and save their QR
export async function markScannedAndSaveMyQR(exchangeId, myQrData) {
  try {
    await setDoc(doc(db, 'qr_exchange', exchangeId), {
      personB_qr: myQrData,
      personB_ready: true,
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking scanned:', error);
    return { success: false, error };
  }
}

// Listen for partner's status
export function listenForPartnerReady(exchangeId, onPartnerReady) {
  const docRef = doc(db, 'qr_exchange', exchangeId);
  
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (data?.personB_ready && data?.personB_qr) {
      onPartnerReady(data.personB_qr);
    }
  });
  
  return unsubscribe;
}
