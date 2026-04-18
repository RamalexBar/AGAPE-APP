// ================================================
// ÁGAPE v10 — MatchModal (Animación emocional mejorada)
// ================================================
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import useStore from '../store/useStore';
import { COLORES } from '../utils/constants';
import { obtenerIniciales, colorAvatar } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

const EMOJIS = ['💕', '✨', '🔥', '💫', '❤️', '⭐', '🌟', '💖', '🎉', '✝️'];

export default function MatchModal({ onVerChat, navigation }) {
  const { nuevoMatch, limpiarNuevoMatch, user } = useStore();

  const opacidadAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim     = useRef(new Animated.Value(0.4)).current;
  const particAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim     = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (nuevoMatch) {
      Animated.parallel([
        Animated.timing(opacidadAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(scaleAnim,    { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(particAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(particAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          ]),
          { iterations: 4 }
        ).start();
      });
    } else {
      opacidadAnim.setValue(0);
      scaleAnim.setValue(0.4);
      slideAnim.setValue(60);
      particAnim.setValue(0);
    }
  }, [nuevoMatch]);

  if (!nuevoMatch) return null;

  const otro = nuevoMatch.usuario || {};
  const fotoPropia = user?.profiles?.fotos?.[0];
  const fotoOtro   = otro?.profiles?.fotos?.[0];
  const nombreOtro = otro?.profiles?.nombre || otro?.nombre || 'alguien';
  const inicialesOtro = obtenerIniciales(nombreOtro);
  const colorOtro     = colorAvatar(nombreOtro);
  const inicialesUser = obtenerIniciales(user?.profiles?.nombre || user?.nombre || 'Yo');
  const colorUser     = colorAvatar(user?.profiles?.nombre || '');

  return (
    <Modal transparent animationType="none" visible={!!nuevoMatch} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacidadAnim }]}>
        {Platform.OS === 'ios'
          ? <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,20,0.92)' }]} />
        }

        {/* Partículas animadas */}
        {EMOJIS.map((emoji, i) => (
          <Animated.Text
            key={i}
            style={[styles.particula, {
              top: `${8 + (i % 5) * 18}%`,
              left: `${(i % 5) * 22}%`,
              opacity: particAnim,
              transform: [{ scale: particAnim }],
            }]}
          >
            {emoji}
          </Animated.Text>
        ))}

        <Animated.View style={[
          styles.contenido,
          {
            opacity: opacidadAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}>
          {/* Título */}
          <LinearGradient
            colors={COLORES.gradPrimario}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.tituloBadge}
          >
            <Text style={styles.tituloBadgeTexto}>¡MATCH!</Text>
          </LinearGradient>

          <Text style={styles.subtitulo}>
            ¡A {nombreOtro} también le gustas! ✝️
          </Text>

          {/* Fotos */}
          <View style={styles.fotosContenedor}>
            {/* Foto propia */}
            <View style={[styles.fotoWrapper, styles.fotoIzquierda]}>
              {fotoPropia
                ? <Image source={{ uri: fotoPropia }} style={styles.foto} contentFit="cover" />
                : (
                  <View style={[styles.foto, { backgroundColor: colorUser, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={styles.avatarLetra}>{inicialesUser}</Text>
                  </View>
                )
              }
            </View>

            {/* Corazón central */}
            <View style={styles.corazonWrap}>
              <LinearGradient colors={COLORES.gradPrimario} style={styles.corazonCircle}>
                <Ionicons name="heart" size={22} color="#fff" />
              </LinearGradient>
            </View>

            {/* Foto del otro */}
            <View style={[styles.fotoWrapper, styles.fotoDerecha]}>
              {fotoOtro
                ? <Image source={{ uri: fotoOtro }} style={styles.foto} contentFit="cover" />
                : (
                  <View style={[styles.foto, { backgroundColor: colorOtro, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={styles.avatarLetra}>{inicialesOtro}</Text>
                  </View>
                )
              }
            </View>
          </View>

          <Text style={styles.mensajeMatch}>
            Ahora pueden chatear y conocerse mejor
          </Text>

          {/* Botones */}
          <TouchableOpacity
            style={styles.btnChat}
            onPress={() => { limpiarNuevoMatch(); onVerChat && onVerChat(nuevoMatch); }}
            activeOpacity={0.88}
          >
            <LinearGradient colors={COLORES.gradPrimario} style={styles.btnChatGrad}>
              <Ionicons name="chatbubbles" size={19} color="#fff" />
              <Text style={styles.btnChatTexto}>Enviar mensaje</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSeguir} onPress={limpiarNuevoMatch}>
            <Text style={styles.btnSeguirTexto}>Seguir explorando</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  particula:       { position: 'absolute', fontSize: 26 },
  contenido:       { width: '100%', alignItems: 'center', gap: 16, backgroundColor: 'rgba(20,20,35,0.85)', borderRadius: 28, padding: 28, borderWidth: 0.5, borderColor: COLORES.borde },
  tituloBadge:     { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 8 },
  tituloBadgeTexto:{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 4 },
  subtitulo:       { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  fotosContenedor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  fotoWrapper:     { width: 110, height: 110, borderRadius: 55, overflow: 'hidden', borderWidth: 3 },
  fotoIzquierda:   { borderColor: COLORES.primario, transform: [{ translateX: 18 }], zIndex: 1 },
  fotoDerecha:     { borderColor: COLORES.secundario, transform: [{ translateX: -18 }] },
  foto:            { width: '100%', height: '100%' },
  avatarLetra:     { color: '#fff', fontWeight: '800', fontSize: 30 },
  corazonWrap:     { zIndex: 10 },
  corazonCircle:   { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORES.fondo },
  mensajeMatch:    { color: COLORES.muted, fontSize: 13, textAlign: 'center' },
  btnChat:         { width: '100%', borderRadius: 16, overflow: 'hidden' },
  btnChatGrad:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 15 },
  btnChatTexto:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSeguir:       { paddingVertical: 10 },
  btnSeguirTexto:  { color: COLORES.muted, fontSize: 14, textDecorationLine: 'underline' },
});
