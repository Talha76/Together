import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import {
  subscribeToMessages,
  sendMessageWithFile,
  getChatRoomId,
  addReaction as fbAddReaction,
  removeReaction as fbRemoveReaction,
  deleteMessage as fbDeleteMessage,
} from '../services/firebaseSync';
import { megaStorage } from '../services/megaStorage';
import { encryptFileAsync, decryptFileAsync } from '../services/encryption';
import { chatRoomManager } from '../services/chatRoomManager';
import { isCompressibleMedia, compressMedia } from '../services/compression';
import { FILE_LIMITS, UI_MESSAGES, STORAGE_KEYS } from '../constants';

export function useMessages(sharedSecret, encryptMessage, decryptMessage, userIdentifier) {
  const [messages, setMessages] = useState([]);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [participants, setParticipants] = useState({});
  const [roomError, setRoomError] = useState(null);
  const [canAccessRoom, setCanAccessRoom] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState({ isOnline: false, userName: null, lastSeen: null });

  const decryptMessageRef = useRef(decryptMessage);
  const userIdentifierRef = useRef(userIdentifier);

  useEffect(() => {
    decryptMessageRef.current = decryptMessage;
    userIdentifierRef.current = userIdentifier;
  }, [decryptMessage, userIdentifier]);

  // Init room ID
  useEffect(() => {
    if (sharedSecret) setChatRoomId(getChatRoomId(sharedSecret));
  }, [sharedSecret]);

  // Join room + listen participants
  useEffect(() => {
    if (!chatRoomId || !userIdentifier) return;

    const joinRoom = async () => {
      const userName = (await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME)) || 'Anonymous';
      const result = await chatRoomManager.joinRoom(chatRoomId, userIdentifier, userName);

      if (!result.success) {
        setRoomError(result.error);
        setCanAccessRoom(false);
        return;
      }

      setRoomError(null);
      setCanAccessRoom(true);

      chatRoomManager.listenToParticipants(chatRoomId, (activeParticipants, typing) => {
        setParticipants(activeParticipants);

        if (!activeParticipants[userIdentifier]) {
          setRoomError('You have been removed from the chat room.');
          setCanAccessRoom(false);
        }

        const now = Date.now();
        let isPartnerTyping = false;
        for (const [id, data] of Object.entries(typing || {})) {
          if (id !== userIdentifier && data.isTyping && now - data.timestamp < 3000) {
            isPartnerTyping = true;
            break;
          }
        }
        setPartnerTyping(isPartnerTyping);

        const partnerEntry = Object.entries(activeParticipants).find(([id]) => id !== userIdentifier);
        if (partnerEntry) {
          const [, data] = partnerEntry;
          setPartnerStatus({ isOnline: true, userName: data.userName, lastSeen: data.lastSeen });
        } else {
          setPartnerStatus(prev => ({ ...prev, isOnline: false }));
        }
      });
    };

    joinRoom();
    return () => { chatRoomManager.cleanup(chatRoomId, userIdentifier); setCanAccessRoom(false); };
  }, [chatRoomId, userIdentifier]);

  // Subscribe messages
  useEffect(() => {
    if (!chatRoomId || !sharedSecret || !canAccessRoom || !userIdentifier) return;

    const unsubscribe = subscribeToMessages(chatRoomId, (firebaseMessages) => {
      const currentUserId = userIdentifierRef.current;

      const decrypted = firebaseMessages.map((msg) => {
        try {
          if (msg.deleted) {
            return {
              id: msg.id, sender: msg.senderId === currentUserId ? 'You' : 'Partner',
              text: 'This message was deleted',
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(msg.createdAt).toLocaleDateString(),
              createdAt: msg.createdAt, deleted: true, decrypted: true, synced: true,
            };
          }

          const decryptedText = decryptMessageRef.current({ ciphertext: msg.content.ciphertext, nonce: msg.content.nonce });
          const isOwnMessage = msg.senderId === currentUserId;

          let replyTo = null;
          if (msg.replyTo) {
            try {
              const replyText = msg.replyTo.text?.ciphertext ? decryptMessageRef.current(msg.replyTo.text) : msg.replyTo.text;
              replyTo = { messageId: msg.replyTo.messageId, senderName: msg.replyTo.senderName, text: replyText };
            } catch { replyTo = { messageId: msg.replyTo.messageId, senderName: msg.replyTo.senderName, text: '[Encrypted]' }; }
          }

          return {
            id: msg.id,
            sender: isOwnMessage ? 'You' : ((participants && participants[msg.senderId]) || 'Partner'),
            text: decryptedText,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            createdAt: msg.createdAt,
            file: msg.file || null, type: msg.type || 'text', replyTo,
            reactions: msg.reactions || null, decrypted: true, synced: true,
          };
        } catch {
          return {
            id: msg.id, text: '[Decryption failed]',
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(msg.createdAt).toLocaleDateString(),
            createdAt: msg.createdAt, decrypted: false,
          };
        }
      });

      setMessages(decrypted);
    });

    return () => unsubscribe();
  }, [chatRoomId, sharedSecret, canAccessRoom, userIdentifier]);

  // Send message
  const addMessage = useCallback(async (userName, inputText, selectedFile, onProgress, abortSignal, replyToMessage = null) => {
    if (!canAccessRoom) throw new Error('No room access');
    if (roomError) throw new Error(roomError);
    if (!sharedSecret || !chatRoomId || !userIdentifier) throw new Error('Encryption not set up');

    try {
      if (abortSignal?.aborted) throw new Error('Upload cancelled');

      let fileMetadata = null;

      if (selectedFile) {
        // selectedFile = { uri, name, type, size }
        if (selectedFile.size > FILE_LIMITS.MAX_SIZE) throw new Error(UI_MESSAGES.ERRORS.FILE_TOO_LARGE);
        if (abortSignal?.aborted) throw new Error('Upload cancelled');

        let fileUri = selectedFile.uri;
        let fileType = selectedFile.type;
        let fileSize = selectedFile.size;
        let originalSize = undefined;
        const needsCompression = isCompressibleMedia(fileType);

        // Compress
        if (needsCompression) {
          if (onProgress) onProgress({ stage: 'compressing', progress: 0 });
          const compressed = await compressMedia(fileUri, fileType, (p) => {
            if (abortSignal?.aborted) return;
            if (onProgress) onProgress({ stage: 'compressing', progress: Math.round(p) });
          });
          if (compressed.compressed) {
            originalSize = fileSize;
            fileUri = compressed.uri;
            fileSize = compressed.compressedSize;
            if (compressed.mimeType) fileType = compressed.mimeType;
          }
          if (abortSignal?.aborted) throw new Error('Upload cancelled');
          if (onProgress) onProgress({ stage: 'compressing', progress: 100 });
        }

        // Read file as base64
        if (onProgress) onProgress({ stage: 'encrypting', progress: 0 });
        const fileData = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        if (onProgress) onProgress({ stage: 'encrypting', progress: 20 });
        if (abortSignal?.aborted) throw new Error('Upload cancelled');

        // Encrypt
        const encryptedFile = await encryptFileAsync(fileData, sharedSecret, (p) => {
          if (abortSignal?.aborted) return;
          if (onProgress) onProgress({ stage: 'encrypting', progress: 20 + Math.round((p / 100) * 80) });
        });
        if (abortSignal?.aborted) throw new Error('Upload cancelled');
        if (onProgress) onProgress({ stage: 'encrypting', progress: 100 });

        const encryptedFileData = Buffer.from(JSON.stringify({
          chunks: encryptedFile.chunks,
          isChunked: encryptedFile.chunks.length > 1
        })).toString('base64');

        // Upload
        if (onProgress) onProgress({ stage: 'uploading', progress: 0 });
        const uploadResult = await megaStorage.uploadFile(encryptedFileData, selectedFile.name, (p) => {
          if (abortSignal?.aborted) return;
          if (onProgress) onProgress({ stage: 'uploading', progress: Math.round(p) });
        }, abortSignal);

        if (!uploadResult.success) throw new Error('File upload failed');
        if (onProgress) onProgress({ stage: 'uploading', progress: 100 });

        fileMetadata = {
          megaLink: uploadResult.link,
          name: selectedFile.name,
          type: fileType,
          size: fileSize,
          originalSize,
          totalSize: encryptedFileData.length,
        };
      }

      if (abortSignal?.aborted) throw new Error('Upload cancelled');

      const messageText = inputText + (selectedFile ? ' 📎 File' : '');
      const encryptedText = encryptMessage(messageText);

      let replyTo = null;
      if (replyToMessage) {
        replyTo = {
          messageId: replyToMessage.id,
          senderName: replyToMessage.sender,
          text: encryptMessage((replyToMessage.text || '').slice(0, 100)),
        };
      }

      const result = await sendMessageWithFile(chatRoomId, encryptedText, fileMetadata, userIdentifier, replyTo);
      if (!result.success) throw new Error('Failed to send');

      return { success: true };
    } catch (error) {
      if (error.message === 'Upload cancelled' || error.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      return { success: false, error: error.message };
    }
  }, [sharedSecret, chatRoomId, encryptMessage, roomError, canAccessRoom, userIdentifier]);

  // Download file → save + share
  const downloadFile = useCallback(async (fileMetadata, onProgress) => {
    if (!canAccessRoom) throw new Error('No room access');

    const downloadResult = await megaStorage.downloadFile(fileMetadata.megaLink, (p) => {
      if (onProgress) onProgress(p * 0.5);
    });

    if (!downloadResult.success) throw new Error('Download failed: ' + downloadResult.error);

    const encryptedFileJSON = Buffer.from(downloadResult.data, 'base64').toString('utf-8');
    const encryptedFileData = JSON.parse(encryptedFileJSON);

    if (!Array.isArray(encryptedFileData.chunks) || encryptedFileData.chunks.length === 0) {
      throw new Error('Invalid file payload');
    }

    const decryptedData = await decryptFileAsync(encryptedFileData.chunks, sharedSecret, (p) => {
      if (onProgress) onProgress(50 + (p * 0.5));
    });

    // Write to temp file + share
    const filePath = FileSystem.cacheDirectory + fileMetadata.name;
    await FileSystem.writeAsStringAsync(filePath, decryptedData, { encoding: FileSystem.EncodingType.Base64 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    }

    if (onProgress) onProgress(100);
  }, [sharedSecret, canAccessRoom]);

  const handleAddReaction = useCallback(async (messageId, emoji) => {
    if (chatRoomId && userIdentifier) await fbAddReaction(chatRoomId, messageId, emoji, userIdentifier);
  }, [chatRoomId, userIdentifier]);

  const handleRemoveReaction = useCallback(async (messageId) => {
    if (chatRoomId && userIdentifier) await fbRemoveReaction(chatRoomId, messageId, userIdentifier);
  }, [chatRoomId, userIdentifier]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (chatRoomId) await fbDeleteMessage(chatRoomId, messageId);
  }, [chatRoomId]);

  const setTypingStatus = useCallback((isTyping) => {
    if (chatRoomId && userIdentifier) chatRoomManager.setTyping(chatRoomId, userIdentifier, isTyping);
  }, [chatRoomId, userIdentifier]);

  return {
    messages, addMessage, downloadFile, chatRoomId, participants,
    participantCount: Object.keys(participants).length,
    roomError, canAccessRoom, partnerTyping, partnerStatus, setTypingStatus,
    addReaction: handleAddReaction, removeReaction: handleRemoveReaction,
    deleteMessage: handleDeleteMessage, userIdentifier,
  };
}
