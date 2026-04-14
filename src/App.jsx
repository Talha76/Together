// src/App.jsx
import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import CodeSetupScreen from './components/CodeSetupScreen';
import ChatScreen from './components/ChatScreen';
import ToastContainer from './components/Toast';
import { useEncryption } from './hooks/useEncryption';
import { useMessages } from './hooks/useMessages';
import { useToast } from './hooks/useToast';
import { STORAGE_KEYS } from './constants';

export default function TogetherChat() {
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userIdentifier, setUserIdentifier] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  const [step, setStep] = useState('welcome');

  const { toasts, showToast, dismissToast } = useToast();
  const encryption = useEncryption();
  const {
    messages, addMessage, downloadFile, participantCount, roomError,
    partnerTyping, partnerStatus, setTypingStatus,
    addReaction, removeReaction, deleteMessage, userIdentifier: currentUserId,
    chatRoomId,
  } = useMessages(
    encryption.sharedSecret,
    encryption.encryptMessage,
    encryption.decryptMessage,
    userIdentifier
  );

  useEffect(() => {
    const savedUserName = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    const savedPhoneNumber = localStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
    const savedSharedCode = localStorage.getItem(STORAGE_KEYS.SHARED_CODE);

    if (savedUserName && savedPhoneNumber && savedSharedCode && encryption.isEncrypted) {
      setUserName(savedUserName);
      setPhoneNumber(savedPhoneNumber);
      setUserIdentifier(savedPhoneNumber);
      setSharedCode(savedSharedCode);
      setStep('chat');
    }
  }, [encryption.isEncrypted]);

  useEffect(() => {
    if (roomError && step === 'chat') {
      showToast(roomError, 'error', 5000);
      handleDisconnect();
    }
  }, [roomError, step]);

  const handleSetupWithCode = async () => {
    if (!userName.trim() || !phoneNumber.trim() || !sharedCode.trim()) {
      showToast('Please enter your name, phone number, and a shared code', 'error');
      return;
    }

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      showToast('Please enter a valid phone number (at least 7 digits)', 'error');
      return;
    }

    const result = await encryption.setupWithCode(sharedCode);

    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }

    localStorage.setItem(STORAGE_KEYS.USER_NAME, userName);
    localStorage.setItem(STORAGE_KEYS.PHONE_NUMBER, phoneNumber);
    localStorage.setItem(STORAGE_KEYS.SHARED_CODE, sharedCode);
    localStorage.setItem(STORAGE_KEYS.MY_KEYS, JSON.stringify(result.keys));
    localStorage.setItem(STORAGE_KEYS.THEIR_PUBLIC_KEY, result.keys.publicKey);
    localStorage.setItem(STORAGE_KEYS.SHARED_SECRET, result.secret);
    localStorage.setItem(STORAGE_KEYS.KEY_EXCHANGE_METHOD, 'code');

    setUserIdentifier(phoneNumber);
    setStep('chat');
  };

  const handleDisconnect = () => {
    encryption.clearEncryptionData();
    localStorage.removeItem(STORAGE_KEYS.PHONE_NUMBER);
    localStorage.removeItem(STORAGE_KEYS.SHARED_CODE);
    setStep('welcome');
    setUserName('');
    setPhoneNumber('');
    setUserIdentifier('');
    setSharedCode('');
  };

  const handleSendMessage = async (inputText, selectedFile, onProgress, abortSignal, replyToMessage = null) => {
    const result = await addMessage(userName, inputText, selectedFile, onProgress, abortSignal, replyToMessage);
    
    // Don't show alert for cancellations
    if (!result.success && !result.cancelled && result.error) {
      showToast(result.error, 'error');
    }
    
    return result;
  };

  const handleDownloadFile = async (fileMetadata, onProgress) => {
    try {
      await downloadFile(fileMetadata, onProgress);
    } catch (error) {
      showToast('Failed to download file: ' + error.message, 'error');
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {step === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setStep('code-setup')} />
      )}
      {step === 'code-setup' && (
        <CodeSetupScreen
          userName={userName}
          phoneNumber={phoneNumber}
          sharedCode={sharedCode}
          onUserNameChange={setUserName}
          onPhoneNumberChange={setPhoneNumber}
          onSharedCodeChange={setSharedCode}
          onConnect={handleSetupWithCode}
          onBack={() => setStep('welcome')}
        />
      )}
      {step === 'chat' && !roomError && (
        <ChatScreen
          userName={userName}
          encryptionStatus={encryption.isEncrypted ? '🔒 E2E Encrypted' : 'Not encrypted'}
          participantCount={participantCount}
          messages={messages}
          onSendMessage={handleSendMessage}
          onDownloadFile={handleDownloadFile}
          onDisconnect={handleDisconnect}
          showToast={showToast}
          partnerTyping={partnerTyping}
          partnerStatus={partnerStatus}
          onTypingChange={setTypingStatus}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          onDeleteMessage={deleteMessage}
          currentUserId={currentUserId}
          chatRoomId={chatRoomId}
        />
      )}
    </>
  );
}
