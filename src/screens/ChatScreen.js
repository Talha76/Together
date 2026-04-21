import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useEncryption } from '../hooks/useEncryption';
import { useMessages } from '../hooks/useMessages';
import { STORAGE_KEYS, UI_MESSAGES } from '../constants';
import { getRelativeTime, getDateLabel, formatFileSize } from '../utils';

export default function ChatScreen({ navigation }) {
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState('');
  const [userIdentifier, setUserIdentifier] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stageProgress, setStageProgress] = useState({});
  const [activeStage, setActiveStage] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const flatListRef = useRef(null);
  const uploadController = useRef(null);
  const downloadController = useRef(null);

  const { sharedSecret, encryptMessage, decryptMessage, clearEncryptionData, loading: encLoading } = useEncryption();

  useEffect(() => {
    (async () => {
      const name = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
      const phone = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_NUMBER);
      setUserName(name || 'Anonymous');
      setUserIdentifier(phone || name || 'user_' + Date.now());
    })();
  }, []);

  const {
    messages, addMessage, downloadFile, chatRoomId, partnerTyping, partnerStatus,
    canAccessRoom, roomError, setTypingStatus, addReaction, deleteMessage,
  } = useMessages(sharedSecret, encryptMessage, decryptMessage, userIdentifier);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isUploading) return;

    setTypingStatus(false);
    const text = inputText;
    setInputText('');

    try {
      await addMessage(userName, text, null, null, null, null);
    } catch {}
  }, [inputText, userName, addMessage, isUploading, setTypingStatus]);

  const handlePickFile = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled) return;
    const asset = result.assets[0];

    const controller = new AbortController();
    uploadController.current = controller;
    setIsUploading(true);
    setStageProgress({});
    setActiveStage(null);

    try {
      const file = {
        uri: asset.uri,
        name: asset.fileName || `file_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
        type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        size: asset.fileSize || 0,
      };

      await addMessage(userName, '', file, (progress) => {
        if (progress && typeof progress === 'object' && progress.stage) {
          setActiveStage(progress.stage);
          setStageProgress(prev => ({ ...prev, [progress.stage]: progress.progress }));
        }
      }, controller.signal, null);
    } catch {} finally {
      setIsUploading(false);
      setStageProgress({});
      setActiveStage(null);
      uploadController.current = null;
    }
  }, [userName, addMessage]);

  const handleDownload = useCallback(async (message) => {
    if (downloadingId || !message.file?.megaLink) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloadingId(message.id);
    setDownloadProgress(0);
    try {
      await downloadFile(message.file, (p) => setDownloadProgress(Math.round(p)), controller.signal);
    } catch (e) {
      if (e.message !== UI_MESSAGES.ERRORS.DOWNLOAD_CANCELLED) {
        Alert.alert('Download failed', e.message);
      }
    } finally {
      setDownloadingId(null);
      setDownloadProgress(0);
      downloadController.current = null;
    }
  }, [downloadingId, downloadFile]);

  const handleDisconnect = useCallback(async () => {
    Alert.alert('Disconnect', 'Leave this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await clearEncryptionData();
          navigation.replace('Welcome');
        }
      },
    ]);
  }, [clearEncryptionData, navigation]);

  const renderMessage = useCallback(({ item }) => {
    const isOwn = item.sender === 'You';
    return (
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubblePartner]}>
        {!isOwn && <Text style={styles.senderName}>{item.sender}</Text>}
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
          {item.deleted ? 'This message was deleted' : item.text}
        </Text>
        {item.file && (
          <View style={styles.fileRow}>
            <TouchableOpacity
              onPress={() => handleDownload(item)}
              disabled={!!downloadingId || !item.file.megaLink}
            >
              <Text style={[styles.fileInfo, isOwn && styles.fileInfoOwn]}>
                {downloadingId === item.id ? `⬇ ${downloadProgress}%` : '📎'}{' '}
                {item.file.name} ({formatFileSize(item.file.size)})
              </Text>
              {downloadingId !== item.id && (
                <Text style={[styles.downloadHint, isOwn && styles.downloadHintOwn]}>Tap to save</Text>
              )}
            </TouchableOpacity>
            {downloadingId === item.id && (
              <TouchableOpacity
                onPress={() => downloadController.current?.abort()}
                style={styles.dlCancelBtn}
              >
                <Text style={[styles.dlCancelText, isOwn && styles.dlCancelTextOwn]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={[styles.timestamp, isOwn && styles.timestampOwn]}>{item.timestamp}</Text>
      </View>
    );
  }, [handleDownload, downloadingId, downloadProgress]);

  if (encLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {partnerStatus.userName || 'Partner'}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, partnerStatus.isOnline && styles.statusOnline]} />
            <Text style={styles.statusText}>
              {partnerStatus.isOnline ? 'Online' : partnerStatus.lastSeen ? getRelativeTime(partnerStatus.lastSeen) : 'Offline'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
          <Text style={styles.disconnectText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {roomError && (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{roomError}</Text></View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted={false}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={partnerTyping ? (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>typing...</Text>
          </View>
        ) : null}
      />

      {/* Upload Progress */}
      {isUploading && activeStage && (
        <View style={styles.progressContainer}>
          {['compressing', 'encrypting', 'uploading'].map(stage => {
            const progress = stageProgress[stage] || 0;
            const isActive = activeStage === stage;
            const isComplete = progress >= 100;
            if (!isActive && !isComplete && progress === 0 && stage === 'compressing') return null;
            return (
              <View key={stage} style={[styles.progressRow, !isActive && !isComplete && { opacity: 0.4 }]}>
                <View style={styles.progressLabelRow}>
                  <Text style={[styles.progressLabel, isComplete && styles.progressComplete, isActive && styles.progressActive]}>
                    {isComplete ? '✓ ' : ''}{stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </Text>
                  {(isActive || isComplete) && (
                    <Text style={[styles.progressPct, isComplete && styles.progressComplete]}>{progress}%</Text>
                  )}
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }, isComplete && styles.progressBarComplete]} />
                </View>
              </View>
            );
          })}
          <TouchableOpacity onPress={() => uploadController.current?.abort()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TouchableOpacity onPress={handlePickFile} disabled={isUploading} style={styles.attachBtn}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (text.trim()) setTypingStatus(true);
            }}
            placeholder="Message..."
            style={styles.textInput}
            multiline
            maxLength={5000}
            editable={!isUploading && canAccessRoom}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isUploading}
            style={[styles.sendBtn, (!inputText.trim() || isUploading) && styles.sendBtnDisabled]}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db', marginRight: 6 },
  statusOnline: { backgroundColor: '#22c55e' },
  statusText: { fontSize: 12, color: '#6b7280' },
  disconnectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  disconnectText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  errorBanner: { backgroundColor: '#fef2f2', padding: 12 },
  errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  // Messages
  messageList: { paddingHorizontal: 12, paddingVertical: 8 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginVertical: 2 },
  bubbleOwn: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubblePartner: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  senderName: { fontSize: 11, fontWeight: '600', color: '#2563eb', marginBottom: 2 },
  messageText: { fontSize: 15, color: '#1a1a1a', lineHeight: 21 },
  messageTextOwn: { color: '#fff' },
  fileRow: { marginTop: 4 },
  fileInfo: { fontSize: 12, color: '#6b7280' },
  fileInfoOwn: { color: 'rgba(255,255,255,0.8)' },
  downloadHint: { fontSize: 11, color: '#2563eb', marginTop: 1 },
  downloadHintOwn: { color: 'rgba(255,255,255,0.6)' },
  timestamp: { fontSize: 10, color: '#9ca3af', marginTop: 4, alignSelf: 'flex-end' },
  timestampOwn: { color: 'rgba(255,255,255,0.7)' },
  typingContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
  // Progress
  progressContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  progressRow: { marginBottom: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  progressActive: { color: '#2563eb' },
  progressComplete: { color: '#22c55e' },
  progressPct: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  progressBarBg: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 2 },
  progressBarComplete: { backgroundColor: '#22c55e' },
  cancelBtn: { alignSelf: 'flex-end', marginTop: 4 },
  cancelText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  // Input
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  attachBtn: { padding: 8 },
  attachIcon: { fontSize: 22 },
  textInput: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f3f4f6', borderRadius: 20, fontSize: 15, marginHorizontal: 8 },
  sendBtn: { padding: 8, backgroundColor: '#2563eb', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#9ca3af' },
  dlCancelBtn: { marginTop: 4, alignSelf: 'flex-start' },
  dlCancelText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  dlCancelTextOwn: { color: '#fecaca' },
  sendIcon: { fontSize: 18, color: '#fff' },
});
