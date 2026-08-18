// ================================================
// ÁGAPE v2 — Servicio: Devocional Diario con IA
// Versículos + reflexión generada + puntos
// ================================================

const supabase = require('../config/supabase');
const { actualizarRachaDevocional, verificarBadges, otorgarXP } = require('./spiritualJourneyService');

// Banco de versículos hardcoded (fallback cuando no hay en DB)
const VERSICULOS_FALLBACK = [
  { referencia: 'Jeremías 29:11', texto: 'Porque yo sé los planes que tengo para ustedes, planes para su bienestar y no para su mal, a fin de darles un futuro lleno de esperanza.', tema: 'esperanza' },
  { referencia: 'Filipenses 4:13', texto: 'Todo lo puedo en Cristo que me fortalece.', tema: 'fortaleza' },
  { referencia: 'Salmos 23:1', texto: 'El SEÑOR es mi pastor; nada me faltará.', tema: 'provision' },
  { referencia: 'Romanos 8:28', texto: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.', tema: 'fe' },
  { referencia: 'Juan 3:16', texto: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.', tema: 'amor' },
  { referencia: 'Isaías 40:31', texto: 'Los que esperan en el SEÑOR renovarán sus fuerzas; volarán como las águilas.', tema: 'esperanza' },
  { referencia: 'Proverbios 3:5-6', texto: 'Confía en el SEÑOR con todo tu corazón; no dependas de tu propio entendimiento.', tema: 'confianza' },
  { referencia: 'Mateo 11:28', texto: 'Vengan a mí todos ustedes que están cansados y agobiados, y yo les daré descanso.', tema: 'descanso' },
  { referencia: '1 Corintios 13:13', texto: 'Ahora permanecen la fe, la esperanza y el amor. Pero el mayor de ellos es el amor.', tema: 'amor' },
  { referencia: 'Josué 1:9', texto: 'Sé fuerte y valiente. No tengas miedo; el SEÑOR tu Dios estará contigo.', tema: 'valor' },
];

// Reflexiones pre-escritas por tema (para no depender siempre de IA)
const REFLEXIONES_CACHE = {
  esperanza: [
    'La esperanza no es ingenuidad — es la certeza de que el Autor de tu historia ya conoce el final, y es hermoso. Cada vez que sientas que el camino se cierra, recuerda: Dios trabaja en lo que tus ojos aún no pueden ver. Él está tejiendo algo mejor.',
    'Vivir con esperanza no significa ignorar el dolor. Significa creer que Dios puede transformar cada lágrima en semilla. Tu historia no ha terminado. El mejor capítulo puede estar por comenzar.',
  ],
  fortaleza: [
    'La fortaleza verdadera no viene de no necesitar ayuda — viene de saber a quién pedirla. En Cristo, tu debilidad se convierte en el lugar exacto donde su poder se manifiesta. No te disculpes por tus limitaciones; Él las usa.',
    'Hay días en que "todo lo puedo" se siente imposible. Pero Pablo lo escribió desde la cárcel. Desde la oscuridad. La fortaleza de Cristo no te quita los problemas — te transforma en el centro de ellos.',
  ],
  amor: [
    'El amor de Dios no es una recompensa por ser bueno. Es la base desde la que puedes intentarlo. No tienes que ganártelo — ya lo tienes. Recíbelo hoy como agua sobre tierra seca.',
    'Ser amado por Dios no depende de tu desempeño espiritual. En tus peores días, en tus mejores días, en los días grises: el amor del Padre hacia ti no fluctúa. Es un ancla, no una variable.',
  ],
  fe: [
    'La fe no elimina la duda — la sostiene mientras caminas. No necesitas tener todo claro para confiar. Abraham tampoco sabía a dónde iba. La fe es el primer paso, no la certeza del destino.',
    'Dios no pide que entiendas todo. Pide que confíes en el que sí lo entiende. Entrégale hoy lo que no puedes controlar y descansa en que sus planes son mejores que los tuyos.',
  ],
  valor: [
    'El valor cristiano no es la ausencia de miedo — es avanzar aunque el corazón tiemble, porque sabes que no vas solo. Dios no prometió que el camino fuera fácil, prometió que iría contigo.',
    'Josué tenía miedo. Lo sabemos porque Dios le dijo tres veces "sé fuerte y valiente". El coraje no es un sentimiento; es una decisión tomada en la presencia de Dios.',
  ],
  confianza: [
    'Confiar en Dios en lo pequeño — en los detalles del día, en las decisiones menores — es el entrenamiento para confiar en Él en las tormentas grandes. Practica hoy.',
    'El camino de la confianza empieza reconociendo que no somos el GPS de nuestra propia vida. Hay una sabiduría mayor que la nuestra guiando cada paso.',
  ],
  descanso: [
    'El descanso que Jesús ofrece no es inactividad — es paz en el movimiento. Es hacer las cosas desde un corazón asentado, no desde la ansiedad. Ven a Él hoy. No mañana. Hoy.',
    'Dios descansó en el séptimo día no porque estuviera cansado, sino para enseñarnos que el reposo es sagrado. Date permiso de parar. De respirar. De confiar en que el mundo no colapsa si descansas.',
  ],
  provision: [
    'El Señor como pastor no es solo una imagen bonita — es una promesa activa. Él busca, protege, guía y alimenta. Hoy, en lo que te falta: ¿puedes confiar en el Pastor?',
    'Nada me faltará no significa que siempre tendrás todo lo que quieres. Significa que Él proveerá todo lo que necesitas. Hay una diferencia enorme — y una paz enorme en entenderla.',
  ],
};

// ── Obtener devocional del día ────────────────────────────────────
const obtenerDevocionalDelDia = async (userId = null) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // 1. Buscar versículo programado para hoy en DB
    let versiculo = null;
    const { data: versDB } = await supabase
      .from('daily_verses')
      .select('*')
      .eq('date_featured', hoy)
      .single();

    if (versDB) {
      versiculo = versDB;
    } else {
      // 2. Versículo aleatorio determinístico por fecha (mismo para todos en el día)
      const seed = new Date(hoy).getTime();
      const idx = Math.abs(seed) % VERSICULOS_FALLBACK.length;
      const vf = VERSICULOS_FALLBACK[idx];

      versiculo = {
        id: `fallback_${hoy}`,
        verse_text: vf.texto,
        verse_reference: vf.referencia,
        date_featured: hoy,
        tema: vf.tema,
        reflection: null,
        prayer: null,
      };
    }

    // 3. Obtener reflexión
    const tema = versiculo.tema || 'fe';
    let reflexion = versiculo.reflection;
    if (!reflexion) {
      const reflexionesTema = REFLEXIONES_CACHE[tema] || REFLEXIONES_CACHE['fe'];
      const seed2 = new Date(hoy).getDate();
      reflexion = reflexionesTema[seed2 % reflexionesTema.length];
    }

    // 4. Verificar si el usuario ya lo leyó hoy
    let yaLeido = false;
    let rachaInfo = null;
    if (userId) {
      const { data: log } = await supabase
        .from('devotional_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('date_completed', hoy)
        .single();
      yaLeido = !!log;

      const { data: sp } = await supabase
        .from('spiritual_profiles')
        .select('racha_devocional, total_devocionales')
        .eq('user_id', userId)
        .single();
      rachaInfo = sp;
    }

    return {
      versiculo: {
        id: versiculo.id,
        texto: versiculo.verse_text,
        referencia: versiculo.verse_reference,
        tema,
      },
      reflexion,
      oracion: versiculo.prayer || generarOracionPorTema(tema),
      fecha: hoy,
      ya_leido: yaLeido,
      racha_actual: rachaInfo?.racha_devocional || 0,
      total_devocionales: rachaInfo?.total_devocionales || 0,
      xp_disponible: yaLeido ? 0 : 20,
    };
  } catch (error) {
    console.error('[Devocional] Error:', error);
    throw error;
  }
};

// ── Marcar devocional como completado ─────────────────────────────
const completarDevocional = async (userId, versiculoId = null) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Verificar si ya completó hoy
    const { data: existente } = await supabase
      .from('devotional_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('date_completed', hoy)
      .single();

    if (existente) {
      return { ya_completado: true, mensaje: '¡Ya completaste el devocional de hoy! 🙌' };
    }

    // Registrar la completación
    await supabase.from('devotional_completions').insert({
      user_id: userId,
      versiculo_id: versiculoId,
      date_completed: hoy,
    });

    // Actualizar racha y dar XP/monedas
    const rachaResult = await actualizarRachaDevocional(userId);

    // Verificar badges
    const badgesNuevos = await verificarBadges(userId, 'devocional_completado');

    const mensajes = [
      '¡Bien hecho! La Palabra sembrada en tu corazón dará fruto. 🌱',
      '¡Fiel a tu tiempo con Dios! Eso cambia el día. ✨',
      '¡La Palabra es viva y eficaz! Gracias por recibirla hoy. 📖',
      '¡Hermoso! Crecer en fe un día a la vez. 🕊️',
      '¡Excelente! Tu racha espiritual crece. Sigue adelante. 🔥',
    ];
    const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

    return {
      ya_completado: false,
      completado: true,
      mensaje,
      racha: rachaResult.racha,
      xp_ganado: rachaResult.xp_result?.xp_ganado || 20,
      monedas_ganadas: rachaResult.monedas_ganadas || 5,
      badges_nuevos: badgesNuevos,
      subio_nivel: rachaResult.xp_result?.subio_nivel || false,
      nivel_nuevo: rachaResult.xp_result?.nivel || null,
    };
  } catch (error) {
    console.error('[Devocional] Error completando:', error);
    throw error;
  }
};

// ── Historial de devocionales ─────────────────────────────────────
const obtenerHistorialDevocional = async (userId, limite = 30) => {
  const { data } = await supabase
    .from('devotional_completions')
    .select('*, versiculo:versiculo_id(verse_reference, verse_text)')
    .eq('user_id', userId)
    .order('date_completed', { ascending: false })
    .limit(limite);
  return data || [];
};

// ── Generar oración por tema ──────────────────────────────────────
const generarOracionPorTema = (tema) => {
  const oraciones = {
    esperanza: 'Señor, renueva hoy mi esperanza. Cuando no veo el camino, recuérdame que Tú ya estás en el final. Gracias por tus planes de bien para mi vida. Amén.',
    fortaleza: 'Padre, en mi debilidad de hoy, confío en tu fortaleza. No quiero depender de mis fuerzas sino de las tuyas. Llena mis pasos con tu poder. Amén.',
    amor: 'Dios, gracias porque tu amor por mí no depende de mis errores. Ayúdame hoy a recibir tu amor y a darlo libremente a quienes me rodean. Amén.',
    fe: 'Señor, fortalece mi fe. En lo que no entiendo, ayúdame a confiar en ti. En lo que temo, recuérdame que Tú eres fiel. Amén.',
    confianza: 'Padre, quiero soltar el control. Lo que no puedo cambiar, lo pongo en tus manos. Guía mis decisiones hoy con tu sabiduría. Amén.',
    descanso: 'Jesús, vengo a ti tal como estoy — cansado y necesitado. Dame el descanso que solo tú puedes dar. Que mi alma encuentre paz en tu presencia. Amén.',
    provision: 'Señor, eres mi pastor y nada me faltará. Gracias por proveer incluso lo que aún no he pedido. Confío en tu cuidado hoy. Amén.',
    valor: 'Dios, dame valor para este día. En los momentos difíciles, recuérdame que no voy solo. Tu presencia va delante de mí. Amén.',
  };
  return oraciones[tema] || oraciones['fe'];
};

module.exports = {
  obtenerDevocionalDelDia,
  completarDevocional,
  obtenerHistorialDevocional,
};
