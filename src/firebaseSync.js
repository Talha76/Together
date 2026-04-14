import { db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { uint8ArrayToBase64 } from './utils/encoding';

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
    }
  );

  return unsubscribe;
}

// Send message with Mega.nz file link
export async function sendMessageWithFile(
  chatRoomId,
  encryptedMessage,
  fileMetadata,
  senderId = null,
  replyTo = null
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

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Add emoji reaction to a message
export async function addReaction(chatRoomId, messageId, emoji, userId) {
  try {
    const msgRef = doc(db, 'chats', chatRoomId, 'messages', messageId);
    await updateDoc(msgRef, {
      [`reactions.${userId}`]: emoji,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Remove reaction from a message
export async function removeReaction(chatRoomId, messageId, userId) {
  try {
    const msgRef = doc(db, 'chats', chatRoomId, 'messages', messageId);
    await updateDoc(msgRef, {
      [`reactions.${userId}`]: deleteField(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Soft-delete a message
export async function deleteMessage(chatRoomId, messageId) {
  try {
    const msgRef = doc(db, 'chats', chatRoomId, 'messages', messageId);
    await updateDoc(msgRef, {
      deleted: true,
      content: { ciphertext: '', nonce: '' },
      file: deleteField(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
