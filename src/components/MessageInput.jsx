// src/components/MessageInput.jsx
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader, Smile, Check } from 'lucide-react';
import { FILE_LIMITS, UI_MESSAGES, STORAGE_KEYS } from '../constants';
import { isCompressibleMedia } from '../mediaCompression';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😊', '😂', '🤣', '🥲', '😍', '🥰', '😘', '😗', '😙', '😚', '🤗', '🤩', '🥳', '😎', '🤓', '😏', '😌', '😴', '🤤', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤭', '🫢', '🤫', '🤔', '🫡', '🤐', '😶', '😑', '😬', '🙄', '😮‍💨', '🤥', '😇', '🥺', '🥹', '😢', '😭', '😤', '😠', '🤯', '😱', '🥶', '🥵', '😈'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💔', '❤️‍🔥', '❤️‍🩹', '🫶'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '👋', '🫵', '💪', '🫰'],
  'Objects': ['🎉', '🎊', '🎁', '🎈', '✨', '🌟', '⭐', '🔥', '💯', '💐', '🌹', '🌻', '🌺', '🍕', '🍔', '☕', '🍷', '🍺', '🎵', '🎶', '💎', '🏆', '🎯', '📱', '💻', '📷', '🎮', '⚽', '🏀'],
};

const STORAGE_KEY = STORAGE_KEYS.RECENT_EMOJIS;

export function MessageInput({ onSendMessage, showToast, onTypingChange, replyingTo, onCancelReply }) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [stageProgress, setStageProgress] = useState({});
  const [activeStage, setActiveStage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [emojiCategory, setEmojiCategory] = useState(() => {
    try {
      const recent = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return recent?.length > 0 ? 'Recent' : 'Smileys';
    } catch { return 'Smileys'; }
  });
  const [inputHeight, setInputHeight] = useState('auto');
  const [uploadController, setUploadController] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = newHeight + 'px';
      setInputHeight(newHeight + 'px');
    }
  }, [message]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > FILE_LIMITS.MAX_SIZE) {
        showToast?.(UI_MESSAGES.ERRORS.FILE_TOO_LARGE, 'error');
        return;
      }
      setSelectedFile(file);
      setShowEmojiPicker(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
      setIsUploading(false);
      setStageProgress({});
      setActiveStage(null);
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || isUploading) return;

    // Clear typing status
    clearTimeout(typingTimeoutRef.current);
    onTypingChange?.(false);

    const controller = new AbortController();
    setUploadController(controller);
    setIsUploading(true);
    setStageProgress({});
    setActiveStage(null);
    setShowEmojiPicker(false);

    try {
      const result = await onSendMessage(message, selectedFile, (progress) => {
        if (progress && typeof progress === 'object' && progress.stage) {
          setActiveStage(progress.stage);
          setStageProgress(prev => ({ ...prev, [progress.stage]: progress.progress }));
        }
      }, controller.signal, replyingTo);

      if (result?.cancelled) {
        return;
      }

      setMessage('');
      setSelectedFile(null);
      onCancelReply?.();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
      } else {
        showToast?.('Failed to send message', 'error');
      }
    } finally {
      setIsUploading(false);
      setStageProgress({});
      setActiveStage(null);
      setUploadController(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
    // Update recent emojis
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 20);
    setRecentEmojis(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="border-t border-gray-200 bg-white safe-area-bottom">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="flex items-center justify-between bg-gray-50 border-l-4 border-blue-500 rounded-r-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-600">{replyingTo.sender}</p>
              <p className="text-xs text-gray-500 truncate">{replyingTo.text}</p>
            </div>
            <button
              onClick={onCancelReply}
              className="flex-shrink-0 p-1 ml-2 rounded-full hover:bg-gray-200 transition"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Paperclip className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              disabled={isUploading}
              className="rounded-full p-1.5 hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 touch-manipulation flex-shrink-0 ml-2"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress — per-stage bars */}
      {isUploading && activeStage && (
        <div className="px-3 pt-2 sm:px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs sm:text-sm font-medium">Sending file...</span>
            <button
              onClick={handleCancelUpload}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium touch-manipulation"
            >
              Cancel
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {(selectedFile && isCompressibleMedia(selectedFile)
              ? ['compressing', 'encrypting', 'uploading']
              : ['encrypting', 'uploading']
            ).map((stage) => {
              const progress = stageProgress[stage] || 0;
              const isActive = activeStage === stage;
              const isComplete = progress >= 100;
              const isPending = !isActive && !isComplete && progress === 0;
              const label = stage.charAt(0).toUpperCase() + stage.slice(1);

              return (
                <div key={stage} className={`transition-opacity ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      {isComplete && (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      )}
                      {isActive && !isComplete && (
                        <Loader className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                      )}
                      <span className={`text-xs font-medium ${
                        isComplete ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {label}
                      </span>
                    </div>
                    {(isActive || isComplete) && (
                      <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                        {progress}%
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isComplete ? 'bg-green-500' : isActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            {/* Category tabs */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {(recentEmojis.length > 0 ? ['Recent'] : []).concat(Object.keys(EMOJI_CATEGORIES)).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEmojiCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                    emojiCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Emoji grid */}
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-48 overflow-y-auto">
              {(emojiCategory === 'Recent' ? recentEmojis : EMOJI_CATEGORIES[emojiCategory] || []).map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-xl hover:bg-gray-200 active:bg-gray-300 rounded-lg p-1 transition touch-manipulation aspect-square flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 p-3 sm:p-4 items-end">
        {/* File Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
          accept="*/*"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-full p-3 text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition touch-manipulation flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isUploading}
          className={`rounded-full p-3 text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition touch-manipulation flex-shrink-0 ${
            showEmojiPicker ? 'bg-gray-200' : ''
          }`}
          title="Add emoji"
        >
          <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (onTypingChange && e.target.value.trim()) {
                onTypingChange(true);
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => onTypingChange(false), 2000);
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder={isUploading ? "Uploading..." : "Message..."}
            disabled={isUploading}
            rows={1}
            className="w-full resize-none rounded-2xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:opacity-50 text-base"
            style={{ 
              minHeight: '48px',
              maxHeight: '120px',
              height: inputHeight
            }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isUploading || (!message.trim() && !selectedFile)}
          className="rounded-full bg-blue-600 p-3 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:bg-gray-400 transition touch-manipulation flex-shrink-0"
          title="Send"
        >
          {isUploading ? (
            <Loader className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          ) : (
            <Send className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>
      </div>
    </div>
  );
}
