import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { disconnectSocket } from '../services/api';
import { getServerBaseUrl, setServerBaseUrl } from '../services/serverConfig';

export default function ServerConfigScreen({ navigation, route }: any) {
  const mode = route?.params?.mode === 'edit' ? 'edit' : 'setup';
  const [value, setValue] = useState(getServerBaseUrl());
  const [saving, setSaving] = useState(false);

  const subtitle = useMemo(
    () =>
      mode === 'setup'
        ? 'Enter your backend URL before using the app.'
        : 'Update the backend URL for this app.',
    [mode],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await setServerBaseUrl(value);
      disconnectSocket();
      if (mode === 'setup') {
        navigation.replace('Login');
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Invalid Server URL', err?.message || 'Please enter a valid URL.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Server Settings</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="http://172.16.216.70:5000"
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Server URL</Text>}
      </TouchableOpacity>

      {mode === 'edit' && (
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1a1a2e',
  },
  title: {
    color: '#0abde3',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 18,
  },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1a4a7a',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  saveButton: {
    backgroundColor: '#0abde3',
    borderRadius: 10,
    alignItems: 'center',
    padding: 14,
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#53a8b6',
    fontSize: 13,
  },
});
