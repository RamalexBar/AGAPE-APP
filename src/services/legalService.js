// src/services/legalService.js
// Gestión de documentos legales y registro de consentimiento
const fs      = require('fs');
const path    = require('path');
const supabase = require('../config/supabase');

const LEGAL_DIR     = path.join(__dirname, '../../../legal');
const CURRENT_TERMS_VERSION   = '1.0';
const CURRENT_PRIVACY_VERSION = '1.0';

// ── Leer documento legal desde archivo ──────────────────────────
const getLegalDoc = (tipo) => {
  const files = { privacy: 'privacy-policy.md', terms: 'terms-of-service.md' };
  const file  = files[tipo];
  if (!file) throw Object.assign(new Error('Documento no encontrado.'), { status: 404 });

  try {
    return fs.readFileSync(path.join(LEGAL_DIR, file), 'utf8');
  } catch {
    throw Object.assign(new Error('Error al leer documento.'), { status: 500 });
  }
};

// ── Registrar aceptación de términos (obligatorio en registro) ───
const registrarConsentimiento = async (userId, { terms_version, privacy_version, ip = null, user_agent = null }) => {
  const { error } = await supabase.from('legal_consents').insert({
    user_id:          userId,
    terms_version:    terms_version    || CURRENT_TERMS_VERSION,
    privacy_version:  privacy_version  || CURRENT_PRIVACY_VERSION,
    accepted_at:      new Date().toISOString(),
    ip_address:       ip,
    user_agent:       user_agent,
  });

  if (error) {
    console.error('[Legal] Error registrando consentimiento:', error.message);
    // No bloquear el registro por esto — loguear y continuar
  }
};

// ── Verificar si el usuario aceptó la versión actual ────────────
const verificarConsentimientoActual = async (userId) => {
  const { data } = await supabase
    .from('legal_consents')
    .select('terms_version, privacy_version, accepted_at')
    .eq('user_id', userId)
    .eq('terms_version', CURRENT_TERMS_VERSION)
    .eq('privacy_version', CURRENT_PRIVACY_VERSION)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .single();

  return {
    aceptado:           !!data,
    necesita_actualizacion: !data,
    ultima_aceptacion:  data?.accepted_at || null,
    version_actual: {
      terms:   CURRENT_TERMS_VERSION,
      privacy: CURRENT_PRIVACY_VERSION,
    },
  };
};

// ── Obtener historial de consentimientos del usuario ─────────────
const getHistorialConsentimientos = async (userId) => {
  const { data } = await supabase
    .from('legal_consents')
    .select('terms_version, privacy_version, accepted_at')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false });
  return data || [];
};

module.exports = {
  getLegalDoc,
  registrarConsentimiento,
  verificarConsentimientoActual,
  getHistorialConsentimientos,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
};
