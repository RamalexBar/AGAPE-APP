// ================================================
// ÃGAPE v10 â€” Zustand Store (Production Ready)
// Estado global limpio, persistente y reactivo
// ================================================
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const LIKES_FREE = 20;
const LIKES_INTERVALO_MS = 12 * 60 * 60 * 1000; // 12 horas

const useStore = create((set, get) => ({

  // â”€â”€ AUTH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // -- ENTORNO (personas cercanas) --
  usuariosCercanos: [],
  setUsuariosCercanos: (usuarios) => set({ usuariosCercanos: usuarios }),

  inicializar: async () => {
    try {
      const token = await SecureStore.getItemAsync('agape_token');
      if (token) {
        // GET /api/auth/me devuelve el perfil directamente (sin envolver en { user }).
        const { data } = await authAPI.getMe();
        set({ user: data, token, isAuthenticated: true, isLoading: false });
        get().verificarLikes();
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('agape_token');
      set({ isLoading: false });
    }
  },

  loginConGoogle: async (accessToken) => {
    try {
      const { data } = await authAPI.loginConGoogle(accessToken);
      await SecureStore.setItemAsync('agape_token', data.accessToken);
      set({ user: data.user, token: data.accessToken, isAuthenticated: true });
      get().verificarLikes();
    } catch (error) {
      throw error;
    }
  },
  login: async (email, password) => {
    const { data } = await authAPI.login(email, password);
    await SecureStore.setItemAsync('agape_token', data.accessToken);
    set({ user: data.user, token: data.accessToken, isAuthenticated: true });
    get().verificarLikes();
    return data;
  },

  register: async (datos) => {
    const { data } = await authAPI.register(datos);
    await SecureStore.setItemAsync('agape_token', data.accessToken);
    set({ user: data.user, token: data.accessToken, isAuthenticated: true });
    return data;
  },

  logout: async () => {
    try { await authAPI.logout(); } catch {}
    await SecureStore.deleteItemAsync('agape_token');
    await SecureStore.deleteItemAsync('agape_likes_data');
    set({
      user: null, token: null, isAuthenticated: false,
      perfilesFeed: [], matches: [], mensajesActuales: {},
      nuevoMatch: null, mensajesNoLeidos: 0,
    });
  },

  actualizarUsuario: (datos) =>
    set((state) => ({ user: { ...state.user, ...datos } })),

  // â”€â”€ SISTEMA DE LIKES (20 gratis / 12h) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  likesRestantes: LIKES_FREE,
  likesSiguienteReset: null,

  verificarLikes: async () => {
    try {
      const { user } = get();
      if (user?.premium || user?.subscription_type === 'premium') {
        set({ likesRestantes: Infinity, likesSiguienteReset: null });
        return;
      }
      const raw = await SecureStore.getItemAsync('agape_likes_data');
      const ahora = Date.now();
      if (raw) {
        const saved = JSON.parse(raw);
        if (ahora >= saved.resetAt) {
          const nuevo = { count: LIKES_FREE, resetAt: ahora + LIKES_INTERVALO_MS };
          await SecureStore.setItemAsync('agape_likes_data', JSON.stringify(nuevo));
          set({ likesRestantes: LIKES_FREE, likesSiguienteReset: nuevo.resetAt });
        } else {
          set({ likesRestantes: saved.count, likesSiguienteReset: saved.resetAt });
        }
      } else {
        const nuevo = { count: LIKES_FREE, resetAt: ahora + LIKES_INTERVALO_MS };
        await SecureStore.setItemAsync('agape_likes_data', JSON.stringify(nuevo));
        set({ likesRestantes: LIKES_FREE, likesSiguienteReset: nuevo.resetAt });
      }
    } catch {}
  },

  // Suma swipes extra (p.ej. tras ver un anuncio) al contador local de 12h,
  // sin esperar a que se cumpla la ventana de reseteo.
  agregarLikesExtra: async (cantidad) => {
    const { likesRestantes } = get();
    const nuevo = likesRestantes + cantidad;
    set({ likesRestantes: nuevo });
    try {
      const raw = await SecureStore.getItemAsync('agape_likes_data');
      const saved = raw ? JSON.parse(raw) : { resetAt: Date.now() + LIKES_INTERVALO_MS };
      await SecureStore.setItemAsync('agape_likes_data',
        JSON.stringify({ ...saved, count: nuevo }));
    } catch {}
  },

  usarLike: async () => {
    const { user, likesRestantes } = get();
    if (user?.premium || user?.subscription_type === 'premium') return true;
    if (likesRestantes <= 0) return false;
    const nuevosLikes = likesRestantes - 1;
    set({ likesRestantes: nuevosLikes });
    try {
      const raw = await SecureStore.getItemAsync('agape_likes_data');
      if (raw) {
        const saved = JSON.parse(raw);
        await SecureStore.setItemAsync('agape_likes_data',
          JSON.stringify({ ...saved, count: nuevosLikes }));
      }
    } catch {}
    return true;
  },

  // â”€â”€ FEED DE PERFILES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  perfilesFeed: [],
  setPerfilesFeed: (perfiles) => set({ perfilesFeed: perfiles }),
  removerPerfilFeed: (id) =>
    set((state) => ({ perfilesFeed: state.perfilesFeed.filter(p => p.id !== id) })),

  // â”€â”€ MATCHES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  matches: [],
  nuevoMatch: null,
  setNuevoMatch: (match) => set({ nuevoMatch: match }),
  limpiarNuevoMatch: () => set({ nuevoMatch: null }),

  // â”€â”€ MENSAJES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mensajesActuales: {},
  mensajesNoLeidos: 0,

  setMensajesMatch: (matchId, mensajes) =>
    set((state) => ({
      mensajesActuales: { ...state.mensajesActuales, [matchId]: mensajes },
    })),

  agregarMensaje: (matchId, mensaje) =>
    set((state) => {
      const actuales = state.mensajesActuales[matchId] || [];
      return {
        mensajesActuales: {
          ...state.mensajesActuales,
          [matchId]: [...actuales, mensaje],
        },
      };
    }),

  incrementarNoLeidos: () =>
    set((state) => ({ mensajesNoLeidos: state.mensajesNoLeidos + 1 })),

  resetearNoLeidos: () => set({ mensajesNoLeidos: 0 }),
}));

export default useStore;



