import React, { useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

export default function MessageInput({ 
  inputText,
  selectedFile,
  previewUrl,
  onInputChange,
  onFileSelect,
  onRemoveFile,
  onSendMessage
}) {
  const fileInputRef = useRef(null);
  
  const emojis = ['❤️', '😘', '🥰', '😍', '💕', '💖', '🌹', '✨'];

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const addEmoji = (emoji) => {
    onInputChange(inputText + emoji);
  };

  return (
    <div className="bg-white border-t shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {selectedFile && (
          <div className="mb-3 p-3 bg-pink-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 bg-pink-100 rounded flex items-center justify-center">
                  📄
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Will be encrypted
                </p>
              </div>
            </div>
            <button
              onClick={onRemoveFile}
              className="text-gray-500 hover:text-red-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => addEmoji(emoji)}
              className="text-2xl hover:scale-125 transition-transform flex-shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-pink-100 text-pink-600 p-3 rounded-xl hover:bg-pink-200 transition"
            title="Attach file (will be encrypted)"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type encrypted message..."
            className="flex-1 px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-400"
          />
          <button
            onClick={onSendMessage}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-3 rounded-xl hover:from-pink-600 hover:to-purple-600 transition"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
