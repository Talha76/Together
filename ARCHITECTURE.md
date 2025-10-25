# Component Architecture

## Before Refactoring

```txt
┌─────────────────────────────────────────┐
│                                         │
│            App.jsx (400+ lines)         │
│                                         │
│  • All UI components inline             │
│  • All state management                 │
│  • All encryption logic                 │
│  • All message handling                 │
│  • Multiple useEffect hooks             │
│  • 20+ useState hooks                   │
│                                         │
└─────────────────────────────────────────┘
```

## After Refactoring

```txt
┌──────────────────────────────────────────────────────────────────┐
│                     App.jsx (260 lines)                          │
│                   • Route orchestration                          │
│                   • Step management                              │
│                   • QR scanner modal state                       │
└────────┬──────────────────────────┬──────────────────────────────┘
         │                          │
         ▼                          ▼
┌────────────────┐        ┌──────────────────┐
│  useEncryption │        │   useMessages    │
│                │        │                  │
│ • Key gen      │        │ • Load messages  │
│ • Encrypt/     │        │ • Add message    │
│   Decrypt      │        │ • Save messages  │
│ • Storage      │        │ • File handling  │
└────────────────┘        └──────────────────┘
         │                          │
         └──────────┬───────────────┘
                    │
         ┌──────────┴───────────┐
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Screen          │    │ Screen          │
│ Components      │    │ Components      │
│                 │    │                 │
│ • Welcome       │    │ • Chat          │
│ • ChooseMethod  │    │   ├─ Header     │
│ • QRSetup       │    │   ├─ Messages   │
│ • CodeSetup     │    │   └─ Input      │
└─────────────────┘    └─────────────────┘
```

## Data Flow

```txt
User Action
    │
    ▼
App.jsx (handler)
    │
    ├─► useEncryption hook
    │       │
    │       ├─ Generate keys
    │       ├─ Encrypt data
    │       └─ Save to localStorage
    │
    └─► useMessages hook
            │
            ├─ Create message
            ├─ Encrypt content
            └─ Update state
                │
                ▼
            Component re-renders
                │
                ▼
            Display to user
```

## Component Communication

```txt
┌─────────────┐
│   App.jsx   │
└──────┬──────┘
       │
       ├─ Props ─► WelcomeScreen
       │              └─ Callback: onGetStarted
       │
       ├─ Props ─► ChooseMethodScreen
       │              ├─ Callback: onSelectMethod
       │              └─ Callback: onBack
       │
       ├─ Props ─► QRSetupScreen
       │              ├─ Data: userName, qrCodeData
       │              └─ Callbacks: onGenerateQR, onScanQR, etc.
       │
       ├─ Props ─► CodeSetupScreen
       │              ├─ Data: userName, sharedCode
       │              └─ Callbacks: onConnect, onBack
       │
       └─ Props ─► ChatScreen
                      ├─ Data: messages, userName, encryption status
                      └─ Callbacks: onSendMessage, onDisconnect
                          │
                          ├─► ChatHeader
                          ├─► MessageList
                          └─► MessageInput
```

## State Management

```txt
┌───────────────────────────────────────────┐
│            App.jsx (UI State)             │
│                                           │
│  • step (welcome, choose, qr, code, chat) │
│  • userName                               │
│  • sharedCode                             │
│  • showQRScanner                          │
│  • encryptionStatus                       │
└───────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  useEncryption  │    │   useMessages    │
│                 │    │                  │
│  • myKeys       │    │  • messages[]    │
│  • theirPublicKey│   │                  │
│  • sharedSecret │    │                  │
│  • keyExchangeMethod│ │                 │
│  • qrCodeData   │    │                  │
└─────────────────┘    └──────────────────┘
```

## File Organization

```txt
src/
├── App.jsx                      # Main orchestrator (260 lines)
├── App-original.jsx.bak         # Backup of original
│
├── components/                  # UI Components
│   ├── WelcomeScreen.jsx        # Landing page
│   ├── ChooseMethodScreen.jsx   # Method selection
│   ├── QRSetupScreen.jsx        # QR flow (3 steps)
│   ├── CodeSetupScreen.jsx      # Code flow
│   ├── ChatScreen.jsx           # Chat orchestrator
│   ├── ChatHeader.jsx           # Header bar
│   ├── MessageList.jsx          # Message display
│   ├── MessageInput.jsx         # Input + emojis + files
│   ├── QRCodeDisplay.jsx        # QR rendering (existing)
│   └── QRScanner.bak.jsx        # QR scanner (existing)
│
├── hooks/                       # Custom hooks
│   ├── useEncryption.js         # Encryption logic
│   └── useMessages.js           # Message management
│
├── encryption.js                # Crypto utilities (existing)
├── firebase.js                  # Firebase config (existing)
└── config.js                    # App config (existing)
```
