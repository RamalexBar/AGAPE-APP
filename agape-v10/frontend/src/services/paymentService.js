import { Linking, Alert } from 'react-native';
import * as Localization from 'expo-localization';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://agape-backend-7w4h.onrender.com';

const CHECKOUT_URLS = {
  premium_monthly_usd: 'https://agapeapp.lemonsqueezy.com/checkout/buy/7b19e3c4-ad5b-47b5-8722-35d2f3042f19',
  premium_annual_usd:  'https://agapeapp.lemonsqueezy.com/checkout/buy/d0150734-02a5-4bfd-adad-37b665fa44e5',
  premium_monthly_eur: 'https://agapeapp.lemonsqueezy.com/checkout/buy/d556ecaa-6c01-47a5-bf44-2e7797ffca2c',
  premium_annual_eur:  'https://agapeapp.lemonsqueezy.com/checkout/buy/bbdca294-7279-4516-b49e-5e76584a0ac1',
};

export function detectCurrency() {
  try {
    const timezone = Localization.timezone || '';
    const isEurope = timezone.startsWith('Europe/') ||
      ['Atlantic/Canary', 'Atlantic/Madeira', 'Atlantic/Azores'].includes(timezone);
    return isEurope ? 'EUR' : 'USD';
  } catch {
    return 'USD';
  }
}

export async function openCheckout({ userId, email, plan = 'monthly' }) {
  try {
    const currency = detectCurrency();
    const planKey = `premium_${plan}_${currency.toLowerCase()}`;
    const url = CHECKOUT_URLS[planKey] || CHECKOUT_URLS.premium_monthly_usd;
    const checkoutUrl = `${url}?checkout[email]=${encodeURIComponent(email)}&checkout[custom][user_id]=${userId}`;
    const canOpen = await Linking.canOpenURL(checkoutUrl);
    if (canOpen) {
      await Linking.openURL(checkoutUrl);
    } else {
      Alert.alert('Error', 'No se pudo abrir el checkout. Intenta de nuevo.');
    }
  } catch (error) {
    console.error('Error abriendo checkout:', error);
    Alert.alert('Error', 'No se pudo iniciar el pago. Intenta de nuevo.');
  }
}

export async function getSubscriptionStatus(userId) {
  try {
    const res = await fetch(`${API_URL}/api/lemonsqueezy/subscription/${userId}`);
    const data = await res.json();
    return data;
  } catch (error) {
    return { plan: 'free', status: 'none' };
  }
}

export async function isPremium(userId) {
  const sub = await getSubscriptionStatus(userId);
  return sub.plan === 'premium' && sub.status === 'active';
}