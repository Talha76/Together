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
import { Buffer } from 'buffer';

function uint8ArrayToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

export function getChatRoomId(encryptionKey) {
  let keyBytes;

  if (typeof encryptionKey === 'string') {
    keyBytes = new Uint8Array(Buffer.from(encryptionKey, 'base64'));
  } else if (encryptionKey instanceof Uint8Array) {
    keyBytes = encryptionKey;
  } else if (typeof encryptionKey === 'object') {
    keyBytes = new Uint8Array(Object.values(encryptionKey));
  } else {
    throw new Error('Invalid encryption key format');
  }

  const keyB64 = uint8ArrayToBase64(keyBytes);
  return keyB64.substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
}

export function subscribeToMessages(chatRoomId, onMessagesUpdate) {
  const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(100));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      onMessagesUpdate(messages.reverse());
    },
    () => {}
  );

  return unsubscribe;
}

export async function sendMessageWithFile(
  chatRoomId, encryptedMessage, fileMetadata, senderId = null, replyTo = null
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
        originalSize: fileMetadata.originalSize,
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

export async function addReaction(chatRoomId, messageId, emoji, userId) {
  try {
    const msgRef = doc(db, 'chats', chatRoomId, 'messages', messageId);
    await updateDoc(msgRef, { [`reactions.${userId}`]: emoji });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export async function removeReaction(chatRoomId, messageId, userId) {
  try {
    const msgRef = doc(db, 'chats', chatRoomId, 'messages', messageId);
    await updateDoc(msgRef, { [`reactions.${userId}`]: deleteField() });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

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
