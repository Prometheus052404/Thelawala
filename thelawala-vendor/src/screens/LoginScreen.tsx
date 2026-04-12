import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { vendorLogin, vendorRegister } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [thelaId, setThelaId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!thelaId.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter both Thela ID and Password.');
      return;
    }
    setLoading(true);
    try {
      const data = await vendorLogin(thelaId.trim(), password);
      navigation.replace('Home', { thelaId: data.vendor.thelaId, token: data.token });
    } catch (err: any) {
      if (err.error === 'not_found') {
        Alert.alert(
          'Account Not Found',
          'Would you like to register with these credentials?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register', onPress: handleRegister },
          ],
        );
      } else {
        Alert.alert('Login Failed', err.message || err.error || 'Could not connect to server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const data = await vendorRegister(thelaId.trim(), password);
      Alert.alert('Welcome!', 'Account created successfully.');
      navigation.replace('Home', { thelaId: data.vendor.thelaId, token: data.token });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || err.error || 'Could not register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.logoArea}>
        <Text style={styles.logoIcon}>🛒</Text>
        <Text style={styles.title}>Thelawala</Text>
        <Text style={styles.subtitle}>Vendor Portal</Text>
      </View>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Thela ID"
          placeholderTextColor="#999"
          value={thelaId}
          onChangeText={setThelaId}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRegister} disabled={loading}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ServerConfig', { mode: 'edit' })}
          disabled={loading}
        >
          <Text style={styles.serverLinkText}>Change Server IP</Text>
        </TouchableOpacity>
      </View>
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
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e94560',
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    backgroundColor: '#0f3460',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  button: {
    backgroundColor: '#e94560',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  linkText: {
    color: '#53a8b6',
    textAlign: 'center',
    marginTop: 18,
    fontSize: 13,
  },
  serverLinkText: {
    color: '#e94560',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});