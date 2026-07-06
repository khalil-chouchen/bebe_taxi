import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';
import ErrorBoundary from './src/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Any pre-load tasks (fonts, assets) go here
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!appReady) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// package.json's "main" field points directly at this file, so Expo never falls
// back to expo/AppEntry.js's automatic registerRootComponent call — it must be
// done explicitly here.
registerRootComponent(App);

export default App;
