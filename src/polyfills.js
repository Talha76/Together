// Polyfills for React Native — must be first import
import { Buffer } from 'buffer';

// Global Buffer (needed by services)
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

// crypto.getRandomValues
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {};
}

if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
