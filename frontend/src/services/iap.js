// ================================================
// ÁGAPE — Wrapper de compras nativas (Apple IAP / Google Play Billing)
// Archivo: frontend/src/services/iap.js
// Requiere build nativo con EAS (no funciona en Expo Go).
// ================================================
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';

const plataforma = Platform.OS === 'ios' ? 'apple' : 'google';

const receiptDe = (purchase) =>
  Platform.OS === 'ios' ? purchase.transactionReceipt : purchase.purchaseToken;

export const iap = {
  plataforma,

  conectar: () => RNIap.initConnection(),

  desconectar: () => RNIap.endConnection(),

  getSuscripciones: (skus) => RNIap.getSubscriptions({ skus }),

  comprar: (sku) => RNIap.requestSubscription({ sku }),

  finalizar: (purchase) => RNIap.finishTransaction({ purchase, isConsumable: false }),

  // Devuelve [{ plataforma, product_id, receipt_or_token }] con lo que ya compró el usuario
  obtenerComprasExistentes: async () => {
    const compras = await RNIap.getAvailablePurchases();
    return compras.map((p) => ({
      plataforma,
      product_id: Platform.OS === 'ios' ? p.productId : (p.productIds?.[0] || p.productId),
      receipt_or_token: receiptDe(p),
    }));
  },

  onCompra: (cb) => RNIap.purchaseUpdatedListener(cb),
  onErrorCompra: (cb) => RNIap.purchaseErrorListener(cb),
  receiptDe,
};

export default iap;
