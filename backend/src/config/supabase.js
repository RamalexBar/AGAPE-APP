// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('[Config] Faltan variables SUPABASE_URL o SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Node <22 no trae WebSocket nativo — @supabase/realtime-js lo necesita
// explícito o revienta al crear el cliente (aunque no uses Realtime).
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

module.exports = supabase;
