// ================================================
// ÁGAPE - Pantalla de Registro v2
// Métodos: Google, Apple, Teléfono, Manual
// Sin fotos en registro — se piden después
// Sin fecha de nacimiento — solo confirma +18
// Campo opcional de iglesia
// ================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';

const METODO = { ELEGIR: 'elegir', MANUAL: 'manual', TELEFONO: 'telefono' };

export default function RegisterScreen({ navigation }) {
  const [metodo, setMetodo]     = useState(METODO.ELEGIR);
  const [paso, setPaso]         = useState(1);
  const [cargando, setCargando] = useState(false);
  const { register }            = useStore();
  const insets                  = useSafeAreaInsets();

  const [nombre,       setNombre]       = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [telefono,     setTelefono]     = useState('');
  const [codigoSMS,    setCodigoSMS]    = useState('');
  const [smsSent,      setSmsSent]      = useState(false);
  const [genero,       setGenero]       = useState('');
  const [mayorDeEdad,  setMayorDeEdad]  = useState(null);
  const [iglesia,      setIglesia]      = useState('');
  const [buscaRelacion, setBuscaRelacion] = useState('');
  const [buscaGenero,   setBuscaGenero]   = useState('todos');
  const [denomination,  setDenomination]  = useState('');
  const [aceptoTerminos,setAceptoTerminos]= useState(false);

  const renderElegirMetodo = () => (
    <View style={styles.pasoContenido}>
      <Text style={styles.pasoTitulo}>Crear cuenta</Text>
      <Text style={styles.pasoSubtitulo}>Elige cómo quieres registrarte</Text>

      <TouchableOpacity style={styles.btnSocial}
        onPress={() => Alert.alert('Próximamente', 'Registro con Google estará disponible pronto.')}>
        <Text style={styles.iconoSocial}>G</Text>
        <Text style={styles.txtSocial}>Continuar con Google</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.btnSocial, styles.btnApple]}
          onPress={() => Alert.alert('Próximamente', 'Registro con Apple ID estará disponible pronto.')}>
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={[styles.txtSocial, { color: '#fff' }]}>Continuar con Apple</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.btnSocial, styles.btnTelefono]}
        onPress={() => setMetodo(METODO.TELEFONO)}>
        <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
        <Text style={[styles.txtSocial, { color: '#fff' }]}>Continuar con teléfono</Text>
      </TouchableOpacity>

      <View style={styles.divisorFila}>
        <View style={styles.divisorLinea} />
        <Text style={styles.divisorTexto}>o</Text>
        <View style={styles.divisorLinea} />
      </View>

      <TouchableOpacity style={styles.btnManual} onPress={() => setMetodo(METODO.MANUAL)}>
        <Text style={styles.btnManualTexto}>Registrarme con correo</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20 }}>
        <Text style={styles.linkLogin}>¿Ya tienes cuenta? <Text style={{ color: '#FF6B9D' }}>Inicia sesión</Text></Text>
      </TouchableOpacity>
    </View>
  );

  const enviarSMS = async () => {
    if (!telefono || telefono.length < 8) { Alert.alert('Error', 'Ingresa un número válido.'); return; }
    setCargando(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setSmsSent(true);
      Alert.alert('Código enviado', 'Revisa tus mensajes.');
    } catch { Alert.alert('Error', 'No se pudo enviar el código.'); }
    finally { setCargando(false); }
  };

  const verificarSMS = async () => {
    if (!codigoSMS || codigoSMS.length < 4) { Alert.alert('Error', 'Ingresa el código.'); return; }
    setMetodo(METODO.MANUAL);
    Alert.alert('✅ Teléfono verificado', 'Ahora completa tu perfil.');
  };

  const renderTelefono = () => (
    <View style={styles.pasoContenido}>
      <TouchableOpacity onPress={() => setMetodo(METODO.ELEGIR)} style={styles.btnVolver}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
        <Text style={styles.txtVolver}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.pasoTitulo}>Tu número</Text>
      <Text style={styles.pasoSubtitulo}>Te enviaremos un código de verificación</Text>
      <Campo icono="flag-outline" placeholder="+57 300 000 0000" value={telefono} onChange={setTelefono} tipo="phone-pad" />
      {!smsSent ? (
        <TouchableOpacity onPress={enviarSMS} disabled={cargando} style={{ marginTop: 8 }}>
          <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnSiguiente}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSiguienteTexto}>Enviar código</Text>}
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <>
          <Campo icono="keypad-outline" placeholder="Código de 6 dígitos" value={codigoSMS} onChange={setCodigoSMS} tipo="numeric" />
          <TouchableOpacity onPress={verificarSMS} style={{ marginTop: 8 }}>
            <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnSiguiente}>
              <Text style={styles.btnSiguienteTexto}>Verificar código</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={enviarSMS} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: '#FF6B9D', fontSize: 13 }}>Reenviar código</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderPaso1 = () => (
    <View style={styles.pasoContenido}>
      <Text style={styles.pasoTitulo}>Datos básicos</Text>
      <Text style={styles.pasoSubtitulo}>Cuéntanos quién eres</Text>
      <Campo icono="person-outline" placeholder="Tu nombre" value={nombre} onChange={setNombre} />
      <Campo icono="mail-outline" placeholder="Correo electrónico" value={email} onChange={setEmail} tipo="email-address" />
      <Campo icono="lock-closed-outline" placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={setPassword} seguro />
      <Campo icono="business-outline" placeholder="Nombre de tu iglesia (opcional)" value={iglesia} onChange={setIglesia} />
      <Text style={styles.etiqueta}>Género</Text>
      <View style={styles.filaBotones}>
        {[{ valor: 'M', label: '♂ Hombre' }, { valor: 'F', label: '♀ Mujer' }, { valor: 'otro', label: '✦ Otro' }].map(g => (
          <TouchableOpacity key={g.valor}
            style={[styles.btnOpcion, genero === g.valor && styles.btnOpcionActivo]}
            onPress={() => setGenero(g.valor)}>
            <Text style={[styles.txtOpcion, genero === g.valor && styles.txtOpcionActivo]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.etiqueta, { marginTop: 6 }]}>¿Eres mayor de 18 años?</Text>
      <View style={styles.filaBotones}>
        {[{ valor: true, label: '✅ Sí, soy mayor de 18' }, { valor: false, label: '❌ No' }].map(op => (
          <TouchableOpacity key={String(op.valor)}
            style={[styles.btnOpcion, mayorDeEdad === op.valor && styles.btnOpcionActivo]}
            onPress={() => setMayorDeEdad(op.valor)}>
            <Text style={[styles.txtOpcion, mayorDeEdad === op.valor && styles.txtOpcionActivo]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mayorDeEdad === false && <Text style={styles.avisoEdad}>Debes tener al menos 18 años para usar Ágape.</Text>}
    </View>
  );

  const renderPaso2 = () => (
    <View style={styles.pasoContenido}>
      <Text style={styles.pasoTitulo}>Tu propósito</Text>
      <Text style={styles.pasoSubtitulo}>Sé honesto para mejores conexiones</Text>
      <Text style={styles.etiqueta}>¿Qué buscas?</Text>
      <View style={styles.columnaOpciones}>
        {[
          { valor: 'amistad',   label: '🤝 Amistad',       desc: 'Conocer personas y hacer amigos' },
          { valor: 'citas',     label: '💕 Citas',          desc: 'Conocer a alguien especial' },
          { valor: 'relacion',  label: '❤️ Relación seria', desc: 'Busco algo estable con propósito' },
          { valor: 'matrimonio',label: '💍 Matrimonio',     desc: 'Busco a mi compañero/a de vida' },
        ].map(op => (
          <TouchableOpacity key={op.valor}
            style={[styles.cardOpcion, buscaRelacion === op.valor && styles.cardOpcionActiva]}
            onPress={() => setBuscaRelacion(op.valor)}>
            <Text style={styles.cardOpcionLabel}>{op.label}</Text>
            <Text style={styles.cardOpcionDesc}>{op.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.etiqueta, { marginTop: 16 }]}>Me interesan</Text>
      <View style={styles.filaBotones}>
        {['Mujeres', 'Hombres', 'Todos'].map(g => (
          <TouchableOpacity key={g}
            style={[styles.btnOpcion, buscaGenero === g.toLowerCase() && styles.btnOpcionActivo]}
            onPress={() => setBuscaGenero(g.toLowerCase())}>
            <Text style={[styles.txtOpcion, buscaGenero === g.toLowerCase() && styles.txtOpcionActivo]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.etiqueta, { marginTop: 16 }]}>Denominación</Text>
      <View style={styles.filaBotones}>
        {['Católico', 'Cristiano', 'Evangélico', 'Bautista', 'Otra'].map(d => (
          <TouchableOpacity key={d}
            style={[styles.btnOpcion, denomination === d && styles.btnOpcionActivo]}
            onPress={() => setDenomination(d)}>
            <Text style={[styles.txtOpcion, denomination === d && styles.txtOpcionActivo]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.filaTerminos} onPress={() => setAceptoTerminos(!aceptoTerminos)}>
        <View style={[styles.checkbox, aceptoTerminos && styles.checkboxActivo]}>
          {aceptoTerminos && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={styles.textoTerminos}>
          Acepto los <Text style={{ color: '#FF6B9D' }} onPress={() => navigation.navigate('Legal')}>Términos de Uso</Text> y la <Text style={{ color: '#FF6B9D' }} onPress={() => navigation.navigate('Legal')}>Política de Privacidad</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const validarPaso1 = () => {
    if (!nombre.trim())        return 'Ingresa tu nombre.';
    if (!email.includes('@'))  return 'Correo inválido.';
    if (password.length < 6)   return 'Contraseña mínimo 6 caracteres.';
    if (!genero)               return 'Selecciona tu género.';
    if (mayorDeEdad === null)  return 'Confirma si eres mayor de 18 años.';
    if (mayorDeEdad === false) return 'Debes tener al menos 18 años para usar Ágape.';
    return null;
  };

  const siguientePaso = () => {
    if (paso === 1) {
      const error = validarPaso1();
      if (error) { Alert.alert('Atención', error); return; }
    }
    setPaso(paso + 1);
  };

  const handleRegistro = async () => {
    if (!buscaRelacion)  { Alert.alert('Atención', 'Selecciona qué tipo de conexión buscas.'); return; }
    if (!aceptoTerminos) { Alert.alert('Atención', 'Debes aceptar los términos para continuar.'); return; }
    try {
      setCargando(true);
      await register({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        genero,
        fecha_nacimiento: '2000-01-01',
        accepted_terms: true,
        iglesia: iglesia.trim() || null,
        denomination: denomination || 'christian',
        connection_purpose: buscaRelacion,
        busca_genero: buscaGenero,
      });
    } catch (error) {
      Alert.alert('Error al registrarse', error.response?.data?.error?.message || 'Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const esManual = metodo === METODO.MANUAL;

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}>
          <View style={styles.header}>
            {(metodo !== METODO.ELEGIR || paso > 1) && (
              <TouchableOpacity onPress={() => { if (paso > 1) setPaso(paso - 1); else setMetodo(METODO.ELEGIR); }}>
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 5 }}>✝ ÁGAPE</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginTop: 2 }}>Conexiones con propósito y fe</Text>
            </View>
            <View style={{ width: 26 }} />
          </View>

          {esManual && (
            <>
              <View style={styles.barraProgreso}>
                {[1, 2].map(n => (<View key={n} style={[styles.segmentoProgreso, n <= paso && styles.segmentoProgresoActivo]} />))}
              </View>
              <Text style={styles.textoProgreso}>Paso {paso} de 2</Text>
            </>
          )}

          {metodo === METODO.ELEGIR   && renderElegirMetodo()}
          {metodo === METODO.TELEFONO && renderTelefono()}
          {esManual && paso === 1     && renderPaso1()}
          {esManual && paso === 2     && renderPaso2()}

          {esManual && (
            <TouchableOpacity onPress={paso < 2 ? siguientePaso : handleRegistro} disabled={cargando} style={{ marginTop: 24, marginBottom: 40 }}>
              <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnSiguiente}>
                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSiguienteTexto}>{paso < 2 ? 'Continuar →' : '¡Crear mi cuenta!'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const Campo = ({ icono, placeholder, value, onChange, tipo, seguro }) => (
  <View style={styles.campoContenedor}>
    <Ionicons name={icono} size={20} color="rgba(255,255,255,0.4)" style={styles.campoIcono} />
    <TextInput style={styles.campo} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.35)"
      value={value} onChangeText={onChange} keyboardType={tipo || 'default'} secureTextEntry={seguro || false} autoCapitalize="none" />
  </View>
);

const styles = StyleSheet.create({
  fondo: { flex: 1 }, scroll: { flexGrow: 1, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  barraProgreso: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  segmentoProgreso: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  segmentoProgresoActivo: { backgroundColor: '#C44DFF' },
  textoProgreso: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 24 },
  pasoContenido: { gap: 14 },
  pasoTitulo: { fontSize: 22, fontWeight: '600', color: '#fff' },
  pasoSubtitulo: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: -8, marginBottom: 6 },
  btnSocial: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, height: 52 },
  btnApple: { backgroundColor: '#000' },
  btnTelefono: { backgroundColor: '#25D366' },
  iconoSocial: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  txtSocial: { fontSize: 15, fontWeight: '500', color: '#333' },
  divisorFila: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  divisorLinea: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  divisorTexto: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  btnManual: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnManualTexto: { color: '#fff', fontSize: 15, fontWeight: '500' },
  linkLogin: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  btnVolver: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  txtVolver: { color: '#fff', fontSize: 14 },
  campoContenedor: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 14, height: 52 },
  campoIcono: { marginRight: 10 },
  campo: { flex: 1, color: '#fff', fontSize: 15 },
  etiqueta: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  filaBotones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnOpcion: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' },
  btnOpcionActivo: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.2)' },
  txtOpcion: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  txtOpcionActivo: { color: '#C44DFF', fontWeight: '600' },
  avisoEdad: { color: '#FF6464', fontSize: 12, marginTop: -6 },
  columnaOpciones: { gap: 10 },
  cardOpcion: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  cardOpcionActiva: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.15)' },
  cardOpcionLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardOpcionDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  filaTerminos: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  checkboxActivo: { backgroundColor: '#C44DFF', borderColor: '#C44DFF' },
  textoTerminos: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 20 },
  btnSiguiente: { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  btnSiguienteTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});