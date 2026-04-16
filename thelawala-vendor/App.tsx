import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { loadServerBaseUrl } from './src/services/serverConfig';

// Flip to true for AUJAR hardware testing without backend/auth.
const DEBUG_NO_SERVER = true;

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'ServerConfig' | 'Login' | 'Home' | null>(null);

  useEffect(() => {
    let active = true;

    if (DEBUG_NO_SERVER) {
      setInitialRoute('Home');
      return () => {
        active = false;
      };
    }

    (async () => {
      const existing = await loadServerBaseUrl();
      if (!active) return;
      setInitialRoute(existing ? 'Login' : 'ServerConfig');
    })();

    return () => {
      active = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={initialRoute} />;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
});