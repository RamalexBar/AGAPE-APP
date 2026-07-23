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
  
  APPLE_IAP_SHARED_SECRET: Joi.string().required(),
  GOOGLE_PLAY_PACKAGE_NAME: Joi.string().required(),
  
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  
  PRIVACY_POLICY_URL: Joi.string().uri().required(),
  TERMS_OF_SERVICE_URL: Joi.string().uri().required(),

  // Secreto compartido para autenticar los webhooks de Apple/Google
  // (se configura como ?token=... en la URL de notificaciones del servidor
  // en App Store Connect / Play Console). Opcional para no romper despliegues
  // existentes, pero se recomienda encarecidamente definirlo en producción.
  WEBHOOK_SHARED_SECRET: Joi.string().min(16).optional(),
}).unknown().required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error(`\n❌ Error de configuración: Faltan variables de entorno críticas:`);
  error.details.forEach(detail => console.error(`   - ${detail.message}`));
  console.error(`\nRevisa tu archivo .env antes de continuar.\n`);
  process.exit(1);
}

module.exports = envVars;
