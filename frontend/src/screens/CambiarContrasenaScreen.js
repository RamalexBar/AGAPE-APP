// ================================================
// ÁGAPE — Cambiar contraseña
// authAPI.changePassword ya existía en el backend/API pero ninguna
// pantalla lo usaba.
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

export default function CambiarContrasenaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!actual) { Alert.alert('Falta un dato', 'Ingresa tu contraseña actual.'); return; }
    if (nueva.length < 8) { Alert.alert('Contraseña muy corta', 'La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (nueva !== confirmar) { Alert.alert('No coinciden', 'La nueva contraseña y su confirmación no son iguales.'); return; }

    setGuardando(true);
    try {
      await authAPI.changePassword(actual, nueva);
      Alert.alert('✅ Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
      navigation.goBack();
    } catch (e) {
      const mensaje = e?.response?.data?.error || 'No se pudo cambiar la contraseña. Verifica tu contraseña actual.';
      Alert.alert('Error', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.titulo}>Cambiar contraseña</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.contenido}>
          <Campo icono="lock-closed-outline" placeholder="Contraseña actual" value={actual} onChange={setActual} />
          <Campo icono="key-outline" placeholder="Nueva contraseña (mín. 8 caracteres)" value={nueva} onChange={setNueva} />
          <Campo icono="key-outline" placeholder="Confirmar nueva contraseña" value={confirmar} onChange={setConfirmar} />

          <TouchableOpacity onPress={guardar} disabled={guardando} style={{ marginTop: 10 }}>
            <LinearGradient colors={COLORES.gradPrimario} style={styles.btnGuardar}>
              {guardando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnGuardarTexto}>Guardar nueva contraseña</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const Campo = ({ icono, placeholder, value, onChange }) => (
  <View style={styles.campoContenedor}>
    <Ionicons name={icono} size={20} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
    <TextInput
      style={styles.campo}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      value={value}
      onChangeText={onChange}
      secureTextEntry
      autoCapitalize="none"
    />
  </View>
);

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  btnVolver: { padding: 4 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  contenido: { padding: 24, gap: 14 },
  campoContenedor: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
  },
  campo: { flex: 1, color: '#fff', fontSize: 15 },
  btnGuardar: { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  btnGuardarTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
