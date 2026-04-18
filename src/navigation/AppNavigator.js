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

// Auth
import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

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
import LegalScreen       from '../screens/LegalScreen';
import PremiumScreen     from '../screens/PremiumScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = {
  Explorar: { activo: 'search',       inactivo: 'search-outline' },
  Entorno:  { activo: 'globe',        inactivo: 'globe-outline' },
  Mensajes: { activo: 'chatbubbles',  inactivo: 'chatbubbles-outline' },
  Matches:  { activo: 'heart',        inactivo: 'heart-outline' },
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
      <Tab.Screen name="Matches"  component={MatchesScreen} />
      <Tab.Screen name="Perfil"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, inicializar } = useStore();
  useNotifications();

  useEffect(() => { inicializar(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.fondo, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORES.secundario} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Registro" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Legal"    component={LegalScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main"          component={MainTabs} />
            <Stack.Screen name="Chat"          component={ChatScreen}  options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="VerPerfil"     component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Configuracion" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ActivosAhora"  component={ActiveNowScreen} />
            <Stack.Screen name="Verificacion"  component={VerificationScreen} />
            <Stack.Screen name="Eventos"       component={EventsScreen} />
            <Stack.Screen name="Logros"        component={GamificationScreen} />
            <Stack.Screen name="Premium"       component={PremiumScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Legal"         component={LegalScreen} />
            <Stack.Screen name="Videollamada"  component={VideoCallScreen} options={{ presentation: 'fullScreenModal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
