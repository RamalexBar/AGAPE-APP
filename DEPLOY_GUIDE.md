# 🚀 Guía de Despliegue y Checklist Final: ÁGAPE v5

Este documento contiene los pasos críticos para lanzar la aplicación hoy mismo sin riesgos de rechazo en las tiendas.

---

## 🛠️ 1. Despliegue del Backend (Producción)

1.  **Variables de Entorno**:
    - Usa el archivo `backend/.env.production`.
    - Asegúrate de configurar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` con valores largos y aleatorios.
    - Configura las credenciales reales de **Supabase**, **Firebase** y **Apple/Google IAP**.
2.  **Base de Datos**:
    - Ejecuta los scripts en `backend/database/` en tu instancia de Supabase en el orden indicado.
3.  **Deploy**:
    - Si usas **Railway/Render**: Conecta el repositorio, apunta al directorio `backend/` y usa el `Dockerfile` incluido.
    - Asegúrate de que el puerto 3000 esté expuesto y que el dominio tenga **HTTPS** (obligatorio para las tiendas).

---

## 📱 2. Preparación del Frontend (App)

1.  **Configuración de URLs**:
    - En `frontend/src/config.js`, cambia el entorno a `'prod'` y pon la URL real de tu backend (ej: `https://api.agape-app.com`).
2.  **Identificadores de App**:
    - En `frontend/app.json`, verifica que el `bundleIdentifier` (iOS) y `package` (Android) coincidan con lo registrado en App Store Connect y Google Play Console.
3.  **Firebase**:
    - Asegúrate de que el archivo `frontend/google-services.json` sea el real descargado de tu consola de Firebase.
4.  **Build con EAS**:
    ```bash
    cd frontend
    eas build --platform ios --profile production
    eas build --platform android --profile production
    ```

---

## ✅ 3. Checklist Final de Publicación (Evitar Rechazos)

### 🍏 Apple App Store (Guideline 5.1.1 & 3.1.1)
- [ ] **Borrado de Cuenta**: El botón "Eliminar Cuenta" en `SettingsScreen` debe llamar a `authAPI.deleteAccount()` (ya configurado para borrado total).
- [ ] **Restaurar Compras**: La pantalla de suscripciones DEBE tener un botón de "Restaurar Compras".
- [ ] **Privacidad**: Los enlaces a la Política de Privacidad y Términos deben ser accesibles antes del registro.
- [ ] **IAP**: No uses Stripe/PayU para contenido digital (suscripciones/monedas). Usa **Apple In-App Purchases**.

### 🤖 Google Play Store
- [ ] **Data Safety**: Completa el formulario de seguridad de datos indicando que recolectas Email y ubicación (para el feed).
- [ ] **Prominent Disclosure**: Si pides ubicación en segundo plano, debes mostrar un mensaje claro al usuario antes de pedir el permiso.

---

## 🔗 4. Integración de Pagos (Webhooks)

1.  **Apple**: Configura la URL de Webhook en App Store Connect: `https://tu-api.com/api/webhooks/apple`.
2.  **Google**: Configura el tema de Pub/Sub y apunta a: `https://tu-api.com/api/webhooks/google`.

---
**¡Todo listo para el lanzamiento!**
