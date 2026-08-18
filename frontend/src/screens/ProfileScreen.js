// ================================================
// ÁGAPE - Pantalla de Perfil propio
// Archivo: frontend/src/screens/ProfileScreen.js
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import ReportButton from '../components/ReportButton';

const { width } = Dimensions.get('window');

const COLORES = {
  fondo: '#0f0f1a',
  card: 'rgba(255,255,255,0.05)',
  borde: 'rgba(255,255,255,0.1)',
  texto: '#fff',
  muted: 'rgba(255,255,255,0.5)',
  premium: '#C44DFF',
  acento: '#FF6B9D',
};

export default function ProfileScreen({ navigation, route }) {
  const { user, logout } = useStore();
  const insets = useSafeAreaInsets();
  const [cargando, setCargando] = useState(false);

  // Si se navega con params (ver perfil de otro usuario)
  const perfilVer = route?.params?.perfil || null;
  const esPropioPerfl = !perfilVer;
  const perfil = perfilVer || user;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            setCargando(true);
            try { await logout(); } catch {}
            setCargando(false);
          }
        }
      ]
    );
  };

  const esPremium = perfil?.premium || perfil?.es_premium || false;
  const fotos = perfil?.profiles?.fotos || perfil?.fotos || [];
  const nombre = perfil?.profiles?.nombre || perfil?.nombre || perfil?.email?.split('@')[0] || 'Usuario';
  const edad = perfil?.profiles?.edad || perfil?.edad || '';
  const bio = perfil?.profiles?.bio || perfil?.bio || 'Sin bio aún.';
  const ubicacion = perfil?.profiles?.ciudad || perfil?.ciudad || '';
  const intereses = perfil?.profiles?.intereses || perfil?.intereses || [];

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {!esPropioPerfl && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitulo}>{esPropioPerfl ? 'Mi Perfil' : nombre}</Text>
          {!esPropioPerfl && (
            <ReportButton
              userId={perfilVer?.id || perfilVer}
              userName={nombre}
              onBlock={() => navigation.goBack()}
            />
          )}
          {esPropioPerfl && (
            <TouchableOpacity onPress={() => navigation.navigate('Configuracion')} style={styles.btnConfig}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Foto principal */}
        <View style={styles.fotoContenedor}>
          {fotos.length > 0 ? (
            <Image source={{ uri: fotos[0] }} style={styles.fotoPrincipal} contentFit="cover" />
          ) : (
            <View style={[styles.fotoPrincipal, styles.fotoPlaceholder]}>
              <Ionicons name="person" size={80} color="rgba(255,255,255,0.2)" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15,15,26,0.95)']}
            style={styles.gradienteFoto}
          />
          {/* Info sobre la foto */}
          <View style={styles.infoSobreFoto}>
            <View style={styles.nombreFila}>
              <Text style={styles.nombre}>{nombre}{edad ? `, ${edad}` : ''}</Text>
              {esPremium && (
                <View style={styles.badgePremium}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={styles.badgePremiumTexto}>Premium</Text>
                </View>
              )}
            </View>
            {ubicacion ? (
              <View style={styles.ubicacionFila}>
                <Ionicons name="location-outline" size={14} color={COLORES.muted} />
                <Text style={styles.ubicacionTexto}>{ubicacion}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Galería de fotos */}
        {fotos.length > 1 && (
          <View style={styles.galeria}>
            {fotos.slice(1, 4).map((foto, i) => (
              <Image key={i} source={{ uri: foto }} style={styles.fotoGaleria} contentFit="cover" />
            ))}
          </View>
        )}

        {/* Bio */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Sobre mí</Text>
          <Text style={styles.bioTexto}>{bio}</Text>
        </View>

        {/* Intereses */}
        {intereses.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Intereses</Text>
            <View style={styles.interesesContenedor}>
              {intereses.map((interes, i) => (
                <View key={i} style={styles.interesChip}>
                  <Text style={styles.interesTexto}>{interes}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Estadísticas (solo perfil propio) */}
        {esPropioPerfl && (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumero}>🔥</Text>
              <Text style={styles.statLabel}>Boost activo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumero}>{esPremium ? '∞' : '1 min'}</Text>
              <Text style={styles.statLabel}>Videollamada</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumero}>{esPremium ? '✓' : '✗'}</Text>
              <Text style={styles.statLabel}>Sin anuncios</Text>
            </View>
          </View>
        )}

        {/* Banner premium (si no es premium) */}
        {esPropioPerfl && !esPremium && (
          <TouchableOpacity style={styles.bannerPremium}>
            <LinearGradient colors={['#C44DFF', '#FF6B9D']} style={styles.bannerGradiente} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="star" size={22} color="#fff" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.bannerTitulo}>Hazte Premium</Text>
                <Text style={styles.bannerSub}>Videollamadas de 5 min · Sin anuncios · Matches ilimitados</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Opciones (solo perfil propio) */}
        {esPropioPerfl && (
          <View style={styles.opciones}>
            <TouchableOpacity style={styles.opcionItem} onPress={() => navigation.navigate('Configuracion')}>
              <Ionicons name="create-outline" size={22} color={COLORES.acento} />
              <Text style={styles.opcionTexto}>Editar perfil</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORES.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.opcionItem} onPress={() => navigation.navigate('Logros')}>
              <Ionicons name="trophy-outline" size={22} color="#FFD700" />
              <Text style={styles.opcionTexto}>Mis logros</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORES.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.opcionItem} onPress={() => navigation.navigate('Verificacion')}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#22c55e" />
              <Text style={styles.opcionTexto}>Verificar cuenta</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORES.muted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.opcionItem, styles.opcionPeligro]} onPress={handleLogout} disabled={cargando}>
              {cargando
                ? <ActivityIndicator color="#EF4444" size="small" />
                : <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              }
              <Text style={[styles.opcionTexto, { color: '#EF4444' }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  btnVolver: { padding: 4 },
  btnConfig: { padding: 4 },
  fotoContenedor: {
    marginHorizontal: 20,
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  fotoPrincipal: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  fotoPlaceholder: {
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradienteFoto: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '50%',
  },
  infoSobreFoto: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 6,
  },
  nombreFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nombre: { fontSize: 26, fontWeight: '800', color: '#fff' },
  badgePremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(196,77,255,0.8)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePremiumTexto: { color: '#fff', fontSize: 11, fontWeight: '600' },
  ubicacionFila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ubicacionTexto: { color: COLORES.muted, fontSize: 14 },
  galeria: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
  },
  fotoGaleria: {
    flex: 1,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#1a1a2e',
  },
  seccion: {
    marginHorizontal: 20,
    marginTop: 24,
    gap: 10,
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bioTexto: {
    fontSize: 14,
    color: COLORES.muted,
    lineHeight: 22,
  },
  interesesContenedor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interesChip: {
    backgroundColor: 'rgba(196,77,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196,77,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  interesTexto: { color: COLORES.premium, fontSize: 13, fontWeight: '500' },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: COLORES.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statNumero: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: COLORES.muted },
  statDivider: { width: 1, height: 30, backgroundColor: COLORES.borde },
  bannerPremium: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bannerGradiente: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerTitulo: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  opciones: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: COLORES.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORES.borde,
    overflow: 'hidden',
  },
  opcionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORES.borde,
  },
  opcionPeligro: { borderBottomWidth: 0 },
  opcionTexto: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '500' },
});
