// src/services/profileService.js
const supabase = require('../config/supabase');

const CAMPOS_PUBLICOS = [
  'nombre', 'bio', 'avatar_url', 'ubicacion_ciudad',
  'denomination', 'connection_purpose', 'valores', 'spiritual_habits',
  'intencion_relacion', 'nivel_compromiso', 'frecuencia_iglesia', 'fecha_nacimiento',
];

const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, edad, avatar_url, bio, ubicacion_ciudad, denomination, connection_purpose, is_verified, is_faith_verified, intencion_relacion, nivel_compromiso, frecuencia_iglesia, last_active_at, created_at, spiritual_profiles(total_xp, nivel, racha_devocional), profiles(fotos, intereses)')
    .eq('id', userId).eq('is_active', true).single();
  if (error || !data) throw Object.assign(new Error('Perfil no encontrado.'), { status: 404 });
  return data;
};

const getMyProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, email, edad, avatar_url, bio, ubicacion_ciudad, genero, denomination, connection_purpose, valores, spiritual_habits, intencion_relacion, nivel_compromiso, frecuencia_iglesia, is_verified, is_faith_verified, last_active_at, created_at, spiritual_profiles(total_xp, nivel, racha_devocional, monedas_fe, total_devocionales), profiles(fotos, intereses)')
    .eq('id', userId).single();
  if (error || !data) throw Object.assign(new Error('Perfil no encontrado.'), { status: 404 });
  return data;
};

const updateProfile = async (userId, campos) => {
  const update = {};
  for (const key of CAMPOS_PUBLICOS) { if (campos[key] !== undefined) update[key] = campos[key]; }
  if (!Object.keys(update).length) throw Object.assign(new Error('Sin campos válidos.'), { status: 400 });
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('users').update(update).eq('id', userId)
    .select('id, nombre, bio, avatar_url, ubicacion_ciudad, denomination, connection_purpose, intencion_relacion, nivel_compromiso, frecuencia_iglesia').single();
  if (error) throw Object.assign(new Error('Error al actualizar perfil.'), { status: 500 });
  return data;
};

const updatePhotos = async (userId, fotos) => {
  if (!Array.isArray(fotos) || fotos.length > 6) throw Object.assign(new Error('Máximo 6 fotos.'), { status: 400 });
  const { data, error } = await supabase.from('profiles').upsert({ user_id: userId, fotos }, { onConflict: 'user_id' }).select().single();
  if (error) throw Object.assign(new Error('Error al actualizar fotos.'), { status: 500 });
  return data;
};

const calcularCompletitud = (perfil) => {
  const campos = [
    { key: 'avatar_url',         peso: 20, label: 'Foto de perfil' },
    { key: 'bio',                peso: 15, label: 'Descripción personal' },
    { key: 'denomination',       peso: 10, label: 'Denominación' },
    { key: 'connection_purpose', peso: 15, label: 'Propósito de conexión' },
    { key: 'intencion_relacion', peso: 15, label: 'Intención de relación' },
    { key: 'frecuencia_iglesia', peso: 10, label: 'Frecuencia en iglesia' },
    { key: 'valores',            peso: 15, label: 'Valores personales' },
  ];
  let total = 0; const faltantes = [];
  campos.forEach(({ key, peso, label }) => {
    const v = perfil[key]; const ok = v && (Array.isArray(v) ? v.length > 0 : String(v).length > 0);
    if (ok) total += peso; else faltantes.push(label);
  });
  return { porcentaje: total, faltantes, completo: total >= 80 };
};

const deactivateAccount = async (userId) => {
  await supabase.from('users').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', userId);
  return { mensaje: 'Cuenta desactivada correctamente.' };
};

module.exports = { getProfile, getMyProfile, updateProfile, updatePhotos, calcularCompletitud, deactivateAccount };
