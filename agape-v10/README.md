# ✝️ ÁGAPE v10 — App de Citas Cristiana

**Versión 10 — Profesional, lista para producción**

---

## Estructura del proyecto

```
agape-v10/
├── backend/                    ← Node.js + Express + Socket.io + Supabase
│   ├── database/               ← Scripts SQL (ejecutar en orden numérico)
│   ├── legal/                  ← Política de privacidad + Términos de servicio
│   ├── src/
│   │   ├── config/             ← Entorno, logger, Supabase
│   │   ├── controllers/        ← Controladores de rutas
│   │   ├── middlewares/        ← Auth, seguridad, rate limiting
│   │   ├── models/             ← Modelos de datos
│   │   ├── routes/             ← Endpoints REST completos
│   │   ├── services/           ← Lógica de negocio
│   │   ├── socket/             ← Socket.io handlers (chat en tiempo real)
│   │   └── utils/              ← Helpers de backend
│   ├── .env.example            ← Copia a .env y configura
│   ├── Dockerfile              ← Deploy en Railway / Render
│   └── package.json
│
├── frontend/                   ← React Native (Expo SDK 50)
│   ├── src/
│   │   ├── components/         ← MatchModal, PaywallModal, ReportButton, etc.
│   │   ├── hooks/              ← useNotifications
│   │   ├── navigation/         ← AppNavigator (Stack + Tabs)
│   │   ├── screens/            ← 15 pantallas completas
│   │   ├── services/           ← api.js (REST) + socketService.js
│   │   ├── store/              ← Zustand (estado global)
│   │   └── utils/              ← constants.js + helpers.js
│   ├── App.js                  ← Entry point
│   ├── app.json                ← Config Expo
│   ├── eas.json                ← Config builds EAS
│   └── package.json
│
├── CHECKLIST_PRODUCCION.md     ← Pasos antes de publicar
├── GUIA_V8_APPSTORE.md         ← Guía detallada App Store
└── README.md                   ← Este archivo
```

---

## Inicio rápido

```bash
# Backend
cd backend
cp .env.example .env
# Llenar .env con credenciales reales (Supabase, JWT, Firebase)
npm install
npm run dev

# Frontend
cd frontend
npm install
npx expo start
```

---

## Mejoras v10 vs v9

| Área | v9 | v10 |
|------|----|-----|
| API endpoints | Paths inconsistentes | `/api/` prefix unificado |
| `matchAPI.getFeed` | Sin parámetros | Con `limit` configurable |
| `matchAPI.swipe` | No existía | Implementado correctamente |
| `activeAPI` | No exportado | Exportado desde api.js |
| `useStore.usarLike` | Faltaba | Implementado |
| `useStore.incrementarNoLeidos` | Faltaba | Implementado |
| Constantes globales | Dispersas | Centralizadas en `constants.js` |
| Helpers | Básico | Completo: `tiempoRelativo`, `calcularEdad`, `formatearHoraMensaje`, etc. |
| Config DEV/PROD | Manual | Auto-detectado por `NODE_ENV` |
| Socket | Sin reconexión | Auto-reconexión con backoff |
| Notificaciones | Básico | Android channel + badge counter |
| LoginScreen | Sin validación email | `esEmailValido()` integrado |
| ChatScreen | Sin fallback REST | Fallback automático si socket falla |
| MatchModal | Animaciones simples | Blur, spring, partículas mejoradas |
| PaywallModal | Código duplicado | Limpio, reutilizable |
| AppNavigator | Tabs duplicadas | Limpio, sin duplicados |
| Expo SDK | 49 | 50 (LTS) |
| package versions | Desactualizadas | Actualizadas a versiones estables |

---

## Planes

| Plan | Precio COP | USD | Beneficios |
|------|-----------|-----|-----------|
| Free | $0 | — | 20 likes/12h, chat, devocional |
| Premium | $14.900/mes | USD $3.99 | Swipes ∞, ver likes, sin anuncios, filtros |
| (3 meses) | $34.900 | USD $9.99 | Todo + ahorra 22% |
| (12 meses) | $119.900 | USD $29.99 | Todo + ahorra 33% |

---

## Compliance App Store / Google Play

- ✅ Botón "Restaurar compras" (Apple 3.1.1)
- ✅ Texto legal en paywall (Apple 3.1.2)
- ✅ Eliminación de cuenta completa (Apple 5.1.1)
- ✅ Reportes y bloqueo de usuarios (Apple 1.2)
- ✅ Política de privacidad + Términos de servicio
- ✅ PrivacyInfo.xcprivacy (iOS 17+)
- ✅ Data Safety section (Google Play)

---

## Variables de entorno requeridas

Copia `backend/.env.example` a `backend/.env` y completa:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
FRONTEND_URL=
PRIVACY_POLICY_URL=
TERMS_OF_SERVICE_URL=
FIREBASE_PROJECT_ID=   # Para notificaciones push
PORT=3000
NODE_ENV=development
```

---

## Deploy

**Backend (Railway / Render):**
```bash
# El Dockerfile ya está configurado
# Solo conecta el repo y configura las env vars
```

**Frontend (EAS Build):**
```bash
cd frontend
eas build --platform all --profile production
eas submit --platform all
```
