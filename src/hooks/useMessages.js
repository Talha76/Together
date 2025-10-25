import { useState, useEffect } from 'react';

export function useMessages(sharedSecret, encryptMessage, decryptMessage, encryptFile) {
  const [messages, setMessages] = useState([]);

  const loadMessages = () => {
    const savedMessages = localStorage.getItem('togetherMessages');
    if (savedMessages && sharedSecret) {
      const encrypted = JSON.parse(savedMessages);
      // Decrypt messages
      const decrypted = encrypted.map(msg => {
        if (msg.encrypted && sharedSecret) {
          try {
            const decryptedText = decryptMessage(
              { ciphertext: msg.text, nonce: msg.nonce }
            );
            return { ...msg, text: decryptedText, decrypted: true };
          } catch {
            return { ...msg, text: '[Decryption failed]', decrypted: false };
          }
        }
        return msg;
      });
      setMessages(decrypted);
    }
  };

  // Load messages from localStorage on mount
  useEffect(() => {
    if (sharedSecret) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedSecret]);

  const saveMessages = (msgs) => {
    localStorage.setItem('togetherMessages', JSON.stringify(msgs));
  };

  const addMessage = async (userName, inputText, selectedFile) => {
    if (!sharedSecret) {
      return { success: false, error: 'Encryption not set up!' };
    }

    if (!inputText.trim() && !selectedFile) {
      return { success: false, error: 'No message or file to send' };
    }

    const newMessage = {
      id: Date.now(),
      sender: userName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(),
      encrypted: true,
      synced: false
    };

    // Encrypt text message
    if (inputText.trim()) {
      const encrypted = encryptMessage(inputText);
      newMessage.text = encrypted.ciphertext;
      newMessage.nonce = encrypted.nonce;
    }

    // Handle file
    if (selectedFile) {
      const isLargeFile = selectedFile.size > 1024 * 1024;
      
      newMessage.file = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        storage: isLargeFile ? 'indexedDB' : 'firestore',
        encrypted: true
      };

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          
          // Encrypt file
          const encryptedFile = encryptFile(base64Data);
          newMessage.file.data = encryptedFile.ciphertext;
          newMessage.file.nonce = encryptedFile.nonce;
          
          if (isLargeFile) {
            newMessage.file.localOnly = true;
          }
          
          // Save encrypted message
          const updatedMessages = [...messages, newMessage];
          setMessages(updatedMessages);
          saveMessages(updatedMessages);
          
          resolve({ success: true });
        };
        reader.readAsDataURL(selectedFile);
      });
    } else {
      // Save encrypted message
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
      return { success: true };
    }
  };

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem('togetherMessages');
  };

  return {
    messages,
    addMessage,
    clearMessages,
    loadMessages
  };
}
