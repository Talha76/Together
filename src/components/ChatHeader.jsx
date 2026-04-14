// src/components/ChatHeader.jsx
import { useState } from 'react';
import { Heart, Shield, LogOut, Search, X } from 'lucide-react';

function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChatHeader({ userName, encryptionStatus, partnerStatus, onDisconnect, searchQuery, onSearchChange, chatRoomId }) {
  const [showSearch, setShowSearch] = useState(false);

  const getStatusDisplay = () => {
    if (!partnerStatus?.userName) {
      return <span className="text-gray-400">Waiting for partner...</span>;
    }
    if (partnerStatus.isOnline) {
      return (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
          <span>{partnerStatus.userName} &middot; Online</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
        <span>{partnerStatus.userName} &middot; Last seen {getRelativeTime(partnerStatus.lastSeen)}</span>
      </span>
    );
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {showSearch ? (
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search messages..."
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
            />
            <button
              onClick={() => { setShowSearch(false); onSearchChange(''); }}
              className="p-1.5 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-7 h-7 text-pink-500" fill="currentColor" />
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">Together</h2>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-600" />
                    {encryptionStatus}
                  </span>
                  <span className="text-gray-300">|</span>
                  {getStatusDisplay()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(true)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
                title="Search messages"
              >
                <Search className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 bg-pink-50 px-3 py-1.5 rounded-full hidden sm:inline">
                {userName}
              </span>
              <button
                onClick={onDisconnect}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
