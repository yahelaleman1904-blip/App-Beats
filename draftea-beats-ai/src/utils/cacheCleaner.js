// src/utils/cacheCleaner.js

const MATCHES_CACHE_KEY = 'draftea_ai_matches_cache_v1';
const PROTECTED_KEYS = [
  'draftea_ai_tickets_v1',       // Tus tickets y % de efectividad (INTOCABLE)
  'draftea_ai_learning_logs_v1', // Las reglas aprendidas por la IA (INTOCABLE)
  'draftea_ai_pinned_teams_v1'   // Tus equipos de Fila Cero (INTOCABLE)
];

/**
 * Purga partidos pasados del caché del teléfono sin tocar jamás el Historial de Beats.
 */
export function purgeExpiredMatchesCache() {
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // Ej: '2026-10-16'
    const rawCache = localStorage.getItem(MATCHES_CACHE_KEY);

    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      // Conservar solo partidos de hoy o futuros
      const activeMatches = Array.isArray(parsed.matches)
        ? parsed.matches.filter((m) => m.date >= todayStr)
        : [];

      localStorage.setItem(
        MATCHES_CACHE_KEY,
        JSON.stringify({
          lastCleaned: todayStr,
          matches: activeMatches
        })
      );
    }

    // Limpiar cualquier basura temporal de terceros sin tocar PROTECTED_KEYS
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('temp_match_') &&
        !PROTECTED_KEYS.includes(key)
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn('Error limpiando caché temporal:', err);
  }
}