// ================================================
// ÁGAPE — Sugerencia de Pregunta Guiada en Chat
// "¿Qué papel juega Dios en tu vida?"
// ================================================
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PREGUNTAS = [
  '¿Qué papel juega Dios en tus decisiones importantes?',
  '¿Cómo imaginas una familia construida sobre la fe?',
  '¿Qué versículo ha marcado más tu vida?',
  '¿Cómo describes tu relación con la iglesia hoy?',
  '¿Qué sueños quisieras compartir con alguien especial?',
  '¿Qué significa el servicio cristiano para ti?',
];

export default function ChatQuestionSuggestion({ onSelectPregunta, visible }) {
  const [expanded, setExpanded] = useState(false);

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.headerText}>Preguntas para conectar más profundo</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14} color="rgba(255,255,255,0.4)"
        />
      </TouchableOpacity>

      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {PREGUNTAS.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={styles.preguntaBtn}
              onPress={() => { onSelectPregunta(p); setExpanded(false); }}
              activeOpacity={0.7}
            >
              <Text style={styles.preguntaText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  scroll: { marginTop: 10 },
  preguntaBtn: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 10, maxWidth: 240,
  },
  preguntaText: {
    fontSize: 12, color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic', lineHeight: 17,
  },
});
