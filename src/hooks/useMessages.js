// /src/hooks/useMessages.js
import { useState, useEffect, useRef } from 'react';
import {
  subscribeToMessages,
  sendMessageWithFile,
  getChatRoomId,
} from '../firebaseSync';
import { megaStorage } from '../megaStorage';
import { encryptFile, decryptFile } from '../encryption';

// Generate or retrieve device ID
function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

export function useMessages(sharedSecret, encryptMessage, decryptMessage) {
  const [messages, setMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState(null);
  const deviceIdRef = useRef(getDeviceId());

  // Initialize chatRoomId from sharedSecret
  useEffect(() => {
    if (sharedSecret) {
      const roomId = getChatRoomId(sharedSecret);
      setChatRoomId(roomId);
    }
  }, [sharedSecret]);

  // Subscribe to Firebase messages
  useEffect(() => {
    if (!chatRoomId || !sharedSecret) return;

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      const decrypted = firebaseMessages.map((msg) => {
        try {
          const decryptedText = decryptMessage({
            ciphertext: msg.content.ciphertext,
            nonce: msg.content.nonce,
          });

          // Determine sender based on device ID
          const isOwnMessage = msg.senderId === deviceIdRef.current;

          return {
            id: msg.id,
            sender: isOwnMessage ? 'You' : 'Partner',
            text: decryptedText,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            file: msg.file || null,
            type: msg.type || 'text',
            decrypted: true,
            synced: true,
          };
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          return {
            id: msg.id,
            text: '[Decryption failed]',
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            decrypted: false,
          };
        }
      });

      setMessages(decrypted);
    });

    return () => unsubscribe();
  }, [chatRoomId, sharedSecret, decryptMessage]);

  const addMessage = async (userName, inputText, selectedFile, onProgress) => {
    if (!sharedSecret || !chatRoomId) {
      throw new Error('Encryption not set up!');
    }

    if (!inputText.trim() && !selectedFile) {
      throw new Error('No message or file to send');
    }

    try {
      let fileMetadata = null;

      // Handle file upload
      if (selectedFile) {
        // Read file
        const fileBuffer = await selectedFile.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        const base64Data = btoa(String.fromCharCode(...fileBytes));

        // Encrypt file
        console.log('🔐 Encrypting file...');
        const encryptedFile = encryptFile(base64Data, sharedSecret, (progress) => {
          if (onProgress) onProgress(progress * 0.3); // 0-30%
        });

        // Upload to Mega.nz
        console.log('📤 Uploading to Mega.nz...');
        const uploadResult = await megaStorage.uploadFile(
          JSON.stringify(encryptedFile),
          `encrypted_${selectedFile.name}`,
          (progress) => {
            if (onProgress) onProgress(30 + progress * 0.7); // 30-100%
          }
        );

        if (!uploadResult.success) {
          throw new Error('Failed to upload file: ' + uploadResult.error);
        }

        fileMetadata = {
          megaLink: uploadResult.link,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          totalSize: encryptedFile.totalSize,
        };
      }

      // Encrypt message text
      const messageText = inputText.trim() || (selectedFile ? '📎 File' : '');
      const encryptedText = encryptMessage(messageText);

      // Send to Firestore with device ID
      const result = await sendMessageWithFile(
        chatRoomId,
        encryptedText,
        fileMetadata,
        deviceIdRef.current
      );

      if (!result.success) {
        throw new Error('Failed to send to Firebase');
      }

      if (onProgress) onProgress(100);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  };

  const downloadFile = async (fileMetadata, onProgress) => {
    try {
      // Download from Mega.nz
      console.log('📥 Downloading from Mega.nz...');
      const downloadResult = await megaStorage.downloadFile(
        fileMetadata.megaLink,
        (progress) => {
          if (onProgress) onProgress(progress * 0.7); // 0-70%
        }
      );

      if (!downloadResult.success) {
        throw new Error('Download failed: ' + downloadResult.error);
      }

      // Parse encrypted file data
      const encryptedFile = JSON.parse(
        atob(downloadResult.data)
      );

      // Decrypt file
      console.log('🔓 Decrypting file...');
      const decryptedData = decryptFile(
        encryptedFile.chunks,
        sharedSecret,
        (progress) => {
          if (onProgress) onProgress(70 + progress * 0.3); // 70-100%
        }
      );

      // Create download link
      const blob = new Blob(
        [Uint8Array.from(atob(decryptedData), c => c.charCodeAt(0))],
        { type: fileMetadata.type }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.name;
      a.click();
      URL.revokeObjectURL(url);

      if (onProgress) onProgress(100);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  };

  return {
    messages,
    addMessage,
    downloadFile,
    chatRoomId,
  };
}
