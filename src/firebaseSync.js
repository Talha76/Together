import { db } from './config';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

// Generate unique chat room ID from encryption key
// Both partners will have the same key = same room ID
export function getChatRoomId(encryptionKey) {
  // Use first 32 chars of base64 key as room ID
  const keyB64 = btoa(String.fromCharCode(...encryptionKey));
  return keyB64.substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
}

// Send encrypted message to Firestore
export async function sendMessage(chatRoomId, encryptedMessage, encryptedFile = null) {
  try {
    const messageData = {
      content: encryptedMessage,
      timestamp: serverTimestamp(),
      createdAt: Date.now(), // Fallback for ordering
    };

    if (encryptedFile) {
      messageData.file = {
        data: encryptedFile.data,
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

  return unsubscribe; // Call this to stop listening
}
