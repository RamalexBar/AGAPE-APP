// ================================================
// ÁGAPE — Restablecer contraseña (con código de 6 dígitos)
// Antes: el backend generaba el token pero nunca enviaba el email, y no
// existía ninguna pantalla para completar el flujo con el token.
// ================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../services/api';
import { COLORES } from '../utils/constants';

export default function RestablecerContrasenaScreen({ navigation, route }) {
  const emailInicial = route?.params?.email || '';
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const insets = useSafeAreaInsets();

  const confirmarCambio = async () => {
    if (!email.includes('@')) { Alert.alert('Correo inválido', 'Verifica tu correo.'); return; }
    if (codigo.trim().length !== 6) { Alert.alert('Código inválido', 'El código tiene 6 dígitos.'); return; }
    if (nueva.length < 8) { Alert.alert('Contraseña muy corta', 'Debe tener al menos 8 caracteres.'); return; }
    if (nueva !== confirmar) { Alert.alert('No coinciden', 'La contraseña y su confirmación no son iguales.'); return; }

    setCargando(true);
    try {
      await authAPI.resetPassword(email.trim().toLowerCase(), codigo.trim(), nueva);
      Alert.alert('✅ Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.', [
        { text: 'Iniciar sesión', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      const mensaje = e?.response?.data?.error || 'Código inválido o expirado. Solicita uno nuevo.';
      Alert.alert('Error', mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={COLORES.gradFondo} style={styles.fondo}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.contenido}>
          <Ionicons name="key-outline" size={54} color={COLORES.secundario} style={{ marginBottom: 20 }} />
          <Text style={styles.titulo}>Escribe tu código</Text>
          <Text style={styles.subtitulo}>Ingresa el código de 6 dígitos que te enviamos y tu nueva contraseña.</Text>

          <Campo icono="mail-outline" placeholder="Correo electrónico" value={email} onChange={setEmail} tipo="email-address" />
          <Campo icono="keypad-outline" placeholder="Código de 6 dígitos" value={codigo} onChange={setCodigo} tipo="number-pad" maxLength={6} />
          <Campo icono="lock-closed-outline" placeholder="Nueva contraseña" value={nueva} onChange={setNueva} seguro />
          <Campo icono="lock-closed-outline" placeholder="Confirmar nueva contraseña" value={confirmar} onChange={setConfirmar} seguro />

          <TouchableOpacity style={styles.btnEnviar} onPress={confirmarCambio} disabled={cargando} activeOpacity={0.85}>
            <LinearGradient colors={COLORES.gradPrimario} style={styles.btnEnviarGrad}>
              {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnEnviarTexto}>Cambiar contraseña</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const Campo = ({ icono, placeholder, value, onChange, tipo, seguro, maxLength }) => (
  <View style={styles.campo}>
    <Ionicons name={icono} size={20} color={COLORES.muted} style={styles.campoIco} />
    <TextInput
      style={styles.campoInput}
      placeholder={placeholder}
      placeholderTextColor={COLORES.muted}
      value={value}
      onChangeText={onChange}
      keyboardType={tipo || 'default'}
      secureTextEntry={seguro || false}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={maxLength}
    />
  </View>
);

const styles = StyleSheet.create({
  fondo:   { flex: 1 },
  header:  { paddingHorizontal: 16, paddingBottom: 10 },
  btnVolver: { padding: 6, alignSelf: 'flex-start' },
  contenido: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  titulo:    { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10 },
  subtitulo: { fontSize: 14, color: COLORES.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  campo: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: COLORES.fondoInput, borderRadius: 14,
    paddingHorizontal: 14, height: 52, marginBottom: 14,
  },
  campoIco:   { marginRight: 10 },
  campoInput: { flex: 1, color: '#fff', fontSize: 14 },
  btnEnviar:     { width: '100%', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  btnEnviarGrad: { height: 52, justifyContent: 'center', alignItems: 'center' },
  btnEnviarTexto:{ color: '#fff', fontWeight: '700', fontSize: 16 },
});
