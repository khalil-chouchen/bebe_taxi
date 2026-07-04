import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { token, user, setAuth, clearAuth, isLoading } = useAuthStore();
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
          // Token invalid — clear it
          await clearAuth();
        }
      }
      setBooting(false);
    })();
  }, []);

  if (booting || isLoading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

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
