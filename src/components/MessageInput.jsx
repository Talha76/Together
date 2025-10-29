// src/components/MessageInput.jsx
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader, Smile } from 'lucide-react';
import { FILE_LIMITS, UI_MESSAGES } from '../constants';

const EMOJI_LIST = ['❤️', '😊', '😂', '👍', '🎉', '😍', '🥰', '😘', '💕', '✨', '🌟', '💖', '😎', '🔥', '💯', '🙏', '👏', '🎊', '💐', '🌹'];

export function MessageInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputHeight, setInputHeight] = useState('auto');
  const [uploadController, setUploadController] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

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
        alert(UI_MESSAGES.ERRORS.FILE_TOO_LARGE);
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
      setUploadProgress(0);
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || disabled || isUploading) return;

    const controller = new AbortController();
    setUploadController(controller);
    setIsUploading(true);
    setUploadProgress(0);
    setShowEmojiPicker(false);

    try {
      const result = await onSendMessage(message, selectedFile, (progress) => {
        setUploadProgress(progress);
      }, controller.signal);

      if (result?.cancelled) {
        console.log('Upload cancelled by user');
        return;
      }

      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
        console.log('Upload cancelled');
      } else {
        console.error('Send failed:', error);
        alert('Failed to send message');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
    setShowEmojiPicker(false);
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

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="px-3 pt-2 sm:px-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 text-xs sm:text-sm">Uploading...</span>
            <div className="flex items-center gap-3">
              <span className="font-medium text-blue-600 text-xs sm:text-sm">{uploadProgress}%</span>
              <button
                onClick={handleCancelUpload}
                className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="grid grid-cols-10 gap-2">
              {EMOJI_LIST.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="text-2xl hover:bg-gray-200 active:bg-gray-300 rounded-lg p-1 transition touch-manipulation"
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
          accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="rounded-full p-3 text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition touch-manipulation flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled || isUploading}
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
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isUploading ? "Uploading..." : "Message..."}
            disabled={disabled || isUploading}
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
          disabled={disabled || isUploading || (!message.trim() && !selectedFile)}
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
