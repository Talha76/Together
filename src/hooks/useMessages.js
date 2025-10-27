// src/hooks/useMessages.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToMessages,
  sendMessageWithFile,
  getChatRoomId,
} from '../firebaseSync';
import { megaStorage } from '../megaStorage';
import { encryptFile, decryptFile } from '../encryption';
import { chatRoomManager } from '../chatRoomManager';

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
  const [participants, setParticipants] = useState({});
  const [roomError, setRoomError] = useState(null);
  const [canAccessRoom, setCanAccessRoom] = useState(false);
  const deviceIdRef = useRef(getDeviceId());
  
  // Store the decrypt function in a ref to avoid re-subscribing
  const decryptMessageRef = useRef(decryptMessage);
  
  // Update ref when function changes
  useEffect(() => {
    decryptMessageRef.current = decryptMessage;
  }, [decryptMessage]);

  // Initialize chatRoomId from sharedSecret
  useEffect(() => {
    if (sharedSecret) {
      const roomId = getChatRoomId(sharedSecret);
      setChatRoomId(roomId);
      console.log('📱 Chat Room ID:', roomId);
    }
  }, [sharedSecret]);

  // Join room and listen to participants
  useEffect(() => {
    if (!chatRoomId) return;

    const userName = localStorage.getItem('togetherUserName') || 'Anonymous';
    const currentDeviceId = deviceIdRef.current;

    // Join room
    const joinRoom = async () => {
      const result = await chatRoomManager.joinRoom(
        chatRoomId,
        currentDeviceId,
        userName
      );

      if (!result.success) {
        console.error('❌ Failed to join room:', result.error);
        setRoomError(result.error);
        setCanAccessRoom(false);
        return;
      }

      console.log('✅ Successfully joined room');
      setRoomError(null);
      setCanAccessRoom(true);

      // Listen to participant changes
      chatRoomManager.listenToParticipants(chatRoomId, (activeParticipants) => {
        setParticipants(activeParticipants);
        
        // Check if current device is still in the room
        if (!activeParticipants[currentDeviceId]) {
          console.warn('⚠️ Device removed from room');
          setRoomError('You have been removed from the chat room.');
          setCanAccessRoom(false);
        }
      });
    };

    joinRoom();

    // Cleanup on unmount
    return () => {
      chatRoomManager.cleanup(chatRoomId, currentDeviceId);
      setCanAccessRoom(false);
    };
  }, [chatRoomId]);

  // Subscribe to Firebase messages ONLY if user can access room
  useEffect(() => {
    if (!chatRoomId || !sharedSecret || !canAccessRoom) {
      console.log('🚫 Not subscribing to messages - no room access');
      return;
    }

    console.log('👂 Subscribing to messages...');

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      const decrypted = firebaseMessages.map((msg) => {
        try {
          const decryptedText = decryptMessageRef.current({
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

    return () => {
      console.log('🔌 Unsubscribing from messages...');
      unsubscribe();
    };
  }, [chatRoomId, sharedSecret, canAccessRoom]);

  const addMessage = useCallback(async (userName, inputText, selectedFile, onProgress) => {
    if (!canAccessRoom) {
      throw new Error('Cannot send message - no room access');
    }

    if (roomError) {
      throw new Error(roomError);
    }

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
        console.log('📎 Processing file:', selectedFile.name);
        
        const fileBuffer = await selectedFile.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        const base64Data = uint8ArrayToBase64(fileBytes);

        console.log('🔐 Encrypting file...');
        const encryptedFile = encryptFile(base64Data, sharedSecret, (progress) => {
          if (onProgress) onProgress(progress * 0.3);
        });

        console.log('📦 Encrypted file chunks:', encryptedFile.chunks.length);

        const encryptedFileJSON = JSON.stringify(encryptedFile);
        const encryptedFileBase64 = btoa(encryptedFileJSON);

        console.log('📤 Uploading to Mega.nz...');
        const uploadResult = await megaStorage.uploadFile(
          encryptedFileBase64,
          `encrypted_${Date.now()}_${selectedFile.name}`,
          (progress) => {
            if (onProgress) onProgress(30 + progress * 0.7);
          }
        );

        if (!uploadResult.success) {
          throw new Error('Failed to upload file: ' + uploadResult.error);
        }

        console.log('✅ File uploaded:', uploadResult.link);

        fileMetadata = {
          megaLink: uploadResult.link,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          totalSize: encryptedFile.totalSize,
        };
      }

      const messageText = inputText.trim() || (selectedFile ? '📎 File' : '');
      const encryptedText = encryptMessage(messageText);

      console.log('💾 Sending to Firestore...');
      const result = await sendMessageWithFile(
        chatRoomId,
        encryptedText,
        fileMetadata,
        deviceIdRef.current
      );

      if (!result.success) {
        throw new Error('Failed to send to Firebase');
      }

      console.log('✅ Message sent successfully');

      if (onProgress) onProgress(100);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return { success: false, error: error.message };
    }
  }, [sharedSecret, chatRoomId, encryptMessage, roomError, canAccessRoom]);

  const downloadFile = useCallback(async (fileMetadata, onProgress) => {
    if (!canAccessRoom) {
      throw new Error('Cannot download file - no room access');
    }

    try {
      console.log('📥 Downloading file:', fileMetadata.name);

      const downloadResult = await megaStorage.downloadFile(
        fileMetadata.megaLink,
        (progress) => {
          if (onProgress) onProgress(progress * 0.7);
        }
      );

      if (!downloadResult.success) {
        throw new Error('Download failed: ' + downloadResult.error);
      }

      console.log('✅ File downloaded from Mega.nz');

      const encryptedFileJSON = atob(downloadResult.data);
      const encryptedFile = JSON.parse(encryptedFileJSON);

      console.log('🔓 Decrypting file...');

      const decryptedData = decryptFile(
        encryptedFile.chunks,
        sharedSecret,
        (progress) => {
          if (onProgress) onProgress(70 + progress * 0.3);
        }
      );

      console.log('✅ File decrypted');

      const byteCharacters = atob(decryptedData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      const blob = new Blob([byteArray], { type: fileMetadata.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ File saved:', fileMetadata.name);

      if (onProgress) onProgress(100);
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      throw error;
    }
  }, [sharedSecret, canAccessRoom]);

  return {
    messages,
    addMessage,
    downloadFile,
    chatRoomId,
    participants,
    participantCount: Object.keys(participants).length,
    roomError,
    canAccessRoom,
  };
}
