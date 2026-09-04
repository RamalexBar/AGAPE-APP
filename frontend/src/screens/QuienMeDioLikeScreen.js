// ================================================
// ÁGAPE — Quién me dio like (Premium)
// Antes: el backend ya devolvía la lista completa (GET /api/matches/likes)
// pero no existía ninguna pantalla para verla — el botón premium no hacía nada.
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
import { COLORES } from '../utils/constants';
import { tiempoRelativo, obtenerIniciales, colorAvatar } from '../utils/helpers';

export default function QuienMeDioLikeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [likes, setLikes]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesando, setProcesando]   = useState(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const { data } = await matchAPI.getLikesRecibidos();
      setLikes(data?.likes || []);
    } catch {
      setLikes([]);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const darLikeDeVuelta = async (persona) => {
    setProcesando(persona.from_user_id);
    try {
      await matchAPI.darLike(persona.from_user_id, persona.connection_type || 'friendship');
      // Si se vuelve match, el listener global de sockets (AppNavigator) ya
      // muestra el MatchModal automáticamente en cualquier pantalla.
      setLikes(prev => prev.filter(l => l.from_user_id !== persona.from_user_id));
    } catch {
      // el límite diario u otro error ya se refleja simplemente al no quitar la card
    } finally {
      setProcesando(null);
    }
  };

  const pasar = (persona) => {
    setLikes(prev => prev.filter(l => l.from_user_id !== persona.from_user_id));
  };

  const renderItem = ({ item }) => {
    const otro = item.from_user || {};
    const foto = otro.avatar_url;
    const nombre = otro.nombre || 'Alguien';
    const iniciales = obtenerIniciales(nombre);
    const colorBase = colorAvatar(nombre);
    const enCurso = procesando === item.from_user_id;

    return (
      <View style={styles.card}>
        {foto
          ? <Image source={{ uri: foto }} style={styles.foto} contentFit="cover" />
          : (
            <View style={[styles.foto, { backgroundColor: colorBase, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{iniciales}</Text>
            </View>
          )
        }
        <View style={styles.info}>
          <Text style={styles.nombre}>{nombre}</Text>
          {item.created_at && <Text style={styles.tiempo}>{tiempoRelativo(item.created_at)}</Text>}
        </View>
        <View style={styles.acciones}>
          <TouchableOpacity style={styles.btnPasar} onPress={() => pasar(item)} disabled={enCurso}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnLike} onPress={() => darLikeDeVuelta(item)} disabled={enCurso}>
            {enCurso
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="heart" size={20} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={COLORES.gradFondo} style={styles.fondo}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Quién te dio like</Text>
        <View style={{ width: 32 }} />
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator color={COLORES.secundario} size="large" />
        </View>
      ) : (
        <FlatList
          data={likes}
          keyExtractor={item => String(item.from_user_id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(true); }} tintColor={COLORES.secundario} />
          }
          contentContainerStyle={styles.listaContent}
          ListEmptyComponent={() => (
            <View style={styles.vacio}>
              <Text style={{ fontSize: 52 }}>👀</Text>
              <Text style={styles.vacioTexto}>Nadie te ha dado like todavía</Text>
              <Text style={styles.vacioSub}>Sigue explorando, pronto aparecerán aquí</Text>
            </View>
          )}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  btnVolver: { padding: 4 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listaContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORES.bordeCard,
  },
  foto: { width: 56, height: 56, borderRadius: 28 },
  info: { flex: 1 },
  nombre: { color: '#fff', fontSize: 15, fontWeight: '600' },
  tiempo: { color: COLORES.muted, fontSize: 12, marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 8 },
  btnPasar: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnLike: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORES.primario,
  },
  vacio: { alignItems: 'center', marginTop: 70, gap: 10 },
  vacioTexto: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  vacioSub: { color: COLORES.muted, fontSize: 14, textAlign: 'center' },
});
