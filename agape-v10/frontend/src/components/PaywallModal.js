// ================================================
// ÁGAPE v10 — Paywall Modal (UX emocional)
// No parece paywall — parece una oportunidad
// ================================================
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORES } from '../utils/constants';

const { height } = Dimensions.get('window');

const ICONOS = {
  heart: 'heart', search: 'search', infinite: 'infinite',
  sparkles: 'star', person: 'person-circle', refresh: 'refresh-circle',
};

export default function PaywallModal({
  visible, tipo, mensaje, puede_ver_ad, compat,
  perfil, onVerAnuncio, onUpgrade, onCerrar,
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: height, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && !mensaje) return null;

  const icono  = ICONOS[mensaje?.icono] || 'heart';
  const titulo = mensaje?.titulo || '✨ Función Premium';
  const sub    = mensaje?.subtitulo || 'Activa Premium para acceder a esta función';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCerrar}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {Platform.OS === 'ios'
          ? <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,20,0.88)' }]} />
        }
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCerrar} activeOpacity={1} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Icono */}
          <LinearGradient colors={COLORES.gradPrimario} style={styles.iconoWrap}>
            <Ionicons name={icono} size={30} color="#fff" />
          </LinearGradient>

          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.sub}>{sub}</Text>

          {compat ? (
            <View style={styles.compatBadge}>
              <Text style={styles.compatTexto}>{compat}% de compatibilidad</Text>
            </View>
          ) : null}

          {/* Botón principal */}
          <TouchableOpacity onPress={onUpgrade} style={styles.btnPrimario} activeOpacity={0.88}>
            <LinearGradient colors={COLORES.gradPrimario} style={styles.btnPrimarioGrad}>
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.btnPrimarioTexto}>Ver con Premium</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Anuncio opcional */}
          {puede_ver_ad && onVerAnuncio && (
            <TouchableOpacity onPress={onVerAnuncio} style={styles.btnAnuncio}>
              <Ionicons name="play-circle-outline" size={18} color={COLORES.muted} />
              <Text style={styles.btnAnuncioTexto}>Ver anuncio gratis</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onCerrar} style={styles.btnCerrar}>
            <Text style={styles.btnCerrarTexto}>Ahora no</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#141428', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 14, alignItems: 'center', gap: 14, borderWidth: 0.5, borderColor: COLORES.borde },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 8 },
  iconoWrap:       { width: 66, height: 66, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  titulo:          { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub:             { fontSize: 14, color: COLORES.muted, textAlign: 'center', lineHeight: 20 },
  compatBadge:     { backgroundColor: 'rgba(255,92,141,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 },
  compatTexto:     { color: COLORES.primario, fontWeight: '700', fontSize: 14 },
  btnPrimario:     { width: '100%', borderRadius: 16, overflow: 'hidden' },
  btnPrimarioGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 15 },
  btnPrimarioTexto:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  btnAnuncio:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  btnAnuncioTexto: { color: COLORES.muted, fontSize: 14 },
  btnCerrar:       { paddingVertical: 8 },
  btnCerrarTexto:  { color: COLORES.muted, fontSize: 13, textDecorationLine: 'underline' },
});
