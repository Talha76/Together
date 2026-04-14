import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>💕</Text>
        <Text style={styles.title}>Together</Text>
        <Text style={styles.subtitle}>End-to-end encrypted chat for couples</Text>
        <Text style={styles.description}>
          Share messages, photos, and files with military-grade encryption.
          Only you and your partner can read them.
        </Text>
      </View>
      <View style={styles.bottom}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Setup')}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Get Started
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  description: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
  bottom: { paddingHorizontal: 32, paddingBottom: 32 },
  button: { borderRadius: 12, paddingVertical: 4, backgroundColor: '#2563eb' },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
});
