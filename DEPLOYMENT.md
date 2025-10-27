# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required environment variables
- [ ] Set `NODE_ENV=production` for production builds
- [ ] Configure Firebase project with production credentials
- [ ] Set up MEGA storage (if using)

### 2. Code Quality

- [ ] Run `npm run lint` and fix all issues
- [ ] Run `npm run test` and ensure all tests pass
- [ ] Remove all `console.log` statements (will be auto-removed in production)
- [ ] Review and update version in `package.json`
- [ ] Update `CHANGELOG.md` with new features

### 3. PWA Assets

- [ ] Generate all required favicon sizes using the favicon generator
- [ ] Place icons in `public/` folder with correct names:
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `apple-touch-icon.png` (180x180)
  - `pwa-192x192.png`
  - `pwa-512x512.png`
- [ ] Create `public/robots.txt`
- [ ] Add splash screens for iOS (optional)

### 4. Security

- [ ] Ensure HTTPS is enabled on hosting platform
- [ ] Review Firebase security rules
- [ ] Set proper CORS headers
- [ ] Enable rate limiting if available
- [ ] Review Content Security Policy

### 5. Performance

- [ ] Run Lighthouse audit and aim for 90+ score
- [ ] Optimize images (use WebP format)
- [ ] Enable Brotli/Gzip compression
- [ ] Set proper cache headers
- [ ] Test on slow 3G connection

---

## Build Process

### Development Build

```bash
npm run dev
```

### Production Build

```bash
# Clean previous build
rm -rf dist

# Build for production
npm run build:prod

# Preview production build locally
npm run preview
```

### Build Output

After building, verify these files exist in `dist/`:

- `index.html`
- `assets/` (JS, CSS, images)
- `sw.js` (service worker)
- `manifest.webmanifest`
- All PWA icons
- `robots.txt`

### Build Analysis

```bash
npm run analyze
```

This will show you the bundle size breakdown.

---

## Deployment Platforms

### Option 1: Vercel (Recommended)

**Pros:** Free tier, automatic HTTPS, CDN, easy deployments

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**vercel.json Configuration:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Option 2: Netlify

**Pros:** Free tier, automatic HTTPS, serverless functions support

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

**netlify.toml Configuration:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Option 3: Firebase Hosting

**Pros:** Integrated with Firebase services, global CDN

```bash
# Install Firebase CLI
npm i -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy --only hosting
```

**firebase.json Configuration:**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      },
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Option 4: GitHub Pages

**Pros:** Free, simple

```bash
# Install gh-pages
npm i -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

**Update vite.config.js for GitHub Pages:**

```javascript
export default defineConfig({
  base: "/your-repo-name/", // Important!
  // ... rest of config
});
```

---

## Post-Deployment

### 1. Verification

- [ ] Visit deployed URL
- [ ] Test PWA installation on mobile (Android & iOS)
- [ ] Verify service worker is registered (DevTools → Application)
- [ ] Test offline functionality
- [ ] Check all pages and features work
- [ ] Test file upload/download
- [ ] Test encryption/decryption
- [ ] Verify HTTPS is working

### 2. Performance Testing

```bash
# Run Lighthouse audit
lighthouse https://your-domain.com --view

# Or use PageSpeed Insights
# https://pagespeed.web.dev/
```

**Target Scores:**

- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 90+
- PWA: Pass all audits

### 3. Mobile Testing

- [ ] Test on actual iOS device (Safari)
- [ ] Test on actual Android device (Chrome)
- [ ] Verify PWA installs correctly
- [ ] Test in landscape and portrait
- [ ] Verify no address bar in installed PWA
- [ ] Test push notifications (if enabled)
- [ ] Test file sharing

### 4. Browser Testing

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 5. Security Testing

- [ ] Run security audit: `npm audit`
- [ ] Check for XSS vulnerabilities
- [ ] Verify HTTPS is enforced
- [ ] Test CSP headers
- [ ] Review Firebase security rules

---

## Monitoring & Maintenance

### Analytics (Optional)

If you add analytics:

**Google Analytics:**

```javascript
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Error Tracking (Optional)

**Sentry Integration:**

```bash
npm install @sentry/react
```

```javascript
// In main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### Uptime Monitoring

Use free services:

- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- StatusCake: https://www.statuscake.com

### Performance Monitoring

- Firebase Performance Monitoring
- Google Lighthouse CI
- WebPageTest: https://www.webpagetest.org

---

## Rollback Plan

If deployment fails:

### Quick Rollback (Vercel)

```bash
vercel rollback
```

### Quick Rollback (Netlify)

Use Netlify dashboard → Deploys → Roll back

### Quick Rollback (Firebase)

```bash
firebase hosting:rollback
```

### Manual Rollback

```bash
# Revert to previous commit
git revert HEAD

# Rebuild and redeploy
npm run build
# Deploy using your chosen method
```

---

## Updating the App

### Regular Updates

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install new dependencies
npm install

# 3. Run tests
npm run test

# 4. Build
npm run build

# 5. Deploy
# Use your deployment method
```

### Security Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Rebuild and redeploy
npm run build
```

---

## Domain Setup (Optional)

### Custom Domain on Vercel

1. Go to project settings → Domains
2. Add your custom domain
3. Configure DNS records as shown
4. Wait for SSL certificate (automatic)

### Custom Domain on Netlify

1. Go to Domain settings
2. Add custom domain
3. Configure DNS records
4. SSL is automatic

### DNS Configuration Example

```
Type    Name    Value
A       @       192.0.2.1
CNAME   www     your-app.netlify.app
```

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### PWA Not Installing

- Check manifest.webmanifest is accessible
- Verify all icons exist
- Ensure HTTPS is enabled
- Check service worker is registered
- Clear browser cache and try again

### Slow Load Times

- Enable compression (Gzip/Brotli)
- Optimize images
- Check bundle size with `npm run analyze`
- Use CDN
- Enable caching headers

### Service Worker Issues

```bash
# In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister())
})

# Then reload and reinstall
```

---

## Support & Resources

- **Vite Docs:** <https://vitejs.dev>
- **React Docs:** <https://react.dev>
- **PWA Docs:** <https://web.dev/progressive-web-apps/>
- **Firebase Docs:** <https://firebase.google.com/docs>
- **Netlify Docs:** <https://docs.netlify.com>

---

## Changelog

Keep track of changes in `CHANGELOG.md`:

```markdown
# Changelog

## [1.0.0] - 2024-01-15

### Added

- Initial production release
- End-to-end encryption
- File sharing
- PWA support

### Fixed

- Mobile responsiveness issues

### Security

- Updated dependencies
```

---

**Remember:** Always test thoroughly before deploying to production!
