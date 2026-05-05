
// ================================================
// ÁGAPE v10 — Subscription Screen
// ================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORES } from '../utils/constants';
import { getSubscriptionStatus, openCheckout, detectCurrency } from '../services/paymentService';

export default function SubscriptionScreen({ route, navigation }) {
  const { userId, email } = route?.params || {};
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    setCurrency(detectCurrency());
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setLoading(true);
    const data = await getSubscriptionStatus(userId);
    setSubscription(data);
    setLoading(false);
  };

  const handleSubscribe = async () => {
    await openCheckout({ userId, email, plan: billingCycle });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Premium',
      '¿Estás seguro? Perderás todos los beneficios Premium.',
      [
        { text: 'No, mantener', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => {
          Linking.openURL('https://app.lemonsqueezy.com/my-orders');
        }},
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORES.primario} />
      </View>
    );
  }

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={COLORES.gradPrimario} style={styles.header}>
        <Ionicons name="star" size={48} color="#fff" />
        <Text style={styles.headerTitle}>
          {isPremium ? '¡Eres Premium! 💜' : 'Ágape Premium'}
        </Text>
        <Text style={styles.headerSub}>
          {isPremium
            ? `Activo hasta ${periodEnd}`
            : 'Conecta sin límites con el mundo'}
        </Text>
      </LinearGradient>

      {/* Estado actual */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Plan actual</Text>
          <View style={[styles.statusBadge, isPremium && styles.statusBadgePremium]}>
            <Text style={styles.statusBadgeText}>
              {isPremium ? '⭐ Premium' : '🟢 Gratis'}
            </Text>
          </View>
        </View>
        {isPremium && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Renovación</Text>
            <Text style={styles.statusValue}>{periodEnd}</Text>
          </View>
        )}
      </View>

      {/* Beneficios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isPremium ? '✅ Tus beneficios activos' : '🔒 Beneficios Premium'}
        </Text>
        {[
          { icon: 'heart', text: 'Likes ilimitados' },
          { icon: 'chatbubbles', text: 'Mensajes ilimitados' },
          { icon: 'eye', text: 'Ver quién te dio like' },
          { icon: 'star', text: 'Prioridad en matches' },
          { icon: 'search', text: 'Filtros avanzados' },
          { icon: 'language', text: 'Traducción automática en chat' },
        ].map((f, i) => (
          <View key={i} style={styles.feature}>
            <View style={[styles.featureIcon, isPremium && styles.featureIconActive]}>
              <Ionicons name={f.icon} size={18} color={isPremium ? '#fff' : COLORES.muted} />
            </View>
            <Text style={[styles.featureText, isPremium && styles.featureTextActive]}>
              {f.text}
            </Text>
            {isPremium && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
          </View>
        ))}
      </View>

      {/* Botones */}
      {!isPremium ? (
        <View style={styles.section}>
          {/* Toggle mensual/anual */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[styles.billingBtn, billingCycle === 'monthly' && styles.billingBtnActive]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
                Mensual
              </Text>
              <Text style={styles.billingPrice}>
                {currency === 'EUR' ? '€14.99' : '$14.99'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.billingBtn, billingCycle === 'annual' && styles.billingBtnActive]}
              onPress={() => setBillingCycle('annual')}
            >
              <Text style={[styles.billingText, billingCycle === 'annual' && styles.billingTextActive]}>
                Anual
              </Text>
              <Text style={styles.billingPrice}>
                {currency === 'EUR' ? '€119.99' : '$119.99'}
              </Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Ahorra 33%</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleSubscribe} style={styles.subscribeBtn}>
            <LinearGradient colors={COLORES.gradPrimario} style={styles.subscribeBtnGrad}>
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.subscribeBtnText}>
                Suscribirme — {billingCycle === 'monthly'
                  ? (currency === 'EUR' ? '€14.99/mes' : '$14.99/mes')
                  : (currency === 'EUR' ? '€119.99/año' : '$119.99/año')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.securityNote}>
            🔒 Pago seguro · Cancela cuando quieras
          </Text>
        </View>
      ) : (
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancelar suscripción</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0D0D1A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D1A' },
  header:           { alignItems: 'center', paddingTop: 60, paddingBottom: 40, gap: 12 },
  headerTitle:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub:        { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  statusCard:       { margin: 16, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, gap: 12 },
  statusRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel:      { color: COLORES.muted, fontSize: 14 },
  statusValue:      { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusBadge:      { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgePremium: { backgroundColor: 'rgba(124,58,237,0.3)' },
  statusBadgeText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  section:          { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle:     { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  feature:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  featureIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  featureIconActive:{ backgroundColor: '#7C3AED' },
  featureText:      { flex: 1, fontSize: 15, color: COLORES.muted },
  featureTextActive:{ color: '#fff' },
  billingToggle:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
  billingBtn:       { flex: 1, backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'transparent' },
  billingBtnActive: { borderColor: '#7C3AED' },
  billingText:      { color: COLORES.muted, fontWeight: '600' },
  billingTextActive:{ color: '#fff' },
  billingPrice:     { color: '#fff', fontSize: 18, fontWeight: '800' },
  savingsBadge:     { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  savingsText:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  subscribeBtn:     { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  subscribeBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
  subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  securityNote:     { textAlign: 'center', color: COLORES.muted, fontSize: 13 },
  cancelBtn:        { margin: 16, padding: 16, alignItems: 'center' },
  cancelBtnText:    { color: COLORES.muted, fontSize: 14, textDecorationLine: 'underline' },
});