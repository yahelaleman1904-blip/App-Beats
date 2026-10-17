// src/utils/haptics.js

export const triggerHaptic = (type = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(12); // Toque suave (cambiar liga, fecha, tab)
          break;
        case 'medium':
          navigator.vibrate(25); // Fijar equipo o seleccionar partido
          break;
        case 'success':
          navigator.vibrate([15, 40, 20]); // Generar Beat o marcar ticket ganado
          break;
        default:
          navigator.vibrate(10);
      }
    } catch {
      // Ignorar en navegadores de PC que bloquean vibración
    }
  }
};