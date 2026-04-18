// ================================================
// ÁGAPE — Modal de Match con Lenguaje Emocional
// Reemplaza el frío "Match encontrado"
// ================================================
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const MENSAJES_MOTIVACION = [
  'No estás aquí por casualidad',
  'El Señor tiene planes buenos para ti',
  'Cada conexión tiene un propósito',
];

export default function EmotionalMatchModal({ visible, match, miAvatar, onEnviarMensaje, onContinuar }) {
  const scaleAnim  = useRef(new Animated.Value(0.5)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const heartAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(heartAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
            Animated.timing(heartAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0.5);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!match) return null;

  const motivacion = MENSAJES_MOTIVACION[Math.floor(Date.now() / 3600000) % MENSAJES_MOTIVACION.length];
  const compat     = match.compatibilidad?.score_total;
  const labelEmoc  = match.compatibilidad?.label_emocional;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#1B2B4A', '#0a0a14']} style={styles.gradient}>

            {/* Partículas de corazones decorativas */}
            <View style={styles.particles}>
              {['❤️','✨','💫','🙏'].map((e,i) => (
                <Text key={i} style={[styles.particle, { top: 20 + i*30, left: i%2===0 ? 20 : width-60-40 }]}>{e}</Text>
              ))}
            </View>

            {/* Título emocional */}
            <Text style={styles.frase}>{motivacion}</Text>

            {/* Avatares superpuestos */}
            <View style={styles.avatarRow}>
              <View style={[styles.avatarWrap, styles.avatarLeft]}>
                <Image source={{ uri: miAvatar || '' }} style={styles.avatar} contentFit="cover" />
              </View>
              <Animated.View style={[styles.heartCenter, { transform: [{ scale: heartAnim }] }]}>
                <LinearGradient colors={['#FF6B9D','#C44DFF']} style={styles.heartBg}>
                  <Ionicons name="heart" size={24} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <View style={[styles.avatarWrap, styles.avatarRight]}>
                <Image source={{ uri: match.avatar_url || '' }} style={styles.avatar} contentFit="cover" />
              </View>
            </View>

            {/* Mensaje emocional del match */}
            <Text style={styles.tituloMatch}>{match.mensaje_emocional || 'Hay alguien que comparte tu forma de ver la vida'}</Text>
            <Text style={styles.nombreMatch}>{match.nombre}</Text>

            {/* Badge de compatibilidad */}
            {compat >= 70 && (
              <View style={styles.compatBadge}>
                <Ionicons name="sparkles" size={12} color="#C9A84C" />
                <Text style={styles.compatText}>{labelEmoc || `${compat}% de afinidad`}</Text>
              </View>
            )}

            {/* Preguntas guiadas sugeridas */}
            {match.pregunta_sugerida && (
              <View style={styles.preguntaWrap}>
                <Text style={styles.preguntaLabel}>💬 Para empezar</Text>
                <Text style={styles.preguntaTexto}>"{match.pregunta_sugerida}"</Text>
              </View>
            )}

            {/* Botones */}
            <TouchableOpacity onPress={onEnviarMensaje} style={styles.btnMensajeWrap} activeOpacity={0.85}>
              <LinearGradient colors={['#C9A84C','#A07830']} style={styles.btnMensaje}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.btnMensajeText}>Iniciar conversación</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onContinuar} style={styles.btnContinuar}>
              <Text style={styles.btnContinuarText}>Seguir explorando</Text>
            </TouchableOpacity>

          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card:    { width: '100%', maxWidth: 380, borderRadius: 28, overflow: 'hidden' },
  gradient:{ padding: 32, alignItems: 'center' },
  particles: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  particle:  { position: 'absolute', fontSize: 20, opacity: 0.4 },
  frase: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 24,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarWrap: {
    width: 90, height: 90, borderRadius: 45, overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarLeft:  { marginRight: -16, zIndex: 1 },
  avatarRight: { marginLeft: -16, zIndex: 1 },
  avatar: { width: '100%', height: '100%' },
  heartCenter: { zIndex: 2 },
  heartBg: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0f0f1a',
  },
  tituloMatch: {
    fontSize: 18, fontWeight: '600', color: '#fff',
    textAlign: 'center', lineHeight: 26, marginBottom: 6,
  },
  nombreMatch: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 16 },
  compatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20,
  },
  compatText: { fontSize: 12, color: '#E8D4A0', fontWeight: '500' },
  preguntaWrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14, marginBottom: 24, width: '100%',
  },
  preguntaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: '600' },
  preguntaTexto: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', lineHeight: 19 },
  btnMensajeWrap: { width: '100%', marginBottom: 12 },
  btnMensaje: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 15,
  },
  btnMensajeText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  btnContinuar:   { paddingVertical: 10 },
  btnContinuarText: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
});
