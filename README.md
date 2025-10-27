# 💕 Together - Private Chat for Couples

<div align="center">

![Together Chat Logo](public/pwa-192x192.png)

**End-to-end encrypted messaging app built with React, featuring military-grade encryption and PWA support.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-success)](https://web.dev/progressive-web-apps/)

[Demo](https://your-demo-url.com) · [Report Bug](https://github.com/yourusername/together-chat/issues) · [Request Feature](https://github.com/yourusername/together-chat/issues)

</div>

---

## 🌟 Features

### 🔐 Security First

- **Military-Grade Encryption**: End-to-end encryption using NaCl (Curve25519, XSalsa20, Poly1305)
- **Zero Trust**: Messages encrypted on device, never stored in plain text
- **No Server Access**: Only encrypted data passes through servers

### 💬 Messaging

- Real-time encrypted messaging
- Photo & video sharing (encrypted)
- File attachments up to 100MB
- Message timestamps
- Typing indicators
- Read receipts

### 📱 Progressive Web App

- Install on any device (iOS, Android, Desktop)
- Works offline with cached messages
- Native app experience
- No address bar when installed
- Push notifications (coming soon)
- Home screen icon

### 🎨 User Experience

- Beautiful, modern UI with gradient themes
- Responsive design for all screen sizes
- Dark mode support (coming soon)
- Smooth animations
- Touch-optimized controls
- Emoji support

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Firebase account (free tier works)
- MEGA account (optional, for file storage)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/together-chat.git
cd together-chat
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. **Generate PWA icons**

```bash
# Open the favicon generator
npm run dev
# Navigate to http://localhost:3000
# Use the built-in favicon generator tool
# Download all icon sizes and place in public/ folder
```

5. **Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Deploy

### Build for Production

```bash
npm run build:prod
```

The optimized files will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🏗️ Project Structure

```
together-chat/
├── public/                  # Static assets
│   ├── pwa-*.png           # PWA icons
│   ├── favicon-*.png       # Favicons
│   ├── apple-touch-icon.png
│   ├── robots.txt
│   └── manifest.json
│
├── src/
│   ├── components/         # React components
│   │   ├── WelcomeScreen.jsx
│   │   ├── CodeSetupScreen.jsx
│   │   ├── ChatScreen.jsx
│   │   ├── ChatHeader.jsx
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   ├── MediaViewer.jsx
│   │   └── ErrorBoundary.jsx
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useEncryption.js
│   │   ├── useMessages.js
│   │   └── useFirestore.js
│   │
│   ├── utils/              # Utility functions
│   │   └── index.js
│   │
│   ├── constants/          # App constants
│   │   └── index.js
│   │
│   ├── encryption.js       # Encryption utilities
│   ├── firebase.js         # Firebase config
│   ├── config.js           # App config
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
│
├── .env.example            # Environment variables template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS config
├── package.json
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

---

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build
npm run build:prod  # with optimizations

# Preview production build
npm run preview

# Run linter
npm run lint
npm run lint:fix

# Run tests
npm run test
npm run test:ui

# Analyze bundle size
npm run analyze
```

### Code Quality

- **ESLint**: Enforces code style and catches errors
- **React Hooks Rules**: Ensures proper hook usage
- **Fast Refresh**: Instant feedback during development

### Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test -- --watch
```

---

## 🔐 Security

### Encryption Details

**Algorithm**: NaCl Box (Libsodium)

- **Key Exchange**: Curve25519 (ECDH)
- **Encryption**: XSalsa20 stream cipher
- **Authentication**: Poly1305 MAC

**Key Generation**:

- Code Method: PBKDF2-derived keys from shared passphrase

**Message Flow**:

1. Sender encrypts message with recipient's public key
2. Encrypted message + nonce sent to server
3. Recipient decrypts with their private key
4. Keys never leave the device

### Best Practices

- Never share your private keys
- Use strong passwords (12+ characters)
- Keep your app updated
- Clear data when switching devices
- Report security issues responsibly

---

## 📱 Installing as PWA

### Android (Chrome/Edge)

1. Open the app URL in Chrome
2. Tap menu (⋮) → "Install app"
3. Tap "Install" in the prompt
4. Find the app icon on your home screen
5. Tap the icon to open (no address bar!)

### iOS (Safari)

1. Open the app URL in Safari
2. Tap Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"
5. Find the app icon on your home screen
6. Tap the icon to open (no address bar!)

### Desktop (Chrome/Edge)

1. Open the app URL
2. Click install icon in address bar
3. Click "Install"
4. App opens in standalone window

---

## 🎨 Customization

### Theming

Edit `tailwind.config.js` to customize colors:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#ec4899", // Pink
        secondary: "#a855f7", // Purple
        accent: "#3b82f6", // Blue
      },
    },
  },
};
```

### Constants

Edit `src/constants/index.js` to customize:

```javascript
export const FILE_LIMITS = {
  MAX_SIZE: 100 * 1024 * 1024, // Change max file size
  ALLOWED_TYPES: [
    /* Add/remove file types */
  ],
};

export const FEATURES = {
  VOICE_MESSAGES: false, // Enable/disable features
  VIDEO_CALLS: false,
  GROUP_CHAT: false,
};
```

### Branding

Update app name and description:

- `package.json`: Change `name` field
- `index.html`: Update `<title>` and meta tags
- `vite.config.js`: Update PWA manifest
- `src/constants/index.js`: Update `APP_CONFIG`

---

## 🐛 Troubleshooting

### PWA Won't Install

**Issue**: "Add to Home Screen" not showing

**Solutions**:

- Ensure HTTPS is enabled
- Verify all PWA icons exist in `public/` folder
- Check service worker is registered (DevTools → Application)
- Clear browser cache and try again
- On iOS, use Safari (not Chrome)

### Messages Not Encrypting

**Issue**: "Encryption failed" error

**Solutions**:

- Ensure both users completed key exchange
- Check shared secret exists in localStorage
- Clear app data and reconnect
- Verify no browser extensions blocking crypto APIs

### Files Won't Upload

**Issue**: Upload fails or times out

**Solutions**:

- Check file size (max 100MB)
- Verify file type is allowed
- Check Firebase Storage rules
- Check internet connection
- Try smaller file first

### App Not Working Offline

**Issue**: App shows blank screen offline

**Solutions**:

- Check service worker is installed
- Verify PWA was installed properly
- Clear cache and reinstall
- Check browser console for errors

### Address Bar Still Shows

**Issue**: PWA shows browser UI

**Solutions**:

- Ensure you opened from home screen icon (not browser)
- Uninstall and reinstall the PWA
- Check manifest.json has `display: "standalone"`
- On iOS, add from Safari only

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Make your changes**
4. **Run tests and linter**
   ```bash
   npm run test
   npm run lint:fix
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
7. **Open a Pull Request**

### Code Style

- Use functional components with hooks
- Follow existing code structure
- Add comments for complex logic
- Write tests for new features
- Keep components small and focused
- Use meaningful variable names

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Examples**:

```bash
feat(chat): add message reactions
fix(encryption): resolve decryption error on iOS
docs(readme): update installation instructions
```

---

## 📊 Performance

### Lighthouse Scores

Target scores for production:

- **Performance**: 95+ ⚡
- **Accessibility**: 100 ♿
- **Best Practices**: 100 ✅
- **SEO**: 95+ 🔍
- **PWA**: Pass all audits 📱

### Bundle Size

Optimized production build:

- **Initial Load**: ~150KB (gzipped)
- **React Vendor**: ~45KB
- **Firebase**: ~35KB
- **Crypto**: ~25KB
- **App Code**: ~45KB

### Optimization Techniques

✅ Code splitting by route
✅ Tree shaking unused code
✅ Minification (Terser)
✅ Compression (Gzip + Brotli)
✅ Image optimization
✅ Service worker caching
✅ CDN delivery
✅ Lazy loading components

---

## 🔄 Updates & Versioning

### Semantic Versioning

We use [SemVer](https://semver.org/) for versioning:

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Update Strategy

**Automatic Updates**:

- Service worker updates automatically
- Users notified of new version
- Refresh to apply updates

**Manual Updates**:

```bash
git pull origin main
npm install
npm run build
# Deploy
```

### Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

✅ Commercial use
✅ Modification
✅ Distribution
✅ Private use

❌ Liability
❌ Warranty

---

## 🙏 Acknowledgments

### Built With

- [React](https://reactjs.org/) - UI framework
- [Vite](https://vitejs.dev/) - Build tool
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Firebase](https://firebase.google.com/) - Backend
- [TweetNaCl](https://tweetnacl.js.org/) - Encryption
- [Lucide Icons](https://lucide.dev/) - Icons
- [Workbox](https://developers.google.com/web/tools/workbox) - PWA

### Inspiration

- WhatsApp's E2E encryption
- Signal's security model
- Telegram's user experience
- Between app's couples focus

### Special Thanks

- Open source community
- Beta testers
- Early adopters
- Contributors

---

## 📞 Support

### Documentation

- [User Guide](docs/USER_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](DEPLOYMENT.md)

### Community

- [GitHub Discussions](https://github.com/yourusername/together-chat/discussions)
- [Discord Server](https://discord.gg/your-invite)
- [Twitter](https://twitter.com/togetherchat)

### Issues

Found a bug? [Report it here](https://github.com/yourusername/together-chat/issues/new?template=bug_report.md)

Want a feature? [Request it here](https://github.com/yourusername/together-chat/issues/new?template=feature_request.md)

### Security

Found a security vulnerability? **DO NOT** open a public issue.

Email: security@your-domain.com

We'll respond within 24 hours.

---

## 🗺️ Roadmap

### Version 1.1 (Q1 2024)

- [ ] Voice messages
- [ ] Message reactions
- [ ] Dark mode
- [ ] Custom themes
- [ ] Export chat history

### Version 1.2 (Q2 2024)

- [ ] Video messages
- [ ] Message editing
- [ ] Message deletion
- [ ] Search messages
- [ ] Link previews

### Version 2.0 (Q3 2024)

- [ ] Video calls
- [ ] Voice calls
- [ ] Screen sharing
- [ ] Group chat (max 4)
- [ ] Message scheduling

### Future Considerations

- Desktop apps (Electron)
- Browser extension
- Multi-device sync
- Cloud backup (encrypted)
- Premium features

---

## 📈 Analytics & Monitoring

### Privacy-First Analytics

If enabled, we collect:

- ✅ Page views
- ✅ Feature usage (anonymous)
- ✅ Error tracking
- ✅ Performance metrics

We **never** collect:

- ❌ Message content
- ❌ Personal information
- ❌ Encryption keys
- ❌ File contents

### Opt-Out

Users can disable analytics in settings.

---

## 💡 FAQ

**Q: Is this really end-to-end encrypted?**
A: Yes! Messages are encrypted on your device before being sent. Only you and your partner can decrypt them.

**Q: Can the server read my messages?**
A: No. The server only sees encrypted data and cannot decrypt it.

**Q: What if I lose my phone?**
A: Your encryption keys are stored on the device. If lost, you'll need to set up a new connection with your partner.

**Q: Can I use this for group chats?**
A: Currently, it's designed for 1-on-1 conversations. Group chat is on the roadmap.

**Q: Is it really free?**
A: Yes! The app is free and open source. Hosting costs are minimal with Firebase's free tier.

**Q: How is this different from WhatsApp?**
A: Similar encryption, but fully open source, no phone number required, and designed specifically for couples.

**Q: Can I self-host it?**
A: Yes! You can deploy it on your own infrastructure and use your own Firebase project.

**Q: Does it work offline?**
A: Yes! Once installed as a PWA, you can view cached messages offline. New messages require internet.

**Q: Is iOS supported?**
A: Yes! Install via Safari using "Add to Home Screen". Works great on iOS 15+.

**Q: Can I contribute?**
A: Absolutely! See the [Contributing](#-contributing) section.

---

## 📱 Screenshots

<div align="center">

### Welcome Screen

![Welcome Screen](docs/screenshots/welcome.png)

### Chat Interface

![Chat Interface](docs/screenshots/chat.png)

### Mobile PWA

![Mobile PWA](docs/screenshots/mobile.png)

</div>

---

## ⭐ Star History

If you find this project useful, please consider giving it a star!

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/together-chat&type=Date)](https://star-history.com/#yourusername/together-chat&Date)

---

## 🔗 Links

- **Website**: https://together-chat.com
- **Demo**: https://demo.together-chat.com
- **Docs**: https://docs.together-chat.com
- **GitHub**: https://github.com/yourusername/together-chat
- **NPM**: https://www.npmjs.com/package/together-chat

---

<div align="center">

**Made with 💕 for couples who value privacy**

[⬆ Back to Top](#-together---private-chat-for-couples)

</div>
