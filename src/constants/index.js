// Application Configuration
export const APP_CONFIG = {
  name: 'Together',
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0',
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString(),
  description: 'End-to-end encrypted chat for couples'
}

// Storage Keys
export const STORAGE_KEYS = {
  USER_NAME: 'togetherUserName',
  MY_KEYS: 'togetherMyKeys',
  THEIR_PUBLIC_KEY: 'togetherTheirPublicKey',
  SHARED_SECRET: 'togetherSharedSecret',
  KEY_EXCHANGE_METHOD: 'togetherKeyExchangeMethod',
  MESSAGES: 'togetherMessages',
  ROOM_ID: 'togetherRoomId',
  LAST_ACTIVE: 'togetherLastActive'
}

// UI Steps
export const STEPS = {
  WELCOME: 'welcome',
  CHOOSE_METHOD: 'choose-method',
  QR_SETUP: 'qr-setup',
  QR_WAITING: 'qr-waiting',
  QR_SHOW_MINE: 'qr-show-mine',
  CODE_SETUP: 'code-setup',
  CHAT: 'chat'
}

// Key Exchange Methods
export const KEY_EXCHANGE_METHODS = {
  QR_CODE: 'qr',
  SHARED_CODE: 'code'
}

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: Infinity, // No size limit - handle unlimited files
  MAX_SIZE_DISPLAY: 'Unlimited',
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'application/pdf',
    'text/plain',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ],
  CHUNK_SIZE: 10 * 1024 * 1024 // 10MB chunks for better performance with large files
}

// Firebase Configuration
export const FIREBASE_CONFIG = {
  COLLECTION_ROOMS: 'chatRooms',
  COLLECTION_MESSAGES: 'messages',
  STORAGE_PATH: 'encrypted-files',
  MAX_PARTICIPANTS: 2,
  MESSAGE_LIMIT: 100,
  TYPING_TIMEOUT: 3000 // 3 seconds
}

// Encryption Configuration
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'NaCl Box (Curve25519, XSalsa20, Poly1305)',
  KEY_SIZE: 32, // bytes
  NONCE_SIZE: 24, // bytes
  MIN_CODE_LENGTH: 6,
  RECOMMENDED_CODE_LENGTH: 12
}

// UI Messages
export const UI_MESSAGES = {
  ERRORS: {
    FILE_TOO_LARGE: `File is too large. Maximum size is ${FILE_LIMITS.MAX_SIZE_DISPLAY}`,
    FILE_TYPE_NOT_ALLOWED: 'This file type is not supported',
    ENCRYPTION_FAILED: 'Failed to encrypt message. Please try again.',
    DECRYPTION_FAILED: 'Failed to decrypt message',
    UPLOAD_FAILED: 'Failed to upload file. Please try again.',
    DOWNLOAD_FAILED: 'Failed to download file',
    CONNECTION_LOST: 'Connection lost. Reconnecting...',
    ROOM_FULL: 'This room is full. Maximum 2 participants allowed.',
    INVALID_QR: 'Invalid QR code. Please scan again.',
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
    DOWNLOADING: 'Downloading...'
  }
}

// Animation Durations (ms)
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  TRANSITION: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

// Breakpoints
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
}

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^\+?[\d\s-()]+$/
}

// Date/Time Formats
export const DATE_FORMATS = {
  MESSAGE_TIME: 'h:mm A',
  MESSAGE_DATE: 'MMM D, YYYY',
  FULL: 'MMM D, YYYY h:mm A'
}

// Feature Flags (for gradual rollout)
export const FEATURES = {
  VOICE_MESSAGES: false,
  VIDEO_CALLS: false,
  GROUP_CHAT: false,
  MESSAGE_REACTIONS: false,
  MESSAGE_EDITING: false,
  MESSAGE_DELETION: true,
  FILE_SHARING: true,
  IMAGE_PREVIEW: true,
  VIDEO_PREVIEW: true,
  LINK_PREVIEW: false,
  NOTIFICATIONS: true,
  TYPING_INDICATORS: true
}

// Analytics Events (if you add analytics)
export const ANALYTICS_EVENTS = {
  APP_LAUNCHED: 'app_launched',
  USER_REGISTERED: 'user_registered',
  CHAT_STARTED: 'chat_started',
  MESSAGE_SENT: 'message_sent',
  FILE_UPLOADED: 'file_uploaded',
  FILE_DOWNLOADED: 'file_downloaded',
  ERROR_OCCURRED: 'error_occurred'
}

// Error Codes
export const ERROR_CODES = {
  ENCRYPTION_FAILED: 'E001',
  DECRYPTION_FAILED: 'E002',
  FILE_TOO_LARGE: 'E003',
  FILE_TYPE_INVALID: 'E004',
  UPLOAD_FAILED: 'E005',
  DOWNLOAD_FAILED: 'E006',
  CONNECTION_FAILED: 'E007',
  ROOM_FULL: 'E008',
  INVALID_QR: 'E009'
}

export default {
  APP_CONFIG,
  STORAGE_KEYS,
  STEPS,
  KEY_EXCHANGE_METHODS,
  FILE_LIMITS,
  FIREBASE_CONFIG,
  ENCRYPTION_CONFIG,
  UI_MESSAGES,
  ANIMATION,
  BREAKPOINTS,
  PATTERNS,
  DATE_FORMATS,
  FEATURES,
  ANALYTICS_EVENTS,
  ERROR_CODES
}
