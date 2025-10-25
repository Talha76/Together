import React, { useState, useEffect } from 'react';
import * as encryptionUtils from './encryption';
import QRScanner from './components/QRScanner.bak';
import WelcomeScreen from './components/WelcomeScreen';
import ChooseMethodScreen from './components/ChooseMethodScreen';
import QRSetupScreen from './components/QRSetupScreen';
import CodeSetupScreen from './components/CodeSetupScreen';
import ChatScreen from './components/ChatScreen';
import { useEncryption } from './hooks/useEncryption';
import { useMessages } from './hooks/useMessages';

export default function TogetherChat() {
  const [userName, setUserName] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  const [step, setStep] = useState('welcome');
  const [showQRScanner, setShowQRScanner] = useState(false);
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

  // Setup with QR - Generate
  const handleSetupWithQRGenerate = () => {
    if (!userName.trim()) {
      alert('Please enter your name first');
      return;
    }
    
    const keys = encryption.generateQRKeys();
    localStorage.setItem('togetherUserName', userName);
    localStorage.setItem('togetherMyKeys', JSON.stringify(keys));
    localStorage.setItem('togetherKeyMethod', 'qr');
    
    setStep('qr-waiting');
  };

  // Setup with QR - Scan
  const handleSetupWithQRScan = () => {
    if (!userName.trim()) {
      alert('Please enter your name first');
      return;
    }
    
    // Generate my keys first
    const keys = encryptionUtils.generateKeyPair();
    encryption.setMyKeys(keys);
    
    // Show QR scanner
    setShowQRScanner(true);
  };

  // Handle successful QR scan
  const handleQRScanSuccess = (scannedText) => {
    const parsed = encryptionUtils.parseQRData(scannedText);
    
    if (!parsed) {
      alert('Invalid QR code format');
      setShowQRScanner(false);
      return;
    }
    
    encryption.setTheirPublicKey(parsed.pk);
    
    // Generate shared secret
    const secret = encryptionUtils.generateSharedSecret(encryption.myKeys.secretKey, parsed.pk);
    encryption.setSharedSecret(secret);
    
    // Save keys
    localStorage.setItem('togetherUserName', userName);
    localStorage.setItem('togetherMyKeys', JSON.stringify(encryption.myKeys));
    localStorage.setItem('togetherTheirPublicKey', parsed.pk);
    localStorage.setItem('togetherSharedSecret', secret);
    localStorage.setItem('togetherKeyMethod', 'qr');
    
    encryption.setKeyExchangeMethod('qr');
    setShowQRScanner(false);
    
    // Now show MY QR code for them to scan
    const myQrData = encryptionUtils.generateQRData(encryption.myKeys.publicKey);
    encryption.setQrCodeData(myQrData);
    setStep('qr-show-mine');
  };

  // Handle waiting screen scanner open
  const handleWaitingScreenOpenScanner = () => {
    setShowQRScanner(true);
  };

  // Complete QR setup
  const handleCompleteQRSetup = () => {
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

  // Render QR Scanner Modal (if active)
  const renderQRScannerModal = () => {
    if (!showQRScanner) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <QRScanner
          onScan={handleQRScanSuccess}
          onClose={() => setShowQRScanner(false)}
        />
      </div>
    );
  };

  // Render based on step
  if (step === 'welcome') {
    return (
      <>
        {renderQRScannerModal()}
        <WelcomeScreen onGetStarted={() => setStep('choose-method')} />
      </>
    );
  }

  if (step === 'choose-method') {
    return (
      <>
        {renderQRScannerModal()}
        <ChooseMethodScreen
          onSelectMethod={(method) => {
            encryption.setKeyExchangeMethod(method);
            setStep(method === 'qr' ? 'qr-setup' : 'code-setup');
          }}
          onBack={() => setStep('welcome')}
        />
      </>
    );
  }

  if (step === 'qr-setup' || step === 'qr-waiting' || step === 'qr-show-mine') {
    return (
      <>
        {renderQRScannerModal()}
        <QRSetupScreen
          step={step}
          userName={userName}
          qrCodeData={encryption.qrCodeData}
          onUserNameChange={setUserName}
          onGenerateQR={handleSetupWithQRGenerate}
          onScanQR={handleSetupWithQRScan}
          onOpenScanner={handleWaitingScreenOpenScanner}
          onComplete={handleCompleteQRSetup}
          onBack={() => setStep('choose-method')}
        />
      </>
    );
  }

  if (step === 'code-setup') {
    return (
      <>
        {renderQRScannerModal()}
        <CodeSetupScreen
          userName={userName}
          sharedCode={sharedCode}
          onUserNameChange={setUserName}
          onSharedCodeChange={setSharedCode}
          onConnect={handleSetupWithCode}
          onBack={() => setStep('choose-method')}
        />
      </>
    );
  }

  // Chat Screen
  return (
    <>
      {renderQRScannerModal()}
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
    </>
  );
}
