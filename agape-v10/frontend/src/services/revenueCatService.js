import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const API_KEY = 'test_BuaJyWlSUteECYDzhACkGqUtqxN';

// ─────────────────────────────────────────
// Inicializar RevenueCat
// Llamar al inicio de la app
// ─────────────────────────────────────────
export function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey: API_KEY });
}

// ─────────────────────────────────────────
// Identificar usuario
// ─────────────────────────────────────────
export async function identifyUser(userId) {
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error('Error identificando usuario:', error);
  }
}

// ─────────────────────────────────────────
// Obtener productos disponibles
// ─────────────────────────────────────────
export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return [];
  }
}

// ─────────────────────────────────────────
// Comprar suscripción
// ─────────────────────────────────────────
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active['Agape Pro'];
    return { success: true, isPremium: !!isPremium };
  } catch (error) {
    if (!error.userCancelled) {
      console.error('Error en compra:', error);
    }
    return { success: false, isPremium: false };
  }
}

// ─────────────────────────────────────────
// Verificar si usuario es Premium
// ─────────────────────────────────────────
export async function checkPremiumStatus() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active['Agape Pro'];
  } catch (error) {
    console.error('Error verificando premium:', error);
    return false;
  }
}

// ─────────────────────────────────────────
// Restaurar compras
// ─────────────────────────────────────────
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active['Agape Pro'];
  } catch (error) {
    console.error('Error restaurando compras:', error);
    return false;
  }
}