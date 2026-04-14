// src/chatRoomManager.js
import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INACTIVE_TIMEOUT = 60000; // 60 seconds (2 missed heartbeats)

export class ChatRoomManager {
  constructor() {
    this.heartbeatInterval = null;
    this.participantUnsubscribe = null;
  }

  async joinRoom(chatRoomId, deviceId, userName) {
    try {
      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      const roomDoc = await getDoc(roomRef);

      const now = Date.now();

      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const participants = roomData.participants || {};

        const activeParticipants = {};
        for (const [id, data] of Object.entries(participants)) {
          if (now - data.lastSeen < INACTIVE_TIMEOUT) {
            activeParticipants[id] = data;
          }
        }

        if (activeParticipants[deviceId]) {
          await this.updatePresence(chatRoomId, deviceId, userName);
          this.startHeartbeat(chatRoomId, deviceId, userName);
          return { success: true, isRejoining: true };
        }

        if (Object.keys(activeParticipants).length >= 2) {
          return {
            success: false,
            error: 'This chat room is full. Only 2 people can chat at a time.',
          };
        }

        activeParticipants[deviceId] = {
          userName,
          joinedAt: now,
          lastSeen: now,
        };

        await setDoc(roomRef, {
          participants: activeParticipants,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(roomRef, {
          participants: {
            [deviceId]: {
              userName,
              joinedAt: now,
              lastSeen: now,
            },
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      this.startHeartbeat(chatRoomId, deviceId, userName);

      return { success: true, isRejoining: false };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to join chat room: ' + error.message,
      };
    }
  }

  async updatePresence(chatRoomId, deviceId, userName) {
    try {
      const roomRef = doc(db, 'chat_rooms', chatRoomId);

      await updateDoc(roomRef, {
        [`participants.${deviceId}.lastSeen`]: Date.now(),
        [`participants.${deviceId}.userName`]: userName,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Presence update failed silently
    }
  }

  startHeartbeat(chatRoomId, deviceId, userName) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.updatePresence(chatRoomId, deviceId, userName);
    }, HEARTBEAT_INTERVAL);

    this.updatePresence(chatRoomId, deviceId, userName);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async leaveRoom(chatRoomId, deviceId) {
    try {
      this.stopHeartbeat();

      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      const roomDoc = await getDoc(roomRef);

      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const participants = roomData.participants || {};

        delete participants[deviceId];

        if (Object.keys(participants).length === 0) {
          await deleteDoc(roomRef);
        } else {
          await setDoc(roomRef, {
            participants,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }
    } catch {
      // Leave room failed silently
    }
  }

  async setTyping(chatRoomId, deviceId, isTyping) {
    try {
      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      await updateDoc(roomRef, {
        [`typing.${deviceId}`]: isTyping ? { isTyping: true, timestamp: Date.now() } : { isTyping: false, timestamp: Date.now() },
      });
    } catch {
      // Typing update failed silently
    }
  }

  listenToParticipants(chatRoomId, onUpdate) {
    const roomRef = doc(db, 'chat_rooms', chatRoomId);

    this.participantUnsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.data();
        const participants = roomData.participants || {};
        const typing = roomData.typing || {};

        const now = Date.now();
        const activeParticipants = Object.entries(participants)
          .filter(([_, data]) => now - data.lastSeen < INACTIVE_TIMEOUT)
          .reduce((acc, [id, data]) => {
            acc[id] = data;
            return acc;
          }, {});

        onUpdate(activeParticipants, typing);
      }
    });

    return this.participantUnsubscribe;
  }

  stopListening() {
    if (this.participantUnsubscribe) {
      this.participantUnsubscribe();
      this.participantUnsubscribe = null;
    }
  }

  cleanup(chatRoomId, deviceId) {
    this.stopHeartbeat();
    this.stopListening();
    if (chatRoomId && deviceId) {
      this.leaveRoom(chatRoomId, deviceId);
    }
  }
}

export const chatRoomManager = new ChatRoomManager();
