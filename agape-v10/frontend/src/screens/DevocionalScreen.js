// ================================================
// ÁGAPE v10 — Camino Espiritual
// Devocional del día + misiones diarias/semanales
// ================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spiritualAPI } from '../services/api';
import { COLORES } from '../utils/constants';

export default function DevocionalScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [devocional,  setDevocional]  = useState(null);
  const [misiones,    setMisiones]    = useState(null);
  const [cargando,    setCargando]    = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [misionEnCurso, setMisionEnCurso] = useState(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [resDev, resMis] = await Promise.all([
        spiritualAPI.getDevocional(),
        spiritualAPI.getRetos(),
      ]);
      setDevocional(resDev.data);
      setMisiones(resMis.data);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar tu camino espiritual. Intenta de nuevo.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const marcarLeido = async () => {
    if (completando || devocional?.ya_leido) return;
    setCompletando(true);
    try {
      const { data } = await spiritualAPI.completarDevocional(devocional?.versiculo?.id);
      if (data.ya_completado) {
        setDevocional(d => ({ ...d, ya_leido: true }));
        return;
      }
      setDevocional(d => ({
        ...d,
        ya_leido: true,
        racha_actual: data.racha ?? d.racha_actual,
      }));
      const extra = data.subio_nivel ? `\n¡Subiste al nivel ${data.nivel_nuevo?.nivel ?? data.nivel_nuevo}! 🎉` : '';
      Alert.alert('🙏 ¡Bien hecho!', `${data.mensaje}\n+${data.xp_ganado} XP · +${data.monedas_ganadas} monedas${extra}`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error?.message || 'No se pudo registrar tu devocional.');
    } finally {
      setCompletando(false);
    }
  };

  const completarMision = async (mision) => {
    if (misionEnCurso || mision.completada) return;
    setMisionEnCurso(mision.id);
    try {
      const { data } = await spiritualAPI.completarReto(mision.id);
      if (data.ya_completada) {
        setMisiones(m => actualizarMisionCompletada(m, mision.id));
        return;
      }
      setMisiones(m => actualizarMisionCompletada(m, mision.id));
      const extra = data.xp_result?.subio_nivel ? `\n¡Subiste al nivel ${data.xp_result.nivel?.nivel ?? data.xp_result.nivel}! 🎉` : '';
      Alert.alert('✨ Misión completada', `${data.mensaje}${extra}`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error?.message || 'No se pudo completar la misión.');
    } finally {
      setMisionEnCurso(null);
    }
  };

  const actualizarMisionCompletada = (m, misionId) => {
    if (!m) return m;
    const marcar = (lista) => lista.map(x => x.id === misionId ? { ...x, completada: true } : x);
    return {
      ...m,
      diarias: marcar(m.diarias || []),
      semanales: marcar(m.semanales || []),
      especiales: marcar(m.especiales || []),
    };
  };

  const MisionItem = ({ mision }) => (
    <View style={[styles.misionCard, mision.completada && styles.misionCardCompletada]}>
      <View style={[styles.misionIcono, mision.completada && styles.misionIconoCompletado]}>
        <Text style={{ fontSize: 22 }}>{mision.emoji}</Text>
      </View>
      <View style={styles.misionInfo}>
        <Text style={styles.misionTitulo}>{mision.titulo}</Text>
        <Text style={styles.misionDesc}>{mision.descripcion}</Text>
        <Text style={styles.misionRecompensa}>+{mision.xp} XP · +{mision.monedas} monedas</Text>
      </View>
      {mision.completada ? (
        <View style={styles.misionCheck}>
          <Ionicons name="checkmark-circle" size={24} color={COLORES.verde} />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.misionBtn}
          onPress={() => completarMision(mision)}
          disabled={misionEnCurso === mision.id}
        >
          {misionEnCurso === mision.id
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.misionBtnTexto}>Completar</Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );

  if (cargando) {
    return (
      <View style={[styles.fondo, styles.centrado]}>
        <ActivityIndicator size="large" color={COLORES.secundario} />
      </View>
    );
  }

  const totalMisiones = (misiones?.diarias?.length || 0) + (misiones?.semanales?.length || 0) + (misiones?.especiales?.length || 0);

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Camino Espiritual</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(true); }} tintColor={COLORES.secundario} />
        }
      >
        {/* Racha */}
        <LinearGradient colors={['rgba(196,77,255,0.2)', 'rgba(255,107,157,0.1)']} style={styles.rachaCard}>
          <View style={styles.rachaItem}>
            <Text style={styles.rachaNum}>🔥 {devocional?.racha_actual ?? 0}</Text>
            <Text style={styles.rachaLabel}>Racha de días</Text>
          </View>
          <View style={styles.rachaSeparador} />
          <View style={styles.rachaItem}>
            <Text style={styles.rachaNum}>{devocional?.total_devocionales ?? 0}</Text>
            <Text style={styles.rachaLabel}>Devocionales</Text>
          </View>
        </LinearGradient>

        {/* Devocional del día */}
        <View style={styles.devCard}>
          <Text style={styles.devEtiqueta}>Devocional de hoy</Text>
          <Text style={styles.devVersiculo}>"{devocional?.versiculo?.texto}"</Text>
          <Text style={styles.devReferencia}>— {devocional?.versiculo?.referencia}</Text>

          {devocional?.reflexion && (
            <View style={styles.devSeccion}>
              <Text style={styles.devSeccionTitulo}>Reflexión</Text>
              <Text style={styles.devTexto}>{devocional.reflexion}</Text>
            </View>
          )}

          {devocional?.oracion && (
            <View style={styles.devSeccion}>
              <Text style={styles.devSeccionTitulo}>Oración</Text>
              <Text style={styles.devTexto}>{devocional.oracion}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnLeido, devocional?.ya_leido && styles.btnLeidoCompletado]}
            onPress={marcarLeido}
            disabled={completando || devocional?.ya_leido}
          >
            <LinearGradient
              colors={devocional?.ya_leido ? ['#2d2d3d', '#2d2d3d'] : COLORES.gradPrimario}
              style={styles.btnLeidoGrad}
            >
              {completando ? (
                <ActivityIndicator color="#fff" />
              ) : devocional?.ya_leido ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORES.verde} />
                  <Text style={styles.btnLeidoTexto}>Ya lo leíste hoy</Text>
                </>
              ) : (
                <>
                  <Ionicons name="book-outline" size={20} color="#fff" />
                  <Text style={styles.btnLeidoTexto}>Ya lo leí (+{devocional?.xp_disponible ?? 20} XP)</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Misiones */}
        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Text style={styles.seccionTitulo}>Misiones</Text>
            {misiones?.progreso_diario && (
              <Text style={styles.seccionProgreso}>
                {misiones.progreso_diario.completadas}/{misiones.progreso_diario.total} hoy
              </Text>
            )}
          </View>

          {totalMisiones === 0 ? (
            <Text style={styles.sinMisiones}>No hay misiones disponibles ahora mismo.</Text>
          ) : (
            <>
              {misiones?.diarias?.length > 0 && (
                <>
                  <Text style={styles.subtitulo}>Hoy</Text>
                  {misiones.diarias.map(m => <MisionItem key={m.id} mision={m} />)}
                </>
              )}
              {misiones?.semanales?.length > 0 && (
                <>
                  <Text style={[styles.subtitulo, { marginTop: 10 }]}>Esta semana</Text>
                  {misiones.semanales.map(m => <MisionItem key={m.id} mision={m} />)}
                </>
              )}
              {misiones?.especiales?.some(m => !m.completada) && (
                <>
                  <Text style={[styles.subtitulo, { marginTop: 10 }]}>Especiales</Text>
                  {misiones.especiales.filter(m => !m.completada).map(m => <MisionItem key={m.id} mision={m} />)}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo:    { flex: 1, backgroundColor: COLORES.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  btnVolver:{ padding: 4 },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#fff' },

  rachaCard: { flexDirection: 'row', borderRadius: 18, padding: 18, justifyContent: 'space-around' },
  rachaItem: { alignItems: 'center', gap: 4 },
  rachaNum:  { fontSize: 24, fontWeight: '800', color: '#fff' },
  rachaLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  rachaSeparador: { width: 0.5, backgroundColor: 'rgba(255,255,255,0.15)' },

  devCard: { backgroundColor: COLORES.fondoCard, borderRadius: 20, padding: 20, borderWidth: 0.5, borderColor: COLORES.bordeCard, gap: 10 },
  devEtiqueta: { fontSize: 12, fontWeight: '700', color: COLORES.secundario, textTransform: 'uppercase', letterSpacing: 1 },
  devVersiculo: { fontSize: 17, fontStyle: 'italic', color: '#fff', lineHeight: 25 },
  devReferencia:{ fontSize: 13, color: COLORES.muted, textAlign: 'right' },
  devSeccion: { marginTop: 8, gap: 4 },
  devSeccionTitulo: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  devTexto: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 21 },

  btnLeido: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  btnLeidoCompletado: { opacity: 0.9 },
  btnLeidoGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
  btnLeidoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },

  seccion: { gap: 10 },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: '#fff' },
  seccionProgreso: { fontSize: 12, color: COLORES.muted },
  subtitulo: { fontSize: 12, fontWeight: '700', color: COLORES.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  sinMisiones: { color: COLORES.muted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  misionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORES.fondoCard, borderRadius: 14, padding: 12, borderWidth: 0.5, borderColor: COLORES.bordeCard, marginBottom: 8 },
  misionCardCompletada: { opacity: 0.6 },
  misionIcono: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(196,77,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  misionIconoCompletado: { backgroundColor: 'rgba(74,222,128,0.15)' },
  misionInfo: { flex: 1, gap: 2 },
  misionTitulo: { fontSize: 14, fontWeight: '600', color: '#fff' },
  misionDesc: { fontSize: 12, color: COLORES.muted },
  misionRecompensa: { fontSize: 11, color: '#FFA500', marginTop: 2 },
  misionCheck: { padding: 4 },
  misionBtn: { backgroundColor: 'rgba(196,77,255,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
  misionBtnTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
