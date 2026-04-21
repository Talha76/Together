import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEncryption } from '../hooks/useEncryption';
import { ENCRYPTION_CONFIG } from '../constants';

export default function SetupScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setupWithCode, saveEncryptionKeys } = useEncryption();

  const handleConnect = async () => {
    if (!userName.trim()) { setError('Enter your name'); return; }
    if (!phoneNumber.trim()) { setError('Enter your phone number'); return; }
    if (sharedCode.length < ENCRYPTION_CONFIG.MIN_CODE_LENGTH) {
      setError(`Code must be at least ${ENCRYPTION_CONFIG.MIN_CODE_LENGTH} characters`);
      return;
    }

    setLoading(true);
    setError('');

    const result = await setupWithCode(sharedCode);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await saveEncryptionKeys(userName.trim(), phoneNumber.trim());
    setLoading(false);
    navigation.replace('Chat');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Setup</Text>
          <Text style={styles.subtitle}>
            Enter your name and a shared secret code.{'\n'}
            Both you and your partner must use the same code.
          </Text>

          <TextInput
            label="Your Name"
            value={userName}
            onChangeText={setUserName}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
          />

          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <TextInput
            label="Shared Secret Code"
            value={sharedCode}
            onChangeText={setSharedCode}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
          />

          {sharedCode.length > 0 && sharedCode.length < ENCRYPTION_CONFIG.RECOMMENDED_CODE_LENGTH && (
            <Text style={styles.hint}>
              Tip: Use {ENCRYPTION_CONFIG.RECOMMENDED_CODE_LENGTH}+ characters for stronger encryption
            </Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleConnect}
            loading={loading}
            disabled={loading || !userName.trim() || !phoneNumber.trim() || !sharedCode}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Connect
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 32, lineHeight: 22 },
  input: { marginBottom: 16 },
  hint: { fontSize: 12, color: '#f59e0b', marginBottom: 12 },
  error: { fontSize: 14, color: '#ef4444', marginBottom: 12 },
  button: { borderRadius: 12, paddingVertical: 4, backgroundColor: '#2563eb', marginTop: 8 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
