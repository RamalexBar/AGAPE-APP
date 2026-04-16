# 🕊️ ÁGAPE — V8: Guía Completa App Store Ready
### Consolidación v1 (production) + v7 (completo) + Plan de Aprobación Total

---

## 📊 ANÁLISIS COMPARATIVO: production-v1 vs COMPLETO-v7

### Resultado: **SON DISTINTOS** — v1 es más avanzada que v7

| Aspecto | agape-production-v1 | agape-COMPLETO-v7 |
|---|---|---|
| Framework Frontend | **React Native CLI 0.72.6** (nativo) | Expo SDK 49 |
| Notificaciones | `@react-native-firebase/messaging` (FCM nativo) | `expo-notifications` |
| Almacenamiento seguro | `AsyncStorage` | `expo-secure-store` ✅ mejor |
| Build System | Gradle + Xcode nativo | EAS Build |
| Archivos Android | ✅ Incluye carpeta nativa completa | ❌ No incluye |
| Archivos iOS | ✅ Incluye Info.plist, entitlements | ❌ No incluye |
| Política de Privacidad | ❌ NO incluida | ✅ Incluida (`privacy-policy.md`) |
| Migraciones SQL | ❌ NO incluidas | ✅ 5 scripts de migración |
| Screens frontend | ❌ NO incluidas | ✅ 13 screens completas |
| Checklist producción | ✅ `CHECKLIST_PRODUCCION.md` | ✅ `DEPLOY_GUIDE.md` |
| README | ✅ Completo (setup, builds) | ❌ No incluye |
| Archivos compartidos idénticos | 102 de 108 | — |
| Archivos con diferencias | 6 (App.js, package.json, api.js, etc.) | — |

### Diferencias técnicas críticas detectadas

**v1 (production) tiene:**
- Carpeta `frontend/android/` completa con Gradle, Manifest, Java, keystores
- `frontend/ios/` con entitlements nativos para IAP y Push
- `firebase/messaging` nativo (más control en background)
- `CHECKLIST_PRODUCCION.md` + `README.md` + `FIREBASE_SETUP.md`
- `paywallService.js` (backend) — **ausente en v7**

**v7 (completo) tiene:**
- `backend/database/` con 5 scripts SQL de migración — **ausentes en v1**
- `backend/legal/privacy-policy.md` — **ausente en v1**
- `frontend/src/screens/` con 13 pantallas — **ausentes en v1**
- `frontend/src/components/` con PaywallModal, SwipeLimitBanner, etc.
- `eas.json` para EAS Build
- `expo-secure-store` para tokens (más seguro que AsyncStorage)

### Recomendación de consolidación
Usar **v1 como base** (nativo, más maduro para tiendas) e incorporar los assets únicos de v7.

---

## 🚨 PARTE 1: PLAN DE ACCIÓN PRIORIZADO

### BLOQUE CRÍTICO — Rechazo garantizado si no se resuelve (Semana 1)

**PRIORIDAD 1 — Política de Privacidad pública (Guideline 5.1.1)**

La app en v1 NO tiene `privacy-policy.md` (v7 sí la tiene). Ambas versiones apuntan a `https://agape-app.com/privacy` en el `.env.production`, pero esa URL debe estar viva y ser accesible públicamente antes de enviar a revisión.

Acciones concretas:
1. Publicar `backend/legal/privacy-policy.md` (de v7) como página web en `https://agape-app.com/privacy`
2. Publicar `backend/legal/terms-of-service.md` en `https://agape-app.com/terms`
3. Ambas URLs deben responder en HTTPS sin autenticación
4. Incluir las URLs en App Store Connect al momento de subir el build

**PRIORIDAD 2 — Botón "Restaurar Compras" (Guideline 3.1.1)**

El `iapService.js` tiene implementada la función `restaurarCompras()` pero el frontend (en `PremiumScreen.js` de v7 y la pantalla equivalente en v1) no tiene el botón visible. Apple rechaza AUTOMÁTICAMENTE si falta este botón en cualquier pantalla con IAP.

**PRIORIDAD 3 — Términos de suscripción visibles en paywall (Guideline 3.1.2)**

El `PaywallModal.js` actual carece del texto legal obligatorio. Apple requiere que CADA pantalla de paywall muestre textualmente duración, precio, renovación automática y enlace a política.

**PRIORIDAD 4 — Flujo de eliminación de cuenta verificable (Guideline 5.1.1v)**

El `accountDeletionService.js` existe pero tiene una laguna crítica: no elimina al usuario de `auth.users` de Supabase (solo de la tabla `users`). El revisor de Apple crea una cuenta, la elimina, y verifica que no pueda volver a entrar.

**PRIORIDAD 5 — Contenido generado por usuarios: moderación visible (Guideline 1.2)**

El `moderationService.js` existe en backend pero Apple necesita evidencia en la app de que existe un mecanismo de reporte. La UI debe tener botón "Reportar" accesible en perfiles y mensajes.

---

### BLOQUE IMPORTANTE — Puede causar rechazo o suspensión (Semana 2)

- Validación completa de recibos Apple (el `_validateApple` actual usa el endpoint legacy `verifyReceipt` — Apple recomienda migrar a App Store Server API)
- Exposición de `.env.production` en frontend (detectado en v1: variables hardcodeadas en `api.js`)
- `APPLE_IAP_SHARED_SECRET` y `JWT_*` con valores placeholder en el `.env.production` incluido en el ZIP — asegurarse que el deploy real use variables de entorno del servidor, no archivos
- Tests: solo existe `auth.test.js` con 2 casos — insuficiente para una app de producción

### BLOQUE DE OPTIMIZACIÓN — Mejora conversión sin riesgo (Semana 3)

- Migrar token storage de `AsyncStorage` (v1) a `SecureStore` (como hace v7)
- Implementar webhooks reales de Apple/Google (el `webhookService.js` existe, necesita configuración)
- A/B testing del paywall (la tabla `paywall_events` ya existe en el schema)
- Rate limiting por usuario en endpoints de IAP

---

## 💳 PARTE 2: IMPLEMENTACIÓN IAP — ARQUITECTURA CORRECTA

### Arquitectura general aprobada por Apple

```
[Usuario toca "Comprar"]
       ↓
[StoreKit / Play Billing — NATIVO]  ← Todo ocurre en el dispositivo
       ↓
[Recibo / Purchase Token]
       ↓
[App envía al BACKEND propio]  ← NUNCA validar solo en cliente
       ↓
[Backend valida con Apple/Google]
       ↓
[Backend activa suscripción en DB]
       ↓
[App desbloquea features]
```

### Estado actual del `iapService.js` (AMBAS versiones tienen el mismo archivo)

**Lo que ya está bien:**
- `procesarCompra()` valida server-side ✅
- Detección de transacciones duplicadas por `transaction_id` ✅
- Modo simulado en desarrollo ✅
- Manejo del código de error `21007` (sandbox→producción) ✅
- Google Play Billing v5 con `subscriptionsv2` ✅

**Lo que falta o está incompleto:**

```javascript
// ❌ PROBLEMA 1: Apple usa endpoint LEGACY
// El endpoint verifyReceipt está deprecado desde 2023
// Apple recomienda App Store Server API (JWT-based)
// Tu código actual:
const endpoint = isProd
  ? 'https://buy.itunes.apple.com/verifyReceipt'   // ← DEPRECATED
  : 'https://sandbox.itunes.apple.com/verifyReceipt';

// ✅ SOLUCIÓN: Migrar a App Store Server API
// Instalar: npm install @apple/app-store-server-library
const { AppStoreServerAPI, Environment } = require('@apple/app-store-server-library');
```

### Implementación corregida — `iapService.js` (sección Apple)

```javascript
// ── Validar recibo Apple con App Store Server API (v2) ──────────
const _validateAppleV2 = async (transactionId) => {
  const { AppStoreServerAPI, Environment, decodeTransactions } = require('@apple/app-store-server-library');

  const issuerId    = process.env.APPLE_ISSUER_ID;        // App Store Connect → Keys
  const keyId       = process.env.APPLE_KEY_ID;           // Key ID del .p8
  const privateKey  = process.env.APPLE_PRIVATE_KEY;      // Contenido del .p8
  const bundleId    = process.env.APPLE_BUNDLE_ID;        // com.agape.app
  const env         = process.env.NODE_ENV === 'production'
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

  const client = new AppStoreServerAPI(privateKey, keyId, issuerId, bundleId, env);

  try {
    const response = await client.getTransactionInfo(transactionId);
    const [decoded] = await decodeTransactions([response.signedTransactionInfo]);

    return {
      transaction_id: decoded.transactionId,
      product_id:     decoded.productId,
      expires_ms:     decoded.expiresDate ? new Date(decoded.expiresDate).getTime() : 0,
      purchase_ms:    new Date(decoded.purchaseDate).getTime(),
    };
  } catch (e) {
    console.error('[IAP Apple v2] Error:', e.message);
    return null;
  }
};
```

### Variables de entorno adicionales necesarias

```env
# Nuevas variables para App Store Server API
APPLE_ISSUER_ID=tu-issuer-id-de-app-store-connect
APPLE_KEY_ID=ABC123DEFG
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nCONTENIDO...\n-----END PRIVATE KEY-----"
APPLE_BUNDLE_ID=com.agape.app

# Mantener el shared secret para verificación de webhooks
APPLE_IAP_SHARED_SECRET=tu_shared_secret_aqui
```

### Flujo completo frontend → backend

```javascript
// frontend/src/services/iapService.js (React Native)
import RNIap, {
  purchaseUpdatedListener,
  purchaseErrorListener,
  requestSubscription,
  getSubscriptions,
  finishTransaction,
} from 'react-native-iap';

const PRODUCT_IDS_IOS = [
  'com.agape.app.premium.monthly',
  'com.agape.app.premium.yearly',
  'com.agape.app.vip.monthly',
];

// PASO 1: Inicializar conexión con tienda
export const initIAP = async () => {
  await RNIap.initConnection();
  return await RNIap.getSubscriptions({ skus: PRODUCT_IDS_IOS });
};

// PASO 2: Ejecutar compra
export const comprar = async (productId, onSuccess, onError) => {
  try {
    await requestSubscription({ sku: productId });
    // La compra se completa via purchaseUpdatedListener
  } catch (e) {
    onError(e);
  }
};

// PASO 3: Listener de compras — CRÍTICO
export const setupPurchaseListener = (apiPost, onSuccess) => {
  return purchaseUpdatedListener(async (purchase) => {
    const { transactionReceipt, productId, purchaseToken } = purchase;

    const plataforma = Platform.OS === 'ios' ? 'apple' : 'google';
    const receipt    = plataforma === 'apple' ? transactionReceipt : purchaseToken;

    try {
      // Enviar al backend para validación server-side
      const resultado = await apiPost('/subscriptions/validate-iap', {
        plataforma,
        receipt_or_token: receipt,
        product_id: productId,
      });

      // OBLIGATORIO: Confirmar transacción con la tienda
      await finishTransaction({ purchase, isConsumable: false });

      onSuccess(resultado);
    } catch (error) {
      // Si la validación falla, NO llamar finishTransaction
      // Apple reintentará la entrega automáticamente
      console.error('[IAP] Validación backend falló:', error);
    }
  });
};

// PASO 4: Restaurar compras (OBLIGATORIO para Apple)
export const restaurarCompras = async (apiPost) => {
  const purchases = await RNIap.getAvailablePurchases();

  for (const purchase of purchases) {
    const plataforma = Platform.OS === 'ios' ? 'apple' : 'google';
    await apiPost('/subscriptions/validate-iap', {
      plataforma,
      receipt_or_token: Platform.OS === 'ios'
        ? purchase.transactionReceipt
        : purchase.purchaseToken,
      product_id: purchase.productId,
    });
  }
  return purchases.length;
};
```

---

## 🎨 PARTE 3: UX DE PAYWALL APROBABLE POR APPLE

### Qué debe mostrarse OBLIGATORIAMENTE (Guideline 3.1.2)

Apple rechaza el paywall si falta CUALQUIERA de estos elementos:

1. Nombre del plan y duración explícita ("1 mes", "1 año")
2. Precio con moneda ("$14.900 COP / mes" o equivalente en USD para App Store)
3. Texto de renovación automática
4. Enlace a Política de Privacidad
5. Enlace a Términos de Servicio
6. Botón "Restaurar compras"
7. El cobro debe procesarse con Apple IAP — nunca redirigir a web de pago

### Componente `PaywallModal.js` — Sección legal obligatoria

El `PaywallModal.js` actual en v7 carece del bloque legal. Agregar al final del modal, antes del botón de cierre:

```javascript
// Agregar en PaywallModal.js — sección legal OBLIGATORIA
const SubscriptionLegalFooter = ({ planPrecio = '$14.900 COP', planNombre = 'Premium' }) => (
  <View style={styles.legalContainer}>
    {/* TEXTO LEGAL — No abreviar, Apple lo verifica */}
    <Text style={styles.legalText}>
      {planNombre} · {planPrecio}/mes · Se renueva automáticamente.
      Cancela en Configuración de tu ID de Apple al menos 24 horas antes del final del período.
      El cargo se realizará en tu cuenta de Apple al confirmar la compra.
    </Text>

    {/* BOTÓN RESTAURAR — Obligatorio */}
    <TouchableOpacity
      onPress={onRestaurarCompras}
      style={styles.restoreButton}
      accessibilityLabel="Restaurar compras anteriores"
    >
      <Text style={styles.restoreText}>Restaurar compras</Text>
    </TouchableOpacity>

    {/* ENLACES LEGALES */}
    <View style={styles.linksRow}>
      <TouchableOpacity onPress={() => Linking.openURL('https://agape-app.com/terms')}>
        <Text style={styles.linkText}>Términos de uso</Text>
      </TouchableOpacity>
      <Text style={styles.separator}> · </Text>
      <TouchableOpacity onPress={() => Linking.openURL('https://agape-app.com/privacy')}>
        <Text style={styles.linkText}>Privacidad</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = {
  legalContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
  },
  restoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  restoreText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'underline',
    fontWeight: '500',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  separator: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },
};
```

### Sistema de referidos — Cómo hacerlo seguro

El `referralService.js` puede ser problemático si las recompensas se perciben como "pagos alternativos". Reglas:
- Las recompensas de referidos deben ser en moneda virtual interna (Monedas de Fe) — nunca dinero real ni descuentos en suscripciones
- El valor de las monedas ganadas no puede superar $1 USD por referido
- No usar lenguaje de "ganar dinero" — usar "desbloquea beneficios espirituales"
- Incluir en los Términos de Servicio la sección de referidos con sus limitaciones

---

## 🔒 PARTE 4: SEGURIDAD BACKEND

### Problema crítico: `.env.production` en el repositorio

El archivo `backend/.env.production` incluido en AMBAS versiones contiene valores placeholder pero su mera presencia en el repo es un error de arquitectura:

```bash
# ❌ MAL: .env.production en el zip/repo
JWT_ACCESS_SECRET=cambia_esto_por_un_secreto_muy_largo_y_seguro_1

# ✅ BIEN: Variables de entorno del servidor (Railway/Render/Fly.io)
# Nunca en archivos — siempre en el panel de variables del hosting
```

### Correcciones inmediatas

**1. Eliminar `.env.production` del repositorio**

```bash
# En .gitignore — verificar que exista esta línea:
.env*
!.env.example

# Eliminar historial si ya fue commiteado:
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch backend/.env.production' HEAD
```

**2. Migrar tokens a SecureStore en frontend (v1 usa AsyncStorage)**

v7 ya usa `expo-secure-store`. En v1 (React Native CLI):

```javascript
// Reemplazar en frontend/src/services/api.js (v1)
// ❌ Actual:
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('agape_auth_token');

// ✅ Correcto:
import EncryptedStorage from 'react-native-encrypted-storage';
// npm install react-native-encrypted-storage
const token = await EncryptedStorage.getItem('agape_auth_token');
```

**3. Validación de webhooks Apple/Google (firma HMAC)**

```javascript
// backend/src/routes/webhooks.js — agregar verificación de firma
const verifyAppleWebhook = (req, res, next) => {
  // Apple envía notificaciones con JWT firmado
  // Verificar con la librería oficial
  const { SignedDataVerifier } = require('@apple/app-store-server-library');

  const verifier = new SignedDataVerifier(
    [process.env.APPLE_ROOT_CA_1, process.env.APPLE_ROOT_CA_2, process.env.APPLE_ROOT_CA_3],
    true, // enableOnlineChecks
    process.env.NODE_ENV === 'production' ? Environment.PRODUCTION : Environment.SANDBOX,
    process.env.APPLE_BUNDLE_ID
  );

  try {
    req.appleNotification = verifier.verifyAndDecodeNotification(req.body.signedPayload);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Webhook signature inválido' });
  }
};
```

**4. Rate limiting específico para IAP**

```javascript
// backend/src/middlewares/security.js — agregar al existente
const rateLimit = require('express-rate-limit');

// Límite estricto en validación de compras (previene ataques de replay)
const iapLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minuto
  max: 5,                 // máx 5 intentos por IP/usuario
  message: { error: 'Demasiados intentos. Espera un momento.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports.iapLimiter = iapLimiter;

// En subscriptions.js route:
router.post('/validate-iap', auth, iapLimiter, async (req, res) => { ... });
```

---

## 🛡️ PARTE 5: SISTEMA DE MODERACIÓN

### Mínimo requerido por Apple para apps con UGC (Guideline 1.2)

Apple exige evidencia de 4 elementos:

1. **Mecanismo de reporte in-app** — botón visible en perfiles y mensajes
2. **Sistema de bloqueo de usuarios**
3. **Proceso de revisión de reportes** — el `moderationService.js` ya lo tiene ✅
4. **Capacidad de respuesta en 24h** — declarar en el formulario de revisión

### El `moderationService.js` actual tiene lo necesario en backend. Falta el frontend:

```javascript
// frontend/src/components/ReportButton.js — NUEVO COMPONENTE
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActionSheet,
  Alert, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // o @expo/vector-icons en v7
import api from '../services/api';

const RAZONES_REPORTE = [
  { id: 'spam',         label: 'Spam o contenido falso' },
  { id: 'inappropriate', label: 'Contenido inapropiado' },
  { id: 'harassment',   label: 'Acoso o comportamiento abusivo' },
  { id: 'fake_profile', label: 'Perfil falso o suplantación' },
  { id: 'underage',     label: 'Posible menor de edad' },
  { id: 'other',        label: 'Otro motivo' },
];

export default function ReportButton({ userId, userName, type = 'profile' }) {
  const [reportando, setReportando] = useState(false);

  const reportar = async (razon) => {
    setReportando(true);
    try {
      await api.reportes.crear({ reported_id: userId, razon, tipo: type });
      Alert.alert(
        'Reporte enviado',
        'Gracias. Revisaremos tu reporte en las próximas 24 horas.',
        [{ text: 'Entendido' }]
      );
    } catch (e) {
      Alert.alert('Error', 'No pudimos enviar el reporte. Intenta de nuevo.');
    } finally {
      setReportando(false);
    }
  };

  const mostrarOpciones = () => {
    const opciones = RAZONES_REPORTE.map(r => r.label);
    opciones.push('Cancelar');

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: opciones,
        cancelButtonIndex: opciones.length - 1,
        destructiveButtonIndex: 0,
        title: `Reportar a ${userName}`,
      },
      (index) => {
        if (index < RAZONES_REPORTE.length) {
          reportar(RAZONES_REPORTE[index].id);
        }
      }
    );
  };

  return (
    <TouchableOpacity
      onPress={mostrarOpciones}
      disabled={reportando}
      accessibilityLabel={`Reportar a ${userName}`}
      style={styles.button}
    >
      <Ionicons name="flag-outline" size={20} color="#666" />
      <Text style={styles.text}>Reportar</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  text: {
    color: '#666',
    fontSize: 13,
  },
});
```

### Bloqueo de usuarios — agregar a la API

```javascript
// backend/src/routes/profiles.js — agregar endpoint
router.post('/block/:userId', auth, async (req, res) => {
  const { userId: blockedId } = req.params;
  const reporterId = req.user.id;

  await supabase.from('user_blocks').upsert({
    blocker_id: reporterId,
    blocked_id: blockedId,
    created_at: new Date().toISOString(),
  });

  // Eliminar match si existía
  await supabase.from('connections')
    .delete()
    .or(`and(user_id_1.eq.${reporterId},user_id_2.eq.${blockedId}),and(user_id_1.eq.${blockedId},user_id_2.eq.${reporterId})`);

  res.json({ message: 'Usuario bloqueado.' });
});
```

### Política de moderación — declarar en App Store Connect

En la sección "App Review Information" > "Notes", incluir:
> "La app tiene un sistema de moderación activo. Los usuarios pueden reportar perfiles y mensajes mediante un botón de reporte disponible en cada perfil. Los reportes son revisados por el equipo de moderación en un plazo de 24 horas. Los usuarios que violen las normas reciben advertencias, suspensiones temporales o baneo permanente. El backend incluye auto-moderación que suspende cuentas con 5+ reportes confirmados."

---

## 🗑️ PARTE 6: ELIMINACIÓN DE CUENTA — CUMPLIMIENTO TOTAL

### Laguna actual en `accountDeletionService.js`

```javascript
// ❌ El código actual hace:
await supabase.from('users').delete().eq('id', userId);
// Pero NO elimina de auth.users de Supabase

// ✅ Solución: usar el Admin API de Supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Service role key (no anon key)
);

// Al final del deleteAccountPermanently():
const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
if (authError) throw authError;
```

### `accountDeletionService.js` — Versión completa corregida

```javascript
const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const deleteAccountPermanently = async (userId) => {
  logger.info({ userId }, '[ACCOUNT_DELETION] Iniciando proceso de borrado permanente');

  try {
    // 1. Cancelar suscripciones activas (importante para Apple)
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('transaction_id, plataforma')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Notificar al usuario que debe cancelar manualmente en App Store si aplica
    // (Apple no permite cancelar suscripciones programáticamente)

    // 2. Borrar datos en orden (respetar foreign keys)
    const operaciones = [
      supabase.from('messages').delete().eq('sender_id', userId),
      supabase.from('connections').delete()
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`),
      supabase.from('swipe_actions').delete()
        .or(`swiper_id.eq.${userId},swiped_id.eq.${userId}`),
      supabase.from('push_tokens').delete().eq('user_id', userId),
      supabase.from('user_blocks').delete()
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      supabase.from('subscriptions').delete().eq('user_id', userId),
      supabase.from('user_warnings').delete().eq('user_id', userId),
      supabase.from('paywall_events').delete().eq('user_id', userId),
      supabase.from('spiritual_profiles').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('user_id', userId),
    ];

    await Promise.allSettled(operaciones); // allSettled para no fallar si tabla no existe

    // 3. Anonimizar registros de reportes (requerido por GDPR — no borrar para audit trail)
    await supabase.from('reports')
      .update({ reporter_id: null, description: '[DELETED]' })
      .eq('reporter_id', userId);

    // 4. Borrar de tabla users
    await supabase.from('users').delete().eq('id', userId);

    // 5. CRÍTICO: Borrar de Supabase Auth (sin esto el usuario puede volver a entrar)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      logger.error({ authError, userId }, '[ACCOUNT_DELETION] Error borrando de auth.users');
      throw authError;
    }

    logger.info({ userId }, '[ACCOUNT_DELETION] Cuenta eliminada exitosamente (incluido auth)');
    return {
      success: true,
      message: 'Tu cuenta y todos tus datos han sido eliminados permanentemente. ' +
               'Si tienes una suscripción activa, cancélala desde Configuración > Apple ID > Suscripciones.',
    };
  } catch (err) {
    logger.error({ err, userId }, '[ACCOUNT_DELETION] Error durante el proceso de borrado');
    throw new Error('Error al eliminar la cuenta. Por favor, contacta a soporte@agape-app.com.');
  }
};

module.exports = { deleteAccountPermanently };
```

### Flujo UX de eliminación — Lo que Apple verifica

```
Configuración → Mi cuenta → Zona de peligro → "Eliminar cuenta permanentemente"
       ↓
Modal de confirmación con texto: "Esta acción es irreversible.
Se eliminarán: perfil, fotos, mensajes, matches y datos personales.
Si tienes Premium activo, cancela primero desde Configuración de iOS > Apple ID > Suscripciones."
       ↓
Campo de confirmación: escribir "ELIMINAR"
       ↓
[Botón rojo: "Eliminar mi cuenta"]
       ↓
Loading + llamada a backend
       ↓
Logout forzado + pantalla de confirmación: "Tu cuenta ha sido eliminada."
```

**El revisor de Apple:**
1. Registra una cuenta
2. Va a Configuración → busca "Eliminar cuenta" — debe ser encontrable fácilmente
3. Elimina la cuenta
4. Intenta iniciar sesión con las mismas credenciales
5. Debe recibir error "cuenta no existe" — no "contraseña incorrecta"

---

## ✅ PARTE 7: CHECKLIST FINAL CONSOLIDADO

### 🔴 CRÍTICO — No enviar sin esto

**IAP y Monetización**
- [ ] Botón "Restaurar compras" visible en PremiumScreen/PaywallModal
- [ ] Texto legal en paywall: precio, duración, renovación automática
- [ ] Links a Términos y Privacidad en el paywall
- [ ] `APPLE_IAP_SHARED_SECRET` real configurado en servidor (no placeholder)
- [ ] `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` configurados (para App Store Server API)
- [ ] Products IDs en App Store Connect coinciden exactamente con `monetizationAgapeService.js`
- [ ] Acuerdo de "Paid Applications" firmado en App Store Connect
- [ ] Facturación de prueba completada en sandbox antes de enviar
- [ ] NO hay Stripe/PayPal/PayU para contenido digital en iOS

**Privacidad y Legal**
- [ ] `https://agape-app.com/privacy` — URL pública accesible (publicar `privacy-policy.md` de v7)
- [ ] `https://agape-app.com/terms` — URL pública accesible
- [ ] Ambas URLs ingresadas en App Store Connect
- [ ] Política de privacidad accesible ANTES del registro (en la pantalla de login/registro)

**Eliminación de cuenta**
- [ ] Botón "Eliminar cuenta" navegable sin más de 3 taps desde la pantalla principal
- [ ] `deleteAccountPermanently()` elimina también de `auth.users` de Supabase
- [ ] Flujo confirmado: crear cuenta → eliminar → intentar login → debe fallar

**Moderación (Guideline 1.2)**
- [ ] Botón "Reportar" en cada perfil de usuario
- [ ] Botón "Reportar mensaje" en el chat (mantener presionado el mensaje)
- [ ] Botón "Bloquear usuario" disponible desde el perfil
- [ ] Declarar proceso de moderación en "Notes" al revisor de Apple

### 🟡 IMPORTANTE — Puede causar suspensión posterior

**Seguridad**
- [ ] `.env.production` eliminado del repositorio (no en git)
- [ ] `.gitignore` incluye `.env*` excepto `.env.example`
- [ ] Tokens JWT usan secretos de 64+ caracteres aleatorios reales
- [ ] Tokens del frontend almacenados en `EncryptedStorage` (v1) o `SecureStore` (v7), no `AsyncStorage`
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` con formato JSON completo y válido
- [ ] HTTPS habilitado en el servidor de producción
- [ ] Webhooks de Apple y Google configurados con URLs de producción

**Android / Google Play**
- [ ] `google-services.json` real en `android/app/` (no el placeholder del repo)
- [ ] Sección "Data Safety" completada en Play Console
- [ ] AAB firmado con keystore de producción (backup guardado en lugar seguro)
- [ ] Target SDK 34+ (requisito Google Play 2024)

**iOS**
- [ ] Bundle ID `com.agape.app` coincide en Xcode, Info.plist y App Store Connect
- [ ] Capability "In-App Purchase" activada en Xcode → Signing & Capabilities
- [ ] Capability "Push Notifications" activada
- [ ] `GoogleService-Info.plist` real en `ios/Agape/`
- [ ] APNs Authentication Key configurada en Firebase Console
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) creado — requerido desde mayo 2024

**Base de datos (ejecutar migraciones de v7)**
- [ ] `migration_appstore.sql` ejecutado (tabla `subscriptions` con campos IAP)
- [ ] `migration_monetization.sql` ejecutado
- [ ] `migration_swipe_limits.sql` ejecutado
- [ ] Tabla `user_blocks` creada (para bloqueo de usuarios)
- [ ] Tabla `paywall_events` creada (para analytics)

### 🟢 OPTIMIZACIÓN — Mejora conversión post-lanzamiento

- [ ] Webhook Apple configurado: `https://api.agapeapp.com/api/webhooks/apple`
- [ ] Webhook Google (Pub/Sub): `https://api.agapeapp.com/api/webhooks/google`
- [ ] Firebase Crashlytics activado (detectar crashes en revisión)
- [ ] Sentry o LogRocket para errores JS en producción
- [ ] A/B testing de paywall habilitado (tabla `paywall_events` ya existe)
- [ ] Alertas de servidor para errores 5xx en endpoints IAP

---

## 📁 ESTRUCTURA FINAL RECOMENDADA — ÁGAPE V8

Tomando lo mejor de ambas versiones:

```
agape-v8/
├── backend/                          ← De v1 (más completo)
│   ├── database/                     ← De v7 (5 scripts SQL)
│   │   ├── schema.sql
│   │   ├── migration_appstore.sql
│   │   ├── migration_monetization.sql
│   │   ├── migration_swipe_limits.sql
│   │   └── migration_final.sql
│   ├── legal/                        ← Ambas versiones tienen terms; agregar privacy de v7
│   │   ├── terms-of-service.md
│   │   └── privacy-policy.md        ← De v7 (ausente en v1)
│   ├── src/
│   │   ├── services/
│   │   │   ├── iapService.js        ← Actualizar a App Store Server API v2
│   │   │   ├── paywallService.js    ← De v1 (ausente en v7)
│   │   │   ├── moderationService.js
│   │   │   └── accountDeletionService.js  ← Corregir: agregar admin.deleteUser()
│   │   └── ...                      ← Resto igual en ambas versiones
│   ├── .env.example                 ← Actualizar con nuevas variables Apple
│   └── .env.production              ← ELIMINAR del repo, usar variables de servidor
│
├── frontend/                         ← De v1 (React Native CLI nativo)
│   ├── android/                      ← Completo en v1
│   ├── ios/                          ← Completo en v1
│   ├── src/
│   │   ├── screens/                  ← De v7 (ausentes en v1)
│   │   │   ├── PremiumScreen.js     ← Agregar botón Restaurar + texto legal
│   │   │   └── SettingsScreen.js    ← Verificar acceso a Eliminar cuenta
│   │   ├── components/
│   │   │   ├── PaywallModal.js      ← De v7 + agregar sección legal
│   │   │   └── ReportButton.js      ← NUEVO (ver implementación arriba)
│   │   └── services/
│   │       └── api.js               ← Usar EncryptedStorage en lugar de AsyncStorage
│   └── ...
│
├── README.md                         ← De v1 (completo)
├── CHECKLIST_PRODUCCION.md           ← De v1 + este documento
├── FIREBASE_SETUP.md                 ← De v1
└── DEPLOY_GUIDE.md                   ← De v7
```

---

## 🔧 COMANDOS RÁPIDOS POST-CORRECCIONES

```bash
# Backend — instalar dependencia App Store Server API
cd backend
npm install @apple/app-store-server-library

# Frontend v1 (RN CLI) — reemplazar AsyncStorage por EncryptedStorage
cd frontend
npm install react-native-encrypted-storage
cd ios && pod install && cd ..

# Frontend v1 — instalar react-native-iap si no está
npm install react-native-iap
cd ios && pod install && cd ..

# Verificar que .env no está en git
git check-ignore -v backend/.env.production

# Build iOS para App Store (desde Mac)
cd ios && pod install && cd ..
npx react-native run-ios --configuration Release

# Build Android AAB para Play Store
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

---

*ÁGAPE v8 — Consolidación técnica y compliance App Store / Google Play*
*Generado: Abril 2026 | Base: agape-production-v1 + agape-COMPLETO-v7*
