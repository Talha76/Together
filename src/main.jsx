import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch(() => {});
  });
}

// Disable console logs in production
if (!import.meta.env.DEV) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

// Prevent zoom on iOS double tap
document.addEventListener('dblclick', (e) => {
  e.preventDefault();
}, { passive: false });

// Prevent pinch zoom on iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Render app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
