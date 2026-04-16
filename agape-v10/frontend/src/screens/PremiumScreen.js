// ================================================
// ÁGAPE v10 — Premium Screen
// Apple 3.1.1: Restaurar compras
// Apple 3.1.2: Texto legal de suscripción
// ================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { monetizationAPI } from '../services/api';
import { COLORES, PLANES, BENEFICIOS_PREMIUM } from '../utils/constants';

export default function PremiumScreen({ navigation }) {
  const [planSel,    setPlanSel]    = useState('trimestral');
  const [cargando,   setCargando]   = useState(false);
  const [restaurando,setRestaurando]= useState(false);
  const { user, actualizarUsuario } = useStore();
  const insets = useSafeAreaInsets();
  const planActual = PLANES.find(p => p.id === planSel);

  const handleComprar = async () => {
    if (cargando) return;
    setCargando(true);
    try {
      // ── IAP INTEGRATION ─────────────────────────────────────────
      // Para producción, descomenta el bloque correspondiente a tu plataforma:
      //
      // iOS (expo-in-app-purchases):
      // const IAP = require('expo-in-app-purchases');
      // await IAP.connectAsync();
      // const productId = planActual.productId.ios;
      // IAP.setPurchaseListener(async ({ responseCode, results }) => {
      //   if (responseCode === IAP.IAPResponseCode.OK) {
      //     for (const purchase of results) {
      //       if (!purchase.acknowledged) {
      //         await monetizationAPI.procesarCompra('apple', purchase.productId, purchase.transactionReceipt);
      //         await IAP.finishTransactionAsync(purchase, true);
      //         actualizarUsuario({ premium: true, subscription_type: 'premium' });
      //         Alert.alert('✅ Suscripción activada', '¡Bienvenido a Ágape Premium!');
      //         navigation.goBack();
      //       }
      //     }
      //   }
      // });
      // await IAP.purchaseItemAsync(productId);
      //
      // Android (react-native-iap):
      // Ver documentación en /backend/MONETIZACION.md
      // ─────────────────────────────────────────────────────────────
      Alert.alert(
        '🚀 Próximamente',
        'Las compras in-app estarán disponibles en la versión de producción.',
        [{ text: 'Entendido' }]
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo procesar la compra. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const handleRestaurar = async () => {
    if (restaurando) return;
    setRestaurando(true);
    try {
      // Restaurar compras (obligatorio Apple 3.1.1)
      // const IAP = require('expo-in-app-purchases');
      // await IAP.connectAsync();
      // const { responseCode, results } = await IAP.getPurchaseHistoryAsync();
      // if (results?.length > 0) { ... }
      Alert.alert('Restaurar compras', 'Verifica tus compras anteriores en la tienda de aplicaciones.');
    } catch {
      Alert.alert('Error', 'No se pudieron restaurar las compras.');
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <View style={[styles.fondo, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnCerrar}>
          <Ionicons name="close" size={26} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Ágape Premium</Text>
        <TouchableOpacity onPress={handleRestaurar} disabled={restaurando} style={styles.btnRestaurar}>
          {restaurando
            ? <ActivityIndicator size="small" color={COLORES.muted} />
            : <Text style={styles.btnRestaurarTexto}>Restaurar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient colors={['#2a0060', '#15052a']} style={styles.hero}>
          <Text style={styles.heroEmoji}>✝️</Text>
          <Text style={styles.heroTitulo}>Conecta sin límites</Text>
          <Text style={styles.heroSub}>
            Más swipes, más matches, filtros espirituales y mucho más
          </Text>
        </LinearGradient>

        {/* Beneficios */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Todo lo que incluye</Text>
          <View style={styles.beneficiosList}>
            {BENEFICIOS_PREMIUM.map((b, i) => (
              <View key={i} style={styles.beneficioItem}>
                <LinearGradient colors={COLORES.gradPrimario} style={styles.beneficioIcono}>
                  <Ionicons name={b.icono} size={16} color="#fff" />
                </LinearGradient>
                <Text style={styles.beneficioTexto}>{b.texto}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Planes */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Elige tu plan</Text>
          <View style={styles.planesGrid}>
            {PLANES.map((plan) => {
              const seleccionado = planSel === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, seleccionado && styles.planCardActivo]}
                  onPress={() => setPlanSel(plan.id)}
                  activeOpacity={0.85}
                >
                  {plan.popular && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeTexto}>MÁS POPULAR</Text>
                    </View>
                  )}
                  {plan.ahorro && (
                    <View style={styles.planAhorroBadge}>
                      <Text style={styles.planAhorroTexto}>{plan.ahorro}</Text>
                    </View>
                  )}
                  <Text style={styles.planNombre}>{plan.nombre}</Text>
                  <Text style={[styles.planPrecio, seleccionado && { color: COLORES.primario }]}>
                    {plan.precioUSD}
                  </Text>
                  <Text style={styles.planPrecioLocal}>{plan.precio}</Text>
                  <Text style={styles.planPeriodo}>por {plan.periodo}</Text>
                  {seleccionado && (
                    <View style={styles.planCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORES.primario} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Botón comprar */}
        <TouchableOpacity
          onPress={handleComprar}
          disabled={cargando}
          activeOpacity={0.88}
          style={styles.btnComprarWrapper}
        >
          <LinearGradient
            colors={COLORES.gradPrimario}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.btnComprar}
          >
            {cargando
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Text style={styles.btnComprarTexto}>
                    Comenzar — {planActual?.precioUSD}/{planActual?.periodo}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Texto legal Apple 3.1.2 */}
        <View style={styles.legal}>
          <Text style={styles.legalTexto}>
            La suscripción se cobra automáticamente a tu cuenta de {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} al confirmar la compra.
            La suscripción se renueva automáticamente al final de cada período a menos que se cancele al menos 24 horas antes.
            Puedes gestionar y cancelar tu suscripción en los ajustes de tu cuenta.
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://agapeapp.co/terms')}>
              <Text style={styles.legalLink}>Términos de uso</Text>
            </TouchableOpacity>
            <Text style={styles.legalSep}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://agapeapp.co/privacy')}>
              <Text style={styles.legalLink}>Privacidad</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo:              { flex: 1, backgroundColor: COLORES.fondo },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  btnCerrar:          { padding: 6 },
  headerTitulo:       { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnRestaurar:       { padding: 6 },
  btnRestaurarTexto:  { color: COLORES.secundario, fontSize: 13, fontWeight: '600' },
  scroll:             { paddingBottom: 50 },
  hero:               { margin: 16, borderRadius: 24, padding: 28, alignItems: 'center', gap: 8 },
  heroEmoji:          { fontSize: 44 },
  heroTitulo:         { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  heroSub:            { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  seccion:            { paddingHorizontal: 16, marginTop: 24 },
  seccionTitulo:      { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 14 },
  beneficiosList:     { gap: 10 },
  beneficioItem:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  beneficioIcono:     { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  beneficioTexto:     { color: 'rgba(255,255,255,0.85)', fontSize: 14, flex: 1 },
  planesGrid:         { flexDirection: 'row', gap: 10 },
  planCard:           { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent', gap: 4, position: 'relative', overflow: 'hidden' },
  planCardActivo:     { borderColor: COLORES.primario, backgroundColor: 'rgba(255,92,141,0.10)' },
  planBadge:          { backgroundColor: COLORES.primario, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  planBadgeTexto:     { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planAhorroBadge:    { backgroundColor: 'rgba(74,222,128,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  planAhorroTexto:    { color: COLORES.verde, fontSize: 9, fontWeight: '700' },
  planNombre:         { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  planPrecio:         { fontSize: 18, fontWeight: '800', color: '#fff' },
  planPrecioLocal:    { fontSize: 12, color: COLORES.muted },
  planPeriodo:        { fontSize: 11, color: COLORES.muted },
  planCheck:          { position: 'absolute', top: 10, right: 10 },
  btnComprarWrapper:  { marginHorizontal: 16, marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  btnComprar:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 17 },
  btnComprarTexto:    { color: '#fff', fontSize: 16, fontWeight: '800' },
  legal:              { paddingHorizontal: 20, marginTop: 20, gap: 10 },
  legalTexto:         { color: COLORES.muted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  legalLinks:         { flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  legalLink:          { color: COLORES.secundario, fontSize: 12 },
  legalSep:           { color: COLORES.muted, fontSize: 12 },
});
