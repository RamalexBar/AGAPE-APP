// ================================================
// ÁGAPE — Botón de Reporte + Bloqueo
// Apple Guideline 1.2 — UGC moderation required
// Usar en: ProfileScreen, ChatScreen
// ================================================
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileAPI } from '../services/api';

const MOTIVOS = [
  { id: 'fake_profile',   label: 'Perfil falso o spam' },
  { id: 'inappropriate',  label: 'Contenido inapropiado' },
  { id: 'harassment',     label: 'Acoso o intimidación' },
  { id: 'hate_speech',    label: 'Discurso de odio' },
  { id: 'underage',       label: 'Posible menor de edad' },
  { id: 'other',          label: 'Otro motivo' },
];

export default function ReportButton({ userId, userName, onBlock }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [enviando, setEnviando]         = useState(false);

  const handleReport = async (motivo) => {
    setEnviando(true);
    try {
      await profileAPI.reportUser(userId, motivo.id, `Reporte desde la app: ${motivo.label}`);
      setModalVisible(false);
      Alert.alert(
        'Reporte enviado',
        'Gracias por ayudarnos a mantener una comunidad segura y cristiana. Revisaremos el caso en las próximas 24 horas.',
        [{ text: 'Aceptar' }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar el reporte. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleBlock = () => {
    Alert.alert(
      `Bloquear a ${userName}`,
      'No podrán verse mutuamente en el feed ni comunicarse. Esta acción no se puede deshacer fácilmente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileAPI.blockUser(userId);
              onBlock?.();
              Alert.alert('Usuario bloqueado', `${userName} ha sido bloqueado.`);
            } catch {
              Alert.alert('Error', 'No se pudo bloquear al usuario.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.triggerBtn} onPress={() => setModalVisible(true)}>
        <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <Text style={styles.titulo}>Opciones para {userName}</Text>

            {/* Reportar */}
            <Text style={styles.seccion}>Reportar este perfil</Text>
            {MOTIVOS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={styles.opcion}
                onPress={() => handleReport(m)}
                disabled={enviando}
              >
                <Ionicons name="flag-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.opcionTexto}>{m.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Bloquear */}
            <View style={styles.divider} />
            <TouchableOpacity style={[styles.opcion, styles.opcionPeligro]} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={16} color="#FF6464" />
              <Text style={[styles.opcionTexto, { color: '#FF6464' }]}>Bloquear a {userName}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: { padding: 8 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  titulo:       { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center' },
  seccion:      { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },
  opcion:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.07)' },
  opcionPeligro:{ borderBottomWidth: 0 },
  opcionTexto:  { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  divider:      { height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
  cancelBtn:    { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  cancelTxt:    { fontSize: 15, color: 'rgba(255,255,255,0.45)' },
});
