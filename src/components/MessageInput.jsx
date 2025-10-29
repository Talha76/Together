// src/components/MessageInput.jsx - Unlimited File Upload Support
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader, Smile, AlertCircle } from 'lucide-react';
import { formatLargeFileSize, estimateUploadTime, checkMemoryAvailability } from '../utils/chunkedUpload';

const EMOJI_LIST = ['❤️', '😊', '😂', '👍', '🎉', '😍', '🥰', '😘', '💕', '✨', '🌟', '💖', '😎', '🔥', '💯', '🙏', '👏', '🎊', '💐', '🌹'];

export function MessageInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputHeight, setInputHeight] = useState('auto');
  const [fileWarning, setFileWarning] = useState(null);
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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // NO SIZE LIMIT - accept any file size
    setFileWarning(null);

    // Check memory availability for very large files
    const GB = 1024 * 1024 * 1024;
    if (file.size > 1 * GB) {
      const memoryCheck = await checkMemoryAvailability(file.size);
      if (memoryCheck.warning) {
        setFileWarning({
          type: 'warning',
          message: memoryCheck.warning,
          estimated: estimateUploadTime(file.size)
        });
      }
    }

    setSelectedFile(file);
    setShowEmojiPicker(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || disabled || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setShowEmojiPicker(false);

    try {
      await onSendMessage(message, selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setMessage('');
      setSelectedFile(null);
      setFileWarning(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Send failed:', error);
      alert('Failed to send message: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

  return (
    <div className="border-t border-gray-200 bg-white safe-area-bottom">
      {/* File Preview */}
      {selectedFile && (
        <div className="px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="rounded-xl bg-blue-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Paperclip className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatLargeFileSize(selectedFile.size)}
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

            {/* Large File Warning */}
            {fileWarning && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-yellow-800">
                    {fileWarning.message}
                  </p>
                  {fileWarning.estimated && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Estimated time: {fileWarning.estimated}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="px-3 pt-2 sm:px-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 text-xs sm:text-sm">
              {uploadProgress < 30 ? 'Encrypting...' : 
               uploadProgress < 99 ? 'Uploading...' : 
               'Finalizing...'}
            </span>
            <span className="font-medium text-blue-600 text-xs sm:text-sm">
              {uploadProgress}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {selectedFile && selectedFile.size > 100 * 1024 * 1024 && (
            <p className="text-xs text-gray-500 mt-1 text-center">
              Large file upload in progress... Please wait.
            </p>
          )}
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
          accept="*/*"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="rounded-full p-3 text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition touch-manipulation flex-shrink-0"
          title="Attach file (any size)"
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
