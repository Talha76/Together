import React, { useRef, useEffect } from 'react';
import { Shield, Lock } from 'lucide-react';

export default function MessageList({ 
  messages, 
  userName, 
  keyExchangeMethod,
  decryptMessageForDisplay,
  decryptFileForDisplay 
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-400 mt-20">
        <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">Secure encrypted chat active!</p>
        <div className="text-xs bg-white p-4 rounded-xl inline-block text-left space-y-1">
          <p><strong>Method:</strong> {keyExchangeMethod === 'qr' ? '🔐 QR Code' : '🔑 Shared Code'}</p>
          <p><strong>Cipher:</strong> XSalsa20-Poly1305</p>
          <p><strong>Key Exchange:</strong> X25519</p>
          <p className="text-green-600 mt-2">✓ All messages encrypted on device</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, index) => {
        const isCurrentUser = msg.sender === userName;
        const showDate = index === 0 || messages[index - 1].date !== msg.date;
        const displayText = msg.encrypted ? decryptMessageForDisplay(msg) : msg.text;

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="text-center my-4">
                <span className="bg-white px-4 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                  {msg.date}
                </span>
              </div>
            )}
            <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-xs lg:max-w-md">
                <div className={`rounded-2xl px-4 py-3 ${
                  isCurrentUser 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' 
                    : 'bg-white text-gray-800 shadow-md'
                }`}>
                  <p className="text-sm font-medium mb-1 opacity-90">{msg.sender}</p>
                  
                  {msg.file && (
                    <div className="mb-2">
                      {msg.file.type.startsWith('image/') && msg.file.data ? (
                        <img 
                          src={decryptFileForDisplay(msg.file)} 
                          alt={msg.file.name}
                          className="rounded-lg max-w-full"
                        />
                      ) : (
                        <div className="text-xs opacity-75">
                          📎 {msg.file.name} {msg.file.localOnly && '(Local)'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {displayText && <p className="break-words">{displayText}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-xs ${isCurrentUser ? 'text-pink-100' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                    <div className="flex items-center gap-1">
                      {msg.encrypted && <Lock className="w-3 h-3" />}
                      {!msg.synced && <span className="text-xs">📱</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </>
  );
}
