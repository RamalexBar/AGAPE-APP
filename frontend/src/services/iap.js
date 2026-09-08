// ================================================
// ÁGAPE — Wrapper de compras nativas (Apple IAP / Google Play Billing)
// Archivo: frontend/src/services/iap.js
// Requiere build nativo con EAS (no funciona en Expo Go).
//
// Usa expo-iap en vez de react-native-iap: esa última quedó rota en
// RN 0.81+ porque depende de la propiedad `currentActivity`, que React
// Native eliminó (su propio equipo la declaró obsoleta en favor de
// expo-iap). La interfaz pública de este archivo se mantiene idéntica
// para no tocar PremiumScreen.js.
// ================================================
import { Platform } from 'react-native';
import {
  initConnection, endConnection, fetchProducts, requestPurchase,
  finishTransaction, getAvailablePurchases,
  purchaseUpdatedListener, purchaseErrorListener,
} from 'expo-iap';

const plataforma = Platform.OS === 'ios' ? 'apple' : 'google';

// expo-iap unifica el recibo/token en purchase.purchaseToken (iOS JWS o
// purchaseToken de Android), coincide con lo que espera el backend.
const receiptDe = (purchase) => purchase?.purchaseToken;

export const iap = {
  plataforma,

  conectar: () => initConnection(),

  desconectar: () => endConnection(),

  // Se mapea a {productId, localizedPrice} — la forma que ya espera
  // PremiumScreen.js (antes venía directo de react-native-iap).
  getSuscripciones: async (skus) => {
    const productos = await fetchProducts({ skus, type: 'subs' });
    return (productos || []).map((p) => ({ productId: p.id, localizedPrice: p.displayPrice }));
  },

  comprar: (sku) => requestPurchase({
    type: 'subs',
    request: { apple: { sku }, google: { skus: [sku] } },
  }),

  finalizar: (purchase) => finishTransaction({ purchase, isConsumable: false }),

  // Devuelve [{ plataforma, product_id, receipt_or_token }] con lo que ya compró el usuario
  obtenerComprasExistentes: async () => {
    const compras = await getAvailablePurchases();
    return (compras || []).map((p) => ({
      plataforma,
      product_id: p.productId,
      receipt_or_token: receiptDe(p),
    }));
  },

  onCompra: (cb) => purchaseUpdatedListener(cb),
  onErrorCompra: (cb) => purchaseErrorListener(cb),
  receiptDe,
};

export default iap;
