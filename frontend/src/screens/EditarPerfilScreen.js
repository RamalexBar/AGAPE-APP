// ================================================
// ÁGAPE — Editar Perfil
// Pantalla real de edición (antes, "Editar perfil" solo
// llevaba a Configuración, que a su vez volvía a Ver Perfil).
// ================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { authAPI, profileAPI } from '../services/api';
import { COLORES, INTERESES_LISTA } from '../utils/constants';

export default function EditarPerfilScreen({ navigation }) {
  const { user, actualizarUsuario } = useStore();
  const insets = useSafeAreaInsets();

  const fotosIniciales = user?.profiles?.fotos || user?.fotos || [];
  const [fotos, setFotos] = useState(fotosIniciales);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [ciudad, setCiudad] = useState(user?.ubicacion_ciudad || '');
  const [intereses, setIntereses] = useState(user?.profiles?.intereses || user?.intereses || []);
  const [connectionPurpose, setConnectionPurpose] = useState(user?.connection_purpose || 'friendship');
  const [buscaGenero, setBuscaGenero] = useState(user?.busca_genero || 'todos');
  const [guardando, setGuardando] = useState(false);

  const agregarFoto = async () => {
    if (fotos.length >= 6 || subiendoFoto) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (resultado.canceled) return;

    setSubiendoFoto(true);
    try {
      const uri = resultado.assets[0].uri;
      const formData = new FormData();
      formData.append('photo', { uri, type: 'image/jpeg', name: 'foto.jpg' });
      const { data } = await profileAPI.uploadPhoto(formData);
      setFotos(data?.fotos || [...fotos, data?.url].filter(Boolean));
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = (index) => {
    Alert.alert('Quitar foto', '¿Eliminar esta foto de tu perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => setFotos(fotos.filter((_, i) => i !== index)) },
    ]);
  };

  const toggleInteres = (interes) => {
    if (intereses.includes(interes)) {
      setIntereses(intereses.filter(i => i !== interes));
    } else if (intereses.length < 8) {
      setIntereses([...intereses, interes]);
    }
  };

  const guardar = async () => {
    if (!nombre.trim()) { Alert.alert('Falta tu nombre', 'El nombre no puede quedar vacío.'); return; }
    if (fotos.length === 0) { Alert.alert('Falta una foto', 'Agrega al menos una foto de perfil.'); return; }

    setGuardando(true);
    try {
      // Las fotos ya se suben una a una al elegirlas; aquí solo se sincroniza
      // el orden/eliminaciones si el array cambió respecto al original.
      const fotosCambiaron = JSON.stringify(fotos) !== JSON.stringify(fotosIniciales);
      if (fotosCambiaron) {
        await profileAPI.updatePhotos(fotos);
      }

      await profileAPI.updateProfile({
        nombre: nombre.trim(),
        bio: bio.trim(),
        ubicacion_ciudad: ciudad.trim(),
        intereses,
        connection_purpose: connectionPurpose,
        busca_genero: buscaGenero,
      });

      const { data } = await authAPI.getMe();
      actualizarUsuario(data);

      Alert.alert('✅ Perfil actualizado', 'Tus cambios ya son visibles para otras personas.');
      navigation.goBack();
    } catch (e) {
      const mensaje = e?.response?.data?.error || 'No se pudo guardar el perfil. Intenta de nuevo.';
      Alert.alert('Error', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitulo}>Editar perfil</Text>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.etiqueta}>Fotos (mín. 1, máx. 6)</Text>
          <View style={styles.gridFotos}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                style={styles.celdaFoto}
                onPress={() => (fotos[i] ? quitarFoto(i) : agregarFoto())}
                disabled={subiendoFoto}
              >
                {fotos[i] ? (
                  <>
                    <Image source={{ uri: fotos[i] }} style={styles.foto} contentFit="cover" />
                    <View style={styles.badgeQuitar}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    {subiendoFoto && i === fotos.length
                      ? <ActivityIndicator color="rgba(255,255,255,0.5)" />
                      : <Ionicons name="add" size={28} color="rgba(255,255,255,0.3)" />
                    }
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.etiqueta}>Nombre</Text>
          <View style={styles.campoContenedor}>
            <TextInput style={styles.campo} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" placeholderTextColor="rgba(255,255,255,0.35)" />
          </View>

          <Text style={styles.etiqueta}>Ciudad</Text>
          <View style={styles.campoContenedor}>
            <TextInput style={styles.campo} value={ciudad} onChangeText={setCiudad} placeholder="¿Dónde vives?" placeholderTextColor="rgba(255,255,255,0.35)" />
          </View>

          <Text style={styles.etiqueta}>Sobre ti</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Escribe algo interesante sobre ti..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
          />
          <Text style={styles.contador}>{bio.length}/500</Text>

          <Text style={styles.etiqueta}>Intereses ({intereses.length}/8)</Text>
          <View style={styles.gridIntereses}>
            {INTERESES_LISTA.map(interes => (
              <TouchableOpacity
                key={interes}
                style={[styles.tagInteres, intereses.includes(interes) && styles.tagInteresActivo]}
                onPress={() => toggleInteres(interes)}
              >
                <Text style={[styles.tagTexto, intereses.includes(interes) && styles.tagTextoActivo]}>{interes}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.etiqueta}>Tipo de conexión</Text>
          <View style={styles.filaBotones}>
            {[
              { valor: 'friendship', label: '🤝 Amistad / Citas' },
              { valor: 'marriage', label: '❤️ Relación seria' },
              { valor: 'community', label: '✨ Comunidad' },
            ].map(op => (
              <TouchableOpacity
                key={op.valor}
                style={[styles.btnOpcion, connectionPurpose === op.valor && styles.btnOpcionActivo]}
                onPress={() => setConnectionPurpose(op.valor)}
              >
                <Text style={[styles.txtOpcion, connectionPurpose === op.valor && styles.txtOpcionActivo]}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.etiqueta}>Me interesan</Text>
          <View style={styles.filaBotones}>
            {['mujeres', 'hombres', 'todos'].map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.btnOpcion, buscaGenero === g && styles.btnOpcionActivo]}
                onPress={() => setBuscaGenero(g)}
              >
                <Text style={[styles.txtOpcion, buscaGenero === g && styles.txtOpcionActivo]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={guardar} disabled={guardando} style={{ marginTop: 28, marginBottom: 40 }}>
            <LinearGradient colors={['#FF6B9D', '#C44DFF']} style={styles.btnGuardar}>
              {guardando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnGuardarTexto}>Guardar cambios</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  btnVolver: { padding: 4 },
  headerTitulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  etiqueta: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  gridFotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celdaFoto: { width: '31%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden' },
  foto: { width: '100%', height: '100%' },
  badgeQuitar: {
    position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  fotoPlaceholder: {
    width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, borderStyle: 'dashed',
  },
  campoContenedor: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
  },
  campo: { flex: 1, color: '#fff', fontSize: 15 },
  bioInput: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    padding: 14, color: '#fff', fontSize: 14, height: 100, textAlignVertical: 'top',
  },
  contador: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', marginTop: -10 },
  gridIntereses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagInteres: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tagInteresActivo: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.2)' },
  tagTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  tagTextoActivo: { color: '#C44DFF' },
  filaBotones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnOpcion: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnOpcionActivo: { borderColor: '#C44DFF', backgroundColor: 'rgba(196,77,255,0.2)' },
  txtOpcion: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  txtOpcionActivo: { color: '#C44DFF', fontWeight: '600' },
  btnGuardar: { borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center' },
  btnGuardarTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
