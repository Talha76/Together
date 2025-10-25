import React from 'react';
import { Heart, Shield } from 'lucide-react';

export default function ChatHeader({ userName, encryptionStatus, onDisconnect }) {
  return (
    <div className="bg-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-500" fill="currentColor" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Together</h2>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Shield className="w-3 h-3 text-green-600" />
                <span>{encryptionStatus}</span>
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Local only</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-pink-50 px-4 py-2 rounded-full">
              {userName}
            </div>
            <button
              onClick={onDisconnect}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
