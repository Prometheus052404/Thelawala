import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { loadServerBaseUrl } from './src/services/serverConfig';

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'ServerConfig' | 'Login' | null>(null);

  useEffect(() => {
    let active = true;

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
        <ActivityIndicator size="large" color="#0abde3" />
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
