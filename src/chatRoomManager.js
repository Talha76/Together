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

  // Join a chat room
  async joinRoom(chatRoomId, deviceId, userName) {
    try {
      console.log('🚪 Attempting to join room:', chatRoomId);

      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      const roomDoc = await getDoc(roomRef);

      const now = Date.now();

      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const participants = roomData.participants || {};

        // Remove inactive participants
        const activeParticipants = {};
        for (const [id, data] of Object.entries(participants)) {
          if (now - data.lastSeen < INACTIVE_TIMEOUT) {
            activeParticipants[id] = data;
          } else {
            console.log('🧹 Removing inactive participant:', id);
          }
        }

        // Check if this device is already in the room
        if (activeParticipants[deviceId]) {
          console.log('✅ Already in room, updating presence');
          await this.updatePresence(chatRoomId, deviceId, userName);
          this.startHeartbeat(chatRoomId, deviceId, userName);
          return { success: true, isRejoining: true };
        }

        // Check if room is full (max 2 participants)
        if (Object.keys(activeParticipants).length >= 2) {
          console.log('❌ Room is full');
          return {
            success: false,
            error: 'This chat room is full. Only 2 people can chat at a time.',
          };
        }

        // Add this participant
        activeParticipants[deviceId] = {
          userName,
          joinedAt: now,
          lastSeen: now,
        };

        await setDoc(roomRef, {
          participants: activeParticipants,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        console.log('✅ Joined room successfully');
      } else {
        // Create new room
        console.log('🆕 Creating new room');
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

        console.log('✅ Room created and joined');
      }

      // Start heartbeat
      this.startHeartbeat(chatRoomId, deviceId, userName);

      return { success: true, isRejoining: false };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      return {
        success: false,
        error: 'Failed to join chat room: ' + error.message,
      };
    }
  }

  // Update presence (heartbeat)
  async updatePresence(chatRoomId, deviceId, userName) {
    try {
      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      
      await updateDoc(roomRef, {
        [`participants.${deviceId}.lastSeen`]: Date.now(),
        [`participants.${deviceId}.userName`]: userName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error updating presence:', error);
    }
  }

  // Start heartbeat to maintain presence
  startHeartbeat(chatRoomId, deviceId, userName) {
    // Clear existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    console.log('💓 Starting heartbeat');

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.updatePresence(chatRoomId, deviceId, userName);
    }, HEARTBEAT_INTERVAL);

    // Also update presence immediately
    this.updatePresence(chatRoomId, deviceId, userName);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      console.log('💔 Stopping heartbeat');
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Leave room
  async leaveRoom(chatRoomId, deviceId) {
    try {
      console.log('👋 Leaving room:', chatRoomId);

      this.stopHeartbeat();

      const roomRef = doc(db, 'chat_rooms', chatRoomId);
      const roomDoc = await getDoc(roomRef);

      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const participants = roomData.participants || {};

        // Remove this participant
        delete participants[deviceId];

        if (Object.keys(participants).length === 0) {
          // Delete room if empty
          console.log('🗑️ Deleting empty room');
          await deleteDoc(roomRef);
        } else {
          // Update room
          await setDoc(roomRef, {
            participants,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      console.log('✅ Left room successfully');
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  }

  // Listen for participant changes
  listenToParticipants(chatRoomId, onUpdate) {
    console.log('👂 Listening to participants in room:', chatRoomId);

    const roomRef = doc(db, 'chat_rooms', chatRoomId);

    this.participantUnsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.data();
        const participants = roomData.participants || {};
        
        // Filter active participants
        const now = Date.now();
        const activeParticipants = Object.entries(participants)
          .filter(([_, data]) => now - data.lastSeen < INACTIVE_TIMEOUT)
          .reduce((acc, [id, data]) => {
            acc[id] = data;
            return acc;
          }, {});

        console.log('👥 Active participants:', Object.keys(activeParticipants).length);
        
        onUpdate(activeParticipants);
      }
    });

    return this.participantUnsubscribe;
  }

  // Stop listening to participants
  stopListening() {
    if (this.participantUnsubscribe) {
      console.log('🔇 Stopped listening to participants');
      this.participantUnsubscribe();
      this.participantUnsubscribe = null;
    }
  }

  // Cleanup (call when user disconnects or closes app)
  cleanup(chatRoomId, deviceId) {
    this.stopHeartbeat();
    this.stopListening();
    if (chatRoomId && deviceId) {
      this.leaveRoom(chatRoomId, deviceId);
    }
  }
}

// Export singleton
export const chatRoomManager = new ChatRoomManager();
