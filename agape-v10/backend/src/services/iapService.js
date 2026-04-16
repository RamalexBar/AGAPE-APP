// ================================================
// ÁGAPE — IAP Service v4
// Apple StoreKit 2 + Google Play Billing v5
// Validación server-side obligatoria
// ================================================
const supabase = require('../config/supabase');
const { activarSuscripcion, PLANES, PAQUETES_MONEDAS } = require('./monetizationAgapeService');

// ── Mapa de product IDs → configuración ──────────────────────────
const buildProductMap = () => {
  const map = {};
  // Suscripciones
  Object.values(PLANES).forEach(plan => {
    if (!plan.apple_product_id) return;
    map[plan.apple_product_id]  = { tipo: 'subscription', plan: plan.id, dias: 30 };
    map[plan.google_product_id] = { tipo: 'subscription', plan: plan.id, dias: 30 };
    if (plan.apple_annual_id)  map[plan.apple_annual_id]  = { tipo: 'subscription', plan: plan.id, dias: 365 };
    if (plan.google_annual_id) map[plan.google_annual_id] = { tipo: 'subscription', plan: plan.id, dias: 365 };
  });
  // Monedas
  PAQUETES_MONEDAS.forEach(pkg => {
    map[pkg.apple_id]  = { tipo: 'coins', package_id: pkg.id, cantidad: pkg.cantidad + pkg.bonus };
    map[pkg.google_id] = { tipo: 'coins', package_id: pkg.id, cantidad: pkg.cantidad + pkg.bonus };
  });
  return map;
};

const PRODUCT_MAP = buildProductMap();

// ── Validar recibo Apple ──────────────────────────────────────────
const _validateApple = async (receiptData) => {
  const secret   = process.env.APPLE_IAP_SHARED_SECRET;
  const isProd   = process.env.NODE_ENV === 'production';
  const endpoint = isProd
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  const body = JSON.stringify({ 'receipt-data': receiptData, password: secret, 'exclude-old-transactions': true });

  let res;
  try { res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }); }
  catch (e) { throw Object.assign(new Error('Error al contactar Apple.'), { status: 502 }); }

  const data = await res.json();

  // 21007 = receipt de sandbox enviado a producción → reintentar en sandbox
  if (data.status === 21007 && isProd) {
    const sbRes  = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const sbData = await sbRes.json();
    if (sbData.status !== 0) return null;
    return _parseAppleLatest(sbData);
  }

  if (data.status !== 0) return null;
  return _parseAppleLatest(data);
};

const _parseAppleLatest = (data) => {
  const items = data.latest_receipt_info;
  if (!items?.length) return null;
  // Tomar la transacción más reciente
  const latest = items.sort((a, b) => parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms))[0];
  return {
    transaction_id: latest.transaction_id,
    product_id:     latest.product_id,
    expires_ms:     parseInt(latest.expires_date_ms || '0'),
    purchase_ms:    parseInt(latest.purchase_date_ms),
  };
};

// ── Validar token Google Play ─────────────────────────────────────
const _validateGoogle = async (purchaseToken, productId, isSubscription = true) => {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;

  // Modo simulado en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[IAP Google DEV] Simulando compra — token: ${purchaseToken.slice(0, 15)}...`);
    const product = PRODUCT_MAP[productId];
    if (!product) return null;
    const expMs = Date.now() + (product.dias || 30) * 86400000;
    return { transaction_id: `google_sim_${Date.now()}`, product_id: productId, expires_ms: expMs, purchase_ms: Date.now() };
  }

  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth   = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/androidpublisher' });
    const client = await auth.getClient();

    const endpoint = isSubscription
      ? `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptionsv2/tokens/${purchaseToken}`
      : `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const { data } = await client.request({ url: endpoint });

    if (isSubscription) {
      const expMs = parseInt(data.lineItems?.[0]?.expiryTime || '0');
      return { transaction_id: data.orderId, product_id: productId, expires_ms: expMs, purchase_ms: Date.now() };
    } else {
      // One-time product (monedas)
      if (data.purchaseState !== 0) return null; // 0 = purchased
      return { transaction_id: data.orderId, product_id: productId, expires_ms: 0, purchase_ms: Date.now() };
    }
  } catch (e) {
    console.error('[IAP Google] Error:', e.message);
    return null;
  }
};

// ── Procesar compra (Apple o Google) ─────────────────────────────
const procesarCompra = async (userId, { plataforma, receipt_or_token, product_id }) => {
  const productConfig = PRODUCT_MAP[product_id];
  if (!productConfig) throw Object.assign(new Error(`Producto desconocido: ${product_id}`), { status: 400 });

  // Validar con la tienda
  let validacion;
  const esSubscripcion = productConfig.tipo === 'subscription';

  if (plataforma === 'apple') {
    validacion = await _validateApple(receipt_or_token);
  } else if (plataforma === 'google') {
    validacion = await _validateGoogle(receipt_or_token, product_id, esSubscripcion);
  } else {
    throw Object.assign(new Error('Plataforma inválida. Usar apple o google.'), { status: 400 });
  }

  if (!validacion) throw Object.assign(new Error('Recibo de compra no válido o expirado.'), { status: 400 });

  // Verificar transacción duplicada
  const { data: dup } = await supabase.from('subscriptions').select('id').eq('transaction_id', validacion.transaction_id).single();
  if (dup) return { ya_activa: true, mensaje: 'Esta compra ya fue procesada.' };

  // ── Suscripción ──────────────────────────────────────────────
  if (esSubscripcion) {
    const ahora    = Date.now();
    const expirado = validacion.expires_ms > 0 && validacion.expires_ms < ahora;
    if (expirado) throw Object.assign(new Error('La suscripción ya expiró.'), { status: 400 });

    const resultado = await activarSuscripcion(userId, productConfig.plan, {
      dias:          productConfig.dias,
      transactionId: validacion.transaction_id,
      plataforma,
    });

    return { ...resultado, tipo: 'subscription', product_id };
  }

  // ── Monedas de Fe (one-time purchase) ────────────────────────
  const pkg = PAQUETES_MONEDAS.find(p => p.id === productConfig.package_id);
  if (!pkg) throw Object.assign(new Error('Paquete de monedas no encontrado.'), { status: 400 });

  const totalMonedas = productConfig.cantidad;
  await supabase.rpc('increment_monedas_fe', { p_user_id: userId, p_cantidad: totalMonedas });

  // Registrar la transacción de monedas para evitar duplicados
  await supabase.from('subscriptions').insert({
    user_id: userId, plan_type: 'free', is_active: false,
    transaction_id: validacion.transaction_id, plataforma,
    precio_pagado: pkg.precio_cop,
  });

  await supabase.from('monetization_events').insert({
    user_id: userId, evento: 'coins_purchased',
    plan_id: null, valor_cop: pkg.precio_cop,
    metadata: JSON.stringify({ package: pkg.id, monedas: totalMonedas, transaction_id: validacion.transaction_id }),
  }).catch(() => {});

  return {
    tipo:            'coins',
    monedas_ganadas: totalMonedas,
    package:         pkg,
    mensaje:         `¡${totalMonedas} monedas de fe añadidas! 🙌`,
  };
};

const restaurarCompras = (userId, data) => procesarCompra(userId, data);

module.exports = { procesarCompra, restaurarCompras, PRODUCT_MAP };
