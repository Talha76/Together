export const APP_CONFIG = {
  name: 'Together',
  version: '1.0.0',
  description: 'End-to-end encrypted chat for couples'
}

export const STORAGE_KEYS = {
  USER_NAME: 'togetherUserName',
  PHONE_NUMBER: 'togetherPhoneNumber',
  SHARED_CODE: 'togetherSharedCode',
  MY_KEYS: 'togetherMyKeys',
  THEIR_PUBLIC_KEY: 'togetherTheirPublicKey',
  SHARED_SECRET: 'togetherSharedSecret',
  KEY_EXCHANGE_METHOD: 'togetherKeyMethod',
  RECENT_EMOJIS: 'togetherRecentEmojis',
}

export const STEPS = {
  WELCOME: 'welcome',
  CODE_SETUP: 'code-setup',
  CHAT: 'chat'
}

export const KEY_EXCHANGE_METHODS = {
  SHARED_CODE: 'code'
}

export const FILE_LIMITS = {
  MAX_SIZE: 1024 * 1024 * 1024,
  MAX_SIZE_DISPLAY: '1GB',
  CHUNK_SIZE: 10 * 1024 * 1024
}

export const FIREBASE_CONFIG = {
  COLLECTION_ROOMS: 'chatRooms',
  COLLECTION_MESSAGES: 'messages',
  MAX_PARTICIPANTS: 2,
  MESSAGE_LIMIT: 100,
  TYPING_TIMEOUT: 3000
}

export const COMPRESSION_CONFIG = {
  IMAGE_MAX_DIMENSION: 2048,
  IMAGE_QUALITY: 0.7,
  VIDEO_MAX_SIZE: 720,
  VIDEO_QUALITY: 'medium',
}

export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'NaCl Box (Curve25519, XSalsa20, Poly1305)',
  KEY_SIZE: 32,
  NONCE_SIZE: 24,
  MIN_CODE_LENGTH: 6,
  RECOMMENDED_CODE_LENGTH: 12
}

export const UI_MESSAGES = {
  ERRORS: {
    FILE_TOO_LARGE: `File is too large. Maximum size is ${FILE_LIMITS.MAX_SIZE_DISPLAY}`,
    ENCRYPTION_FAILED: 'Failed to encrypt message. Please try again.',
    DECRYPTION_FAILED: 'Failed to decrypt message',
    UPLOAD_FAILED: 'Failed to upload file. Please try again.',
    DOWNLOAD_FAILED: 'Failed to download file',
    DOWNLOAD_CANCELLED: 'Download cancelled',
    UPLOAD_CANCELLED: 'Upload cancelled',
    CONNECTION_LOST: 'Connection lost. Reconnecting...',
    ROOM_FULL: 'This room is full. Maximum 2 participants allowed.',
    WEAK_CODE: 'Password is too weak. Use at least 12 characters.'
  },
  SUCCESS: {
    FILE_UPLOADED: 'File uploaded successfully',
    FILE_DOWNLOADED: 'File downloaded',
    CONNECTED: 'Connected securely',
    MESSAGE_SENT: 'Message sent'
  },
  INFO: {
    TYPING: 'is typing...',
    ENCRYPTING: 'Encrypting...',
    UPLOADING: 'Uploading...',
    DOWNLOADING: 'Downloading...',
    COMPRESSING: 'Compressing...'
  }
}

export const FEATURES = {
  MESSAGE_REACTIONS: true,
  MESSAGE_DELETION: true,
  FILE_SHARING: true,
  IMAGE_PREVIEW: true,
  VIDEO_PREVIEW: true,
  TYPING_INDICATORS: true
}

export const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥']
