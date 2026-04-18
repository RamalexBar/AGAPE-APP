// ================================================
// ÁGAPE - Pantalla Legal (Privacidad y Términos)
// ================================================
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIVACIDAD = `POLÍTICA DE PRIVACIDAD — ÁGAPE
Última actualización: ${new Date().toLocaleDateString('es-CO')}

1. INFORMACIÓN QUE RECOPILAMOS
Recopilamos información que usted nos proporciona directamente:
• Nombre, email, fecha de nacimiento, género
• Fotos de perfil
• Ubicación (solo cuando usa la app)
• Mensajes entre usuarios

2. USO DE LA INFORMACIÓN
Usamos su información para:
• Crear y gestionar su cuenta
• Mostrarle perfiles compatibles
• Facilitar la comunicación entre usuarios
• Mejorar nuestros servicios

3. COMPARTIR INFORMACIÓN
No vendemos su información personal a terceros.
Podemos compartir información con:
• Proveedores de servicios (Supabase, Agora)
• Autoridades legales cuando sea requerido

4. SEGURIDAD
Usamos cifrado SSL/TLS y bcrypt para contraseñas.
Sus datos están protegidos en servidores seguros.

5. SUS DERECHOS
Puede solicitar acceso, corrección o eliminación
de sus datos en cualquier momento enviando un
email a privacidad@agape.app

6. CONTACTO
privacidad@agape.app`;

const TERMINOS = `TÉRMINOS DE SERVICIO — ÁGAPE
Última actualización: ${new Date().toLocaleDateString('es-CO')}

1. ACEPTACIÓN
Al usar Ágape, acepta estos términos. Si no está
de acuerdo, no use la aplicación.

2. ELEGIBILIDAD
Debe tener 18 años o más para usar Ágape.
Es responsable de la veracidad de su información.

3. CONDUCTA
Está prohibido:
• Acosar o intimidar a otros usuarios
• Publicar contenido inapropiado o ilegal
• Crear cuentas falsas
• Usar la app con fines comerciales sin permiso

4. CONTENIDO
Usted es responsable del contenido que publica.
Nos otorga licencia para mostrar su contenido
dentro de la plataforma.

5. SUSCRIPCIÓN PREMIUM
• La suscripción se renueva automáticamente
• Puede cancelar en cualquier momento
• No se realizan reembolsos por períodos parciales

6. LIMITACIÓN DE RESPONSABILIDAD
Ágape no garantiza que encontrará pareja.
No somos responsables por interacciones fuera
de la plataforma.

7. TERMINACIÓN
Podemos suspender cuentas que violen estos términos.

8. CONTACTO
soporte@agape.app`;

export default function LegalScreen({ navigation, route }) {
  const tipo = route?.params?.tipo || 'privacidad';
  const [activo, setActivo] = useState(tipo);
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#0f0f1a', '#1a0533']} style={styles.fondo}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnVolver}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Legal</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activo === 'privacidad' && styles.tabActivo]}
          onPress={() => setActivo('privacidad')}
        >
          <Text style={[styles.tabTexto, activo === 'privacidad' && styles.tabTextoActivo]}>
            Privacidad
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activo === 'terminos' && styles.tabActivo]}
          onPress={() => setActivo('terminos')}
        >
          <Text style={[styles.tabTexto, activo === 'terminos' && styles.tabTextoActivo]}>
            Términos
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.contenido}>
        <Text style={styles.texto}>
          {activo === 'privacidad' ? PRIVACIDAD : TERMINOS}
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  btnVolver: { padding: 4 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#fff' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActivo: { backgroundColor: '#C44DFF' },
  tabTexto: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  tabTextoActivo: { color: '#fff' },
  scroll: { flex: 1 },
  contenido: { padding: 20, paddingBottom: 40 },
  texto: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 22 },
});
