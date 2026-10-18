// src/data/historyData.js

// Historial inicial limpio: Los porcentajes se calculan 100% con tus propios Beats reales verificados
export const INITIAL_HISTORY_TICKETS = [];

// Reglas base extraídas del análisis de tus capturas reales de Draftea (DAF 1 a DAF 6)
export const INITIAL_LEARNING_LOGS = [
  {
    id: 'rule-daf-team-sot',
    tag: 'TOPE TIROS AL ARCO EQUIPO',
    source: 'Calibración Real Draftea (MCI / LIV / VIL / EVE)',
    rule: 'Prohibido usar promedios inflados (como 8.0+ o 11.0+ tiros al arco). En modo Seguro se usa el Piso Mínimo de los últimos 5 juegos con tope máximo de 3.0+ a 5.0+ Tiros al Arco.',
    penaltyMarket: 'TIROS AL ARCO EQUIPO',
    maxSafeLine: 5.0
  },
  {
    id: 'rule-daf-ligamx-sot',
    tag: 'FILTRO TIRADORES LIGA MX',
    source: 'Auditoría Captura DAF 3 (Carranza, Puente, Vega, Estupiñán = 0 tiros)',
    rule: 'En Liga MX no basta el promedio: solo se sugiere 1.0+ Tiro al Arco si el jugador cumplió en al menos 4 de sus últimos 5 partidos partido por partido y es Titular confirmado.',
    penaltyMarket: 'TIROS AL ARCO JUGADOR (B+)',
    minConsistency: 4
  },
  {
    id: 'rule-daf-cerrojo-15',
    tag: 'PROTECCIÓN CERROJO 1-0',
    source: 'Auditoría Captura DAF 2 y DAF 6 (Espanyol 0-1 Atl. Madrid / Dinamo 1-0)',
    rule: 'Cuando el visitante o local tiene perfil de ganar 1-0 y cerrar el partido, se descarta ↑ 1.5 Goles y se prioriza ↑ 0.5 Goles o 1.0+ Tiro al Arco del centro delantero.',
    penaltyMarket: 'GOLES TOTALES 90\'',
    preferUnderProtection: true
  }
];