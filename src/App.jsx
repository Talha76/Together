// src/App.jsx
import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import CodeSetupScreen from './components/CodeSetupScreen';
import ChatScreen from './components/ChatScreen';
import { useEncryption } from './hooks/useEncryption';
import { useMessages } from './hooks/useMessages';
import { megaConfig } from './config';
import { generateUserIdentifier } from './userIdentifier';

export default function TogetherChat() {
  const [userName, setUserName] = useState('');
  const [userIdentifier, setUserIdentifier] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  const [step, setStep] = useState('welcome');
  const [encryptionStatus, setEncryptionStatus] = useState('Not encrypted');

  const encryption = useEncryption();
  const { messages, addMessage, downloadFile, participantCount, roomError } = useMessages(
    encryption.sharedSecret,
    encryption.encryptMessage,
    encryption.decryptMessage,
    userIdentifier
  );

  useEffect(() => {
    const savedUserName = localStorage.getItem('togetherUserName');
    const savedUserIdentifier = localStorage.getItem('togetherUserIdentifier');
    const savedSharedCode = localStorage.getItem('togetherSharedCode');
    
    if (savedUserName && savedUserIdentifier && savedSharedCode && encryption.isEncrypted) {
      setUserName(savedUserName);
      setUserIdentifier(savedUserIdentifier);
      setSharedCode(savedSharedCode);
      setStep('chat');
      setEncryptionStatus('🔒 E2E Encrypted');
    }
  }, [encryption.isEncrypted]);

  useEffect(() => {
    if (roomError && step === 'chat') {
      alert(roomError + '\n\nYou will be disconnected.');
      handleDisconnect();
    }
  }, [roomError, step]);

  const handleSetupWithCode = async () => {
    if (!userName.trim() || !sharedCode.trim()) {
      alert('Please enter your name and a shared code');
      return;
    }
    
    const result = await encryption.setupWithCode(sharedCode);
    
    if (!result.success) {
      alert(result.error);
      return;
    }
    
    // Generate unique user identifier from name + code hash
    const identifier = await generateUserIdentifier(userName, sharedCode);
    
    localStorage.setItem('togetherUserName', userName);
    localStorage.setItem('togetherUserIdentifier', identifier);
    localStorage.setItem('togetherSharedCode', sharedCode);
    localStorage.setItem('togetherMyKeys', JSON.stringify(result.keys));
    localStorage.setItem('togetherTheirPublicKey', result.keys.publicKey);
    localStorage.setItem('togetherSharedSecret', result.secret);
    localStorage.setItem('togetherKeyMethod', 'code');
    
    setUserIdentifier(identifier);
    setStep('chat');
    setEncryptionStatus('🔒 E2E Encrypted');
  };

  const handleDisconnect = () => {
    encryption.clearEncryptionData();
    localStorage.removeItem('togetherUserIdentifier');
    localStorage.removeItem('togetherSharedCode');
    setStep('welcome');
    setUserName('');
    setUserIdentifier('');
    setSharedCode('');
    setEncryptionStatus('Not encrypted');
  };

  const handleSendMessage = async (inputText, selectedFile, onProgress, abortSignal) => {
    const result = await addMessage(userName, inputText, selectedFile, onProgress, abortSignal);
    
    // Don't show alert for cancellations
    if (!result.success && !result.cancelled && result.error) {
      alert(result.error);
    }
    
    return result;
  };

  const handleDownloadFile = async (fileMetadata, onProgress) => {
    try {
      await downloadFile(fileMetadata, onProgress);
    } catch (error) {
      alert('Failed to download file: ' + error.message);
    }
  };

  if (roomError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Room Full</h2>
          <p className="text-gray-600 mb-6">{roomError}</p>
          <button
            onClick={handleDisconnect}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <input type="hidden" id="mega-password" value={megaConfig.password} />
      {step === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setStep('code-setup')} />
      )}
      {step === 'code-setup' && (
        <CodeSetupScreen
          userName={userName}
          sharedCode={sharedCode}
          onUserNameChange={setUserName}
          onSharedCodeChange={setSharedCode}
          onConnect={handleSetupWithCode}
          onBack={() => setStep('welcome')}
        />
      )}
      {step === 'chat' && !roomError && (
        <ChatScreen
          userName={userName}
          encryptionStatus={encryptionStatus}
          participantCount={participantCount}
          messages={messages}
          onSendMessage={handleSendMessage}
          onDownloadFile={handleDownloadFile}
          onDisconnect={handleDisconnect}
        />
      )}
    </>
  );
}
