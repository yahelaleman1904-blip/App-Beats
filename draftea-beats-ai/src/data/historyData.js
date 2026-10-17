// src/data/historyData.js

export const INITIAL_HISTORY_TICKETS = [
  {
    id: 'tk-real-1',
    createdAt: '15 Oct (12:34)',
    title: 'Escalera Soñadora de 18 Elecciones (Goles + PA)',
    category: 'SONADOR', // SEGURO | ARRIESGADO | SONADOR
    totalOdd: '8.46',
    avgLegProb: '91.4',
    ticketProb: 28,
    legs: [
      { legId: 'r1-1', fullMatchTitle: 'Huracán vs Gimnasia LP', market: 'GOLES TOTALES 90\'', selection: '↑ 0.5 Goles', odd: 1.10, prob: 92, badge: 'COLCHÓN', hit: true },
      { legId: 'r1-2', fullMatchTitle: 'Dinamo Zagreb vs Anderlecht', market: 'GOLES TOTALES 90\'', selection: '↑ 0.5 Goles (1-0)', odd: 1.04, prob: 95, badge: 'COLCHÓN', hit: true },
      { legId: 'r1-3', fullMatchTitle: 'Olympique Marsella vs Olympiacos', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (0-1)', odd: 1.28, prob: 82, badge: 'TENDENCIA', hit: false, failReason: 'Faltó 1 gol (quedó 0-1). Marsella bajó ritmo ofensivo en 2T.' },
      { legId: 'r1-4', fullMatchTitle: 'Bournemouth vs Stuttgart', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (3-0)', odd: 1.11, prob: 90, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-5', fullMatchTitle: 'Hoffenheim vs Beşiktaş', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (2-3)', odd: 1.17, prob: 88, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-6', fullMatchTitle: 'Rennes vs OFI Creta', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (2-1)', odd: 1.12, prob: 90, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-7', fullMatchTitle: 'SC Freiburg vs FK Jablonec', market: 'GOLES TOTALES 90\'', selection: '↑ 0.5 Goles (3-2)', odd: 1.03, prob: 97, badge: 'COLCHÓN', hit: true },
      { legId: 'r1-8', fullMatchTitle: 'FC København vs Braga', market: 'GOLES TOTALES 90\'', selection: '↑ 0.5 Goles (3-0)', odd: 1.07, prob: 94, badge: 'COLCHÓN', hit: true },
      { legId: 'r1-9', fullMatchTitle: 'Stuttgart II vs Iberia', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (2-0)', odd: 1.13, prob: 89, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-10', fullMatchTitle: 'Jagiellonia vs Arminia', market: 'GOLES TOTALES 90\'', selection: '↑ 0.5 Goles (3-1)', odd: 1.03, prob: 96, badge: 'COLCHÓN', hit: true },
      { legId: 'r1-11', fullMatchTitle: 'Ferencváros vs Viktoria Plzeň', market: 'GOLES TOTALES 90\'', selection: '↑ 0.5 Goles (2-1)', odd: 1.03, prob: 96, badge: 'COLCHÓN', hit: true },
      { legId: 'r1-12', fullMatchTitle: 'Braga vs Radnički', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (2-1)', odd: 1.11, prob: 90, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-13', fullMatchTitle: 'Hearts vs Njardvik', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (1-1)', odd: 1.16, prob: 88, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-14', fullMatchTitle: 'Atalanta vs Pafos', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (3-1)', odd: 1.14, prob: 90, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-15', fullMatchTitle: 'Brighton vs Kauno Žalgiris', market: 'GANA 90\' (PA)', selection: 'Gana Brighton (4-0)', odd: 1.02, prob: 98, badge: 'PA +2 GOLES', hit: true },
      { legId: 'r1-16', fullMatchTitle: 'NEC Nijmegen vs Leverkusen', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (1-1)', odd: 1.31, prob: 85, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-17', fullMatchTitle: 'Benfica vs Celtic', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (4-1)', odd: 1.08, prob: 93, badge: 'OVER 1.5', hit: true },
      { legId: 'r1-18', fullMatchTitle: 'Celta de Vigo vs Juventus', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (1-2)', odd: 1.42, prob: 81, badge: 'OVER 1.5', hit: true }
    ]
  },
  {
    id: 'tk-real-2',
    createdAt: '13 Oct (15:32)',
    title: 'Beat Mixto de 7 Elecciones (Tiros B+ y Equipos)',
    category: 'ARRIESGADO',
    totalOdd: '18.69',
    avgLegProb: '78.5',
    ticketProb: 22,
    legs: [
      { legId: 'r2-1', fullMatchTitle: 'LASK vs Liverpool', market: 'GOLES TOTALES 90\'', selection: '↑ 2.5 Goles (3-6)', odd: 1.38, prob: 88, badge: 'OVER 2.5', hit: true },
      { legId: 'r2-2', fullMatchTitle: 'Feyenoord vs Como', market: 'TIROS B+ 90\'', selection: 'A. Hadj-Moussa 3.0+ Tiros (Hizo 5)', odd: 1.42, prob: 85, badge: 'B+', hit: true },
      { legId: 'r2-3', fullMatchTitle: 'Real Betis vs FC Porto', market: 'TOTAL DE TIROS 90\'', selection: 'Real Betis 14.0+ Tiros (Hizo 17)', odd: 1.55, prob: 82, badge: 'VOLUMEN', hit: true },
      { legId: 'r2-4', fullMatchTitle: 'Manchester City vs PSG', market: 'TOTAL TIROS AL ARCO 90\'', selection: 'Manchester City 5.0+ Al Arco (Hizo 9)', odd: 1.47, prob: 86, badge: 'ATAQUE', hit: true },
      { legId: 'r2-5', fullMatchTitle: 'Aston Villa vs Fenerbahçe', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles (6-0)', odd: 1.18, prob: 92, badge: 'OVER 1.5', hit: true },
      { legId: 'r2-6', fullMatchTitle: 'Bodø/Glimt vs Borussia Dortmund', market: 'TIROS B+ 90\'', selection: 'A. Helmersen 3.0+ Tiros (Se quedó en 2)', odd: 1.46, prob: 68, badge: 'B+', hit: false, failReason: 'Helmersen se quedó a 1 tiro (2/3). Línea de 3.0+ contra defensa Champions era exigente.' },
      { legId: 'r2-7', fullMatchTitle: 'AS Roma vs Real Madrid', market: 'TIROS AL ARCO B+ 90\'', selection: 'P. Dybala (0) → Rodrigo Mora (1) • 2.0+ Al Arco', odd: 2.43, prob: 54, badge: 'B+ CAMBIO 46\'', hit: false, failReason: 'Dybala salió al 46\' con 0 tiros; Rodrigo Mora sumó 1 gracias a Banca+, quedando en 1/2.' }
    ]
  },
  {
    id: 'tk-safe-1',
    createdAt: '14 Oct (19:00)',
    title: 'Beat Seguro Nocturno (3 Partidos • 100% Hit)',
    category: 'SEGURO',
    totalOdd: '2.34',
    avgLegProb: '91.6',
    ticketProb: 77,
    legs: [
      { legId: 's1-1', fullMatchTitle: 'FC Barcelona vs Alavés', market: 'TIROS AL ARCO B+', selection: 'R. Lewandowski 1.0+ Tiro al Arco', odd: 1.28, prob: 94, badge: 'B+ TITULAR', hit: true },
      { legId: 's1-2', fullMatchTitle: 'Cruz Azul vs Necaxa', market: 'GOLES TOTALES 90\'', selection: '↑ 1.5 Goles', odd: 1.32, prob: 91, badge: 'TENDENCIA L10', hit: true },
      { legId: 's1-3', fullMatchTitle: 'PSV Eindhoven vs AZ Alkmaar', market: 'TOTAL TIROS EQUIPO', selection: 'PSV 5.0+ Tiros al Arco', odd: 1.38, prob: 90, badge: 'EREDIVISIE', hit: true }
    ]
  }
];

export const INITIAL_LEARNING_LOGS = [
  {
    id: 'learn-1',
    tag: 'AJUSTE ROTACIÓN + BANCA+ (B+)',
    source: 'Detectado en: AS Roma vs Real Madrid (P. Dybala cambio al 46\')',
    rule: 'En Nivel Seguro y Arriesgado, el motor limita a 1.0+ Tiro al Arco a jugadores con promedio menor a 70 minutos o riesgo de cambio al medio tiempo, reservando líneas de 2.0+ solo para titulares de 85+ min.'
  },
  {
    id: 'learn-2',
    tag: 'AJUSTE LÍNEAS DE TIROS 3.0+',
    source: 'Detectado en: Bodø/Glimt vs BVB (A. Helmersen 2/3 tiros)',
    rule: 'Cuando un delantero local enfrenta a un club Top 8 de Champions, se prioriza "1.0+ Tiro al Arco B+" sobre "3.0+ Tiros Totales" para evitar bloqueos defensivos.'
  },
  {
    id: 'learn-3',
    tag: 'PROTECCIÓN ESCALERAS +18 PARTIDOS',
    source: 'Detectado en: Marsella vs Olympiacos (0-1 en Goles ↑ 1.5)',
    rule: 'En duelos con defensas cerradas de ligas griegas/francesas dentro de Soñadores de +18 picks, el algoritmo baja automáticamente la línea a "↑ 0.5 Goles" o cambia a "Tiros Totales del Local".'
  }
];