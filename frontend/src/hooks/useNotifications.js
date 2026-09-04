// ================================================
// ÁGAPE v10 — Hook de Notificaciones Push
// Expo Notifications + Firebase
// ================================================
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
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

// Preferencia local del usuario (persiste entre reinicios). El toggle en
// Configuración escribe aquí y este mismo valor decide si el hook vuelve
// a registrar el token push la próxima vez que se abre la app.
export const PREF_NOTIFICACIONES_KEY = 'agape_notificaciones_activas';

export async function notificacionesActivadas() {
  try {
    const valor = await SecureStore.getItemAsync(PREF_NOTIFICACIONES_KEY);
    return valor !== 'false'; // activadas por defecto
  } catch {
    return true;
  }
}

async function obtenerTokenPushActual() {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

// Pide permiso (si hace falta) y registra el token push actual en el backend.
export async function registrarTokenPush() {
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

// Quita el token push actual del backend — deja de recibir notificaciones
// en este dispositivo sin tocar el permiso del sistema operativo.
export async function desregistrarTokenPush() {
  try {
    const token = await obtenerTokenPushActual();
    if (token) await notificationAPI.eliminarToken(token);
  } catch (e) {
    console.warn('Notificaciones:', e.message);
  }
}

export default function useNotifications() {
  const { isAuthenticated, incrementarNoLeidos } = useStore();
  const notifListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      if (await notificacionesActivadas()) await registrarTokenPush();
    })();

    notifListener.current = Notifications.addNotificationReceivedListener((notif) => {
      const tipo = notif.request.content.data?.tipo;
      if (tipo === 'message') incrementarNoLeidos();
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
}
