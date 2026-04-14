// src/components/ChatScreen.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import ChatHeader from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useNotificationSound } from '../hooks/useNotificationSound';

export default function ChatScreen({
  userName,
  encryptionStatus,
  participantCount,
  messages,
  onSendMessage,
  onDownloadFile,
  onDisconnect,
  showToast,
  partnerTyping,
  partnerStatus,
  onTypingChange,
  onAddReaction,
  onRemoveReaction,
  onDeleteMessage,
  currentUserId,
  chatRoomId,
}) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { playMessageSound } = useNotificationSound();
  const prevMessageCountRef = useRef(messages.length);

  // Play sound on new partner message
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const newest = messages[messages.length - 1];
      if (newest && newest.sender !== 'You' && !document.hidden) {
        playMessageSound();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, playMessageSound]);

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(msg => msg.text?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader
        userName={userName}
        encryptionStatus={encryptionStatus}
        participantCount={participantCount}
        partnerStatus={partnerStatus}
        onDisconnect={onDisconnect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        chatRoomId={chatRoomId}
      />
      <MessageList
        messages={filteredMessages}
        onDownloadFile={onDownloadFile}
        showToast={showToast}
        partnerTyping={partnerTyping && !searchQuery}
        onReply={setReplyingTo}
        onAddReaction={onAddReaction}
        onRemoveReaction={onRemoveReaction}
        onDeleteMessage={onDeleteMessage}
        currentUserId={currentUserId}
        searchQuery={searchQuery}
      />
      <MessageInput
        onSendMessage={onSendMessage}
        showToast={showToast}
        onTypingChange={onTypingChange}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
