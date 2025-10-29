// src/components/MessageList.jsx
import { Download, File, Loader, Image as ImageIcon, Video, Eye, Pause, Play } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { MediaViewer } from './MediaViewer';
import { decryptFileAsync } from '../encryption';

export function MessageList({ messages, onDownloadFile }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-400 px-4 text-center text-sm sm:text-base">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onDownloadFile={onDownloadFile}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, onDownloadFile }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [decryptedData, setDecryptedData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const downloadControllerRef = useRef(null);

  const isImage = message.file?.type?.startsWith('image/');
  const isVideo = message.file?.type?.startsWith('video/');
  const isMediaFile = isImage || isVideo;

  // Generate thumbnail for images (optional optimization)
  useEffect(() => {
    if (isImage && decryptedData && !thumbnailUrl) {
      try {
        const byteCharacters = atob(decryptedData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: message.file.type });
        const url = URL.createObjectURL(blob);
        setThumbnailUrl(url);
      } catch (e) {
        console.error('Failed to create thumbnail:', e);
      }
    }

    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [isImage, decryptedData, message.file?.type]);

  const handleDownload = async () => {
    if (downloading || !message.file) return;

    setDownloading(true);
    setDownloadProgress(0);
    setIsPaused(false);

    try {
      await onDownloadFile(message.file, (progress) => {
        setDownloadProgress(progress);
      });
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
      setIsPaused(false);
    }
  };

  const handleViewMedia = async () => {
    if (isLoadingPreview || !message.file) return;

    // If already decrypted, just show the viewer
    if (decryptedData) {
      setShowViewer(true);
      return;
    }

    // Create abort controller for this download
    const controller = new AbortController();
    downloadControllerRef.current = controller;

    setIsLoadingPreview(true);
    setDownloadProgress(0);
    setIsPaused(false);

    try {
      const { megaStorage } = await import('../megaStorage');
      
      const sharedSecret = localStorage.getItem('togetherSharedSecret');
      if (!sharedSecret) {
        throw new Error('No encryption key found');
      }

      console.log('📥 Downloading for preview:', message.file.name);

      const downloadResult = await megaStorage.downloadFile(
        message.file.megaLink,
        (progress) => {
          if (!downloadControllerRef.current?.signal.aborted) {
            setDownloadProgress(Math.round(progress * 0.5));
          }
        },
        controller.signal
      );

      // Check if cancelled
      if (controller.signal.aborted) {
        console.log('Preview download cancelled');
        return;
      }

      if (!downloadResult.success) {
        throw new Error('Download failed: ' + downloadResult.error);
      }

      const encryptedFileJSON = atob(downloadResult.data);
      const encryptedFile = JSON.parse(encryptedFileJSON);

      console.log('🔓 Decrypting for preview (async)...');
      
      // Use async decryption for non-blocking operation
      const allChunks = encryptedFile.isChunked && encryptedFile.chunks.length > 1
        ? encryptedFile.chunks.flatMap(chunk => chunk.chunks || [chunk])
        : (encryptedFile.chunks?.[0]?.chunks || [encryptedFile.chunks?.[0]] || [encryptedFile]);

      const decrypted = await decryptFileAsync(
        allChunks,
        sharedSecret,
        (progress) => {
          if (!downloadControllerRef.current?.signal.aborted) {
            setDownloadProgress(Math.round(50 + progress * 0.5));
          }
        }
      );

      // Check if cancelled after decryption
      if (controller.signal.aborted) {
        console.log('Preview cancelled after decryption');
        return;
      }

      setDecryptedData(decrypted);
      setShowViewer(true);
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'Download cancelled') {
        console.log('Preview download cancelled by user');
      } else {
        console.error('Preview failed:', error);
        alert('Failed to load preview: ' + error.message);
      }
    } finally {
      setIsLoadingPreview(false);
      setDownloadProgress(0);
      setIsPaused(false);
      downloadControllerRef.current = null;
    }
  };

  const handlePauseResume = () => {
    if (!downloadControllerRef.current) return;
    
    if (isPaused) {
      // Resume - restart the download
      setIsPaused(false);
      handleViewMedia();
    } else {
      // Pause - cancel the download
      setIsPaused(true);
      if (downloadControllerRef.current) {
        downloadControllerRef.current.abort();
        downloadControllerRef.current = null;
      }
      setIsLoadingPreview(false);
    }
  };

  const handleCancelPreview = () => {
    if (downloadControllerRef.current) {
      downloadControllerRef.current.abort();
      downloadControllerRef.current = null;
    }
    setIsLoadingPreview(false);
    setDownloadProgress(0);
    setIsPaused(false);
  };

  const handleDownloadFromViewer = async () => {
    if (!decryptedData || !message.file) return;

    try {
      const byteCharacters = atob(decryptedData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      const blob = new Blob([byteArray], { type: message.file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = message.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download from viewer failed:', error);
      alert('Failed to download file');
    }
  };

  return (
    <>
      <div className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 sm:px-4 sm:py-2 ${
            message.sender === 'You'
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-200 text-gray-900 rounded-bl-sm'
          }`}
        >
          {/* Text Content */}
          {message.text && message.text !== '📎 File' && (
            <p className="break-words text-sm sm:text-base leading-relaxed">{message.text}</p>
          )}

          {/* File Attachment */}
          {message.file && (
            <div className={`${message.text && message.text !== '📎 File' ? 'mt-2' : ''} rounded-xl bg-black/10 p-2.5 sm:p-3`}>
              {/* Thumbnail Preview for Images */}
              {thumbnailUrl && isImage && (
                <div className="mb-2 relative">
                  <img
                    src={thumbnailUrl}
                    alt={message.file.name}
                    className="w-full h-auto max-h-48 sm:max-h-64 object-cover rounded-lg cursor-pointer"
                    onClick={handleViewMedia}
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
                    <Eye className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : isVideo ? (
                    <Video className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <File className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs sm:text-sm font-medium">{message.file.name}</p>
                  <p className="text-[10px] sm:text-xs opacity-75">
                    {(message.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  {/* View Button for Images/Videos */}
                  {isMediaFile && !thumbnailUrl && (
                    <button
                      onClick={handleViewMedia}
                      disabled={isLoadingPreview}
                      className="rounded-lg p-1.5 sm:p-2 hover:bg-black/10 active:bg-black/20 disabled:opacity-50 transition touch-manipulation"
                      title="View"
                    >
                      {isLoadingPreview ? (
                        <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  )}

                  {/* Pause/Resume Button (only during preview loading) */}
                  {isLoadingPreview && (
                    <button
                      onClick={handlePauseResume}
                      className="rounded-lg p-1.5 sm:p-2 hover:bg-black/10 active:bg-black/20 transition touch-manipulation"
                      title={isPaused ? "Resume" : "Pause"}
                    >
                      {isPaused ? (
                        <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  )}

                  {/* Download Button */}
                  <button
                    onClick={handleDownload}
                    disabled={downloading || isLoadingPreview}
                    className="rounded-lg p-1.5 sm:p-2 hover:bg-black/10 active:bg-black/20 disabled:opacity-50 transition touch-manipulation"
                    title="Download"
                  >
                    {downloading ? (
                      <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {(downloading || isLoadingPreview) && downloadProgress > 0 && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] sm:text-xs">
                    <span>
                      {isPaused ? 'Paused' : (isLoadingPreview ? 'Loading preview...' : 'Downloading...')}
                    </span>
                    <span className="font-medium">{downloadProgress}%</span>
                  </div>
                  <div className="h-1 sm:h-1.5 overflow-hidden rounded-full bg-black/20">
                    <div
                      className="h-full bg-white/60 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  {isLoadingPreview && (
                    <button
                      onClick={handleCancelPreview}
                      className="mt-1 text-[10px] sm:text-xs opacity-75 hover:opacity-100 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <p className="mt-1 text-[10px] sm:text-xs opacity-75">{message.timestamp}</p>
        </div>
      </div>

      {/* Media Viewer Modal */}
      {showViewer && decryptedData && message.file && (
        <MediaViewer
          fileMetadata={message.file}
          decryptedData={decryptedData}
          onClose={() => setShowViewer(false)}
          onDownload={handleDownloadFromViewer}
        />
      )}
    </>
  );
}
