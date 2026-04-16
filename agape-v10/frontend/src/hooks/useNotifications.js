// ================================================
// ÁGAPE v10 — Hook de Notificaciones Push
// Expo Notifications + Firebase
// ================================================
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationAPI } from '../services/api';
import useStore from '../store/useStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export default function useNotifications() {
  const { isAuthenticated, incrementarNoLeidos } = useStore();
  const notifListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    registrarToken();

    notifListener.current = Notifications.addNotificationReceivedListener((notif) => {
      const tipo = notif.request.content.data?.tipo;
      if (tipo === 'nuevo_mensaje') incrementarNoLeidos();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Aquí puedes navegar según el tipo de notificación
      // navigation.navigate('Chat', { matchId: data.match_id });
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  async function registrarToken() {
    if (!Device.isDevice) return;

    try {
      const { status: existente } = await Notifications.getPermissionsAsync();
      let finalStatus = existente;

      if (existente !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Ágape',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF5C8D',
          sound: 'default',
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      await notificationAPI.registrarToken(token.data, Platform.OS);
    } catch (e) {
      console.warn('Notificaciones:', e.message);
    }
  }
}
