import { db } from './firebase';  // ✅ Import from firebase.js
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

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

// Generate unique chat room ID from encryption key
export function getChatRoomId(encryptionKey) {
  // Handle different input types
  let keyBytes;
  
  if (typeof encryptionKey === 'string') {
    // If it's base64 string, decode it
    keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
  } else if (encryptionKey instanceof Uint8Array) {
    keyBytes = encryptionKey;
  } else if (typeof encryptionKey === 'object') {
    // If it's an object with numeric keys (from JSON.parse)
    keyBytes = new Uint8Array(Object.values(encryptionKey));
  } else {
    throw new Error('Invalid encryption key format');
  }
  
  const keyB64 = uint8ArrayToBase64(keyBytes);
  return keyB64.substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
}

// Send encrypted message to Firestore
export async function sendMessage(chatRoomId, encryptedMessage, encryptedFile = null, senderId = null) {
  try {
    const messageData = {
      content: {
        ciphertext: encryptedMessage.ciphertext,
        nonce: encryptedMessage.nonce
      },
      senderId: senderId || 'unknown',
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

    await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
}

// Listen to real-time messages
export function subscribeToMessages(chatRoomId, onMessagesUpdate) {
  const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(100));

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
      
      // Reverse to show oldest first
      onMessagesUpdate(messages.reverse());
    },
    (error) => {
      console.error('Error listening to messages:', error);
    }
  );

  return unsubscribe;
}

// Send message with Mega.nz file link
export async function sendMessageWithFile(
  chatRoomId,
  encryptedMessage,
  fileMetadata,
  senderId = null
) {
  try {
    const messageData = {
      content: {
        ciphertext: encryptedMessage.ciphertext,
        nonce: encryptedMessage.nonce,
      },
      senderId: senderId || 'unknown',
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
      type: fileMetadata ? 'file' : 'text',
    };

    if (fileMetadata) {
      messageData.file = {
        megaLink: fileMetadata.megaLink,
        name: fileMetadata.name,
        type: fileMetadata.type,
        size: fileMetadata.size,
        totalSize: fileMetadata.totalSize,
      };
    }

    await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
}
