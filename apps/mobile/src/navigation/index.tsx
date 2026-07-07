import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { Platform, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { connectSocket } from '../services/socket';
import { RootStackParamList } from '../types';
import ToastContainer from '../components/Toast';

import SplashScreen from '../screens/SplashScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ClientRegisterScreen from '../screens/client/ClientRegisterScreen';
import TaxiRegisterScreen from '../screens/taxi/TaxiRegisterScreen';
import ClientNavigator from './ClientNavigator';
import TaxiNavigator from './TaxiNavigator';

// react-native-screens' web implementation can render screens invisible;
// native-stack enables it automatically on import, so disable it again for web only.
if (Platform.OS === 'web') {
  enableScreens(false);
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      // Load stored token first
      await useAuthStore.getState().loadStoredAuth();
      const storedToken = useAuthStore.getState().token;

      if (storedToken) {
        try {
          const res = await authApi.me();
          const { user: fetchedUser } = res.data;
          await setAuth(fetchedUser, storedToken);
          // Connect socket after auth
          await connectSocket();
        } catch {
          // Token invalid or expired — clear it and fall back to login
          await clearAuth();
        }
      }
      setBooting(false);
    })();
  }, []);

  // Single loading gate: the branded splash doubles as the boot screen so
  // there is no separate spinner shown before/after it (no flicker).
  if (booting) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Unauthenticated flow
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
              <Stack.Screen name="ClientRegister" component={ClientRegisterScreen} />
              <Stack.Screen name="TaxiRegister" component={TaxiRegisterScreen} />
            </>
          ) : user.role === 'client' ? (
            <Stack.Screen name="ClientApp" component={ClientNavigator} />
          ) : (
            <Stack.Screen name="TaxiApp" component={TaxiNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <ToastContainer />
    </View>
  );
}
