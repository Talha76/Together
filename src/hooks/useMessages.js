import { useState, useEffect } from 'react';
import { subscribeToMessages, sendMessage, getChatRoomId } from '../firebaseSync';

export function useMessages(sharedSecret, encryptMessage, decryptMessage, encryptFile) {
  const [messages, setMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState(null);

  // Generate chat room ID from shared secret
  useEffect(() => {
    if (sharedSecret) {
      try {
        // Convert sharedSecret to proper format
        const secretBytes = typeof sharedSecret === 'string' 
          ? Uint8Array.from(atob(sharedSecret), c => c.charCodeAt(0))
          : new Uint8Array(Object.values(sharedSecret));
        
        const roomId = getChatRoomId(secretBytes);
        setChatRoomId(roomId);
        console.log('Chat Room ID:', roomId); // Debug
      } catch (error) {
        console.error('Error generating chat room ID:', error);
      }
    }
  }, [sharedSecret]);

  // Subscribe to Firebase messages
  useEffect(() => {
    if (!chatRoomId || !sharedSecret) return;

    console.log('Subscribing to messages for room:', chatRoomId); // Debug

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      console.log('Received messages:', firebaseMessages.length); // Debug

      // Decrypt messages from Firebase
      const decrypted = firebaseMessages.map((msg) => {
        try {
          const decryptedText = decryptMessage({
            ciphertext: msg.content.ciphertext,
            nonce: msg.content.nonce
          });

          let decryptedFile = null;
          if (msg.file) {
            decryptedFile = {
              ...msg.file,
              decrypted: true,
            };
          }

          return {
            id: msg.id,
            sender: 'Partner', // You can enhance this later
            text: decryptedText,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            file: decryptedFile,
            decrypted: true,
            synced: true
          };
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          return {
            id: msg.id,
            text: '[Decryption failed]',
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            decrypted: false,
            synced: true
          };
        }
      });

      setMessages(decrypted);
    });

    return () => unsubscribe();
  }, [chatRoomId, sharedSecret, decryptMessage]);

  const addMessage = async (userName, inputText, selectedFile) => {
    if (!sharedSecret || !chatRoomId) {
      return { success: false, error: 'Encryption not set up!' };
    }

    if (!inputText.trim() && !selectedFile) {
      return { success: false, error: 'No message or file to send' };
    }

    try {
      let encryptedFileData = null;

      // Encrypt file if attached
      if (selectedFile) {
        const fileBuffer = await selectedFile.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        
        // Convert to base64 for encryption
        const base64Data = btoa(String.fromCharCode(...fileBytes));
        const encryptedFile = encryptFile(base64Data);

        encryptedFileData = {
          data: encryptedFile.ciphertext,
          nonce: encryptedFile.nonce,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        };
      }

      // Encrypt text message
      const encryptedText = encryptMessage(inputText || '📎 File');

      console.log('Sending message to room:', chatRoomId); // Debug

      // Send to Firebase
      const result = await sendMessage(chatRoomId, encryptedText, encryptedFileData);
      
      if (!result.success) {
        return { success: false, error: 'Failed to send to Firebase' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message: ' + error.message };
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    addMessage,
    clearMessages,
    chatRoomId
  };
}
