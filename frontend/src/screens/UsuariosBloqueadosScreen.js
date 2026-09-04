// ================================================
// ÁGAPE — Usuarios bloqueados
// Antes: se podía bloquear desde ReportButton, pero no había forma de
// ver ni desbloquear a nadie — el endpoint DELETE /block/:id existía sin UI.
// ================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI } from '../services/api';
import { COLORES } from '../utils/constants';
import { obtenerIniciales, colorAvatar } from '../utils/helpers';

export default function UsuariosBloqueadosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [bloqueados, setBloqueados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await profileAPI.getBlockedUsers();
      setBloqueados(data?.bloqueados || []);
    } catch {
      setBloqueados([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const desbloquear = (item) => {
    const nombre = item.blocked?.nombre || 'este usuario';
    Alert.alert('Desbloquear', `¿Quieres desbloquear a ${nombre}? Podrán verse de nuevo en el feed.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: async () => {
          setProcesando(item.blocked_id);
          try {
            await profileAPI.unblockUser(item.blocked_id);
            setBloqueados(prev => prev.filter(b => b.blocked_id !== item.blocked_id));
          } catch {
            Alert.alert('Error', 'No se pudo desbloquear al usuario.');
          } finally {
            setProcesando(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const otro = item.blocked || {};
    const nombre = otro.nombre || 'Usuario';
    const enCurso = procesando === item.blocked_id;

    return (
      <View style={styles.card}>
        {otro.avatar_url
          ? <Image source={{ uri: otro.avatar_url }} style={styles.foto} contentFit="cover" />
          : (
            <View style={[styles.foto, { backgroundColor: colorAvatar(nombre), justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{obtenerIniciales(nombre)}</Text>
            </View>
          )
        }
        <Text style={styles.nombre}>{nombre}</Text>
        <TouchableOpacity style={styles.btnDesbloquear} onPress={() => desbloquear(item)} disabled={enCurso}>
          {enCurso
            ? <ActivityIndicator size="small" color={COLORES.primario} />
            : <Text style={styles.btnDesbloquearTexto}>Desbloquear</Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient colors={COLORES.gradFondo} style={styles.fondo}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Usuarios bloqueados</Text>
        <View style={{ width: 32 }} />
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator color={COLORES.secundario} size="large" />
        </View>
      ) : (
        <FlatList
          data={bloqueados}
          keyExtractor={item => String(item.blocked_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listaContent}
          ListEmptyComponent={() => (
            <View style={styles.vacio}>
              <Text style={{ fontSize: 48 }}>🚫</Text>
              <Text style={styles.vacioTexto}>No has bloqueado a nadie</Text>
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
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORES.bordeCard,
  },
  foto: { width: 44, height: 44, borderRadius: 22 },
  nombre: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDesbloquear: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORES.primario,
  },
  btnDesbloquearTexto: { color: COLORES.primario, fontSize: 12, fontWeight: '700' },
  vacio: { alignItems: 'center', marginTop: 70, gap: 10 },
  vacioTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
