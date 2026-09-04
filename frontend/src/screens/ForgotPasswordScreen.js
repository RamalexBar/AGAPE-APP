// ================================================
// ÁGAPE — Recuperar contraseña
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

const esEmailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState('');
  const insets = useSafeAreaInsets();

  const handleEnviar = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!esEmailValido(emailTrimmed)) {
      Alert.alert('Correo inválido', 'Verifica el formato de tu correo.');
      return;
    }
    try {
      setCargando(true);
      await authAPI.forgotPassword(emailTrimmed);
      setEmailEnviado(emailTrimmed);
      setEnviado(true);
    } catch (error) {
      const msg = error.response?.data?.error?.message
        || 'No se pudo procesar la solicitud. Inténtalo de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={COLORES.gradFondo} style={styles.fondo}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.contenido}>
          {!enviado ? (
            <>
              <Ionicons name="lock-open-outline" size={54} color={COLORES.secundario} style={{ marginBottom: 20 }} />
              <Text style={styles.titulo}>¿Olvidaste tu contraseña?</Text>
              <Text style={styles.subtitulo}>
                Ingresa tu correo y te enviaremos instrucciones para recuperar el acceso a tu cuenta.
              </Text>

              <View style={styles.campo}>
                <Ionicons name="mail-outline" size={20} color={COLORES.muted} style={styles.campoIco} />
                <TextInput
                  style={styles.campoInput}
                  placeholder="Correo electrónico"
                  placeholderTextColor={COLORES.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.btnEnviar}
                onPress={handleEnviar}
                disabled={cargando}
                activeOpacity={0.85}
              >
                <LinearGradient colors={COLORES.gradPrimario} style={styles.btnEnviarGrad}>
                  {cargando
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnEnviarTexto}>Enviar instrucciones</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={64} color={COLORES.verde} style={{ marginBottom: 20 }} />
              <Text style={styles.titulo}>Revisa tu correo</Text>
              <Text style={styles.subtitulo}>
                Si ese correo está registrado, te llegó un código de 6 dígitos para recuperar tu contraseña.
                Revisa también la carpeta de spam.
              </Text>

              <TouchableOpacity
                style={styles.btnEnviar}
                onPress={() => navigation.navigate('RestablecerContrasena', { email: emailEnviado })}
                activeOpacity={0.85}
              >
                <LinearGradient colors={COLORES.gradPrimario} style={styles.btnEnviarGrad}>
                  <Text style={styles.btnEnviarTexto}>Ya tengo mi código</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
                <Text style={styles.subtitulo}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo:   { flex: 1 },
  header:  { paddingHorizontal: 16, paddingBottom: 10 },
  btnVolver: { padding: 6, alignSelf: 'flex-start' },
  contenido: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  titulo:    { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10 },
  subtitulo: { fontSize: 14, color: COLORES.muted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  campo: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: COLORES.fondoInput, borderRadius: 14,
    paddingHorizontal: 14, height: 52, marginBottom: 20,
  },
  campoIco:   { marginRight: 10 },
  campoInput: { flex: 1, color: '#fff', fontSize: 14 },
  btnEnviar:     { width: '100%', borderRadius: 14, overflow: 'hidden' },
  btnEnviarGrad: { height: 52, justifyContent: 'center', alignItems: 'center' },
  btnEnviarTexto:{ color: '#fff', fontWeight: '700', fontSize: 16 },
});
