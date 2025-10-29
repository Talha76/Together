// src/hooks/useMessages.js - Updated with Streaming Encryption
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToMessages,
  sendMessageWithFile,
  getChatRoomId,
} from '../firebaseSync';
import { megaStorage } from '../megaStorage';
import { encryptFileStreaming, decryptFileStreaming } from '../encryption-streaming';
import { chatRoomManager } from '../chatRoomManager';

// Utility: Convert Uint8Array to base64 (avoiding stack overflow)
function uint8ArrayToBase64(uint8Array) {
  const chunkSize = 8192;
  const chunks = [];
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
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

    // Cleanup: leave room when component unmounts
    return () => {
      chatRoomManager.leaveRoom(chatRoomId, currentDeviceId);
    };
  }, [chatRoomId]);

  // Subscribe to messages
  useEffect(() => {
    if (!chatRoomId || !canAccessRoom) return;

    console.log('👂 Subscribing to messages in room:', chatRoomId);

    const unsubscribe = subscribeToMessages(chatRoomId, (newMessages) => {
      const decryptedMessages = newMessages.map((msg) => {
        if (!msg.encrypted) return msg;

        const decrypted = decryptMessageRef.current(msg.encrypted);
        return {
          ...msg,
          text: decrypted || '[Encrypted]',
        };
      });

      setMessages(decryptedMessages);
    });

    return () => {
      console.log('🛑 Unsubscribing from messages');
      unsubscribe();
    };
  }, [chatRoomId, canAccessRoom]);

  // Add message with optional file (using streaming encryption for large files)
  const addMessage = useCallback(async (userName, inputText, selectedFile, onProgress) => {
    if (!canAccessRoom) {
      return { success: false, error: 'Cannot send message - no room access' };
    }

    if (!sharedSecret) {
      return { success: false, error: 'No encryption key found' };
    }

    if (!inputText.trim() && !selectedFile) {
      return { success: false, error: 'No message or file to send' };
    }

    try {
      let fileMetadata = null;

      // Handle file upload with STREAMING encryption
      if (selectedFile) {
        console.log('📎 Processing file:', selectedFile.name);
        console.log('📦 File size:', (selectedFile.size / 1024 / 1024).toFixed(2), 'MB');
        
        // Use streaming encryption - processes file in chunks, no full memory load
        console.log('🔐 Encrypting file in chunks...');
        const encryptedFile = await encryptFileStreaming(selectedFile, sharedSecret, (progress) => {
          if (onProgress) onProgress(progress * 0.3); // 0-30% for encryption
        });

        console.log('📦 Encrypted file chunks:', encryptedFile.chunks.length);

        const encryptedFileJSON = JSON.stringify(encryptedFile);
        const encryptedFileBase64 = btoa(encryptedFileJSON);

        console.log('📤 Uploading to Mega.nz...');
        const uploadResult = await megaStorage.uploadFile(
          encryptedFileBase64,
          `encrypted_${Date.now()}_${selectedFile.name}`,
          (progress) => {
            if (onProgress) onProgress(30 + progress * 0.7); // 30-100% for upload
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
          totalSize: encryptedFile.originalSize,
          chunks: encryptedFile.totalChunks
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

  // Download file with streaming decryption
  const downloadFile = useCallback(async (fileMetadata, onProgress) => {
    if (!canAccessRoom) {
      throw new Error('Cannot download file - no room access');
    }

    try {
      console.log('📥 Downloading file:', fileMetadata.name);

      const downloadResult = await megaStorage.downloadFile(
        fileMetadata.megaLink,
        (progress) => {
          if (onProgress) onProgress(progress * 0.7); // 0-70% for download
        }
      );

      if (!downloadResult.success) {
        throw new Error('Download failed: ' + downloadResult.error);
      }

      console.log('✅ File downloaded from Mega.nz');

      const encryptedFileJSON = atob(downloadResult.data);
      const encryptedFile = JSON.parse(encryptedFileJSON);

      console.log('🔓 Decrypting file in chunks...');

      // Use streaming decryption
      const decryptedData = decryptFileStreaming(
        encryptedFile,
        sharedSecret,
        (progress) => {
          if (onProgress) onProgress(70 + progress * 0.3); // 70-100% for decryption
        }
      );

      console.log('✅ File decrypted');

      // Convert base64 to blob
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
