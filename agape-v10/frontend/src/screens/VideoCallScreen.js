// ================================================
// ÁGAPE — Pantalla de Videollamada
// Archivo: frontend/src/screens/VideoCallScreen.js
//
// Free:    1 minuto máximo
// Premium: 5 minutos máximo
// ================================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Alert, ActivityIndicator, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import api from '../services/api';
import { getSocket } from '../services/socketService';
import useStore from '../store/useStore';

// Límites de tiempo
const LIMITE_FREE    = 60;   // 1 minuto
const LIMITE_PREMIUM = 300;  // 5 minutos
const AVISO_ANTES    = 10;   // Avisar 10s antes

// Importar Agora solo si está instalado
let RtcEngine, AgoraView;
try {
  const agora = require('react-native-agora');
  RtcEngine = agora.default || agora.RtcEngine;
  AgoraView = agora.RtcLocalView?.SurfaceView || agora.RtcRemoteView?.SurfaceView;
} catch {
  // Agora no instalado — usar modo demo
}

const COLORES = {
  fondo: '#0a0a14', texto: '#fff',
  muted: 'rgba(255,255,255,0.5)',
  peligro: '#EF4444', verde: '#22c55e',
};

export default function VideoCallScreen({ route, navigation }) {
  const { match, llamada_entrante } = route.params || {};
  const { user } = useStore();
  const esPremium = user?.premium || user?.es_premium || false;
  const LIMITE = esPremium ? LIMITE_PREMIUM : LIMITE_FREE;

  const [estado, setEstado]             = useState('conectando');
  const [llamadaId, setLlamadaId]       = useState(llamada_entrante?.llamada_id || null);
  const [micMute, setMicMute]           = useState(false);
  const [camaraOff, setCamaraOff]       = useState(false);
  const [duracion, setDuracion]         = useState(0);
  const [engineListo, setEngineListo]   = useState(false);
  const [modalPremium, setModalPremium] = useState(false);
  const [avisadoFin, setAvisadoFin]     = useState(false);
  const engineRef  = useRef(null);
  const timerRef   = useRef(null);
  const barraAnim  = useRef(new Animated.Value(1)).current;
  const insets     = useSafeAreaInsets();
  const socket     = getSocket();

  const tiempoRestante = LIMITE - duracion;

  // Animar barra de tiempo
  useEffect(() => {
    Animated.timing(barraAnim, {
      toValue: Math.max(0, 1 - duracion / LIMITE),
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [duracion]);

  // Control de límite de tiempo
  useEffect(() => {
    if (estado !== 'en_curso') return;
    if (!avisadoFin && tiempoRestante === AVISO_ANTES) {
      setAvisadoFin(true);
      Alert.alert(
        '⏱ Tiempo casi agotado',
        esPremium
          ? 'Quedan 10 segundos de tu llamada Premium.'
          : 'Quedan 10 segundos. Hazte Premium para llamadas de 5 minutos.',
        [{ text: 'OK' }]
      );
    }
    if (duracion >= LIMITE) {
      clearInterval(timerRef.current);
      if (!esPremium) { setModalPremium(true); } else { finalizarLlamada(); }
    }
  }, [duracion, estado]);

  const otroUsuario = match?.usuario || {};

  useEffect(() => {
    if (llamada_entrante) {
      iniciarEngine(llamada_entrante.canal, llamada_entrante.app_id);
    } else if (match) {
      solicitarLlamada();
    }
    return () => limpiar();
  }, []);

  const solicitarLlamada = async () => {
    try {
      setEstado('conectando');
      const { data } = await api.post('/videocall/iniciar', { match_id: match.match_id });
      setLlamadaId(data.llamada_id);
      await iniciarEngine(data.canal, data.app_id, data.token, data.uid);
    } catch (e) {
      const msg = e.response?.data?.error || 'No se pudo iniciar la videollamada.';
      Alert.alert('Error', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  const aceptarLlamada = async () => {
    try {
      const { data } = await api.post(`/videocall/responder/${llamadaId}`, { accion: 'aceptar' });
      await iniciarEngine(llamada_entrante.canal, llamada_entrante.app_id, data.token, data.uid);
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar.');
    }
  };

  const rechazarLlamada = async () => {
    await api.post(`/videocall/responder/${llamadaId}`, { accion: 'rechazar' }).catch(() => {});
    navigation.goBack();
  };

  const iniciarEngine = async (canal, appId, token, uid) => {
    if (!RtcEngine) {
      // Modo demo sin Agora instalado
      setEstado('en_curso');
      timerRef.current = setInterval(() => setDuracion(d => d + 1), 1000);
      setEngineListo(true);
      return;
    }

    try {
      engineRef.current = await RtcEngine.create(appId);
      await engineRef.current.enableVideo();
      engineRef.current.addListener('UserOffline', finalizarLlamada);
      engineRef.current.addListener('JoinChannelSuccess', () => {
        setEstado('en_curso');
        timerRef.current = setInterval(() => setDuracion(d => d + 1), 1000);
      });

      await engineRef.current.joinChannel(token || null, canal, null, uid || 0);
      setEngineListo(true);
    } catch (e) {
      console.error('Agora error:', e);
      // Fallback demo
      setEstado('en_curso');
      timerRef.current = setInterval(() => setDuracion(d => d + 1), 1000);
      setEngineListo(true);
    }
  };

  const finalizarLlamada = async () => {
    limpiar();
    if (llamadaId) {
      await api.post(`/videocall/finalizar/${llamadaId}`).catch(() => {});
    }
    navigation.goBack();
  };

  const limpiar = () => {
    clearInterval(timerRef.current);
    if (engineRef.current) {
      engineRef.current.leaveChannel().catch(() => {});
      engineRef.current.destroy().catch(() => {});
    }
  };

  const toggleMic    = async () => { setMicMute(!micMute);    await engineRef.current?.muteLocalAudioStream(!micMute); };
  const toggleCamara = async () => { setCamaraOff(!camaraOff); await engineRef.current?.muteLocalVideoStream(!camaraOff); };

  const formatearTiempo = (seg) => {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const colorBarra = tiempoRestante <= 10 ? '#EF4444' : tiempoRestante <= 30 ? '#F59E0B' : esPremium ? '#C44DFF' : '#22c55e';

  // Modal de tiempo agotado (free)
  const ModalTiempoAgotado = () => (
    <Modal transparent animationType="fade" visible={modalPremium}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalEmoji}>⏱</Text>
          <Text style={styles.modalTitulo}>Tiempo agotado</Text>
          <Text style={styles.modalDescripcion}>
            Los usuarios gratuitos tienen 1 minuto por videollamada.{'\n'}
            Con Premium tienes hasta 5 minutos.
          </Text>
          <View style={styles.modalFeatures}>
            {['5 min por videollamada', 'Sin anuncios', 'Matches ilimitados'].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#C44DFF" />
                <Text style={styles.featureTexto}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnPremium} onPress={() => { setModalPremium(false); finalizarLlamada(); }}>
            <LinearGradient colors={['#C44DFF', '#FF6B9D']} style={styles.btnPremiumGrad}>
              <Text style={styles.btnPremiumTexto}>Ver planes Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setModalPremium(false); finalizarLlamada(); }} style={{ marginTop: 10 }}>
            <Text style={styles.btnCerrarTexto}>Cerrar llamada</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Llamada entrante ─────────────────────────────────────────────
  if (llamada_entrante && estado === 'conectando') {
    return (
      <View style={[styles.fondo, styles.centrado, { paddingTop: insets.top }]}>
        <ModalTiempoAgotado />
        <View style={styles.llamadaEntranteCard}>
          <Text style={styles.llamadaEntranteTitulo}>📹 Videollamada entrante</Text>
          <View style={styles.avatarLlamada}>
            {otroUsuario?.profiles?.fotos?.[0]
              ? <Image source={{ uri: otroUsuario.profiles.fotos[0] }} style={styles.avatarImg} contentFit="cover" />
              : <Text style={{ fontSize: 48 }}>👤</Text>
            }
          </View>
          <Text style={styles.nombreLlamada}>{llamada_entrante.de || 'Tu match'}</Text>
          <View style={styles.botonesCalling}>
            <TouchableOpacity style={[styles.btnLlamada, { backgroundColor: COLORES.peligro }]} onPress={rechazarLlamada}>
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnLlamada, { backgroundColor: COLORES.verde }]} onPress={aceptarLlamada}>
              <Ionicons name="videocam" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.llamadaSubtitulo}>
            {esPremium ? '⭐ Premium · hasta 5 minutos' : '🕐 Gratis · hasta 1 minuto'}
          </Text>
        </View>
      </View>
    );
  }

  // ── Videollamada en curso ────────────────────────────────────────
  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      <ModalTiempoAgotado />

      {/* Video remoto */}
      <View style={styles.videoFondo}>
        {engineListo && RtcEngine && AgoraView
          ? null
          : (
            <View style={styles.videoDemo}>
              <View style={styles.avatarVideo}>
                {otroUsuario?.profiles?.fotos?.[0]
                  ? <Image source={{ uri: otroUsuario.profiles.fotos[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  : <Text style={{ fontSize: 60 }}>👤</Text>
                }
              </View>
              <Text style={styles.modoDemoTexto}>
                {estado === 'conectando' ? 'Conectando...' : 'Modo demo · instala react-native-agora para video real'}
              </Text>
            </View>
          )
        }
      </View>

      {/* Mi video */}
      <View style={styles.miVideoContenedor}>
        {!camaraOff
          ? <View style={styles.miVideoDemo}><Text style={{ fontSize: 24 }}>🤳</Text></View>
          : <View style={[styles.miVideoDemo, { backgroundColor: '#333' }]}><Ionicons name="videocam-off" size={20} color="#999" /></View>
        }
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.nombreEnLlamada}>{otroUsuario?.nombre || 'Videollamada'}</Text>
        {estado === 'en_curso' && (
          <View style={styles.tiempoContenedor}>
            <View style={[styles.puntitoRojo, { backgroundColor: tiempoRestante <= 10 ? '#EF4444' : '#22c55e' }]} />
            <Text style={styles.tiempoTexto}>{formatearTiempo(duracion)}</Text>
            <Text style={[styles.tiempoTexto, { color: COLORES.muted, fontSize: 12 }]}>/ {formatearTiempo(LIMITE)}</Text>
          </View>
        )}
        {estado === 'conectando' && <ActivityIndicator color="#fff" size="small" />}
      </View>

      {/* Barra de tiempo */}
      {estado === 'en_curso' && (
        <View style={styles.barraContenedor}>
          <View style={styles.barraFondo}>
            <Animated.View style={[styles.barraProgreso, {
              width: barraAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: colorBarra,
            }]} />
          </View>
          <Text style={styles.barraTexto}>
            {tiempoRestante > 0 ? `Quedan ${formatearTiempo(tiempoRestante)} · ${esPremium ? 'Premium' : 'Gratis'}` : 'Tiempo agotado'}
          </Text>
        </View>
      )}

      {/* Controles */}
      <View style={styles.controles}>
        <TouchableOpacity style={[styles.btnControl, micMute && styles.btnControlActivo]} onPress={toggleMic}>
          <Ionicons name={micMute ? 'mic-off' : 'mic'} size={22} color="#fff" />
          <Text style={styles.btnControlLabel}>{micMute ? 'Activar mic' : 'Silenciar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnColgar, { backgroundColor: COLORES.peligro }]} onPress={finalizarLlamada}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnControl, camaraOff && styles.btnControlActivo]} onPress={toggleCamara}>
          <Ionicons name={camaraOff ? 'videocam-off' : 'videocam'} size={22} color="#fff" />
          <Text style={styles.btnControlLabel}>{camaraOff ? 'Encender' : 'Apagar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Badge plan */}
      <View style={[styles.premiumBadge, { backgroundColor: esPremium ? 'rgba(196,77,255,0.8)' : 'rgba(0,0,0,0.55)' }]}>
        <Text style={styles.premiumTexto}>{esPremium ? '⭐ Premium · 5 min' : '🕐 Gratis · 1 min'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  videoFondo: { flex: 1, backgroundColor: '#111' },
  videoDemo: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  avatarVideo: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#2d1b45', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  modoDemoTexto: { color: COLORES.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  miVideoContenedor: { position: 'absolute', top: 100, right: 16, width: 90, height: 130, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  miVideoDemo: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', gap: 6 },
  nombreEnLlamada: { fontSize: 20, fontWeight: '600', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  tiempoContenedor: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  puntitoRojo: { width: 6, height: 6, borderRadius: 3 },
  tiempoTexto: { color: '#fff', fontSize: 14, fontVariant: ['tabular-nums'] },
  // Barra de progreso
  barraContenedor: { position: 'absolute', bottom: 145, left: 20, right: 20, gap: 5 },
  barraFondo: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barraProgreso: { height: '100%', borderRadius: 3 },
  barraTexto: { color: COLORES.muted, fontSize: 11, textAlign: 'center' },
  // Controles
  controles: { position: 'absolute', bottom: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  btnControl: { alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16 },
  btnControlActivo: { backgroundColor: 'rgba(255,100,100,0.35)' },
  btnControlLabel: { color: COLORES.muted, fontSize: 10 },
  btnColgar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  premiumBadge: { position: 'absolute', top: 110, left: 16, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  premiumTexto: { color: '#fff', fontSize: 11, fontWeight: '600' },
  // Modal tiempo agotado
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1a1a2e', borderRadius: 28, padding: 28, alignItems: 'center', gap: 12, width: '100%', borderWidth: 1, borderColor: 'rgba(196,77,255,0.3)' },
  modalEmoji: { fontSize: 52 },
  modalTitulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  modalDescripcion: { fontSize: 14, color: COLORES.muted, textAlign: 'center', lineHeight: 20 },
  modalFeatures: { alignSelf: 'stretch', gap: 8, marginVertical: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(196,77,255,0.1)', borderRadius: 10, padding: 10 },
  featureTexto: { color: '#fff', fontSize: 13, fontWeight: '500' },
  btnPremium: { alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  btnPremiumGrad: { paddingVertical: 14, alignItems: 'center' },
  btnPremiumTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnCerrarTexto: { color: COLORES.muted, fontSize: 13, textDecorationLine: 'underline' },
  // Llamada entrante
  llamadaEntranteCard: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 24, padding: 32, alignItems: 'center', gap: 16 },
  llamadaEntranteTitulo: { fontSize: 18, color: '#C44DFF', fontWeight: '600' },
  avatarLlamada: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2d1b45', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#C44DFF' },
  avatarImg: { width: '100%', height: '100%' },
  nombreLlamada: { fontSize: 22, fontWeight: '700', color: '#fff' },
  botonesCalling: { flexDirection: 'row', gap: 40, marginTop: 8 },
  btnLlamada: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  llamadaSubtitulo: { color: COLORES.muted, fontSize: 12 },
});
