// ================================================
// ÁGAPE v10 — Home / Swipe Screen
// Rediseñado: UX superior, código limpio, profesional
// ================================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, ActivityIndicator, Vibration, Dimensions, Platform,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { matchAPI, activeAPI } from '../services/api';
import { COLORES, SOMBRAS } from '../utils/constants';
import { msAContador } from '../utils/helpers';
import MatchModal from '../components/MatchModal';

const { width, height } = Dimensions.get('window');
const CARD_H = height * 0.62;

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    user, perfilesFeed, setPerfilesFeed, removerPerfilFeed,
    setNuevoMatch, likesRestantes, likesSiguienteReset, usarLike, verificarLikes,
  } = useStore();

  const [cargando,        setCargando]        = useState(true);
  const [contadorSwipes,  setContadorSwipes]  = useState(0);
  const [procesando,      setProcesando]      = useState(false);
  const [contadorActivos, setContadorActivos] = useState(0);
  const [tiempoReset,     setTiempoReset]     = useState('');
  const [cardIndex,       setCardIndex]       = useState(0);

  const swiperRef  = useRef(null);
  const likeAnim   = useRef(new Animated.Value(0)).current;
  const nopeAnim   = useRef(new Animated.Value(0)).current;
  const superAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  const esPremium = user?.premium || user?.subscription_type === 'premium';

  // ── Inicialización ──────────────────────────────────
  useEffect(() => {
    cargarFeed();
    verificarLikes();
    activeAPI.getContador()
      .then(r => setContadorActivos(r.data?.total_activos || 0))
      .catch(() => {});

    // Animación pulsante en botón like
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // ── Contador regresivo para reset de likes ──────────
  useEffect(() => {
    if (!likesSiguienteReset || esPremium) return;
    const iv = setInterval(() => {
      const diff = likesSiguienteReset - Date.now();
      if (diff <= 0) { verificarLikes(); clearInterval(iv); return; }
      setTiempoReset(msAContador(diff));
    }, 1000);
    return () => clearInterval(iv);
  }, [likesSiguienteReset, esPremium]);

  const cargarFeed = useCallback(async () => {
    try {
      setCargando(true);
      const { data } = await matchAPI.getFeed(20);
      setPerfilesFeed(data.perfiles || data.feed || []);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los perfiles. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  // ── Animaciones de overlay ──────────────────────────
  const animarOverlay = (tipo) => {
    const anim = tipo === 'like' ? likeAnim : tipo === 'nope' ? nopeAnim : superAnim;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  // ── Lógica principal de swipe ────────────────────────
  const manejarSwipe = useCallback(async (idx, tipo) => {
    if (procesando) return;
    const perfil = perfilesFeed[idx];
    if (!perfil) return;

    if (tipo !== 'dislike') {
      const puedeLike = await usarLike();
      if (!puedeLike) {
        Alert.alert(
          '💔 Sin likes',
          `Usaste tus ${20} likes gratis.\nVuelven en ${tiempoReset || '12h'}.`,
          [
            { text: 'Esperar', style: 'cancel' },
            { text: '⭐ Ver Premium', onPress: () => navigation.navigate('Premium') },
          ]
        );
        return;
      }
    }

    animarOverlay(tipo === 'dislike' ? 'nope' : tipo === 'superlike' ? 'super' : 'like');
    if (Platform.OS === 'ios') {
      Vibration.vibrate(tipo === 'superlike' ? [0,40,40,40] : 25);
    }

    setProcesando(true);
    try {
      const { data } = await matchAPI.swipe(perfil.id, tipo);
      removerPerfilFeed(perfil.id);

      if (data.es_match && data.match) {
        setTimeout(() => setNuevoMatch(data.match), 500);
      }

      const nuevo = contadorSwipes + 1;
      setContadorSwipes(nuevo);

      // Recargar feed cuando quedan pocos perfiles
      if (perfilesFeed.length - idx <= 4) cargarFeed();
    } catch (e) {
      console.error('Swipe error:', e);
    } finally {
      setProcesando(false);
    }
  }, [procesando, perfilesFeed, contadorSwipes, tiempoReset]);

  const swipeDerecha  = () => swiperRef.current?.swipeRight();
  const swipeIzquierda= () => swiperRef.current?.swipeLeft();
  const swipeArriba   = () => swiperRef.current?.swipeTop();

  // ── Tarjeta de perfil ───────────────────────────────
  const renderTarjeta = (perfil) => {
    const fotos  = perfil?.profiles?.fotos || perfil?.fotos || [];
    const nombre = perfil?.profiles?.nombre || perfil?.nombre || 'Usuario';
    const edad   = perfil?.profiles?.edad   || perfil?.edad   || '';
    const ciudad = perfil?.profiles?.ciudad || perfil?.ciudad || '';
    const bio    = perfil?.profiles?.bio    || perfil?.bio    || '';
    const compat = perfil?.compatibilidad   || Math.floor(Math.random() * 20 + 75);
    const intereses = (perfil?.profiles?.intereses || perfil?.intereses || []).slice(0, 3);

    return (
      <View style={styles.tarjeta}>
        {fotos.length > 0 ? (
          <Image
            source={{ uri: fotos[0] }}
            style={styles.fotoTarjeta}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient
            colors={['#2d1b45', '#1a0533']}
            style={[styles.fotoTarjeta, styles.fotoPlaceholder]}
          >
            <Ionicons name="person" size={72} color="rgba(255,255,255,0.15)" />
          </LinearGradient>
        )}

        {/* Gradiente inferior */}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,20,0.75)', 'rgba(10,10,20,0.97)']}
          style={styles.gradienteTarjeta}
        >
          <View style={styles.infoTarjeta}>
            {/* Nombre + badges */}
            <View style={styles.filaHeader}>
              <Text style={styles.nombreEdad}>
                {nombre}{edad ? `, ${edad}` : ''}
              </Text>
              {perfil?.is_verified && (
                <View style={styles.badgeVerificado}>
                  <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                </View>
              )}
              {perfil?.premium && (
                <View style={styles.badgePremium}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                </View>
              )}
            </View>

            {ciudad ? (
              <View style={styles.filaUbicacion}>
                <Ionicons name="location-outline" size={13} color={COLORES.muted} />
                <Text style={styles.ubicacion}>{ciudad}</Text>
              </View>
            ) : null}

            {bio ? (
              <Text style={styles.bio} numberOfLines={2}>{bio}</Text>
            ) : null}

            {/* Intereses */}
            {intereses.length > 0 && (
              <View style={styles.filaIntereses}>
                {intereses.map((int, i) => (
                  <View key={i} style={styles.chipInteres}>
                    <Text style={styles.chipTexto}>{int}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Barra de compatibilidad */}
            <View style={styles.filaCompat}>
              <View style={styles.compatLeft}>
                <Ionicons name="heart" size={12} color={COLORES.primario} />
                <Text style={styles.compatTexto}>{compat}% compatible</Text>
              </View>
              <View style={styles.barraFondo}>
                <LinearGradient
                  colors={COLORES.gradPrimario}
                  style={[styles.barraRelleno, { width: `${compat}%` }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Overlays de swipe */}
        <Animated.View style={[styles.overlayLike, { opacity: likeAnim }]}>
          <Text style={styles.overlayTexto}>LIKE 💕</Text>
        </Animated.View>
        <Animated.View style={[styles.overlayNope, { opacity: nopeAnim }]}>
          <Text style={styles.overlayTexto}>NOPE ✗</Text>
        </Animated.View>
        <Animated.View style={[styles.overlaySuper, { opacity: superAnim }]}>
          <Text style={styles.overlayTexto}>SUPER ⭐</Text>
        </Animated.View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────
  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ActivosAhora')}>
          <Text style={styles.logoTexto}>✦ ÁGAPE</Text>
        </TouchableOpacity>

        <View style={styles.headerCentro}>
          {contadorActivos > 0 && (
            <View style={styles.activosBadge}>
              <View style={styles.puntitoVerde} />
              <Text style={styles.activosTexto}>{contadorActivos} activos</Text>
            </View>
          )}
        </View>

        <View style={styles.headerDerecha}>
          <TouchableOpacity
            style={[styles.likesBadge, likesRestantes === 0 && styles.likesBadgeVacio]}
            onPress={() => !esPremium && likesRestantes === 0 && navigation.navigate('Premium')}
          >
            <Ionicons name="heart" size={13} color={likesRestantes > 0 ? COLORES.primario : '#555'} />
            <Text style={[styles.likesTexto, likesRestantes === 0 && { color: '#555' }]}>
              {esPremium ? '∞' : likesRestantes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Logros')} style={styles.btnIcono}>
            <Ionicons name="trophy-outline" size={22} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Banner sin likes ── */}
      {!esPremium && likesRestantes === 0 && (
        <TouchableOpacity onPress={() => navigation.navigate('Premium')} activeOpacity={0.9}>
          <LinearGradient
            colors={['#B44DFF', '#FF5C8D']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.bannerSinLikes}
          >
            <Ionicons name="heart-dislike" size={15} color="#fff" />
            <Text style={styles.bannerTexto}>
              Sin likes · Recargan en {tiempoReset}
            </Text>
            <Text style={styles.bannerCta}>Premium →</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Feed ── */}
      <View style={styles.swiperContenedor}>
        {cargando ? (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={COLORES.secundario} />
            <Text style={styles.cargandoTexto}>Encontrando personas...</Text>
          </View>
        ) : perfilesFeed.length === 0 ? (
          <View style={styles.centrado}>
            <Text style={{ fontSize: 52 }}>😴</Text>
            <Text style={styles.sinPerfilesTexto}>Sin más perfiles</Text>
            <Text style={styles.sinPerfilesSub}>Amplía tus filtros o vuelve más tarde</Text>
            <TouchableOpacity onPress={cargarFeed} style={styles.btnRecargar}>
              <Text style={styles.btnRecargarTexto}>Recargar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Swiper
            ref={swiperRef}
            cards={perfilesFeed}
            renderCard={renderTarjeta}
            onSwipedRight={(i)  => manejarSwipe(i, 'like')}
            onSwipedLeft={(i)   => manejarSwipe(i, 'dislike')}
            onSwipedTop={(i)    => manejarSwipe(i, 'superlike')}
            onSwipedAll={cargarFeed}
            stackSize={3}
            stackScale={9}
            stackSeparation={16}
            animateCardOpacity
            swipeBackCard
            backgroundColor="transparent"
            cardVerticalMargin={0}
            cardHorizontalMargin={0}
            overlayLabels={{
              left: {
                title: 'NOPE',
                style: {
                  label: { backgroundColor: COLORES.nope, borderColor: COLORES.nope, color: '#fff', borderWidth: 2, fontSize: 22, borderRadius: 10, padding: 10 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 24, marginLeft: -20 },
                },
              },
              right: {
                title: 'LIKE',
                style: {
                  label: { backgroundColor: COLORES.like, borderColor: COLORES.like, color: '#fff', borderWidth: 2, fontSize: 22, borderRadius: 10, padding: 10 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 24, marginLeft: 20 },
                },
              },
              top: {
                title: 'SUPER ⭐',
                style: {
                  label: { backgroundColor: COLORES.superlike, borderColor: COLORES.superlike, color: '#fff', borderWidth: 2, fontSize: 22, borderRadius: 10, padding: 10 },
                  wrapper: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 },
                },
              },
            }}
          />
        )}
      </View>

      {/* ── Controles ── */}
      {!cargando && perfilesFeed.length > 0 && (
        <View style={[styles.controles, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={[styles.btnControl, styles.btnNope]} onPress={swipeIzquierda} activeOpacity={0.85}>
            <Ionicons name="close" size={28} color={COLORES.nope} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnControl, styles.btnSuperLike]} onPress={swipeArriba} activeOpacity={0.85}>
            <Ionicons name="star" size={22} color={COLORES.superlike} />
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={[styles.btnControl, styles.btnLike]} onPress={swipeDerecha} activeOpacity={0.85}>
              <Ionicons name="heart" size={30} color={COLORES.like} />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.btnControl, styles.btnBoost]}
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={22} color={COLORES.boost} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Match Modal ── */}
      <MatchModal navigation={navigation} onVerChat={(match) => {
        navigation.navigate('Chat', { match, usuario: match.usuario });
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor:       { flex: 1, backgroundColor: COLORES.fondo },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  logoTexto:        { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  headerCentro:     { flex: 1, alignItems: 'center' },
  headerDerecha:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activosBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  puntitoVerde:     { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORES.verde },
  activosTexto:     { color: COLORES.verde, fontSize: 11, fontWeight: '600' },
  likesBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,92,141,0.12)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  likesBadgeVacio:  { backgroundColor: 'rgba(80,80,80,0.15)' },
  likesTexto:       { color: COLORES.primario, fontSize: 13, fontWeight: '700' },
  btnIcono:         { padding: 4 },
  bannerSinLikes:   { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  bannerTexto:      { flex: 1, color: '#fff', fontSize: 12, fontWeight: '500' },
  bannerCta:        { color: '#fff', fontWeight: '800', fontSize: 12 },
  swiperContenedor: { flex: 1, marginHorizontal: 14 },
  centrado:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  cargandoTexto:    { color: COLORES.muted, marginTop: 10, fontSize: 14 },
  sinPerfilesTexto: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sinPerfilesSub:   { color: COLORES.muted, fontSize: 14, textAlign: 'center' },
  btnRecargar:      { marginTop: 4, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: COLORES.secundario },
  btnRecargarTexto: { color: COLORES.secundario, fontWeight: '700', fontSize: 14 },
  // Tarjeta
  tarjeta:          { height: CARD_H, borderRadius: 22, overflow: 'hidden', backgroundColor: '#141422', ...SOMBRAS.media },
  fotoTarjeta:      { width: '100%', height: '100%', position: 'absolute' },
  fotoPlaceholder:  { justifyContent: 'center', alignItems: 'center' },
  gradienteTarjeta: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', justifyContent: 'flex-end', padding: 18 },
  infoTarjeta:      { gap: 6 },
  filaHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombreEdad:       { fontSize: 23, fontWeight: '800', color: '#fff' },
  badgeVerificado:  { backgroundColor: 'rgba(74,222,128,0.15)', borderRadius: 10, padding: 2 },
  badgePremium:     { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 10, padding: 2 },
  filaUbicacion:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ubicacion:        { fontSize: 12, color: COLORES.muted },
  bio:              { fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 18 },
  filaIntereses:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chipInteres:      { backgroundColor: 'rgba(180,77,255,0.20)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5, borderColor: 'rgba(180,77,255,0.4)' },
  chipTexto:        { color: '#D0A0FF', fontSize: 11, fontWeight: '600' },
  filaCompat:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  compatLeft:       { flexDirection: 'row', alignItems: 'center', gap: 4, width: 110 },
  compatTexto:      { fontSize: 11, color: COLORES.muted },
  barraFondo:       { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barraRelleno:     { height: '100%', borderRadius: 2 },
  // Overlays
  overlayLike:      { position: 'absolute', top: 36, left: 18, backgroundColor: 'rgba(255,92,141,0.88)', borderRadius: 12, padding: 10, transform: [{ rotate: '-12deg' }] },
  overlayNope:      { position: 'absolute', top: 36, right: 18, backgroundColor: 'rgba(255,85,85,0.88)', borderRadius: 12, padding: 10, transform: [{ rotate: '12deg' }] },
  overlaySuper:     { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: 'rgba(0,201,255,0.88)', borderRadius: 12, padding: 10 },
  overlayTexto:     { color: '#fff', fontSize: 20, fontWeight: '900' },
  // Controles
  controles:        { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, gap: 18 },
  btnControl:       { justifyContent: 'center', alignItems: 'center', borderRadius: 50, ...SOMBRAS.suave },
  btnNope:          { width: 56, height: 56, backgroundColor: '#141422', borderWidth: 1.5, borderColor: COLORES.nope },
  btnLike:          { width: 68, height: 68, backgroundColor: '#141422', borderWidth: 1.5, borderColor: COLORES.like },
  btnSuperLike:     { width: 50, height: 50, backgroundColor: '#141422', borderWidth: 1.5, borderColor: COLORES.superlike },
  btnBoost:         { width: 50, height: 50, backgroundColor: '#141422', borderWidth: 1.5, borderColor: COLORES.boost },
});
