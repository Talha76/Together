// src/components/ChatScreen.jsx
import ChatHeader from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export default function ChatScreen({ 
  userName,
  encryptionStatus,
  participantCount,
  messages,
  onSendMessage, 
  onDownloadFile,
  onDisconnect 
}) {
  return (
    <div className="flex h-screen flex-col">
      <ChatHeader 
        userName={userName} 
        encryptionStatus={encryptionStatus}
        participantCount={participantCount}
        onDisconnect={onDisconnect} 
      />
      <MessageList messages={messages} onDownloadFile={onDownloadFile} />
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
