import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ServerConfigScreen from '../screens/ServerConfigScreen';

export type RootStackParamList = {
  ServerConfig: { mode?: 'setup' | 'edit' } | undefined;
  Login: undefined;
  Home: { token: string; phoneNumber: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  initialRouteName?: keyof RootStackParamList;
};

export default function AppNavigator({ initialRouteName = 'Login' }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
