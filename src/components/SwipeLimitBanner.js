// ================================================
// ÁGAPE — Banner de Límite de Swipes
// Aparece cuando quedan pocos swipes — activa paywall
// ================================================
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SwipeLimitBanner({ restantes, onUpgrade, onVerAnuncio, puedeVerAnuncio }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (restantes <= 5 && restantes > 0) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [restantes]);

  if (restantes > 5 || restantes <= 0) return null;

  const esUrgente = restantes <= 2;

  return (
    <Animated.View style={[styles.wrap, { opacity: fadeAnim }]}>
      <View style={[styles.inner, esUrgente && styles.innerUrgente]}>
        <View style={styles.left}>
          <Ionicons
            name={esUrgente ? 'warning-outline' : 'information-circle-outline'}
            size={16}
            color={esUrgente ? '#FF6464' : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.texto, esUrgente && styles.textoUrgente]}>
            {esUrgente
              ? `Solo ${restantes} ${restantes === 1 ? 'conexión' : 'conexiones'} más hoy`
              : `Te quedan ${restantes} conexiones hoy`
            }
          </Text>
        </View>
        <View style={styles.btns}>
          {puedeVerAnuncio && (
            <TouchableOpacity onPress={onVerAnuncio} style={styles.btnAd}>
              <Ionicons name="play-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.btnAdText}>+6</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onUpgrade} style={styles.btnUpgrade}>
            <Text style={styles.btnUpgradeText}>Ilimitado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginHorizontal: 16, marginBottom: 8 },
  inner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
  },
  innerUrgente: {
    borderColor: 'rgba(255,100,100,0.25)',
    backgroundColor: 'rgba(255,100,100,0.08)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  texto: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  textoUrgente: { color: '#FF6464' },
  btns: { flexDirection: 'row', gap: 8 },
  btnAd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  btnAdText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  btnUpgrade: {
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  btnUpgradeText: { fontSize: 12, color: '#E8D4A0', fontWeight: '600' },
});
