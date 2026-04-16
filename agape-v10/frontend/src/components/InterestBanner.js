// ================================================
// ÁGAPE — Banner "X personas quieren conocerte"
// Aparece en Home — activa upgrade emocional
// ================================================
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function InterestBanner({ esPremium, onPressUpgrade }) {
  const [datos, setDatos]     = useState(null);
  const [vistas, setVistas]   = useState(0);
  const pulseAnim             = useRef(new Animated.Value(1)).current;
  const slideAnim             = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (datos?.total > 0) {
      // Animación de entrada
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }).start();
      // Pulso en el corazón
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [datos]);

  const cargarDatos = async () => {
    try {
      const [intRes, vistasRes] = await Promise.all([
        api.get('/interests/hidden'),
        api.get('/interests/profile-views'),
      ]);
      setDatos(intRes.data);
      setVistas(vistasRes.data.vistas_hoy || 0);
    } catch {}
  };

  if (!datos || datos.total === 0) return null;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity onPress={onPressUpgrade} activeOpacity={0.88}>
        <LinearGradient
          colors={['rgba(255,107,157,0.18)', 'rgba(196,77,255,0.12)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.inner}
        >
          {/* Icono pulsante */}
          <Animated.View style={[styles.heartWrap, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="heart" size={20} color="#FF6B9D" />
          </Animated.View>

          {/* Texto */}
          <View style={styles.textWrap}>
            <Text style={styles.mensaje}>{datos.mensaje_motivacion}</Text>
            {vistas > 0 && (
              <Text style={styles.vistas}>
                {vistas} {vistas === 1 ? 'persona vio' : 'personas vieron'} tu perfil hoy
              </Text>
            )}
          </View>

          {/* CTA */}
          {!esPremium && (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>Ver</Text>
              <Ionicons name="chevron-forward" size={14} color="#FF6B9D" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap:   { marginHorizontal: 16, marginBottom: 12 },
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,107,157,0.25)',
  },
  heartWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,107,157,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  mensaje:  { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18 },
  vistas:   { fontSize: 11, color: 'rgba(255,255,255,0.50)', marginTop: 2 },
  cta:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText:  { fontSize: 13, color: '#FF6B9D', fontWeight: '600' },
});
