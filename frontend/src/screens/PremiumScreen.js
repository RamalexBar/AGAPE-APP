// ================================================
// ÁGAPE v10 — Premium Screen
// Apple 3.1.1: Restaurar compras
// Apple 3.1.2: Texto legal de suscripción
// ================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { monetizationAPI } from '../services/api';
import iap from '../services/iap';
import { COLORES, PLANES, BENEFICIOS_PREMIUM } from '../utils/constants';

export default function PremiumScreen({ navigation }) {
  const [planSel,    setPlanSel]    = useState('trimestral');
  const [cargando,   setCargando]   = useState(false);
  const [restaurando,setRestaurando]= useState(false);
  const [preciosTienda, setPreciosTienda] = useState({});
  const { user, actualizarUsuario } = useStore();
  const insets = useSafeAreaInsets();
  const planActual = PLANES.find(p => p.id === planSel);
  const skuDe = (plan) => Platform.OS === 'ios' ? plan.productId.ios : plan.productId.android;

  // Compra nativa vía App Store/Play Store — StoreKit/Play Billing, único
  // método permitido por Apple 3.1.1 para suscripciones de contenido digital.
  useEffect(() => {
    let activo = true;
    iap.conectar()
      .then(() => iap.getSuscripciones(PLANES.map(skuDe)))
      .then((items) => {
        if (!activo) return;
        const precios = Object.fromEntries(items.map(i => [i.productId, i.localizedPrice]));
        setPreciosTienda(precios);
      })
      .catch(() => {
        // Sin conexión a la tienda (ej. Expo Go / dev): se usa el precio de referencia local.
      });

    const subCompra = iap.onCompra(async (purchase) => {
      try {
        const receipt = iap.receiptDe(purchase);
        await monetizationAPI.procesarCompra(iap.plataforma, purchase.productId, receipt);
        await iap.finalizar(purchase);
        actualizarUsuario({ premium: true, subscription_type: 'premium' });
        Alert.alert('🎉 ¡Bienvenido a Premium!', 'Tu suscripción está activa.', [
          { text: '¡Genial!', onPress: () => navigation.goBack() }
        ]);
      } catch (e) {
        Alert.alert('Error', 'No se pudo validar la compra con el servidor.');
      } finally {
        setCargando(false);
      }
    });

    const subError = iap.onErrorCompra((err) => {
      setCargando(false);
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'No se pudo procesar el pago.');
      }
    });

    return () => {
      activo = false;
      subCompra.remove();
      subError.remove();
      iap.desconectar().catch(() => {});
    };
  }, [actualizarUsuario, navigation]);

  const handleComprar = async () => {
    if (cargando || !user || !planActual) return;
    setCargando(true);
    try {
      await iap.comprar(skuDe(planActual));
      // La confirmación llega de forma asíncrona por el listener onCompra
    } catch (e) {
      setCargando(false);
      Alert.alert('Error', 'No se pudo iniciar la compra. Verifica tu conexión con la tienda.');
    }
  };

  const handleRestaurar = async () => {
    if (restaurando || !user) return;
    setRestaurando(true);
    try {
      const compras = await iap.obtenerComprasExistentes();
      if (compras.length === 0) {
        Alert.alert('Restaurar compras', 'No encontramos una suscripción activa para esta cuenta.');
        return;
      }
      for (const compra of compras) {
        await monetizationAPI.restaurarCompras(compra.plataforma, compra.product_id, compra.receipt_or_token);
      }
      const { data } = await monetizationAPI.getStatus();
      actualizarUsuario({ premium: data.es_premium, subscription_type: data.plan_id });
      if (data?.es_premium) {
        Alert.alert('✅ Suscripción restaurada', 'Tu Premium ya está activo en esta cuenta.');
        navigation.goBack();
      } else {
        Alert.alert('Sin compras activas', 'No encontramos una suscripción activa para esta cuenta.');
      }
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
                    {preciosTienda[skuDe(plan)] || plan.precioUSD}
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
                    Comenzar — {(planActual && preciosTienda[skuDe(planActual)]) || planActual?.precioUSD}/{planActual?.periodo}
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
