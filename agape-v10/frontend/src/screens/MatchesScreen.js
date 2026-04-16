// ================================================
// ÁGAPE v10 — Matches Screen
// Lista de matches + quién te dio like
// ================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matchAPI } from '../services/api';
import useStore from '../store/useStore';
import { COLORES, SOMBRAS } from '../utils/constants';
import { tiempoRelativo, obtenerIniciales, colorAvatar } from '../utils/helpers';

export default function MatchesScreen({ navigation }) {
  const { user } = useStore();
  const insets   = useSafeAreaInsets();
  const [matches,        setMatches]        = useState([]);
  const [likesRecibidos, setLikesRecibidos] = useState(0);
  const [cargando,       setCargando]       = useState(true);
  const [refrescando,    setRefrescando]    = useState(false);

  const esPremium = user?.premium || user?.subscription_type === 'premium';

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [matchRes, likesRes] = await Promise.all([
        matchAPI.getMatches(),
        matchAPI.getLikesRecibidos().catch(() => ({ data: { total: 0 } })),
      ]);
      setMatches(matchRes.data?.matches || []);
      setLikesRecibidos(likesRes.data?.total || 0);
    } catch {}
    finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, []);

  const renderMatch = ({ item }) => {
    const otro  = item.user1_id === user?.id ? item.user2 : item.user1;
    const foto  = otro?.profiles?.fotos?.[0];
    const nombre= otro?.profiles?.nombre || otro?.nombre || 'Usuario';
    const ultimo= item.ultimo_mensaje;
    const esNuevo = !item.ultimo_mensaje;
    const iniciales= obtenerIniciales(nombre);
    const colorBase= colorAvatar(nombre);

    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => navigation.navigate('Chat', { match: item, usuario: otro })}
        activeOpacity={0.75}
      >
        <View style={styles.avatarContenedor}>
          <View style={[styles.avatarWrapper, { borderColor: esNuevo ? COLORES.primario : 'transparent' }]}>
            {foto
              ? <Image source={{ uri: foto }} style={styles.avatar} contentFit="cover" />
              : (
                <View style={[styles.avatar, { backgroundColor: colorBase, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{iniciales}</Text>
                </View>
              )
            }
          </View>
          {esNuevo && <View style={styles.puntitoBadge} />}
        </View>

        <View style={styles.matchInfo}>
          <View style={styles.matchInfoHeader}>
            <Text style={styles.matchNombre}>{nombre}</Text>
            {item.updated_at && (
              <Text style={styles.matchTiempo}>{tiempoRelativo(item.updated_at)}</Text>
            )}
          </View>
          <Text style={styles.matchMensaje} numberOfLines={1}>
            {ultimo || '💕 ¡Nuevo match! Saluda primero'}
          </Text>
        </View>

        {esNuevo && (
          <View style={styles.badgeNuevo}>
            <Text style={styles.badgeNuevoTexto}>NUEVO</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={COLORES.gradFondo} style={styles.fondo}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.titulo}>Mensajes</Text>
        <TouchableOpacity onPress={() => cargar(true)} style={styles.btnRefresh}>
          <Ionicons name="refresh" size={20} color={COLORES.muted} />
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator color={COLORES.secundario} size="large" />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id || item.match_id}
          renderItem={renderMatch}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => { setRefrescando(true); cargar(true); }}
              tintColor={COLORES.secundario}
            />
          }
          ListHeaderComponent={() => (
            <View>
              {/* Card: quién te dio like */}
              {likesRecibidos > 0 && (
                <TouchableOpacity
                  style={styles.likesCard}
                  onPress={() => !esPremium && navigation.navigate('Premium')}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#B44DFF', '#FF5C8D']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.likesGrad}
                  >
                    <View style={styles.likesIconWrap}>
                      {esPremium
                        ? <Ionicons name="heart" size={32} color="#fff" />
                        : <Text style={{ fontSize: 28 }}>👀</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.likesTitulo}>
                        {likesRecibidos} {likesRecibidos === 1 ? 'persona te dio like' : 'personas te dieron like'}
                      </Text>
                      <Text style={styles.likesSub}>
                        {esPremium ? 'Toca para ver quiénes son' : 'Activa Premium para descubrirlos'}
                      </Text>
                    </View>
                    {!esPremium && (
                      <View style={styles.likesCta}>
                        <Text style={styles.likesCtaTexto}>Ver →</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={styles.seccionTitulo}>
                {matches.length > 0 ? `${matches.length} conversaciones` : ''}
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.vacio}>
              <Text style={{ fontSize: 52 }}>💔</Text>
              <Text style={styles.vacioTexto}>Sin matches todavía</Text>
              <Text style={styles.vacioSub}>Sigue explorando perfiles</Text>
              <TouchableOpacity
                style={styles.btnExplorar}
                onPress={() => navigation.navigate('Explorar')}
              >
                <LinearGradient colors={COLORES.gradPrimario} style={styles.btnExplorarGrad}>
                  <Text style={styles.btnExplorarTexto}>Explorar ahora</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listaContent}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo:           { flex: 1 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  titulo:          { fontSize: 26, fontWeight: '800', color: '#fff' },
  btnRefresh:      { padding: 6 },
  centrado:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listaContent:    { paddingHorizontal: 16, paddingBottom: 40 },
  // Likes card
  likesCard:       { borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  likesGrad:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  likesIconWrap:   { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  likesTitulo:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  likesSub:        { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 2 },
  likesCta:        { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  likesCtaTexto:   { color: '#fff', fontWeight: '800', fontSize: 13 },
  seccionTitulo:   { fontSize: 13, fontWeight: '600', color: COLORES.muted, marginBottom: 6, marginLeft: 2 },
  // Match item
  matchItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: COLORES.bordeCard },
  avatarContenedor:{ position: 'relative' },
  avatarWrapper:   { borderRadius: 32, borderWidth: 2, borderColor: 'transparent' },
  avatar:          { width: 56, height: 56, borderRadius: 28 },
  puntitoBadge:    { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: COLORES.primario, borderWidth: 2, borderColor: COLORES.fondo },
  matchInfo:       { flex: 1 },
  matchInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchNombre:     { color: '#fff', fontSize: 15, fontWeight: '600' },
  matchTiempo:     { color: COLORES.muted, fontSize: 11 },
  matchMensaje:    { color: COLORES.muted, fontSize: 13, marginTop: 2 },
  badgeNuevo:      { backgroundColor: COLORES.primario, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeNuevoTexto: { color: '#fff', fontSize: 10, fontWeight: '700' },
  // Vacío
  vacio:           { alignItems: 'center', marginTop: 70, gap: 10 },
  vacioTexto:      { color: '#fff', fontSize: 20, fontWeight: '700' },
  vacioSub:        { color: COLORES.muted, fontSize: 14 },
  btnExplorar:     { marginTop: 10, borderRadius: 16, overflow: 'hidden' },
  btnExplorarGrad: { paddingHorizontal: 30, paddingVertical: 14 },
  btnExplorarTexto:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
