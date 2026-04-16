// ================================================
// ÁGAPE v10 — Chat Screen (Producción)
// Real-time, burbujas mejoradas, UX profesional
// ================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { getSocket } from '../services/socketService';
import { chatAPI } from '../services/api';
import { COLORES, SOMBRAS } from '../utils/constants';
import { tiempoRelativo, formatearHoraMensaje, obtenerIniciales, colorAvatar } from '../utils/helpers';

export default function ChatScreen({ route, navigation }) {
  const { match } = route.params;
  const { user, mensajesActuales, setMensajesMatch, agregarMensaje } = useStore();
  const insets = useSafeAreaInsets();

  const [texto,           setTexto]          = useState('');
  const [cargando,        setCargando]       = useState(true);
  const [otroEscribiendo, setOtroEscribiendo]= useState(false);
  const [enviando,        setEnviando]       = useState(false);

  const flatRef           = useRef(null);
  const escribiendoTimer  = useRef(null);

  const mensajes    = mensajesActuales[match.match_id] || [];
  const otroUsuario = match.usuario || match.user1_id === user?.id ? match.user2 : match.user1;
  const fotoOtro    = otroUsuario?.profiles?.fotos?.[0];
  const nombreOtro  = otroUsuario?.profiles?.nombre || otroUsuario?.nombre || 'Usuario';
  const iniciales   = obtenerIniciales(nombreOtro);
  const colorBase   = colorAvatar(nombreOtro);

  const socket = getSocket();

  // ── Conectar al chat ─────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.emit('unirse_chat', { match_id: match.match_id });

    socket.on('historial_mensajes', ({ mensajes: hist }) => {
      setMensajesMatch(match.match_id, hist || []);
      setCargando(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    });

    socket.on('nuevo_mensaje', (msg) => {
      agregarMensaje(match.match_id, msg);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    });

    socket.on('usuario_escribiendo', ({ user_id }) => {
      if (user_id !== user?.id) setOtroEscribiendo(true);
    });

    socket.on('usuario_dejo_escribir', () => setOtroEscribiendo(false));

    // Fallback: cargar mensajes via REST si socket no responde
    const fallbackTimer = setTimeout(async () => {
      if (cargando) {
        try {
          const { data } = await chatAPI.getMensajes(match.match_id);
          setMensajesMatch(match.match_id, data.mensajes || []);
        } catch {}
        setCargando(false);
      }
    }, 4000);

    return () => {
      clearTimeout(fallbackTimer);
      socket.off('historial_mensajes');
      socket.off('nuevo_mensaje');
      socket.off('usuario_escribiendo');
      socket.off('usuario_dejo_escribir');
    };
  }, [match.match_id]);

  // ── Indicador de escritura ───────────────────────────
  const alEscribir = (val) => {
    setTexto(val);
    if (!socket) return;
    socket.emit('escribiendo', { match_id: match.match_id });
    clearTimeout(escribiendoTimer.current);
    escribiendoTimer.current = setTimeout(() => {
      socket.emit('dejo_de_escribir', { match_id: match.match_id });
    }, 2000);
  };

  // ── Enviar mensaje ───────────────────────────────────
  const enviar = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setTexto('');
    setEnviando(true);
    try {
      if (socket) {
        socket.emit('enviar_mensaje', { match_id: match.match_id, contenido, tipo: 'text' });
      } else {
        const { data } = await chatAPI.enviarMensaje(match.match_id, contenido);
        agregarMensaje(match.match_id, data.mensaje);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      }
    } catch { setTexto(contenido); }
    finally { setEnviando(false); }
  }, [texto, enviando, match.match_id]);

  // ── Render de burbuja ────────────────────────────────
  const renderMensaje = ({ item, index }) => {
    const esMio  = item.sender_id === user?.id || item.remitente_id === user?.id;
    const hora   = formatearHoraMensaje(item.created_at || item.timestamp);
    const prevMsg = mensajes[index - 1];
    const mismoRemitente = prevMsg && (prevMsg.sender_id || prevMsg.remitente_id) === (item.sender_id || item.remitente_id);

    return (
      <View style={[
        styles.burbujaFila,
        esMio ? styles.burbujaFilaMia : styles.burbujaFilaOtra,
        !mismoRemitente && { marginTop: 10 },
      ]}>
        {!esMio && !mismoRemitente && (
          <View style={[styles.miniAvatar, { backgroundColor: colorBase }]}>
            {fotoOtro
              ? <Image source={{ uri: fotoOtro }} style={styles.miniAvatarImg} contentFit="cover" />
              : <Text style={styles.miniAvatarLetra}>{iniciales[0]}</Text>
            }
          </View>
        )}
        {!esMio && mismoRemitente && <View style={styles.miniAvatarEspaciador} />}

        <View style={[styles.burbuja, esMio ? styles.burbujaMia : styles.burbujaOtra]}>
          <Text style={[styles.burbujaTexto, esMio && styles.burbujaTextoMio]}>
            {item.contenido || item.content}
          </Text>
          <Text style={[styles.hora, esMio && styles.horaMia]}>{hora}</Text>
        </View>
      </View>
    );
  };

  // ── Header ───────────────────────────────────────────
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerUsuario}
        onPress={() => navigation.navigate('VerPerfil', { perfil: otroUsuario })}
        activeOpacity={0.8}
      >
        <View style={[styles.avatarHeader, { backgroundColor: colorBase }]}>
          {fotoOtro
            ? <Image source={{ uri: fotoOtro }} style={styles.avatarHeaderImg} contentFit="cover" />
            : <Text style={styles.avatarHeaderLetra}>{iniciales}</Text>
          }
          <View style={styles.indicadorOnline} />
        </View>
        <View>
          <Text style={styles.nombreHeader}>{nombreOtro}</Text>
          <Text style={styles.estadoHeader}>
            {otroEscribiendo ? 'Escribiendo...' : 'Activo hace poco'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnVideollamada}
        onPress={() => navigation.navigate('Videollamada', { match, usuario: otroUsuario })}
      >
        <Ionicons name="videocam-outline" size={24} color={COLORES.secundario} />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {renderHeader()}

      {/* ── Mensajes ── */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator color={COLORES.secundario} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={mensajes}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderMensaje}
          contentContainerStyle={styles.listaContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={() => (
            <View style={styles.vacio}>
              <Text style={{ fontSize: 44 }}>💬</Text>
              <Text style={styles.vacioTexto}>Di hola a {nombreOtro}</Text>
              <Text style={styles.vacioSub}>¡Fueron un match! Rompan el hielo ✨</Text>
            </View>
          )}
          ListFooterComponent={otroEscribiendo ? (
            <View style={styles.escribiendoContenedor}>
              <View style={styles.escribiendoBurbuja}>
                <View style={[styles.dot, { animationDelay: '0ms' }]} />
                <View style={[styles.dot, { animationDelay: '200ms' }]} />
                <View style={[styles.dot, { animationDelay: '400ms' }]} />
              </View>
            </View>
          ) : null}
        />
      )}

      {/* ── Input ── */}
      <View style={[styles.inputContenedor, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.inputFila}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORES.muted}
            value={texto}
            onChangeText={alEscribir}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={enviar}
            disabled={!texto.trim() || enviando}
            style={[styles.btnEnviar, (!texto.trim() || enviando) && styles.btnEnviarDisabled]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={texto.trim() ? COLORES.gradPrimario : ['#333', '#333']}
              style={styles.btnEnviarGrad}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor:          { flex: 1, backgroundColor: COLORES.fondo },
  centrado:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  header:              { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: COLORES.borde, backgroundColor: COLORES.fondo, gap: 10 },
  btnVolver:           { padding: 4 },
  headerUsuario:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarHeader:        { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  avatarHeaderImg:     { width: '100%', height: '100%' },
  avatarHeaderLetra:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  indicadorOnline:     { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: COLORES.verde, borderWidth: 2, borderColor: COLORES.fondo },
  nombreHeader:        { color: '#fff', fontSize: 15, fontWeight: '700' },
  estadoHeader:        { color: COLORES.muted, fontSize: 11, marginTop: 1 },
  btnVideollamada:     { padding: 8 },
  // Lista
  listaContent:        { padding: 14, paddingBottom: 6 },
  vacio:               { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  vacioTexto:          { color: '#fff', fontSize: 18, fontWeight: '700' },
  vacioSub:            { color: COLORES.muted, fontSize: 14 },
  // Burbujas
  burbujaFila:         { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 2 },
  burbujaFilaMia:      { justifyContent: 'flex-end' },
  burbujaFilaOtra:     { justifyContent: 'flex-start' },
  miniAvatar:          { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  miniAvatarImg:       { width: '100%', height: '100%' },
  miniAvatarLetra:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  miniAvatarEspaciador:{ width: 28 },
  burbuja:             { maxWidth: '72%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, paddingBottom: 6 },
  burbujaMia:          { backgroundColor: COLORES.secundario, borderBottomRightRadius: 4 },
  burbujaOtra:         { backgroundColor: 'rgba(255,255,255,0.09)', borderBottomLeftRadius: 4 },
  burbujaTexto:        { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  burbujaTextoMio:     { color: '#fff' },
  hora:                { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  horaMia:             { color: 'rgba(255,255,255,0.6)' },
  // Escribiendo
  escribiendoContenedor:{ padding: 14, paddingTop: 6 },
  escribiendoBurbuja:  { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', alignItems: 'center' },
  dot:                 { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORES.muted },
  // Input
  inputContenedor:     { backgroundColor: COLORES.fondo, borderTopWidth: 0.5, borderTopColor: COLORES.borde, paddingTop: 10, paddingHorizontal: 14 },
  inputFila:           { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input:               { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, paddingTop: 10, color: '#fff', fontSize: 14, maxHeight: 120, borderWidth: 0.5, borderColor: COLORES.borde },
  btnEnviar:           { borderRadius: 22, overflow: 'hidden' },
  btnEnviarDisabled:   { opacity: 0.45 },
  btnEnviarGrad:       { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});
