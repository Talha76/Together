// src/hooks/useMessages.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToMessages,
  sendMessageWithFile,
  getChatRoomId,
  addReaction as fbAddReaction,
  removeReaction as fbRemoveReaction,
  deleteMessage as fbDeleteMessage,
} from '../firebaseSync';
import { megaStorage } from '../megaStorage';
import { encryptFileAsync, decryptFileAsync } from '../encryption';
import { chatRoomManager } from '../chatRoomManager';
import { FILE_LIMITS, UI_MESSAGES, STORAGE_KEYS } from '../constants';
import { base64ToBlob } from '../utils/encoding';
import { downloadBlob } from '../utils';
import { isCompressibleMedia, compressMedia } from '../mediaCompression';

export function useMessages(sharedSecret, encryptMessage, decryptMessage, userIdentifier) {
  const [messages, setMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [participants, setParticipants] = useState({});
  const [roomError, setRoomError] = useState(null);
  const [canAccessRoom, setCanAccessRoom] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState({ isOnline: false, userName: null, lastSeen: null });
  
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
    }
  }, [sharedSecret]);

  // Join room and listen to participants
  useEffect(() => {
    if (!chatRoomId || !userIdentifier) return;

    const userName = localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Anonymous';

    // Join room
    const joinRoom = async () => {
      const result = await chatRoomManager.joinRoom(
        chatRoomId,
        userIdentifier,
        userName
      );

      if (!result.success) {
        setRoomError(result.error);
        setCanAccessRoom(false);
        return;
      }

      setRoomError(null);
      setCanAccessRoom(true);

      // Listen to participant changes
      chatRoomManager.listenToParticipants(chatRoomId, (activeParticipants, typing) => {
        setParticipants(activeParticipants);

        // Check if current user is still in the room
        if (!activeParticipants[userIdentifier]) {
          setRoomError('You have been removed from the chat room.');
          setCanAccessRoom(false);
        }

        // Derive partner typing status
        const now = Date.now();
        const TYPING_TIMEOUT = 3000;
        let isPartnerTyping = false;
        for (const [id, data] of Object.entries(typing || {})) {
          if (id !== userIdentifier && data.isTyping && now - data.timestamp < TYPING_TIMEOUT) {
            isPartnerTyping = true;
            break;
          }
        }
        setPartnerTyping(isPartnerTyping);

        // Derive partner status
        const partnerEntry = Object.entries(activeParticipants).find(([id]) => id !== userIdentifier);
        if (partnerEntry) {
          const [, data] = partnerEntry;
          setPartnerStatus({ isOnline: true, userName: data.userName, lastSeen: data.lastSeen });
        } else {
          // Check all participants (including inactive) for last seen
          setPartnerStatus(prev => ({ ...prev, isOnline: false }));
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
      return;
    }

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      const currentUserId = userIdentifierRef.current;
      
      const decrypted = firebaseMessages.map((msg) => {
        try {
          // Handle soft-deleted messages
          if (msg.deleted) {
            return {
              id: msg.id,
              sender: msg.senderId === currentUserId ? 'You' : 'Partner',
              text: 'This message was deleted',
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(msg.createdAt).toLocaleDateString(),
              createdAt: msg.createdAt,
              deleted: true,
              decrypted: true,
              synced: true,
            };
          }

          const decryptedText = decryptMessageRef.current({
            ciphertext: msg.content.ciphertext,
            nonce: msg.content.nonce,
          });

          const isOwnMessage = msg.senderId === currentUserId;

          // Decrypt reply preview if present
          let replyTo = null;
          if (msg.replyTo) {
            try {
              const replyText = msg.replyTo.text?.ciphertext
                ? decryptMessageRef.current(msg.replyTo.text)
                : msg.replyTo.text;
              replyTo = { messageId: msg.replyTo.messageId, senderName: msg.replyTo.senderName, text: replyText };
            } catch {
              replyTo = { messageId: msg.replyTo.messageId, senderName: msg.replyTo.senderName, text: '[Encrypted]' };
            }
          }

          return {
            id: msg.id,
            sender: isOwnMessage ? 'You' : ((participants && participants[msg.senderId]) || 'Partner'),
            text: decryptedText,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            createdAt: msg.createdAt,
            file: msg.file || null,
            type: msg.type || 'text',
            replyTo,
            reactions: msg.reactions || null,
            decrypted: true,
            synced: true,
          };
        } catch {
          return {
            id: msg.id,
            text: '[Decryption failed]',
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            createdAt: msg.createdAt,
            decrypted: false,
          };
        }
      });

      setMessages(decrypted);
    });

    return () => {
      unsubscribe();
    };
  }, [chatRoomId, sharedSecret, canAccessRoom, userIdentifier]);

  const addMessage = useCallback(async (userName, inputText, selectedFile, onProgress, abortSignal, replyToMessage = null) => {
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
      // Check if cancelled
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      let fileMetadata = null;

      if (selectedFile) {
        // Check file size limit
        if (selectedFile.size > FILE_LIMITS.MAX_SIZE) {
          throw new Error(UI_MESSAGES.ERRORS.FILE_TOO_LARGE);
        }

        if (abortSignal?.aborted) throw new Error('Upload cancelled');

        let fileToUpload = selectedFile;
        const needsCompression = isCompressibleMedia(selectedFile);

        // Phase: Compress video/audio (only for compressible media)
        if (needsCompression) {
          if (onProgress) onProgress({ stage: 'compressing', progress: 0 });
          fileToUpload = await compressMedia(
            selectedFile,
            (p) => {
              if (abortSignal?.aborted) return;
              if (onProgress) onProgress({ stage: 'compressing', progress: Math.round(p) });
            },
            abortSignal
          );
          if (abortSignal?.aborted) throw new Error('Upload cancelled');
          if (onProgress) onProgress({ stage: 'compressing', progress: 100 });
        }

        // Phase: Reading file + encrypting (reported as "encrypting")
        if (onProgress) onProgress({ stage: 'encrypting', progress: 0 });
        const reader = new FileReader();
        const fileDataPromise = new Promise((resolve, reject) => {
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              // Reading is ~0-20% of the "encrypting" stage
              const readPct = Math.round((e.loaded / e.total) * 20);
              if (onProgress) onProgress({ stage: 'encrypting', progress: readPct });
            }
          };
          reader.onload = () => {
            if (onProgress) onProgress({ stage: 'encrypting', progress: 20 });
            resolve(reader.result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileToUpload);
        });

        const fileData = await fileDataPromise;

        if (abortSignal?.aborted) throw new Error('Upload cancelled');

        // Actual encryption is 20-100% of the "encrypting" stage
        let encryptionAborted = false;
        const encryptedFile = await encryptFileAsync(
          fileData,
          sharedSecret,
          (encryptProgress) => {
            if (abortSignal?.aborted) {
              encryptionAborted = true;
              return;
            }
            const p = 20 + Math.round((encryptProgress / 100) * 80);
            if (onProgress) onProgress({ stage: 'encrypting', progress: p });
          }
        );

        if (encryptionAborted || abortSignal?.aborted) throw new Error('Upload cancelled');
        if (onProgress) onProgress({ stage: 'encrypting', progress: 100 });

        const encryptedFileData = btoa(JSON.stringify({
          chunks: encryptedFile.chunks,
          isChunked: encryptedFile.chunks.length > 1
        }));

        // Phase: Uploading to Mega.nz
        if (onProgress) onProgress({ stage: 'uploading', progress: 0 });
        const uploadResult = await megaStorage.uploadFile(
          encryptedFileData,
          fileToUpload.name,
          (uploadProgress) => {
            if (abortSignal?.aborted) return;
            if (onProgress) onProgress({ stage: 'uploading', progress: Math.round(uploadProgress) });
          },
          abortSignal
        );

        if (!uploadResult.success) {
          throw new Error('File upload failed');
        }

        if (onProgress) onProgress({ stage: 'uploading', progress: 100 });

        fileMetadata = {
          megaLink: uploadResult.link,
          name: selectedFile.name,
          type: fileToUpload.type,
          size: fileToUpload.size,
          originalSize: needsCompression ? selectedFile.size : undefined,
          totalSize: encryptedFileData.length,
        };
      }

      // Check if cancelled before sending
      if (abortSignal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Phase 4: Sending to Firebase (99-100%)
      const messageText = inputText + (selectedFile ? ' 📎 File' : '');
      const encryptedText = encryptMessage(messageText);

      if (onProgress) onProgress(99);
      
      // Build encrypted replyTo if replying
      let replyTo = null;
      if (replyToMessage) {
        const encryptedReplyText = encryptMessage(
          (replyToMessage.text || '').slice(0, 100)
        );
        replyTo = {
          messageId: replyToMessage.id,
          senderName: replyToMessage.sender,
          text: encryptedReplyText,
        };
      }

      const result = await sendMessageWithFile(
        chatRoomId,
        encryptedText,
        fileMetadata,
        userIdentifier,
        replyTo,
      );

      if (!result.success) {
        throw new Error('Failed to send to Firebase');
      }

      if (onProgress) onProgress(100);
      
      return { success: true };
    } catch (error) {
      // Silent handling for cancellation
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

    const downloadResult = await megaStorage.downloadFile(
      fileMetadata.megaLink,
      (progress) => {
        if (onProgress) onProgress(progress * 0.5);
      }
    );

    if (!downloadResult.success) {
      throw new Error('Download failed: ' + downloadResult.error);
    }

    const encryptedFileJSON = atob(downloadResult.data);
    const encryptedFileData = JSON.parse(encryptedFileJSON);

    let decryptedData;

    if (encryptedFileData.isChunked && encryptedFileData.chunks.length > 1) {
      const allChunks = encryptedFileData.chunks.flatMap(chunk => chunk.chunks || [chunk]);

      decryptedData = await decryptFileAsync(
        allChunks,
        sharedSecret,
        (decryptProgress) => {
          if (onProgress) onProgress(50 + (decryptProgress * 0.5));
        }
      );
    } else {
      const chunks = encryptedFileData.chunks || [encryptedFileData];
      const allChunks = chunks[0].chunks || [chunks[0]];

      decryptedData = await decryptFileAsync(
        allChunks,
        sharedSecret,
        (decryptProgress) => {
          if (onProgress) onProgress(50 + (decryptProgress * 0.5));
        }
      );
    }

    const blob = base64ToBlob(decryptedData, fileMetadata.type);
    downloadBlob(blob, fileMetadata.name);

    if (onProgress) onProgress(100);
  }, [sharedSecret, canAccessRoom]);

  const handleAddReaction = useCallback(async (messageId, emoji) => {
    if (chatRoomId && userIdentifier) {
      await fbAddReaction(chatRoomId, messageId, emoji, userIdentifier);
    }
  }, [chatRoomId, userIdentifier]);

  const handleRemoveReaction = useCallback(async (messageId) => {
    if (chatRoomId && userIdentifier) {
      await fbRemoveReaction(chatRoomId, messageId, userIdentifier);
    }
  }, [chatRoomId, userIdentifier]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (chatRoomId) {
      await fbDeleteMessage(chatRoomId, messageId);
    }
  }, [chatRoomId]);

  const setTypingStatus = useCallback((isTyping) => {
    if (chatRoomId && userIdentifier) {
      chatRoomManager.setTyping(chatRoomId, userIdentifier, isTyping);
    }
  }, [chatRoomId, userIdentifier]);

  return {
    messages,
    addMessage,
    downloadFile,
    chatRoomId,
    participants,
    participantCount: Object.keys(participants).length,
    roomError,
    canAccessRoom,
    partnerTyping,
    partnerStatus,
    setTypingStatus,
    addReaction: handleAddReaction,
    removeReaction: handleRemoveReaction,
    deleteMessage: handleDeleteMessage,
    userIdentifier,
  };
}
