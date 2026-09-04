// ================================================
// ÁGAPE v10 — Navegación principal
// Limpio, sin duplicados, con Badge de mensajes
// ================================================
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../store/useStore';
import useNotifications from '../hooks/useNotifications';
import { COLORES } from '../utils/constants';
import { conectarSocket, desconectarSocket, getSocket } from '../services/socketService';
import { navigationRef, navegarGlobal } from './navigationRef';
import MatchModal from '../components/MatchModal';

// Auth
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Tabs principales
import HomeScreen    from '../screens/HomeScreen';
import EntornoScreen from '../screens/EntornoScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Stacks
import ChatScreen        from '../screens/ChatScreen';
import SettingsScreen    from '../screens/SettingsScreen';
import ActiveNowScreen   from '../screens/ActiveNowScreen';
import VerificationScreen from '../screens/VerificationScreen';
import EventsScreen      from '../screens/EventsScreen';
import VideoCallScreen   from '../screens/VideoCallScreen';
import GamificationScreen from '../screens/GamificationScreen';
import DevocionalScreen  from '../screens/DevocionalScreen';
import LegalScreen       from '../screens/LegalScreen';
import PremiumScreen     from '../screens/PremiumScreen';
import EditarPerfilScreen from '../screens/EditarPerfilScreen';
import QuienMeDioLikeScreen from '../screens/QuienMeDioLikeScreen';
import UsuariosBloqueadosScreen from '../screens/UsuariosBloqueadosScreen';
import RestablecerContrasenaScreen from '../screens/RestablecerContrasenaScreen';
import CambiarContrasenaScreen from '../screens/CambiarContrasenaScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = {
  Explorar: { activo: 'search',       inactivo: 'search-outline' },
  Entorno:  { activo: 'globe',        inactivo: 'globe-outline' },
  Mensajes: { activo: 'chatbubbles',  inactivo: 'chatbubbles-outline' },
  Perfil:   { activo: 'person',       inactivo: 'person-outline' },
};

function MainTabs() {
  const { mensajesNoLeidos } = useStore();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,20,0.98)',
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 0.5,
          paddingTop: 8,
          paddingBottom: 8,
          height: 66,
        },
        tabBarActiveTintColor:   COLORES.primario,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: { fontSize: 10, marginTop: 2, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const cfg = TAB_ICONS[route.name];
          if (!cfg) return null;
          return (
            <Ionicons
              name={focused ? cfg.activo : cfg.inactivo}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Explorar" component={HomeScreen} />
      <Tab.Screen name="Entorno"  component={EntornoScreen} />
      <Tab.Screen
        name="Mensajes"
        component={MatchesScreen}
        options={{
          tabBarBadge: mensajesNoLeidos > 0 ? mensajesNoLeidos : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORES.primario, fontSize: 10 },
        }}
      />
      <Tab.Screen name="Perfil"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, inicializar, setNuevoMatch } = useStore();
  useNotifications();

  useEffect(() => { inicializar(); }, []);

  // Conecta/desconecta el socket según el estado de sesión — sin esto el
  // chat en tiempo real, "escribiendo..." y las videollamadas nunca
  // llegan a conectar (getSocket() devolvía null para siempre).
  useEffect(() => {
    if (!isAuthenticated) {
      desconectarSocket();
      return;
    }

    let activo = true;
    conectarSocket().then((socket) => {
      if (!activo || !socket) return;
      socket.on('videocall_incoming', (data) => {
        navegarGlobal('Videollamada', { llamada_entrante: data });
      });
      // Se registra a nivel global (no solo en HomeScreen) para que el match
      // aparezca aunque el usuario esté en otra pantalla cuando le hacen match.
      socket.on('new_match', (data) => {
        if (data?.match) setNuevoMatch(data.match);
      });
    });

    return () => {
      activo = false;
      getSocket()?.off('videocall_incoming');
      getSocket()?.off('new_match');
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORES.secundario} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated && (
        <MatchModal onVerChat={(match) => navegarGlobal('Chat', { match, usuario: match.usuario })} />
      )}
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Registro" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="OlvideContrasena" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="RestablecerContrasena" component={RestablecerContrasenaScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Legal"    component={LegalScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"          component={MainTabs} />
            <Stack.Screen name="Chat"          component={ChatScreen}  options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="VerPerfil"     component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="EditarPerfil"  component={EditarPerfilScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Configuracion" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="UsuariosBloqueados" component={UsuariosBloqueadosScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="CambiarContrasena" component={CambiarContrasenaScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ActivosAhora"  component={ActiveNowScreen} />
            <Stack.Screen name="Verificacion"  component={VerificationScreen} />
            <Stack.Screen name="Eventos"       component={EventsScreen} />
            <Stack.Screen name="Logros"        component={GamificationScreen} />
            <Stack.Screen name="Devocional"    component={DevocionalScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Premium"       component={PremiumScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="QuienMeDioLike" component={QuienMeDioLikeScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Legal"         component={LegalScreen} />
            <Stack.Screen name="Videollamada"  component={VideoCallScreen} options={{ presentation: 'fullScreenModal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

