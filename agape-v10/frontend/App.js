// ================================================
// ÁGAPE v10 — App Entry Point
// ================================================
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import { conectarSocket } from './src/services/socketService';
import { initRevenueCat, identifyUser } from './src/services/revenueCatService';
import useStore from './src/store/useStore';

export default function App() {
  const { isAuthenticated, user } = useStore();

  useEffect(() => {
    // Inicializar RevenueCat al arrancar
    initRevenueCat();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      conectarSocket().catch(console.warn);
      // Identificar usuario en RevenueCat
      if (user?.id) identifyUser(user.id);
    }
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppNavigator />
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
