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
import LoadingSpinner from '../components/LoadingSpinner';

import SplashScreen from '../screens/SplashScreen';
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
  const { token, user, setAuth, clearAuth, isLoading } = useAuthStore();
  const [booting, setBooting] = useState(true);

  console.log('[RootNavigator] render, booting =', booting, 'isLoading =', isLoading, 'user =', user);

  useEffect(() => {
    console.log('[RootNavigator] boot effect start');
    (async () => {
      // Load stored token first
      await useAuthStore.getState().loadStoredAuth();
      const storedToken = useAuthStore.getState().token;
      console.log('[RootNavigator] loadStoredAuth done, storedToken =', storedToken);

      if (storedToken) {
        try {
          const res = await authApi.me();
          const { user: fetchedUser } = res.data;
          await setAuth(fetchedUser, storedToken);
          // Connect socket after auth
          await connectSocket();
          console.log('[RootNavigator] auth verified + socket connected');
        } catch (err) {
          console.log('[RootNavigator] token invalid, clearing', err);
          // Token invalid — clear it
          await clearAuth();
        }
      }
      console.log('[RootNavigator] setBooting(false)');
      setBooting(false);
    })();
  }, []);

  if (booting || isLoading) {
    console.log('[RootNavigator] showing LoadingSpinner');
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  console.log('[RootNavigator] rendering Stack.Navigator, user =', user);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Unauthenticated flow
            <>
              <Stack.Screen name="Splash" component={SplashScreen} />
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
