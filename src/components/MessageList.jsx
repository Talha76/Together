// src/components/MessageList.jsx
import { Download, File, Loader } from 'lucide-react';
import { useState } from 'react';

export function MessageList({ messages, onDownloadFile }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-400">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onDownloadFile={onDownloadFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, onDownloadFile }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    if (downloading || !message.file) return;

    setDownloading(true);
    setDownloadProgress(0);

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
    }
  };

  return (
    <div className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          message.sender === 'You'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        {/* Text Content */}
        {message.text && <p className="break-words">{message.text}</p>}

        {/* File Attachment */}
        {message.file && (
          <div className="mt-2 rounded-lg bg-black/10 p-3">
            <div className="flex items-center gap-3">
              <File className="h-6 w-6" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{message.file.name}</p>
                <p className="text-xs opacity-75">
                  {(message.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-lg p-2 hover:bg-black/10 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Download Progress */}
            {downloading && downloadProgress > 0 && (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>Downloading...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full bg-white/50 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-xs opacity-75">{message.timestamp}</p>
      </div>
    </div>
  );
}
