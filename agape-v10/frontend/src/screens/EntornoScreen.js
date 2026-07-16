// AGAPE - Pantalla Entorno SIN react-native-maps
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { entornoAPI } from '../services/api';

export default function EntornoScreen({ navigation }) {
  const { usuariosCercanos, setUsuariosCercanos } = useStore();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [radio, setRadio] = useState(150);
  const [modalMensaje, setModalMensaje] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [textomensaje, setTextoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => { obtenerCercanos(); }, []);

  const obtenerCercanos = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido', 'Activa la ubicacion para usar Entorno.'); setCargando(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await entornoAPI.actualizarUbicacion(loc.coords.latitude, loc.coords.longitude);
      const { data } = await entornoAPI.getCercanos(radio);
      setUsuariosCercanos(data.usuarios || []);
    } catch (e) { Alert.alert('Error', 'No se pudo obtener tu ubicacion.'); }
    finally { setCargando(false); setRefrescando(false); }
  };

  const onRefrescar = () => { setRefrescando(true); obtenerCercanos(); };

  const enviarMensaje = async () => {
    if (!textomensaje.trim()) return;
    setEnviando(true);
    try {
      await entornoAPI.enviarMensajeInicial(usuarioSeleccionado.user_id, textomensaje.trim());
      setModalMensaje(false);
      Alert.alert('Mensaje enviado', 'Si responde, se abrira la conversacion.');
    } catch (e) { Alert.alert('Error', e.response?.data?.error?.message || 'Error al enviar.'); }
    finally { setEnviando(false); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('VerPerfil', { userId: item.user_id })} activeOpacity={0.8}>
      <View style={styles.fotoWrap}>
        {item.fotos?.[0] ? <Image source={{ uri: item.fotos[0] }} style={styles.foto} contentFit="cover" /> : <View style={[styles.foto, styles.fotoFallback]}><Text style={{fontSize:28}}>person</Text></View>}
        {item.is_online && <View style={styles.online} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{item.nombre}, {item.edad}</Text>
        <Text style={styles.dist}>ubicacion {item.distancia_km} km</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
        <Text style={[styles.actividad, item.is_online && {color:'#4ade80'}]}>{item.is_online ? 'En linea' : 'Activo recientemente'}</Text>
      </View>
      <TouchableOpacity onPress={() => { setUsuarioSeleccionado(item); setTextoMensaje(''); setModalMensaje(true); }}>
        <LinearGradient colors={['#FF6B9D','#C44DFF']} style={styles.btnMsg}><Ionicons name="chatbubble-outline" size={16} color="#fff" /></LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (cargando) return <View style={[styles.fondo,styles.center]}><ActivityIndicator size="large" color="#C44DFF" /><Text style={styles.muted}>Buscando personas...</Text></View>;

  return (
    <View style={[styles.fondo,{paddingTop:insets.top}]}>
      <View style={styles.header}>
        <View><Text style={styles.titulo}>Entorno</Text><Text style={styles.sub}>{usuariosCercanos.length} personas en {radio} km</Text></View>
        <View style={styles.radioRow}>
          {[50,100,150].map(r=>(
            <TouchableOpacity key={r} style={[styles.rBtn, radio===r&&styles.rBtnOn]} onPress={()=>{setRadio(r);onRefrescar();}}>
              <Text style={[styles.rTxt,radio===r&&{color:'#C44DFF',fontWeight:'600'}]}>{r}km</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList data={usuariosCercanos} keyExtractor={i=>i.user_id} renderItem={renderItem} contentContainerStyle={{padding:16,gap:12}}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor="#C44DFF" />}
        ListEmptyComponent={<View style={styles.center}><Text style={{fontSize:40}}>mapa</Text><Text style={styles.nombre}>Nadie en {radio} km</Text><Text style={styles.muted}>Amplia el radio o vuelve mas tarde</Text></View>}
      />
      <Modal visible={modalMensaje} transparent animationType="slide">
        <View style={styles.modalFondo}>
          <View style={styles.modalBox}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
              <Text style={styles.titulo}>Mensaje a {usuarioSeleccionado?.nombre}</Text>
              <TouchableOpacity onPress={()=>setModalMensaje(false)}><Ionicons name="close" size={24} color="#fff"/></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Escribe tu mensaje..." placeholderTextColor="rgba(255,255,255,0.35)" value={textomensaje} onChangeText={setTextoMensaje} multiline maxLength={200} autoFocus/>
            <Text style={styles.muted}>{textomensaje.length}/200</Text>
            <TouchableOpacity onPress={enviarMensaje} disabled={enviando||!textomensaje.trim()}>
              <LinearGradient colors={textomensaje.trim()?['#FF6B9D','#C44DFF']:['#333','#333']} style={styles.btnEnviar}>
                {enviando?<ActivityIndicator color="#fff"/>:<Text style={{color:'#fff',fontWeight:'600',fontSize:16}}>Enviar</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo:{flex:1,backgroundColor:'#0f0f1a'}, center:{justifyContent:'center',alignItems:'center',gap:12,padding:40},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16},
  titulo:{fontSize:20,fontWeight:'700',color:'#fff'}, sub:{color:'rgba(255,255,255,0.5)',fontSize:13},
  radioRow:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.07)',borderRadius:10,overflow:'hidden'},
  rBtn:{paddingHorizontal:10,paddingVertical:6}, rBtnOn:{backgroundColor:'rgba(196,77,255,0.4)'},
  rTxt:{color:'rgba(255,255,255,0.5)',fontSize:12},
  card:{flexDirection:'row',gap:12,backgroundColor:'rgba(255,255,255,0.05)',borderRadius:16,padding:12,borderWidth:0.5,borderColor:'rgba(255,255,255,0.1)'},
  fotoWrap:{position:'relative'}, foto:{width:64,height:80,borderRadius:12},
  fotoFallback:{justifyContent:'center',alignItems:'center',backgroundColor:'#2d1b45'},
  online:{position:'absolute',top:4,right:4,width:10,height:10,borderRadius:5,backgroundColor:'#4ade80',borderWidth:1.5,borderColor:'#0f0f1a'},
  info:{flex:1,gap:4}, nombre:{fontSize:15,fontWeight:'600',color:'#fff'},
  dist:{fontSize:12,color:'rgba(255,255,255,0.5)'}, bio:{fontSize:12,color:'rgba(255,255,255,0.6)',lineHeight:18},
  actividad:{fontSize:11,color:'rgba(255,255,255,0.4)'},
  btnMsg:{width:36,height:36,borderRadius:18,justifyContent:'center',alignItems:'center'},
  muted:{color:'rgba(255,255,255,0.5)',fontSize:13,textAlign:'center'},
  modalFondo:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'},
  modalBox:{backgroundColor:'#1a1a2e',borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,gap:14},
  input:{backgroundColor:'rgba(255,255,255,0.08)',borderRadius:14,padding:14,color:'#fff',fontSize:15,height:100,textAlignVertical:'top',borderWidth:0.5,borderColor:'rgba(255,255,255,0.15)'},
  btnEnviar:{borderRadius:14,height:52,justifyContent:'center',alignItems:'center'},
});

