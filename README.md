# ✝️ ÁGAPE Backend v4.1 — Production Ready

Este backend ha sido auditado y refactorizado para cumplir con los estándares de seguridad, estabilidad y requisitos de la **App Store (Apple)** y **Google Play Store**.

## 🚀 Mejoras Implementadas

### 🔐 Seguridad Avanzada
- **JWT con Rotación**: Secretos separados para Access y Refresh tokens (`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`).
- **Rate Limiting**: Protecciones específicas para Auth, Chat, Swipes y API general mediante `express-rate-limit`.
- **Fail-Fast Config**: El servidor no arranca si faltan variables de entorno críticas (validación con `Joi`).
- **Sanitización**: Protección contra XSS y SQL Injection en todos los inputs.

### 🧾 Monetización y Stores
- **Webhooks**: Endpoints listos para recibir notificaciones de Apple y Google (`/api/webhooks/apple` y `/api/webhooks/google`).
- **Borrado de Cuenta**: Implementado borrado permanente de datos (Requisito Apple Guideline 5.1.1).
- **IAP Validation**: Lógica robusta para validación de recibos y restauración de compras.

### ⚠️ Estabilidad y Observabilidad
- **Manejo Global de Errores**: Respuestas JSON estandarizadas sin leaks de información sensible.
- **Logging Estructurado**: Integración con `pino` para logs en formato JSON listos para Datadog/Logtail.
- **Health Check**: Endpoint `/health` para monitoreo de uptime.

## 🛠️ Configuración

1.  **Variables de Env**: Copia `.env.example` a `.env` y completa todos los campos.
    - **IMPORTANTE**: Usa secretos de al menos 32 caracteres para los tokens JWT.
2.  **Instalación**:
    ```bash
    pnpm install
    ```
3.  **Desarrollo**:
    ```bash
    pnpm dev
    ```
4.  **Producción (Docker)**:
    ```bash
    docker build -t agape-backend .
    docker run -p 3000:3000 --env-file .env agape-backend
    ```

## 🧪 Testing
Ejecuta los tests de integración:
```bash
pnpm test
```

## 📱 Requisitos para el Frontend
Para evitar rechazos en las tiendas, asegúrate de que tu frontend:
1.  Muestre un botón de **"Eliminar Cuenta"** visible en los ajustes de perfil.
2.  Incluya un botón de **"Restaurar Compras"** en la pantalla de suscripciones.
3.  Muestre enlaces a la **Política de Privacidad** y **Términos de Servicio** antes del registro.

---
**Desarrollado por Manus AI para el equipo de ÁGAPE.**
