// src/components/WelcomeScreen.jsx
import { Heart, Lock, Shield } from 'lucide-react';

export default function WelcomeScreen({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Heart className="w-20 h-20 text-pink-500 mx-auto mb-4 animate-pulse" fill="currentColor" />
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Together</h1>
          <p className="text-gray-600 mb-2">Private chat for couples</p>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full inline-flex">
            <Shield className="w-4 h-4" />
            <span>End-to-end encrypted with TweetNaCl</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-pink-50 p-4 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Military-grade encryption:
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ XSalsa20-Poly1305 cipher</li>
              <li>✓ X25519 key exchange</li>
              <li>✓ Perfect Forward Secrecy</li>
              <li>✓ Zero-knowledge architecture</li>
            </ul>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-2">✨ Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Messages encrypted before leaving device</li>
              <li>• Photos encrypted in cloud</li>
              <li>• Videos stored locally (encrypted)</li>
              <li>• No one can read your messages</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
