# ✅ ÁGAPE v8 — Checklist de Producción
## App Store + Google Play — Antes de enviar

---

## 🔴 CRÍTICO — No enviar sin esto (rechazo garantizado)

### IAP y Monetización
- [ ] Botón **"Restaurar compras"** visible en PremiumScreen ← **YA INCLUIDO en v8**
- [ ] Texto legal en paywall: precio, duración, renovación automática ← **YA INCLUIDO en v8**
- [ ] Links a Términos y Privacidad en el paywall ← **YA INCLUIDO en v8**
- [ ] `APPLE_IAP_SHARED_SECRET` real configurado en `.env` del servidor
- [ ] Product IDs en App Store Connect coinciden con `monetizationAgapeService.js`:
  - `com.agape.app.premium.monthly`
  - `com.agape.app.premium.quarterly`
  - `com.agape.app.premium.yearly`
  - `com.agape.app.vip.monthly`
  - `com.agape.app.vip.yearly`
  - `com.agape.coins.100` / `.300` / `.700` / `.1500`
- [ ] Acuerdo "Paid Applications" firmado en App Store Connect
- [ ] NO hay Stripe/PayPal/PayU para contenido digital en iOS

### Privacidad y Legal
- [ ] `https://agape-app.com/privacy` — URL pública HTTPS accesible (publicar `backend/legal/privacy-policy.md`)
- [ ] `https://agape-app.com/terms` — URL pública HTTPS accesible
- [ ] Ambas URLs ingresadas en App Store Connect antes de enviar
- [ ] Política de privacidad accesible ANTES del registro (ya está en LoginScreen)

### Eliminación de cuenta (Apple Guideline 5.1.1)
- [ ] Botón "Eliminar cuenta" en Configuración → Zona de peligro ← **YA INCLUIDO en v8**
- [ ] `deleteAccountPermanently()` elimina de `auth.users` de Supabase ← **CORREGIDO en v8**
- [ ] Flujo confirmado: crear cuenta → eliminar → intentar login → debe fallar con "no existe"
- [ ] Botón encontrable en ≤3 taps desde pantalla principal

### Moderación (Apple Guideline 1.2)
- [ ] Botón "Reportar" en cada perfil — componente `ReportButton` ← **YA INCLUIDO en v8**
- [ ] Bloquear usuario desde el perfil ← **YA INCLUIDO en v8**
- [ ] Declarar proceso de moderación en "Notes" al revisor de Apple

---

## 🟡 IMPORTANTE — Puede causar rechazo o suspensión

### Seguridad
- [ ] `.env.production` NO está en el repositorio (`.gitignore` ya lo excluye) ← **YA CONFIGURADO**
- [ ] JWT_SECRET con 64+ caracteres aleatorios reales
- [ ] HTTPS habilitado en el servidor de producción
- [ ] Webhooks Apple y Google configurados con URLs de producción

### Android / Google Play
- [ ] `google-services.json` REAL en `frontend/google-services.json` (reemplazar el placeholder)
- [ ] Sección "Data Safety" completada en Play Console
- [ ] AAB firmado con keystore de producción (backup guardado en lugar seguro)
- [ ] Target SDK 34 configurado en `app.json` ← **YA CONFIGURADO**

### iOS
- [ ] Bundle ID `com.agape.app` en Xcode + Info.plist + App Store Connect
- [ ] Capability "In-App Purchase" activada en Xcode → Signing & Capabilities
- [ ] Capability "Push Notifications" activada
- [ ] `GoogleService-Info.plist` real en `ios/Agape/` (después de `expo prebuild`)
- [ ] APNs Authentication Key configurada en Firebase Console
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`) — requerido desde mayo 2024

### Base de datos
Ejecutar en Supabase SQL Editor en este orden:
```sql
-- 1. Schema base
-- frontend: backend/database/schema.sql

-- 2. Límites de swipe
-- frontend: backend/database/migration_swipe_limits.sql

-- 3. App Store compliance
-- frontend: backend/database/migration_appstore.sql

-- 4. Monetización
-- frontend: backend/database/migration_monetization.sql

-- 5. Sistema final
-- frontend: backend/database/migration_final.sql

-- 6. Conversión/paywall analytics
-- frontend: backend/database/migration_conversion.sql
```

---

## 🟢 OPTIMIZACIÓN — Post-lanzamiento

- [ ] Webhook Apple: `https://api.agape-app.com/api/webhooks/apple`
- [ ] Webhook Google (Pub/Sub): `https://api.agape-app.com/api/webhooks/google`
- [ ] Firebase Crashlytics activado
- [ ] A/B testing de paywall (tabla `paywall_events` ya existe)

---

## 📱 Cómo compilar

### Opción A — EAS Build (recomendada, sin Mac necesario para Android)
```bash
cd frontend
npm install -g eas-cli
eas login
# Registrar en expo.dev → obtener projectId → poner en app.json

# Android AAB (Play Store)
eas build --platform android --profile production

# iOS IPA (App Store) — necesita cuenta Apple Developer
eas build --platform ios --profile production
```

### Opción B — Local Android
```bash
cd frontend
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Opción C — Local iOS (solo Mac)
```bash
cd frontend
npx expo prebuild --platform ios --clean
cd ios && pod install
# Abrir Agape.xcworkspace en Xcode → Archive → Distribute
```

### Ver en Expo Go (preview instantáneo)
```bash
cd frontend
npm install
npx expo start
# Escanear QR con app Expo Go en el teléfono
```

---

## 🌐 Variables de entorno necesarias

```bash
# backend/.env (crear desde .env.example)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_role_key
JWT_SECRET=minimo_64_caracteres_aleatorios
APPLE_IAP_SHARED_SECRET=tu_apple_shared_secret
GOOGLE_PLAY_PACKAGE_NAME=com.agape.app
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---
*ÁGAPE v8 — Completo y listo · Abril 2026*
