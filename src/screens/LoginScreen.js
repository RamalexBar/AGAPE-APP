// ================================================
// ÁGAPE v10 — Login Screen
// Métodos: Google, Apple, Teléfono, Correo
// ================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as LG, Stop, Path, Rect } from 'react-native-svg';
import useStore from '../store/useStore';
import { COLORES } from '../utils/constants';
import { esEmailValido } from '../utils/helpers';

function AgapeLogo({ size = 86 }) {
  const s = size, cx = s / 2;
  const lx = cx - s * 0.155, rx = cx + s * 0.155;
  const hy = s * 0.5, hs = s * 0.30;
  const h = s * 0.80;
  const heartPath = (hcx) =>
    `M ${hcx} ${hy + hs*0.62}
     C ${hcx} ${hy - hs*0.30}, ${hcx - hs*1.4} ${hy - hs*1.2}, ${hcx - hs*0.7} ${hy - hs*0.38}
     C ${hcx - hs*1.4} ${hy - hs*1.8}, ${hcx - hs*2.5} ${hy - hs*1.2}, ${hcx - hs*0.7} ${hy - hs*0.38}
     C ${hcx - hs*0.7} ${hy - hs*0.38}, ${hcx} ${hy - hs*1.1}, ${hcx + hs*0.7} ${hy - hs*0.38}
     C ${hcx + hs*2.5} ${hy - hs*1.2}, ${hcx + hs*1.4} ${hy - hs*1.8}, ${hcx + hs*0.7} ${hy - hs*0.38}
     C ${hcx + hs*1.4} ${hy - hs*1.2}, ${hcx} ${hy - hs*0.30}, ${hcx} ${hy + hs*0.62} Z`;
  return (
    <Svg width={s} height={h} viewBox={`0 0 ${s} ${h}`}>
      <Defs>
        <LG id="gradL" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3060FF" />
          <Stop offset="1" stopColor="#8030C8" />
        </LG>
        <LG id="gradR" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#C03080" />
          <Stop offset="1" stopColor="#FF5C8D" />
        </LG>
      </Defs>
      <Path d={heartPath(lx)} fill="url(#gradL)" opacity="0.95" />
      <Path d={heartPath(rx)} fill="url(#gradR)" opacity="0.95" />
      <Rect x={cx-s*0.05} y={hy-hs*0.9} width={s*0.10} height={hs*1.4} rx={s*0.02} fill="white" />
      <Rect x={cx-s*0.20} y={hy-hs*0.30} width={s*0.40} height={s*0.10} rx={s*0.02} fill="white" />
    </Svg>
  );
}

const MODO = { PRINCIPAL: 'principal', CORREO: 'correo', TELEFONO: 'telefono' };

export default function LoginScreen({ navigation }) {
  const [modo,     setModo]     = useState(MODO.PRINCIPAL);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [verPass,  setVerPass]  = useState(false);
  const [telefono, setTelefono] = useState('');
  const [codigo,   setCodigo]   = useState('');
  const [smsSent,  setSmsSent]  = useState(false);
  const [cargando, setCargando] = useState(false);
  const { login } = useStore();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) { Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.'); return; }
    if (!esEmailValido(emailTrimmed)) { Alert.alert('Correo inválido', 'Verifica el formato.'); return; }
    try {
      setCargando(true);
      await login(emailTrimmed, password);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Error al iniciar sesión.');
    } finally { setCargando(false); }
  };

  const enviarSMS = async () => {
    if (!telefono || telefono.length < 8) { Alert.alert('Error', 'Ingresa un número válido.'); return; }
    setCargando(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setSmsSent(true);
      Alert.alert('Código enviado', `Enviamos un código al ${telefono}`);
    } catch { Alert.alert('Error', 'No se pudo enviar el código.'); }
    finally { setCargando(false); }
  };

  const verificarSMS = async () => {
    if (!codigo || codigo.length < 4) { Alert.alert('Error', 'Ingresa el código.'); return; }
    Alert.alert('✅ Verificado', 'Inicio de sesión exitoso.');
  };

  const renderPrincipal = () => (
    <View style={styles.card}>
      <Text style={styles.titulo}>Bienvenido de vuelta</Text>
      <Text style={styles.subtitulo}>Elige cómo quieres ingresar</Text>
      <TouchableOpacity style={styles.btnSocial}
        onPress={() => Alert.alert('Próximamente', 'Login con Google estará disponible pronto.')} activeOpacity={0.8}>
        <Text style={styles.iconoGoogle}>G</Text>
        <Text style={styles.txtSocial}>Continuar con Google</Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.btnSocial, styles.btnApple]}
          onPress={() => Alert.alert('Próximamente', 'Login con Apple estará disponible pronto.')} activeOpacity={0.8}>
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={[styles.txtSocial, { color: '#fff' }]}>Continuar con Apple</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[styles.btnSocial, styles.btnTelefono]}
        onPress={() => { setSmsSent(false); setModo(MODO.TELEFONO); }} activeOpacity={0.8}>
        <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
        <Text style={[styles.txtSocial, { color: '#fff' }]}>Continuar con teléfono</Text>
      </TouchableOpacity>
      <View style={styles.divider}>
        <View style={styles.dividerLinea} />
        <Text style={styles.dividerTexto}>o</Text>
        <View style={styles.dividerLinea} />
      </View>
      <TouchableOpacity style={styles.btnCorreo} onPress={() => setModo(MODO.CORREO)} activeOpacity={0.8}>
        <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.75)" />
        <Text style={styles.btnCorreoTexto}>Iniciar sesión con correo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnRegistro} onPress={() => navigation.navigate('Registro')} activeOpacity={0.8}>
        <Text style={styles.btnRegistroTexto}>¿No tienes cuenta? Crear una</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCorreo = () => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setModo(MODO.PRINCIPAL)} style={styles.btnVolver}>
        <Ionicons name="chevron-back" size={20} color="#fff" />
        <Text style={styles.txtVolver}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.titulo}>Iniciar sesión</Text>
      <View style={styles.campo}>
        <Ionicons name="mail-outline" size={18} color={COLORES.muted} style={styles.campoIco} />
        <TextInput style={styles.campoInput} placeholder="Correo electrónico"
          placeholderTextColor={COLORES.muted} value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      </View>
      <View style={styles.campo}>
        <Ionicons name="lock-closed-outline" size={18} color={COLORES.muted} style={styles.campoIco} />
        <TextInput style={[styles.campoInput, { flex: 1 }]} placeholder="Contraseña"
          placeholderTextColor={COLORES.muted} value={password} onChangeText={setPassword} secureTextEntry={!verPass} />
        <TouchableOpacity onPress={() => setVerPass(!verPass)} style={styles.ojito}>
          <Ionicons name={verPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORES.muted} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Legal')} style={styles.olvidaste}>
        <Text style={styles.olvidasteTexto}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleLogin} disabled={cargando} activeOpacity={0.88}>
        <LinearGradient colors={COLORES.gradPrimario} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnLogin}>
          {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnLoginTexto}>Iniciar sesión</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderTelefono = () => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setModo(MODO.PRINCIPAL)} style={styles.btnVolver}>
        <Ionicons name="chevron-back" size={20} color="#fff" />
        <Text style={styles.txtVolver}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.titulo}>Tu número</Text>
      <Text style={styles.subtitulo}>Te enviaremos un código de verificación</Text>
      <View style={styles.campo}>
        <Ionicons name="flag-outline" size={18} color={COLORES.muted} style={styles.campoIco} />
        <TextInput style={styles.campoInput} placeholder="+57 300 000 0000"
          placeholderTextColor={COLORES.muted} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" autoCapitalize="none" />
      </View>
      {smsSent && (
        <View style={styles.campo}>
          <Ionicons name="keypad-outline" size={18} color={COLORES.muted} style={styles.campoIco} />
          <TextInput style={styles.campoInput} placeholder="Código de 6 dígitos"
            placeholderTextColor={COLORES.muted} value={codigo} onChangeText={setCodigo} keyboardType="numeric" maxLength={6} />
        </View>
      )}
      <TouchableOpacity onPress={smsSent ? verificarSMS : enviarSMS} disabled={cargando} activeOpacity={0.88}>
        <LinearGradient colors={COLORES.gradPrimario} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnLogin}>
          {cargando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnLoginTexto}>{smsSent ? 'Verificar código' : 'Enviar código'}</Text>}
        </LinearGradient>
      </TouchableOpacity>
      {smsSent && (
        <TouchableOpacity onPress={enviarSMS} style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#FF6B9D', fontSize: 13 }}>Reenviar código</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#0a0a14', '#15052a', '#0a0a14']} style={styles.fondo}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 30 }]}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.logoContenedor}>
            <AgapeLogo size={92} />
            <Text style={styles.logoTexto}>ÁGAPE</Text>
            <Text style={styles.logoSubtitulo}>Conexiones con propósito y fe</Text>
          </View>
          {modo === MODO.PRINCIPAL && renderPrincipal()}
          {modo === MODO.CORREO    && renderCorreo()}
          {modo === MODO.TELEFONO  && renderTelefono()}
          <TouchableOpacity onPress={() => navigation.navigate('Legal')} style={styles.legal}>
            <Text style={styles.legalTexto}>
              Al continuar aceptas nuestros <Text style={styles.legalLink}>Términos</Text> y <Text style={styles.legalLink}>Privacidad</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoContenedor: { alignItems: 'center', marginBottom: 32, gap: 8 },
  logoTexto: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 4, marginTop: 4 },
  logoSubtitulo: { fontSize: 13, color: COLORES.muted, letterSpacing: 0.5 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 22, borderWidth: 0.5, borderColor: COLORES.borde, gap: 14 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitulo: { fontSize: 13, color: COLORES.muted, marginTop: -8 },
  btnVolver: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  txtVolver: { color: '#fff', fontSize: 14 },
  btnSocial: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, height: 52 },
  btnApple: { backgroundColor: '#000' },
  btnTelefono: { backgroundColor: '#25D366' },
  iconoGoogle: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  txtSocial: { fontSize: 15, fontWeight: '500', color: '#333' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLinea: { flex: 1, height: 0.5, backgroundColor: COLORES.borde },
  dividerTexto: { color: COLORES.muted, fontSize: 13 },
  btnCorreo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, height: 52, borderWidth: 1.5, borderColor: COLORES.borde },
  btnCorreoTexto: { color: 'rgba(255,255,255,0.75)', fontWeight: '500', fontSize: 15 },
  btnRegistro: { borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FF6B9D' },
  btnRegistroTexto: { color: '#FF6B9D', fontWeight: '600', fontSize: 15 },
  campo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, height: 52, borderWidth: 0.5, borderColor: COLORES.borde },
  campoIco: { marginRight: 10 },
  campoInput: { flex: 1, color: '#fff', fontSize: 14 },
  ojito: { padding: 4 },
  olvidaste: { alignSelf: 'flex-end', marginTop: -4 },
  olvidasteTexto: { color: COLORES.secundario, fontSize: 13 },
  btnLogin: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnLoginTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  legal: { marginTop: 24, alignItems: 'center' },
  legalTexto: { color: COLORES.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  legalLink: { color: COLORES.secundario, fontWeight: '600' },
}); 