// src/hooks/useMessages.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToMessages,
  sendMessageWithFile,
  getChatRoomId,
} from '../firebaseSync';
import { megaStorage } from '../megaStorage';
import { encryptFileAsync, decryptFileAsync } from '../encryption';
import { chatRoomManager } from '../chatRoomManager';
import { FILE_LIMITS, UI_MESSAGES } from '../constants/index'

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

export function useMessages(sharedSecret, encryptMessage, decryptMessage, userIdentifier) {
  const [messages, setMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [participants, setParticipants] = useState({});
  const [roomError, setRoomError] = useState(null);
  const [canAccessRoom, setCanAccessRoom] = useState(false);
  
  // Store the decrypt function and userIdentifier in refs
  const decryptMessageRef = useRef(decryptMessage);
  const userIdentifierRef = useRef(userIdentifier);
  
  // Update refs when they change
  useEffect(() => {
    decryptMessageRef.current = decryptMessage;
    userIdentifierRef.current = userIdentifier;
  }, [decryptMessage, userIdentifier]);

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
    if (!chatRoomId || !userIdentifier) return;

    const userName = localStorage.getItem('togetherUserName') || 'Anonymous';

    // Join room
    const joinRoom = async () => {
      const result = await chatRoomManager.joinRoom(
        chatRoomId,
        userIdentifier,
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
        
        // Check if current user is still in the room
        if (!activeParticipants[userIdentifier]) {
          console.warn('⚠️ User removed from room');
          setRoomError('You have been removed from the chat room.');
          setCanAccessRoom(false);
        }
      });
    };

    joinRoom();

    // Cleanup on unmount
    return () => {
      chatRoomManager.cleanup(chatRoomId, userIdentifier);
      setCanAccessRoom(false);
    };
  }, [chatRoomId, userIdentifier]);

  // Subscribe to Firebase messages ONLY if user can access room
  useEffect(() => {
    if (!chatRoomId || !sharedSecret || !canAccessRoom || !userIdentifier) {
      console.log('🚫 Not subscribing to messages - no room access');
      return;
    }

    console.log('👂 Subscribing to messages...');

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      const currentUserId = userIdentifierRef.current;
      
      const decrypted = firebaseMessages.map((msg) => {
        try {
          const decryptedText = decryptMessageRef.current({
            ciphertext: msg.content.ciphertext,
            nonce: msg.content.nonce,
          });

          // Determine sender based on userId match (userName + code hash)
          const isOwnMessage = msg.senderId === currentUserId;

          return {
            id: msg.id,
            sender: isOwnMessage ? 'You' : (msg.senderName || 'Partner'),
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
  }, [chatRoomId, sharedSecret, canAccessRoom, userIdentifier]);

  const addMessage = useCallback(async (userName, inputText, selectedFile, onProgress, abortSignal) => {
    if (!canAccessRoom) {
      throw new Error('Cannot send message - no room access');
    }

    if (roomError) {
      throw new Error(roomError);
    }

    if (!sharedSecret || !chatRoomId || !userIdentifier) {
      throw new Error('Encryption not set up!');
    }

    try {
      console.log('📤 Preparing message...');

      // Check if cancelled
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      let fileMetadata = null;

      if (selectedFile) {
        console.log('📎 Processing file:', selectedFile.name);

        // Check file size limit
        if (selectedFile.size > FILE_LIMITS.MAX_SIZE) {
          throw new Error(UI_MESSAGES.ERRORS.FILE_TOO_LARGE);
        }

        // Check if cancelled
        if (abortSignal?.aborted) {
          throw new Error('Upload cancelled');
        }

        // Phase 1: Reading file (0-5%)
        if (onProgress) onProgress(0);
        const reader = new FileReader();
        const fileDataPromise = new Promise((resolve, reject) => {
          reader.onloadstart = () => {
            if (onProgress) onProgress(1);
          };
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              const readProgress = 1 + (e.loaded / e.total) * 4; // 1% to 5%
              if (onProgress) onProgress(Math.round(readProgress));
            }
          };
          reader.onload = () => {
            if (onProgress) onProgress(5);
            resolve(reader.result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        const fileData = await fileDataPromise;

        // Check if cancelled
        if (abortSignal?.aborted) {
          throw new Error('Upload cancelled');
        }

        // Phase 2: Encrypting file (5-15%) - NOW ASYNC!
        console.log('🔒 Encrypting file in chunks (async)...');
        
        const encryptedFile = await encryptFileAsync(
          fileData,
          sharedSecret,
          (encryptProgress) => {
            if (abortSignal?.aborted) {
              throw new Error('Upload cancelled');
            }
            // Map encryption progress from 5% to 15%
            const totalProgress = 5 + (encryptProgress * 0.10);
            if (onProgress) onProgress(Math.round(totalProgress));
          }
        );

        // Check if cancelled
        if (abortSignal?.aborted) {
          throw new Error('Upload cancelled');
        }

        const encryptedFileData = btoa(JSON.stringify({ 
          chunks: encryptedFile.chunks,
          isChunked: encryptedFile.chunks.length > 1
        }));

        // Phase 3: Uploading to Mega.nz (15-99%)
        console.log('☁️ Uploading to Mega.nz...');
        const uploadResult = await megaStorage.uploadFile(
          encryptedFileData,
          selectedFile.name,
          (uploadProgress) => {
            if (abortSignal?.aborted) {
              throw new Error('Upload cancelled');
            }
            // Map upload progress from 15% to 99%
            const totalProgress = 15 + (uploadProgress * 0.84);
            if (onProgress) onProgress(Math.round(totalProgress));
          },
          abortSignal // Pass abort signal to Mega upload
        );

        if (!uploadResult.success) {
          throw new Error('File upload failed');
        }

        fileMetadata = {
          megaLink: uploadResult.link,
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          totalSize: encryptedFileData.length,
        };

        console.log('✅ File uploaded to Mega.nz:', uploadResult.link);
        if (onProgress) onProgress(99);
      }

      // Check if cancelled before sending
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Phase 4: Sending to Firebase (99-100%)
      const messageText = inputText + (selectedFile ? ' 📎 File' : '');
      const encryptedText = encryptMessage(messageText);

      console.log('💾 Sending to Firestore...');
      if (onProgress) onProgress(99);
      
      const result = await sendMessageWithFile(
        chatRoomId,
        encryptedText,
        fileMetadata,
        userIdentifier,
      );

      if (!result.success) {
        throw new Error('Failed to send to Firebase');
      }

      console.log('✅ Message sent successfully');

      if (onProgress) onProgress(100);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      if (error.message === 'Upload cancelled' || error.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      
      return { success: false, error: error.message };
    }
  }, [sharedSecret, chatRoomId, encryptMessage, roomError, canAccessRoom, userIdentifier]);

  const downloadFile = useCallback(async (fileMetadata, onProgress) => {
    if (!canAccessRoom) {
      throw new Error('Cannot download file - no room access');
    }

    try {
      console.log('📥 Downloading file:', fileMetadata.name);

      const downloadResult = await megaStorage.downloadFile(
        fileMetadata.megaLink,
        (progress) => {
          if (onProgress) onProgress(progress * 0.5);
        }
      );

      if (!downloadResult.success) {
        throw new Error('Download failed: ' + downloadResult.error);
      }

      console.log('✅ File downloaded from Mega.nz');

      const encryptedFileJSON = atob(downloadResult.data);
      const encryptedFileData = JSON.parse(encryptedFileJSON);

      console.log('🔓 Decrypting file (async)...');

      let decryptedData;
      
      if (encryptedFileData.isChunked && encryptedFileData.chunks.length > 1) {
        // Decrypt all chunks at once (async)
        const allChunks = encryptedFileData.chunks.flatMap(chunk => chunk.chunks || [chunk]);
        
        decryptedData = await decryptFileAsync(
          allChunks,
          sharedSecret,
          (decryptProgress) => {
            const progress = 50 + (decryptProgress * 0.5);
            if (onProgress) onProgress(progress);
          }
        );
      } else {
        // Single chunk or old format
        const chunks = encryptedFileData.chunks || [encryptedFileData];
        const allChunks = chunks[0].chunks || [chunks[0]];
        
        decryptedData = await decryptFileAsync(
          allChunks,
          sharedSecret,
          (decryptProgress) => {
            const progress = 50 + (decryptProgress * 0.5);
            if (onProgress) onProgress(progress);
          }
        );
      }

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
