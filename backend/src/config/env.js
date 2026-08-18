const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_KEY: Joi.string().required(),
  
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  
  FRONTEND_URL: Joi.string().uri().required(),

  // Opcionales: el código ya degrada con gracia cuando faltan (IAP nativo
  // aún no está conectado al frontend; notificationService.initFirebase()
  // cae a modo simulado si no hay credenciales de Firebase). Exigirlas con
  // .required() impedía arrancar el backend en desarrollo/pruebas sin tener
  // las tres integraciones de terceros completamente configuradas.
  APPLE_IAP_SHARED_SECRET: Joi.string().optional(),
  APPLE_BUNDLE_ID: Joi.string().optional(),
  GOOGLE_PLAY_PACKAGE_NAME: Joi.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),

  // Requeridas solo en producción para verificar el webhook de Google
  // (ver verificarPubSubToken en routes/webhooks.js) — en dev se omite.
  GOOGLE_PUBSUB_AUDIENCE: Joi.string().uri().optional(),
  GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL: Joi.string().email().optional(),

  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),

  PRIVACY_POLICY_URL: Joi.string().uri().required(),
  TERMS_OF_SERVICE_URL: Joi.string().uri().required(),

  // Wompi (pagos en pesos colombianos) — ver routes/wompi.js
  WOMPI_INTEGRITY_KEY: Joi.string().optional(),
  WOMPI_PUBLIC_KEY: Joi.string().optional(),
  WOMPI_EVENTOS: Joi.string().optional(),
  APP_URL: Joi.string().uri().optional(),
}).unknown().required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error(`\n❌ Error de configuración: Faltan variables de entorno críticas:`);
  error.details.forEach(detail => console.error(`   - ${detail.message}`));
  console.error(`\nRevisa tu archivo .env antes de continuar.\n`);
  process.exit(1);
}

// Los placeholders del template pasan la validación de Joi (son strings/URIs
// sintácticamente válidos), así que se chequean aparte para no arrancar en
// producción con credenciales o dominios que en realidad son texto de plantilla.
const PLACEHOLDERS = {
  SUPABASE_URL: 'tu-proyecto.supabase.co',
  SUPABASE_SERVICE_KEY: 'tu_service_role_key',
  JWT_ACCESS_SECRET: 'cambia_esto',
  JWT_REFRESH_SECRET: 'cambia_esto',
  FRONTEND_URL: 'tudominio.com',
  PRIVACY_POLICY_URL: 'tudominio.com',
  TERMS_OF_SERVICE_URL: 'tudominio.com',
  APPLE_IAP_SHARED_SECRET: 'tu_shared_secret_aqui',
  FIREBASE_PROJECT_ID: 'tu-project-id',
  FIREBASE_CLIENT_EMAIL: 'tu-project',
  FIREBASE_PRIVATE_KEY: 'TU_CLAVE_AQUI',
  GOOGLE_PUBSUB_AUDIENCE: 'tudominio.com',
};

if (envVars.NODE_ENV === 'production') {
  const sinReemplazar = Object.entries(PLACEHOLDERS)
    .filter(([key, marca]) => envVars[key]?.includes(marca))
    .map(([key]) => key);

  // Estos, si están presentes, deben ser reales — pero solo se exigen si el
  // proyecto los configuró (Google Play Billing es opcional en esta versión).
  if (envVars.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const cred = JSON.parse(envVars.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (!cred.private_key || !cred.client_email) {
        sinReemplazar.push('GOOGLE_SERVICE_ACCOUNT_JSON (incompleto: falta private_key o client_email)');
      }
    } catch {
      sinReemplazar.push('GOOGLE_SERVICE_ACCOUNT_JSON (no es JSON válido)');
    }
  }

  if (sinReemplazar.length) {
    console.error(`\n❌ Error de configuración: credenciales de plantilla sin reemplazar en producción:`);
    sinReemplazar.forEach(key => console.error(`   - ${key}`));
    console.error(`\nReemplaza estos valores por tus credenciales reales antes de desplegar.\n`);
    process.exit(1);
  }
}

module.exports = envVars;
