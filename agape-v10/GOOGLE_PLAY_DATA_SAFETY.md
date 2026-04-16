# 📊 Google Play — Formulario de Seguridad de Datos
## Ágape — Cómo completarlo en Play Console

---

**DÓNDE ESTÁ:** Google Play Console → tu app → Política → Contenido de la app → Seguridad de los datos

Sin completar este formulario, la app queda en borrador y no puede pasar a revisión.

---

## Sección 1: Recopilación y uso de datos

**¿Tu app recopila o comparte alguno de los tipos de datos de usuario requeridos?**
→ **SÍ**

**¿Todos los datos de usuario recopilados por tu app se transmiten de forma encriptada?**
→ **SÍ** (HTTPS obligatorio)

**¿Ofreces a los usuarios la posibilidad de solicitar la eliminación de sus datos?**
→ **SÍ** (Configuración → Zona de peligro → Eliminar cuenta)

---

## Sección 2: Tipos de datos — marcar en la consola

| Tipo de dato | ¿Recopila? | ¿Comparte? | ¿Opcional? | Propósito |
|---|---|---|---|---|
| Nombre | SÍ | NO | NO | Funcionalidad de la app |
| Dirección de email | SÍ | NO | NO | Funcionalidad, gestión de cuentas |
| ID de usuario | SÍ | NO | NO | Funcionalidad de la app |
| Fotos y videos | SÍ | NO | NO | Funcionalidad (fotos de perfil) |
| Historial de apps | NO | NO | — | — |
| Ubicación aproximada | SÍ | NO | SÍ | Funcionalidad (perfiles cercanos) |
| Ubicación precisa | SÍ | NO | SÍ | Funcionalidad (perfiles cercanos) |
| Mensajes en la app | SÍ | NO | NO | Funcionalidad (chat entre matches) |
| Info de pagos | NO | NO | — | Google/Apple gestionan los pagos |
| Historial de compras | SÍ | NO | NO | Gestión de cuenta (suscripción) |
| Audio | SÍ | NO | SÍ | Funcionalidad (videollamadas) |
| Identificadores de dispositivo | SÍ | NO | NO | Análisis, detección de fraude |
| Datos de uso de la app | SÍ | NO | NO | Análisis y mejora de la app |
| Información de fallos | SÍ | NO | NO | Análisis y diagnóstico |

---

## Sección 3: Prácticas de seguridad

**¿Los datos se transmiten en tránsito con encriptación?** → SÍ
**¿Puedes solicitar la eliminación de datos?** → SÍ
**¿Cumple con las Políticas de Datos Familiares?** → NO APLICA (app 18+)

---

## Notas adicionales para el revisor de Google

En el campo "Notes for reviewer" al enviar la app, incluir:

```
Ágape es una app de citas cristiana para adultos (+18).

- El registro valida edad mínima de 18 años
- Los usuarios pueden eliminar su cuenta y datos desde Configuración → Zona de peligro
- La app incluye sistema de reportes y bloqueo de usuarios
- Las suscripciones se gestionan íntegramente a través de Google Play Billing
- No se usan métodos de pago alternativos para contenido digital
- Cuenta de prueba disponible: tester@agape-test.com / TestPass123!
```

