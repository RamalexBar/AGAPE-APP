// ================================================
// ÁGAPE — Referencia global de navegación
// Permite navegar desde fuera de la jerarquía de componentes
// (p. ej. al recibir una videollamada entrante por socket).
// ================================================
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navegarGlobal(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
