// ================================================
// ÁGAPE — Verificador de notificaciones de Apple (App Store Server Notifications V2)
// Valida la firma JWS contra la cadena de certificados raíz de Apple.
// ================================================
const fs = require('fs');
const path = require('path');
const { SignedDataVerifier, Environment } = require('@apple/app-store-server-library');

const CERTS_DIR = path.join(__dirname, '..', '..', 'certs', 'apple');
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.agape.app';

let verifier = null;

const cargarCertificadosRaiz = () => {
  if (!fs.existsSync(CERTS_DIR)) {
    throw new Error(
      `[AppleIAP] No existe ${CERTS_DIR}. Descarga los certificados raíz de Apple ` +
      '(sección "Apple Root Certificates" en https://www.apple.com/certificateauthority/) ' +
      'y colócalos ahí en formato .cer — ver certs/apple/README.md.'
    );
  }
  const archivos = fs.readdirSync(CERTS_DIR).filter(f => f.endsWith('.cer'));
  if (archivos.length === 0) {
    throw new Error(`[AppleIAP] No se encontraron certificados .cer en ${CERTS_DIR}.`);
  }
  return archivos.map(f => fs.readFileSync(path.join(CERTS_DIR, f)));
};

// Lazy: solo falla si realmente llega una notificación de Apple sin certificados configurados.
const getVerifier = () => {
  if (verifier) return verifier;

  const rootCerts = cargarCertificadosRaiz();
  const environment = process.env.NODE_ENV === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;

  verifier = new SignedDataVerifier(rootCerts, true, environment, BUNDLE_ID);
  return verifier;
};

module.exports = { getVerifier };
