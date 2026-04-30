# ÁGAPE — Guía de Monetización

## Modelo de ingresos

```
FREE  →  PREMIUM ($14.900/mes)  →  VIP ($34.900/mes)
                                        ↕
                          Monedas de Fe (IAP one-time)
```

## Product IDs — configurar en tiendas

### App Store Connect (Apple)
| Product ID | Tipo | Precio |
|---|---|---|
| `com.agape.app.premium.monthly` | Auto-renovable | $14.900 COP |
| `com.agape.app.premium.yearly`  | Auto-renovable | $119.900 COP |
| `com.agape.app.vip.monthly`     | Auto-renovable | $34.900 COP |
| `com.agape.app.vip.yearly`      | Auto-renovable | $269.900 COP |
| `com.agape.coins.100`           | Consumible     | $4.900 COP |
| `com.agape.coins.300`           | Consumible     | $12.900 COP |
| `com.agape.coins.700`           | Consumible     | $24.900 COP |
| `com.agape.coins.1500`          | Consumible     | $44.900 COP |

### Google Play Console
| Product ID | Tipo |
|---|---|
| `agape_premium_monthly` | Suscripción |
| `agape_premium_yearly`  | Suscripción |
| `agape_vip_monthly`     | Suscripción |
| `agape_vip_yearly`      | Suscripción |
| `agape_coins_100`       | One-time |
| `agape_coins_300`       | One-time |
| `agape_coins_700`       | One-time |
| `agape_coins_1500`      | One-time |

## Flujo de compra

```
Frontend (RN/Flutter)
  → Iniciar compra con StoreKit/BillingClient
  → Obtener receipt/purchaseToken
  → POST /api/subscriptions/purchase
      { plataforma: "apple"|"google", product_id, receipt_or_token }
  ← Backend valida con Apple/Google
  ← Activa plan en DB
  ← Responde con plan activo + monedas bonus
```

## Endpoints de monetización

| Método | Ruta | Descripción |
|---|---|---|
| GET  | `/api/subscriptions/status`    | Plan activo + monedas + días restantes |
| GET  | `/api/subscriptions/plans`     | Todos los planes + precios + product IDs |
| POST | `/api/subscriptions/purchase`  | Activar compra IAP |
| POST | `/api/subscriptions/restore`   | Restaurar compras (Apple lo exige) |
| GET  | `/api/subscriptions/coins`     | Saldo + tienda de monedas |
| POST | `/api/subscriptions/coins/spend` | Gastar monedas |
| GET  | `/api/subscriptions/check/:action` | Verificar si puede hacer una acción |
| GET  | `/api/subscriptions/revenue`   | Stats de revenue (solo admin) |

## Lógica de límites por plan

```javascript
// Verificar antes de cada acción sensible:
GET /api/subscriptions/check/conexion
GET /api/subscriptions/check/rewind
GET /api/subscriptions/check/ver_likes
GET /api/subscriptions/check/filtros
GET /api/subscriptions/check/mentoria

// Respuesta:
{ "permitido": true }
{ "permitido": false, "upgrade_mensaje": "Actualiza a Premium..." }
```

## Configuración Apple

1. App Store Connect → Tu App → In-App Purchases
2. Crear cada producto con los IDs de arriba
3. Obtener Shared Secret: Funciones → In-App Purchases → App-Specific Shared Secret
4. Pegar en `.env`: `APPLE_IAP_SHARED_SECRET=...`

**⚠️ Obligatorio para Apple:**
- Implementar "Restaurar compras" (botón visible en UI) ← Ya implementado: `POST /api/subscriptions/restore`
- URL de Política de Privacidad en App Store Connect ← `https://agape-app.com/privacy`
- URL de Términos en App Store Connect ← `https://agape-app.com/terms`

## Configuración Google Play

1. Google Play Console → Setup → API access
2. Crear Service Account con permiso "View financial data, orders, and cancellation survey responses"
3. Descargar JSON de credenciales
4. Subir como variable de entorno o archivo

## Proyección de ingresos (estimada)

| Usuarios activos | Conversión | MRR estimado |
|---|---|---|
| 1.000 | 5% premium | $745.000 COP / mes |
| 5.000 | 5% premium | $3.725.000 COP / mes |
| 10.000 | 5% premium + 1% vip | $8.940.000 COP / mes |
| 50.000 | 5% premium + 2% vip | $58.250.000 COP / mes |

*Comisiones de tiendas: Apple 15-30%, Google 15% (primeros $1M USD)*
