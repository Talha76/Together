import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import CodeSetupScreen from './components/CodeSetupScreen';
import ChatScreen from './components/ChatScreen';
import { useEncryption } from './hooks/useEncryption';
import { useMessages } from './hooks/useMessages';

export default function TogetherChat() {
  const [userName, setUserName] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  const [step, setStep] = useState('welcome');
  const [encryptionStatus, setEncryptionStatus] = useState('Not encrypted');

  // Use custom hooks
  const encryption = useEncryption();
  const { messages, addMessage } = useMessages(
    encryption.sharedSecret,
    encryption.encryptMessage,
    encryption.decryptMessage,
    encryption.encryptFile
  );

  // Load saved user data on mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('togetherUserName');
    
    if (savedUserName && encryption.isEncrypted) {
      setUserName(savedUserName);
      setStep('chat');
      setEncryptionStatus('🔒 E2E Encrypted');
    }
  }, [encryption.isEncrypted]);

  // Setup with shared code
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
    
    localStorage.setItem('togetherUserName', userName);
    localStorage.setItem('togetherMyKeys', JSON.stringify(result.keys));
    localStorage.setItem('togetherTheirPublicKey', result.keys.publicKey);
    localStorage.setItem('togetherSharedSecret', result.secret);
    localStorage.setItem('togetherKeyMethod', 'code');
    
    setStep('chat');
    setEncryptionStatus('🔒 E2E Encrypted');
  };

  // Handle disconnect
  const handleDisconnect = () => {
    if (confirm('Disconnect? Your encrypted messages will remain on this device.')) {
      encryption.clearEncryptionData();
      setStep('welcome');
      setUserName('');
      setSharedCode('');
      setEncryptionStatus('Not encrypted');
    }
  };

  // Handle send message
  const handleSendMessage = async (inputText, selectedFile) => {
    const result = await addMessage(userName, inputText, selectedFile);
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  // Render based on step
  if (step === 'welcome') {
    return <WelcomeScreen onGetStarted={() => setStep('code-setup')} />;
  }

  if (step === 'code-setup') {
    return (
      <CodeSetupScreen
        userName={userName}
        sharedCode={sharedCode}
        onUserNameChange={setUserName}
        onSharedCodeChange={setSharedCode}
        onConnect={handleSetupWithCode}
        onBack={() => setStep('welcome')}
      />
    );
  }

  // Chat Screen
  return (
    <ChatScreen
      userName={userName}
      encryptionStatus={encryptionStatus}
      keyExchangeMethod={encryption.keyExchangeMethod}
      messages={messages}
      sharedSecret={encryption.sharedSecret}
      decryptMessage={encryption.decryptMessage}
      decryptFile={encryption.decryptFile}
      onSendMessage={handleSendMessage}
      onDisconnect={handleDisconnect}
    />
  );
}
