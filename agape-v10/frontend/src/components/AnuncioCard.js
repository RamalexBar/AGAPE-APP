// ================================================
// ÁGAPE v10 — Anuncio con AdMob RewardedAd Real
// Google AdMob SDK — Anuncio remunerado por ver
// ================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Dimensions, ActivityIndicator, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  RewardedAd, RewardedAdEventType, TestIds
} from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');

// ── AdMob Integration ──────────────────────────────────────────────
// IMPORTANTE: Este ID es distinto al "android_app_id" del app.json.
// El app.json necesita el App ID (formato ca-app-pub-XXXX~XXXX, con "~").
// Aquí necesitas el Ad Unit ID del anuncio "Rewarded" específico
// (formato ca-app-pub-XXXX/XXXX, con "/"), que se crea por separado
// en la consola de AdMob → Anuncios → Crear unidad de anuncio → Recompensado.
const ADMOB_REWARDED_ID = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
    ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'  // ← TODO: tu Ad Unit ID real de iOS (pendiente, aún sin cuenta Apple)
    : 'ca-app-pub-1150474313300582/4234467477'; // ← Ad Unit ID real de Android (Agape-Recompensado-Simple-Android)

let rewarded = RewardedAd.createForAdRequest(ADMOB_REWARDED_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export default function AnuncioCard({ visible, onRecompensa, onCerrar, onVerPremium }) {
  const [cargandoAd, setCargandoAd] = useState(false);
  const [adListo, setAdListo] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      const cleanup = precargarAnuncio();
      return cleanup;
    }
  }, [visible]);

  const precargarAnuncio = () => {
    setCargandoAd(true);
    setAdListo(false);

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED, () => {
        setCargandoAd(false);
        setAdListo(true);
      }
    );
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD, () => {
        // El usuario completó el anuncio → dar recompensa
        onRecompensa?.();
      }
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  };

  const verAnuncio = async () => {
    if (!adListo) return;
    setCargandoAd(true);
    try {
      await rewarded.show();
      // Después de mostrarse, se prepara una nueva instancia para la próxima vez
      rewarded = RewardedAd.createForAdRequest(ADMOB_REWARDED_ID, {
        requestNonPersonalizedAdsOnly: true,
      });
    } catch (e) {
      // Anuncio no disponible
      onCerrar?.();
    } finally {
      setCargandoAd(false);
      setAdListo(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#1B2B4A', '#0f0f1a']} style={styles.gradient}>

            <View style={styles.iconWrap}>
              <Ionicons name="play-circle" size={52} color="#C9A84C" />
            </View>

            <Text style={styles.titulo}>+6 conexiones gratis</Text>
            <Text style={styles.subtitulo}>
              Mira un breve anuncio y desbloquea 6 swipes adicionales para hoy.
            </Text>

            {/* Estado del anuncio */}
            {cargandoAd ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#C9A84C" size="small" />
                <Text style={styles.loadingTxt}>Preparando anuncio...</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={verAnuncio}
                disabled={!adListo}
                style={styles.btnVerWrap}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#C9A84C', '#A07830']} style={styles.btnVer}>
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.btnVerTxt}>Ver anuncio y obtener +6 swipes</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Alternativa: Premium */}
            <TouchableOpacity onPress={onVerPremium} style={styles.btnPremium}>
              <Text style={styles.btnPremiumTxt}>Mejor me hago Premium — swipes ilimitados</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onCerrar} style={styles.btnCerrar}>
              <Text style={styles.btnCerrarTxt}>Ahora no</Text>
            </TouchableOpacity>

            {/* Nota legal pequeña */}
            <Text style={styles.notaLegal}>
              Los anuncios son breves (~30 segundos). Máx 2 por día.
            </Text>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: { width: '100%', maxWidth: 360, borderRadius: 24, overflow: 'hidden' },
  gradient: { padding: 32, alignItems: 'center' },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 10 },
  subtitulo: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  loadingTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  btnVerWrap: { width: '100%', marginBottom: 12 },
  btnVer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  btnVerTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnPremium: { paddingVertical: 12, paddingHorizontal: 8 },
  btnPremiumTxt: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  btnCerrar: { paddingVertical: 10 },
  btnCerrarTxt: { fontSize: 12, color: 'rgba(255,255,255,0.28)' },
  notaLegal: { fontSize: 9, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 8 },
});