import React, { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatScreen({ 
  userName, 
  encryptionStatus,
  keyExchangeMethod,
  messages,
  sharedSecret,
  decryptMessage,
  decryptFile,
  onSendMessage,
  onDisconnect 
}) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      
      if (file.size > maxSize) {
        alert('File size should be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSendMessage = async () => {
    await onSendMessage(inputText, selectedFile);
    setInputText('');
    removeFile();
  };

  // Decrypt message for display
  const decryptMessageForDisplay = (msg) => {
    if (!msg.encrypted || !sharedSecret) return msg.text;
    
    try {
      const decrypted = decryptMessage(
        { ciphertext: msg.text, nonce: msg.nonce }
      );
      return decrypted || '[Decryption failed]';
    } catch {
      return '[Decryption failed]';
    }
  };

  // Decrypt file for display
  const decryptFileForDisplay = (file) => {
    if (!file.encrypted || !sharedSecret) return file.data;
    
    try {
      const decrypted = decryptFile(
        { ciphertext: file.data, nonce: file.nonce }
      );
      return 'data:' + file.type + ';base64,' + decrypted;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex flex-col">
      <ChatHeader 
        userName={userName}
        encryptionStatus={encryptionStatus}
        onDisconnect={onDisconnect}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl w-full mx-auto">
        <MessageList 
          messages={messages}
          userName={userName}
          keyExchangeMethod={keyExchangeMethod}
          decryptMessageForDisplay={decryptMessageForDisplay}
          decryptFileForDisplay={decryptFileForDisplay}
        />
      </div>

      {/* Input Area */}
      <MessageInput 
        inputText={inputText}
        selectedFile={selectedFile}
        previewUrl={previewUrl}
        onInputChange={setInputText}
        onFileSelect={handleFileSelect}
        onRemoveFile={removeFile}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
