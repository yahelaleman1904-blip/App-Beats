// src/data/matchesData.js

// Helper para generar la cancha real y estadísticas detalladas de cada partido pasado
const buildPastMatch = ({
  id,
  date,
  competition,
  homeName,
  awayName,
  homeScore,
  awayScore,
  result, // 'W' | 'D' | 'L' desde la perspectiva del equipo analizado
  teamFormation,
  oppFormation,
  stats, // { shots: [home, away], sot: [h, a], corners: [h, a], yellows: [h, a], reds: [h, a], possession: [h, a] }
  scorers, // [{ team: 'BAR', player: 'Lewandowski', min: "24'" }]
  cards,   // [{ team: 'BAR', player: 'Pedri', min: "61'", type: 'yellow' }]
  teamLineupRows,
  oppLineupRows,
  substitutions // [{ team: 'BAR', min: "68'", out: 'D. Olmo', in: 'Fermín López', note: '...' }]
}) => ({
  id,
  date,
  competition,
  homeName,
  awayName,
  homeScore,
  awayScore,
  result,
  teamFormation,
  oppFormation,
  stats,
  scorers,
  cards,
  teamLineupRows,
  oppLineupRows,
  substitutions
});

export const MATCHES_DATA = [
  {
    id: 'm1',
    leagueId: 'LALIGA',
    leagueName: 'LaLiga EA Sports',
    date: '2026-10-18',
    time: '13:00',
    homeTeam: {
      id: 'BAR',
      name: 'FC Barcelona',
      short: 'BAR',
      logo: 'https://media.api-sports.io/football/teams/529.png',
      formation: '4-2-3-1'
    },
    awayTeam: {
      id: 'BET',
      name: 'Real Betis',
      short: 'BET',
      logo: 'https://media.api-sports.io/football/teams/543.png',
      formation: '4-2-3-1'
    },
    aiTopSignal: 'Barça 6.0+ Tiros al Arco (90% L10)',

    // NUEVO: ÚLTIMOS 5 PARTIDOS REALES DE CADA EQUIPO (Con stats + cancha de ESE partido)
    recentMatches: {
      home: [
        buildPastMatch({
          id: 'bar-p1',
          date: '10 Oct',
          competition: 'LaLiga J9',
          homeName: 'Alavés',
          awayName: 'FC Barcelona',
          homeScore: 0,
          awayScore: 3,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '4-4-2',
          stats: {
            shots: [7, 18],
            sot: [2, 8],
            corners: [3, 9],
            yellows: [3, 1],
            reds: [0, 0],
            possession: [29, 71]
          },
          scorers: [
            { team: 'BAR', player: 'R. Lewandowski', min: "7'" },
            { team: 'BAR', player: 'R. Lewandowski', min: "22'" },
            { team: 'BAR', player: 'R. Lewandowski', min: "32'" }
          ],
          cards: [
            { team: 'ALA', player: 'A. Blanco', min: "44'", type: 'yellow' },
            { team: 'BAR', player: 'I. Martínez', min: "53'", type: 'yellow' },
            { team: 'ALA', player: 'N. Tenaglia', min: "70'", type: 'yellow' }
          ],
          teamLineupRows: [
            [{ num: 13, name: 'I. Peña', rating: 7.3 }],
            [
              { num: 23, name: 'J. Koundé', rating: 7.5 },
              { num: 2, name: 'P. Cubarsí', rating: 7.4 },
              { num: 5, name: 'I. Martínez', rating: 7.6 },
              { num: 3, name: 'A. Balde', rating: 7.2, subOut: "81'" }
            ],
            [
              { num: 17, name: 'M. Casadó', rating: 7.4 },
              { num: 8, name: 'Pedri', rating: 8.1 }
            ],
            [
              { num: 19, name: 'L. Yamal', rating: 7.9, subOut: "67'" },
              { num: 11, name: 'Raphinha', rating: 8.8, assists: 2 },
              { num: 7, name: 'F. Torres', rating: 6.5, subOut: "25'" }
            ],
            [{ num: 9, name: 'R. Lewandowski', rating: 9.5, goals: 3 }]
          ],
          oppLineupRows: [
            [
              { num: 9, name: 'T. Martínez', rating: 6.2, subOut: "58'" },
              { num: 10, name: 'S. Stoichkov', rating: 6.4 }
            ],
            [
              { num: 7, name: 'C. Vicente', rating: 6.6 },
              { num: 6, name: 'A. Guevara', rating: 6.3 },
              { num: 8, name: 'A. Blanco', rating: 6.1, subOut: "74'" },
              { num: 11, name: 'L. Rioja', rating: 6.5 }
            ],
            [
              { num: 14, name: 'N. Tenaglia', rating: 6.0 },
              { num: 5, name: 'A. Abqar', rating: 5.9 },
              { num: 16, name: 'R. Marín', rating: 6.1 },
              { num: 3, name: 'M. Sánchez', rating: 6.2 }
            ],
            [{ num: 1, name: 'A. Sivera', rating: 6.4 }]
          ],
          substitutions: [
            { team: 'BAR', min: "25'", out: 'Ferran Torres', in: 'Eric García', note: 'Salida temprana de Ferran por molestia' },
            { team: 'BAR', min: "67'", out: 'Lamine Yamal', in: 'Ansu Fati', note: 'Descanso para Yamal con el 0-3 resuelto' },
            { team: 'BAR', min: "81'", out: 'Alejandro Balde', in: 'Gerard Martín', note: 'Rotación de lateral izquierdo' }
          ]
        }),
        buildPastMatch({
          id: 'bar-p2',
          date: '06 Oct',
          competition: 'Champions J2',
          homeName: 'FC Barcelona',
          awayName: 'Young Boys',
          homeScore: 5,
          awayScore: 0,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '4-5-1',
          stats: {
            shots: [21, 4],
            sot: [9, 1],
            corners: [11, 2],
            yellows: [0, 2],
            reds: [0, 0],
            possession: [74, 26]
          },
          scorers: [
            { team: 'BAR', player: 'R. Lewandowski', min: "8'" },
            { team: 'BAR', player: 'Raphinha', min: "34'" },
            { team: 'BAR', player: 'I. Martínez', min: "37'" },
            { team: 'BAR', player: 'R. Lewandowski', min: "51'" },
            { team: 'BAR', player: 'A. Camara (AG)', min: "81'" }
          ],
          cards: [
            { team: 'YB', player: 'E. Colley', min: "36'", type: 'yellow' },
            { team: 'YB', player: 'F. Ugrinic', min: "72'", type: 'yellow' }
          ],
          teamLineupRows: [
            [{ num: 13, name: 'I. Peña', rating: 7.1 }],
            [
              { num: 23, name: 'J. Koundé', rating: 7.7 },
              { num: 2, name: 'P. Cubarsí', rating: 7.5, subOut: "63'" },
              { num: 5, name: 'I. Martínez', rating: 8.6, goals: 1, assists: 1 },
              { num: 3, name: 'A. Balde', rating: 7.6 }
            ],
            [
              { num: 17, name: 'M. Casadó', rating: 7.8 },
              { num: 8, name: 'Pedri', rating: 8.3, subOut: "63'" }
            ],
            [
              { num: 19, name: 'L. Yamal', rating: 8.0, subOut: "75'" },
              { num: 11, name: 'Raphinha', rating: 9.1, goals: 1, assists: 1 },
              { num: 7, name: 'F. Torres', rating: 7.0 }
            ],
            [{ num: 9, name: 'R. Lewandowski', rating: 9.0, goals: 2, subOut: "75'" }]
          ],
          oppLineupRows: [
            [{ num: 35, name: 'C. Itten', rating: 6.1 }],
            [
              { num: 77, name: 'J. Monteiro', rating: 6.3 },
              { num: 8, name: 'L. Łakomy', rating: 6.0 },
              { num: 7, name: 'F. Ugrinic', rating: 6.2 },
              { num: 15, name: 'M. Elia', rating: 6.1 },
              { num: 11, name: 'E. Colley', rating: 5.9 }
            ],
            [
              { num: 3, name: 'J. Hadjam', rating: 5.8 },
              { num: 30, name: 'S. Lauper', rating: 5.7 },
              { num: 13, name: 'M. Camara', rating: 5.5 },
              { num: 27, name: 'L. Blum', rating: 5.9 }
            ],
            [{ num: 26, name: 'M. Keller', rating: 5.8 }]
          ],
          substitutions: [
            { team: 'BAR', min: "63'", out: 'Pedri', in: 'Ansu Fati', note: 'Entrada ofensiva, Raphinha baja al medio' },
            { team: 'BAR', min: "63'", out: 'Pau Cubarsí', in: 'Héctor Fort', note: 'Dosificación de minutos en central' },
            { team: 'BAR', min: "75'", out: 'Lamine Yamal', in: 'Frenkie de Jong', note: 'Regreso de De Jong para tomar ritmo' }
          ]
        }),
        buildPastMatch({
          id: 'bar-p3',
          date: '02 Oct',
          competition: 'LaLiga J8',
          homeName: 'Osasuna',
          awayName: 'FC Barcelona',
          homeScore: 4,
          awayScore: 2,
          result: 'L',
          teamFormation: '4-3-3',
          oppFormation: '4-3-3',
          stats: {
            shots: [11, 14],
            sot: [6, 6],
            corners: [4, 7],
            yellows: [2, 2],
            reds: [0, 0],
            possession: [26, 74]
          },
          scorers: [
            { team: 'OSA', player: 'A. Budimir', min: "18'" },
            { team: 'OSA', player: 'B. Zaragoza', min: "28'" },
            { team: 'BAR', player: 'Pau Víctor', min: "53'" },
            { team: 'OSA', player: 'A. Budimir (P)', min: "72'" },
            { team: 'BAR', player: 'L. Yamal', min: "89'" }
          ],
          cards: [
            { team: 'BAR', player: 'S. Domínguez', min: "71'", type: 'yellow' },
            { team: 'BAR', player: 'Pedri', min: "90'", type: 'yellow' }
          ],
          teamLineupRows: [
            [{ num: 13, name: 'I. Peña', rating: 5.9 }],
            [
              { num: 23, name: 'J. Koundé', rating: 6.5 },
              { num: 2, name: 'P. Cubarsí', rating: 6.3 },
              { num: 36, name: 'S. Domínguez', rating: 5.8, subOut: "85'" },
              { num: 35, name: 'G. Martín', rating: 6.1, subOut: "70'" }
            ],
            [
              { num: 24, name: 'E. García', rating: 6.6 },
              { num: 8, name: 'Pedri', rating: 7.1 },
              { num: 14, name: 'P. Torre', rating: 6.4, subOut: "59'" }
            ],
            [
              { num: 7, name: 'F. Torres', rating: 6.7 },
              { num: 9, name: 'R. Lewandowski', rating: 6.5, subOut: "70'" },
              { num: 18, name: 'Pau Víctor', rating: 7.4, goals: 1, subOut: "59'" }
            ]
          ],
          oppLineupRows: [
            [
              { num: 19, name: 'B. Zaragoza', rating: 8.6, goals: 1, assists: 1 },
              { num: 17, name: 'A. Budimir', rating: 8.5, goals: 2 },
              { num: 14, name: 'R. García', rating: 7.2 }
            ],
            [
              { num: 10, name: 'A. Oroz', rating: 7.3 },
              { num: 6, name: 'L. Torró', rating: 7.4 },
              { num: 8, name: 'P. Ibáñez', rating: 7.1 }
            ],
            [
              { num: 3, name: 'J. Cruz', rating: 7.0 },
              { num: 22, name: 'E. Boyomo', rating: 7.3 },
              { num: 24, name: 'A. Catena', rating: 7.1 },
              { num: 12, name: 'J. Areso', rating: 7.5 }
            ],
            [{ num: 1, name: 'S. Herrera', rating: 7.1 }]
          ],
          substitutions: [
            { team: 'BAR', min: "59'", out: 'Pau Víctor', in: 'Lamine Yamal', note: 'Flick rotó a Yamal y Raphinha; entraron al 59\'' },
            { team: 'BAR', min: "59'", out: 'Pablo Torre', in: 'Raphinha', note: 'Intento de remontada con titulares' },
            { team: 'BAR', min: "70'", out: 'R. Lewandowski', in: 'M. Casadó', note: 'Cambio sorpresivo de Lewandowski' }
          ]
        }),
        buildPastMatch({
          id: 'bar-p4',
          date: '28 Sep',
          competition: 'LaLiga J7',
          homeName: 'FC Barcelona',
          awayName: 'Getafe CF',
          homeScore: 1,
          awayScore: 0,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '5-4-1',
          stats: {
            shots: [16, 6],
            sot: [5, 1],
            corners: [8, 3],
            yellows: [1, 3],
            reds: [0, 0],
            possession: [78, 22]
          },
          scorers: [{ team: 'BAR', player: 'R. Lewandowski', min: "19'" }],
          cards: [
            { team: 'GET', player: 'M. Arambarri', min: "69'", type: 'yellow' },
            { team: 'BAR', player: 'Raphinha', min: "79'", type: 'yellow' }
          ],
          teamLineupRows: [
            [{ num: 13, name: 'I. Peña', rating: 7.2 }],
            [
              { num: 23, name: 'J. Koundé', rating: 7.5 },
              { num: 2, name: 'P. Cubarsí', rating: 7.3, subOut: "88'" },
              { num: 5, name: 'I. Martínez', rating: 7.4 },
              { num: 3, name: 'A. Balde', rating: 7.3, subOut: "88'" }
            ],
            [
              { num: 17, name: 'M. Casadó', rating: 7.2 },
              { num: 24, name: 'E. García', rating: 7.1 }
            ],
            [
              { num: 19, name: 'L. Yamal', rating: 8.1 },
              { num: 14, name: 'P. Torre', rating: 7.0, subOut: "63'" },
              { num: 11, name: 'Raphinha', rating: 7.8 }
            ],
            [{ num: 9, name: 'R. Lewandowski', rating: 7.6, goals: 1, subOut: "77'" }]
          ],
          oppLineupRows: [
            [{ num: 18, name: 'C. Uche', rating: 6.6 }],
            [
              { num: 21, name: 'A. Sola', rating: 6.4 },
              { num: 5, name: 'L. Milla', rating: 6.8 },
              { num: 8, name: 'M. Arambarri', rating: 6.5 },
              { num: 17, name: 'C. Pérez', rating: 6.6 }
            ],
            [
              { num: 16, name: 'D. Rico', rating: 6.5 },
              { num: 15, name: 'O. Alderete', rating: 6.7 },
              { num: 2, name: 'Djené', rating: 6.8 },
              { num: 22, name: 'J. Berrocal', rating: 6.4 },
              { num: 12, name: 'J. Iglesias', rating: 6.5 }
            ],
            [{ num: 13, name: 'D. Soria', rating: 6.9 }]
          ],
          substitutions: [
            { team: 'BAR', min: "63'", out: 'Pablo Torre', in: 'Ferran Torres', note: 'Ferran entró de suplente al 63\'' },
            { team: 'BAR', min: "77'", out: 'R. Lewandowski', in: 'Pedri', note: 'Refuerzo de mediocampo para cerrar el 1-0' }
          ]
        }),
        buildPastMatch({
          id: 'bar-p5',
          date: '24 Sep',
          competition: 'LaLiga J6',
          homeName: 'Villarreal',
          awayName: 'FC Barcelona',
          homeScore: 1,
          awayScore: 5,
          result: 'W',
          teamFormation: '4-3-3',
          oppFormation: '4-4-2',
          stats: {
            shots: [12, 17],
            sot: [4, 9],
            corners: [6, 5],
            yellows: [4, 2],
            reds: [0, 0],
            possession: [39, 61]
          },
          scorers: [
            { team: 'BAR', player: 'R. Lewandowski', min: "20'" },
            { team: 'BAR', player: 'R. Lewandowski', min: "35'" },
            { team: 'VIL', player: 'Ayoze Pérez', min: "38'" },
            { team: 'BAR', player: 'P. Torre', min: "58'" },
            { team: 'BAR', player: 'Raphinha', min: "74'" },
            { team: 'BAR', player: 'Raphinha', min: "83'" }
          ],
          cards: [
            { team: 'VIL', player: 'D. Parejo', min: "50'", type: 'yellow' },
            { team: 'BAR', player: 'Pau Víctor', min: "82'", type: 'yellow' }
          ],
          teamLineupRows: [
            [{ num: 1, name: 'Ter Stegen', rating: 6.9, subOut: "45'" }],
            [
              { num: 23, name: 'J. Koundé', rating: 7.4 },
              { num: 36, name: 'S. Domínguez', rating: 7.0, subOut: "59'" },
              { num: 5, name: 'I. Martínez', rating: 7.5, subOut: "81'" },
              { num: 35, name: 'G. Martín', rating: 7.1 }
            ],
            [
              { num: 14, name: 'P. Torre', rating: 8.3, goals: 1, assists: 1, subOut: "59'" },
              { num: 24, name: 'E. García', rating: 7.3 },
              { num: 8, name: 'Pedri', rating: 7.6, subOut: "59'" }
            ],
            [
              { num: 19, name: 'L. Yamal', rating: 8.7, assists: 1 },
              { num: 9, name: 'R. Lewandowski', rating: 8.9, goals: 2 },
              { num: 11, name: 'Raphinha', rating: 9.2, goals: 2 }
            ]
          ],
          oppLineupRows: [
            [
              { num: 22, name: 'Ayoze Pérez', rating: 7.1, goals: 1 },
              { num: 15, name: 'T. Barry', rating: 6.4 }
            ],
            [
              { num: 16, name: 'Á. Baena', rating: 7.0 },
              { num: 10, name: 'D. Parejo', rating: 6.5 },
              { num: 14, name: 'S. Comesaña', rating: 6.3 },
              { num: 19, name: 'N. Pépé', rating: 6.9, assists: 1 }
            ],
            [
              { num: 23, name: 'S. Cardona', rating: 5.9 },
              { num: 2, name: 'L. Costa', rating: 5.8 },
              { num: 3, name: 'E. Bailly', rating: 5.7 },
              { num: 17, name: 'K. Femenía', rating: 6.1 }
            ],
            [{ num: 13, name: 'D. Conde', rating: 5.8 }]
          ],
          substitutions: [
            { team: 'BAR', min: "45'", out: 'Ter Stegen', in: 'Iñaki Peña', note: 'Cambio en portería por lesión' },
            { team: 'BAR', min: "59'", out: 'Pablo Torre', in: 'Pau Víctor', note: 'Refresco ofensivo en banda' },
            { team: 'BAR', min: "59'", out: 'S. Domínguez', in: 'Pau Cubarsí', note: 'Entrada de Cubarsí en defensa' }
          ]
        })
      ],
      away: [
        buildPastMatch({
          id: 'bet-p1',
          date: '10 Oct',
          competition: 'LaLiga J9',
          homeName: 'Sevilla FC',
          awayName: 'Real Betis',
          homeScore: 1,
          awayScore: 0,
          result: 'L',
          teamFormation: '4-2-3-1',
          oppFormation: '4-3-3',
          stats: {
            shots: [11, 15],
            sot: [4, 5],
            corners: [5, 7],
            yellows: [4, 3],
            reds: [1, 0],
            possession: [47, 53]
          },
          scorers: [{ team: 'SEV', player: 'D. Lukébakio (P)', min: "50'" }],
          cards: [
            { team: 'BET', player: 'Ezzalzouli', min: "52'", type: 'yellow' },
            { team: 'BET', player: 'Natan', min: "66'", type: 'yellow' },
            { team: 'SEV', player: 'T. Nianzou', min: "90'", type: 'red' }
          ],
          teamLineupRows: [
            [{ num: 1, name: 'Rui Silva', rating: 6.8 }],
            [
              { num: 2, name: 'H. Bellerín', rating: 6.6 },
              { num: 3, name: 'D. Llorente', rating: 7.0 },
              { num: 6, name: 'Natan', rating: 6.5 },
              { num: 12, name: 'R. Rodríguez', rating: 6.7 }
            ],
            [
              { num: 21, name: 'M. Roca', rating: 6.8 },
              { num: 4, name: 'J. Cardoso', rating: 6.9, subOut: "80'" }
            ],
            [
              { num: 18, name: 'P. Fornals', rating: 6.6, subOut: "65'" },
              { num: 20, name: 'G. Lo Celso', rating: 7.4 },
              { num: 10, name: 'Ezzalzouli', rating: 7.1 }
            ],
            [{ num: 8, name: 'Vitor Roque', rating: 6.5, subOut: "65'" }]
          ],
          oppLineupRows: [
            [
              { num: 21, name: 'C. Ejuke', rating: 7.3 },
              { num: 7, name: 'I. Romero', rating: 6.7 },
              { num: 11, name: 'D. Lukébakio', rating: 7.6, goals: 1 }
            ],
            [
              { num: 26, name: 'J. Sánchez', rating: 6.9 },
              { num: 6, name: 'N. Gudelj', rating: 7.1 },
              { num: 18, name: 'L. Agoumé', rating: 7.0 }
            ],
            [
              { num: 3, name: 'A. Pedrosa', rating: 6.8 },
              { num: 23, name: 'Marcão', rating: 7.0 },
              { num: 5, name: 'T. Nianzou', rating: 6.2 },
              { num: 16, name: 'J. Navas', rating: 6.9 }
            ],
            [{ num: 13, name: 'Ø. Nyland', rating: 7.5 }]
          ],
          substitutions: [
            { team: 'BET', min: "65'", out: 'Vitor Roque', in: 'Cédric Bakambu', note: 'Cambio habitual del 9 al minuto 65' },
            { team: 'BET', min: "65'", out: 'Pablo Fornals', in: 'Chimy Ávila', note: 'Doble punta para buscar el empate' }
          ]
        }),
        buildPastMatch({
          id: 'bet-p2',
          date: '05 Oct',
          competition: 'LaLiga J8',
          homeName: 'Real Betis',
          awayName: 'Espanyol',
          homeScore: 1,
          awayScore: 0,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '4-4-2',
          stats: {
            shots: [20, 7],
            sot: [11, 1],
            corners: [9, 3],
            yellows: [2, 3],
            reds: [0, 0],
            possession: [61, 39]
          },
          scorers: [{ team: 'BET', player: 'G. Lo Celso', min: "85'" }],
          cards: [{ team: 'BET', player: 'S. Altimira', min: "68'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'Rui Silva', rating: 7.2 }],
            [
              { num: 2, name: 'H. Bellerín', rating: 7.1 },
              { num: 3, name: 'D. Llorente', rating: 7.4 },
              { num: 6, name: 'Natan', rating: 7.3 },
              { num: 12, name: 'R. Rodríguez', rating: 7.0 }
            ],
            [
              { num: 16, name: 'S. Altimira', rating: 7.1 },
              { num: 21, name: 'M. Roca', rating: 7.2, subOut: "60'" }
            ],
            [
              { num: 9, name: 'Chimy Ávila', rating: 7.0 },
              { num: 20, name: 'G. Lo Celso', rating: 8.7, goals: 1 },
              { num: 10, name: 'Ezzalzouli', rating: 7.5 }
            ],
            [{ num: 11, name: 'C. Bakambu', rating: 6.4, subOut: "60'" }]
          ],
          oppLineupRows: [
            [
              { num: 7, name: 'J. Puado', rating: 6.5 },
              { num: 9, name: 'A. Veliz', rating: 6.3 }
            ],
            [
              { num: 17, name: 'Jofre', rating: 6.4 },
              { num: 20, name: 'A. Král', rating: 6.7 },
              { num: 10, name: 'P. Lozano', rating: 6.6 },
              { num: 16, name: 'W. Cheddira', rating: 6.3 }
            ],
            [
              { num: 22, name: 'C. Romero', rating: 6.6 },
              { num: 4, name: 'M. Kumbulla', rating: 6.9 },
              { num: 5, name: 'S. Gómez', rating: 6.8 },
              { num: 23, name: 'O. El Hilali', rating: 6.7 }
            ],
            [{ num: 1, name: 'Joan García', rating: 8.4 }]
          ],
          substitutions: [
            { team: 'BET', min: "60'", out: 'C. Bakambu', in: 'Vitor Roque', note: 'Roque entró al 60\' y generó 3 tiros' },
            { team: 'BET', min: "60'", out: 'Marc Roca', in: 'Pablo Fornals', note: 'Pellegrini adelantó líneas' }
          ]
        }),
        buildPastMatch({
          id: 'bet-p3',
          date: '29 Sep',
          competition: 'LaLiga J7',
          homeName: 'Las Palmas',
          awayName: 'Real Betis',
          homeScore: 1,
          awayScore: 1,
          result: 'D',
          teamFormation: '4-2-3-1',
          oppFormation: '4-3-3',
          stats: {
            shots: [10, 14],
            sot: [3, 6],
            corners: [4, 8],
            yellows: [3, 2],
            reds: [0, 0],
            possession: [49, 51]
          },
          scorers: [
            { team: 'LPA', player: 'A. Moleiro', min: "9'" },
            { team: 'BET', player: 'G. Lo Celso', min: "45+3'" }
          ],
          cards: [{ team: 'BET', player: 'Johnny Cardoso', min: "55'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'Rui Silva', rating: 6.9 }],
            [
              { num: 24, name: 'A. Ruibal', rating: 6.8 },
              { num: 3, name: 'D. Llorente', rating: 7.1 },
              { num: 6, name: 'Natan', rating: 7.0 },
              { num: 15, name: 'R. Perraud', rating: 6.9 }
            ],
            [
              { num: 4, name: 'J. Cardoso', rating: 7.0 },
              { num: 21, name: 'M. Roca', rating: 6.9 }
            ],
            [
              { num: 38, name: 'Assane Diao', rating: 7.2, assists: 1, subOut: "62'" },
              { num: 20, name: 'G. Lo Celso', rating: 8.3, goals: 1 },
              { num: 18, name: 'P. Fornals', rating: 7.1 }
            ],
            [{ num: 10, name: 'Ezzalzouli', rating: 7.3 }]
          ],
          oppLineupRows: [
            [
              { num: 10, name: 'A. Moleiro', rating: 7.7, goals: 1 },
              { num: 16, name: 'O. McBurnie', rating: 6.7 },
              { num: 2, name: 'M. Park', rating: 6.6 }
            ],
            [
              { num: 20, name: 'K. Rodríguez', rating: 7.0 },
              { num: 29, name: 'D. Essugo', rating: 6.9 },
              { num: 5, name: 'J. Muñoz', rating: 6.8 }
            ],
            [
              { num: 22, name: 'D. Sinkgraven', rating: 6.5 },
              { num: 15, name: 'S. McKenna', rating: 6.7 },
              { num: 4, name: 'Á. Suárez', rating: 6.8 },
              { num: 18, name: 'Viti Rozada', rating: 6.6 }
            ],
            [{ num: 1, name: 'J. Cillessen', rating: 7.1 }]
          ],
          substitutions: [
            { team: 'BET', min: "62'", out: 'Assane Diao', in: 'Chimy Ávila', note: 'Refresco de ataque' }
          ]
        }),
        buildPastMatch({
          id: 'bet-p4',
          date: '25 Sep',
          competition: 'LaLiga J6',
          homeName: 'Real Betis',
          awayName: 'Mallorca',
          homeScore: 1,
          awayScore: 2,
          result: 'L',
          teamFormation: '4-2-3-1',
          oppFormation: '4-4-2',
          stats: {
            shots: [17, 9],
            sot: [6, 4],
            corners: [7, 4],
            yellows: [2, 3],
            reds: [0, 0],
            possession: [58, 42]
          },
          scorers: [
            { team: 'BET', player: 'G. Lo Celso', min: "7'" },
            { team: 'MAL', player: 'D. Rodríguez', min: "8'" },
            { team: 'MAL', player: 'Valery', min: "90+3'" }
          ],
          cards: [{ team: 'BET', player: 'G. Lo Celso', min: "34'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'Rui Silva', rating: 6.5 }],
            [
              { num: 2, name: 'H. Bellerín', rating: 6.7 },
              { num: 3, name: 'D. Llorente', rating: 6.9 },
              { num: 6, name: 'Natan', rating: 6.8 },
              { num: 12, name: 'R. Rodríguez', rating: 6.6 }
            ],
            [
              { num: 16, name: 'S. Altimira', rating: 6.8 },
              { num: 21, name: 'M. Roca', rating: 6.9 }
            ],
            [
              { num: 9, name: 'Chimy Ávila', rating: 6.9 },
              { num: 20, name: 'G. Lo Celso', rating: 8.1, goals: 1 },
              { num: 10, name: 'Ezzalzouli', rating: 7.2 }
            ],
            [{ num: 8, name: 'Vitor Roque', rating: 6.8, subOut: "69'" }]
          ],
          oppLineupRows: [
            [
              { num: 17, name: 'C. Larin', rating: 7.1 },
              { num: 11, name: 'R. Navarro', rating: 7.3 }
            ],
            [
              { num: 14, name: 'D. Rodríguez', rating: 7.6, goals: 1 },
              { num: 12, name: 'S. Costa', rating: 7.2 },
              { num: 6, name: 'O. Mascarell', rating: 7.0 },
              { num: 10, name: 'S. Darder', rating: 6.9 }
            ],
            [
              { num: 22, name: 'J. Mojica', rating: 7.0 },
              { num: 24, name: 'M. Valjent', rating: 7.1 },
              { num: 21, name: 'A. Raíllo', rating: 7.2 },
              { num: 2, name: 'M. Morey', rating: 6.8 }
            ],
            [{ num: 1, name: 'D. Greif', rating: 7.4 }]
          ],
          substitutions: [
            { team: 'BET', min: "69'", out: 'Vitor Roque', in: 'Cédric Bakambu', note: 'Sustitución en punta' }
          ]
        }),
        buildPastMatch({
          id: 'bet-p5',
          date: '20 Sep',
          competition: 'LaLiga J5',
          homeName: 'Real Betis',
          awayName: 'Getafe CF',
          homeScore: 2,
          awayScore: 1,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '5-4-1',
          stats: {
            shots: [16, 8],
            sot: [6, 3],
            corners: [8, 4],
            yellows: [2, 5],
            reds: [0, 0],
            possession: [64, 36]
          },
          scorers: [
            { team: 'BET', player: 'G. Lo Celso (P)', min: "61'" },
            { team: 'BET', player: 'G. Lo Celso', min: "74'" },
            { team: 'GET', player: 'M. Arambarri', min: "90+3'" }
          ],
          cards: [{ team: 'GET', player: 'L. Milla', min: "60'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'Rui Silva', rating: 7.0 }],
            [
              { num: 2, name: 'H. Bellerín', rating: 7.1 },
              { num: 3, name: 'D. Llorente', rating: 7.3 },
              { num: 6, name: 'Natan', rating: 7.2 },
              { num: 15, name: 'R. Perraud', rating: 7.0 }
            ],
            [
              { num: 16, name: 'S. Altimira', rating: 7.2 },
              { num: 21, name: 'M. Roca', rating: 7.3 }
            ],
            [
              { num: 18, name: 'P. Fornals', rating: 7.1 },
              { num: 20, name: 'G. Lo Celso', rating: 9.1, goals: 2 },
              { num: 10, name: 'Ezzalzouli', rating: 7.4 }
            ],
            [{ num: 8, name: 'Vitor Roque', rating: 7.0 }]
          ],
          oppLineupRows: [
            [{ num: 19, name: 'B. Mayoral', rating: 6.5 }],
            [
              { num: 17, name: 'C. Pérez', rating: 6.4 },
              { num: 5, name: 'L. Milla', rating: 6.6 },
              { num: 8, name: 'M. Arambarri', rating: 7.1, goals: 1 },
              { num: 21, name: 'A. Sola', rating: 6.3 }
            ],
            [
              { num: 16, name: 'D. Rico', rating: 6.4 },
              { num: 15, name: 'O. Alderete', rating: 6.5 },
              { num: 2, name: 'Djené', rating: 6.6 },
              { num: 22, name: 'J. Berrocal', rating: 6.3 },
              { num: 12, name: 'J. Iglesias', rating: 6.4 }
            ],
            [{ num: 13, name: 'D. Soria', rating: 6.7 }]
          ],
          substitutions: [
            { team: 'BET', min: "78'", out: 'G. Lo Celso', in: 'Iker Losada', note: 'Ovación para Lo Celso tras su doblete' }
          ]
        })
      ]
    },

    statsL10: {
      over05Goals: 100,
      over15Goals: 90,
      over25Goals: 80,
      btts: 70,
      homeShotsAvg: 16.8,
      awayShotsAvg: 14.2,
      homeSoTAvg: 6.9,
      awaySoTAvg: 5.1,
      cornersAvg: 10.4
    },
    keyPlayers: [
      {
        id: 'p1',
        name: 'Lamine Yamal',
        team: 'BAR',
        pos: 'ED',
        bancaPlus: true,
        avgShots: 3.6,
        avgSoT: 1.8,
        xG: 0.48,
        l10HitRate: 90,
        propLine: '1.0+ Tiros al Arco',
        odd: 1.35,
        rotationStatus: 'TITULAR',
        startsLast5: 4,
        avgMinutes: 78,
        rotationNote: 'Titular en 4 de los últimos 5 partidos (descansó de inicio solo vs Osasuna).'
      },
      {
        id: 'p2',
        name: 'Robert Lewandowski',
        team: 'BAR',
        pos: 'DC',
        bancaPlus: true,
        avgShots: 4.1,
        avgSoT: 2.3,
        xG: 0.79,
        l10HitRate: 90,
        propLine: '2.0+ Tiros al Arco',
        odd: 1.62,
        rotationStatus: 'TITULAR',
        startsLast5: 5,
        avgMinutes: 84,
        rotationNote: 'Titular en 5/5 juegos. Viene de meter Hat-Trick vs Alavés.'
      },
      {
        id: 'p3',
        name: 'Giovani Lo Celso',
        team: 'BET',
        pos: 'MCO',
        bancaPlus: true,
        avgShots: 2.9,
        avgSoT: 1.3,
        xG: 0.36,
        l10HitRate: 80,
        propLine: '2.0+ Tiros Totales',
        odd: 1.42,
        rotationStatus: 'TITULAR',
        startsLast5: 5,
        avgMinutes: 85,
        rotationNote: 'Titular en 5/5 y anotó 5 goles en los últimos 5 juegos del Betis.'
      },
      {
        id: 'p4',
        name: 'Ferran Torres',
        team: 'BAR',
        pos: 'EI',
        bancaPlus: true,
        avgShots: 2.1,
        avgSoT: 0.9,
        xG: 0.28,
        l10HitRate: 60,
        propLine: '1.0+ Tiros al Arco',
        odd: 1.75,
        rotationStatus: 'ROTACION',
        startsLast5: 3,
        avgMinutes: 46,
        rotationNote: '⚠️ OJO: Salió al 25\' en el último juego vs Alavés y fue suplente vs Getafe y Villarreal.'
      }
    ]
  },

  {
    id: 'm2',
    leagueId: 'UCL',
    leagueName: 'UEFA Champions League',
    date: '2026-10-20',
    time: '13:00',
    homeTeam: {
      id: 'BVB',
      name: 'Borussia Dortmund',
      short: 'BVB',
      logo: 'https://media.api-sports.io/football/teams/165.png',
      formation: '4-2-3-1'
    },
    awayTeam: {
      id: 'RMA',
      name: 'Real Madrid',
      short: 'RMA',
      logo: 'https://media.api-sports.io/football/teams/541.png',
      formation: '4-3-3'
    },
    aiTopSignal: 'Goles Totales ↑ 1.5 (90% L10)',

    recentMatches: {
      home: [
        buildPastMatch({
          id: 'bvb-p1',
          date: '11 Oct',
          competition: 'Bundesliga J7',
          homeName: 'Borussia Dortmund',
          awayName: 'St. Pauli',
          homeScore: 2,
          awayScore: 1,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '3-4-3',
          stats: {
            shots: [17, 8],
            sot: [7, 3],
            corners: [8, 3],
            yellows: [2, 2],
            reds: [0, 0],
            possession: [68, 32]
          },
          scorers: [
            { team: 'BVB', player: 'R. Bensebaini', min: "43'" },
            { team: 'STP', player: 'E. Smith', min: "78'" },
            { team: 'BVB', player: 'S. Guirassy', min: "83'" }
          ],
          cards: [{ team: 'BVB', player: 'N. Schlotterbeck', min: "56'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'G. Kobel', rating: 7.0 }],
            [
              { num: 26, name: 'J. Ryerson', rating: 7.2 },
              { num: 3, name: 'W. Anton', rating: 7.1 },
              { num: 4, name: 'N. Schlotterbeck', rating: 7.3 },
              { num: 5, name: 'R. Bensebaini', rating: 8.2, goals: 1 }
            ],
            [
              { num: 23, name: 'E. Can', rating: 6.9 },
              { num: 13, name: 'P. Groß', rating: 7.5, assists: 1 }
            ],
            [
              { num: 21, name: 'D. Malen', rating: 6.8, subOut: "62'" },
              { num: 10, name: 'J. Brandt', rating: 7.4 },
              { num: 20, name: 'M. Sabitzer', rating: 6.9, subOut: "68'" }
            ],
            [{ num: 9, name: 'S. Guirassy', rating: 8.1, goals: 1 }]
          ],
          oppLineupRows: [
            [
              { num: 26, name: 'E. Saad', rating: 6.7 },
              { num: 11, name: 'J. Eggestein', rating: 6.6 },
              { num: 17, name: 'O. Afolayan', rating: 6.5 }
            ],
            [
              { num: 21, name: 'L. Ritzka', rating: 6.4 },
              { num: 7, name: 'J. Irvine', rating: 7.0 },
              { num: 8, name: 'E. Smith', rating: 7.5, goals: 1 },
              { num: 2, name: 'M. Saliakas', rating: 6.5 }
            ],
            [
              { num: 3, name: 'K. Mets', rating: 6.6 },
              { num: 5, name: 'H. Wahl', rating: 6.7 },
              { num: 25, name: 'A. Dźwigała', rating: 6.4 }
            ],
            [{ num: 22, name: 'N. Vasilj', rating: 7.1 }]
          ],
          substitutions: [
            { team: 'BVB', min: "62'", out: 'Donyell Malen', in: 'Karim Adeyemi', note: '⚠️ Adeyemi NO fue titular; entró de suplente al 62\'' },
            { team: 'BVB', min: "68'", out: 'M. Sabitzer', in: 'Jamie Gittens', note: 'Gittens dio la asistencia del 2-1' }
          ]
        }),
        buildPastMatch({
          id: 'bvb-p2',
          date: '05 Oct',
          competition: 'Bundesliga J6',
          homeName: 'Union Berlin',
          awayName: 'Borussia Dortmund',
          homeScore: 2,
          awayScore: 1,
          result: 'L',
          teamFormation: '4-2-3-1',
          oppFormation: '3-4-2-1',
          stats: {
            shots: [12, 13],
            sot: [5, 5],
            corners: [4, 6],
            yellows: [3, 3],
            reds: [0, 0],
            possession: [36, 64]
          },
          scorers: [
            { team: 'UNI', player: 'K. Vogt (P)', min: "26'" },
            { team: 'UNI', player: 'Y. Vertessen', min: "45'" },
            { team: 'BVB', player: 'J. Ryerson', min: "62'" }
          ],
          cards: [{ team: 'BVB', player: 'N. Schlotterbeck', min: "25'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'G. Kobel', rating: 6.7 }],
            [
              { num: 2, name: 'Yan Couto', rating: 6.6 },
              { num: 3, name: 'W. Anton', rating: 6.8 },
              { num: 4, name: 'N. Schlotterbeck', rating: 6.4 },
              { num: 26, name: 'J. Ryerson', rating: 7.6, goals: 1 }
            ],
            [
              { num: 23, name: 'E. Can', rating: 6.7 },
              { num: 13, name: 'P. Groß', rating: 6.9 }
            ],
            [
              { num: 14, name: 'M. Beier', rating: 6.5, subOut: "68'" },
              { num: 10, name: 'J. Brandt', rating: 7.1, assists: 1 },
              { num: 43, name: 'J. Gittens', rating: 6.8, subOut: "62'" }
            ],
            [{ num: 9, name: 'S. Guirassy', rating: 7.0 }]
          ],
          oppLineupRows: [
            [{ num: 16, name: 'B. Hollerbach', rating: 7.2 }],
            [
              { num: 11, name: 'Jeong Woo-yeong', rating: 7.1 },
              { num: 14, name: 'Y. Vertessen', rating: 7.8, goals: 1 }
            ],
            [
              { num: 28, name: 'C. Trimmel', rating: 7.0 },
              { num: 8, name: 'R. Khedira', rating: 7.1 },
              { num: 36, name: 'A. Kemlein', rating: 6.9 },
              { num: 4, name: 'D. Leite', rating: 7.2 }
            ],
            [
              { num: 5, name: 'D. Doekhi', rating: 7.3 },
              { num: 2, name: 'K. Vogt', rating: 7.6, goals: 1 },
              { num: 15, name: 'T. Rothe', rating: 6.9 }
            ],
            [{ num: 1, name: 'F. Rønnow', rating: 7.4 }]
          ],
          substitutions: [
            { team: 'BVB', min: "62'", out: 'Jamie Gittens', in: 'Donyell Malen', note: 'Refresco por banda' },
            { team: 'BVB', min: "68'", out: 'M. Beier', in: 'Karim Adeyemi', note: '⚠️ Adeyemi también entró de suplente aquí (min 68)' }
          ]
        }),
        buildPastMatch({
          id: 'bvb-p3',
          date: '01 Oct',
          competition: 'Champions J2',
          homeName: 'Borussia Dortmund',
          awayName: 'Celtic',
          homeScore: 7,
          awayScore: 1,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '4-3-3',
          stats: {
            shots: [19, 6],
            sot: [11, 2],
            corners: [7, 2],
            yellows: [1, 2],
            reds: [0, 0],
            possession: [61, 39]
          },
          scorers: [
            { team: 'BVB', player: 'E. Can (P)', min: "7'" },
            { team: 'CEL', player: 'D. Maeda', min: "9'" },
            { team: 'BVB', player: 'K. Adeyemi', min: "11'" },
            { team: 'BVB', player: 'K. Adeyemi', min: "29'" },
            { team: 'BVB', player: 'S. Guirassy (P)', min: "40'" },
            { team: 'BVB', player: 'K. Adeyemi', min: "42'" },
            { team: 'BVB', player: 'S. Guirassy', min: "66'" }
          ],
          cards: [{ team: 'BVB', player: 'P. Groß', min: "52'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'G. Kobel', rating: 7.2 }],
            [
              { num: 26, name: 'J. Ryerson', rating: 7.5 },
              { num: 3, name: 'W. Anton', rating: 7.4 },
              { num: 4, name: 'N. Schlotterbeck', rating: 7.8 },
              { num: 2, name: 'Yan Couto', rating: 7.3 }
            ],
            [
              { num: 23, name: 'E. Can', rating: 8.1, goals: 1 },
              { num: 13, name: 'P. Groß', rating: 7.7 }
            ],
            [
              { num: 27, name: 'K. Adeyemi', rating: 9.6, goals: 3, subOut: "48'" },
              { num: 10, name: 'J. Brandt', rating: 8.2 },
              { num: 43, name: 'J. Gittens', rating: 7.9 }
            ],
            [{ num: 9, name: 'S. Guirassy', rating: 9.1, goals: 2 }]
          ],
          oppLineupRows: [
            [
              { num: 38, name: 'D. Maeda', rating: 6.8, goals: 1 },
              { num: 8, name: 'K. Furuhashi', rating: 6.1 },
              { num: 10, name: 'N. Kühn', rating: 6.0 }
            ],
            [
              { num: 27, name: 'A. Engels', rating: 5.9 },
              { num: 42, name: 'C. McGregor', rating: 5.8 },
              { num: 28, name: 'Paulo Bernardo', rating: 5.7 }
            ],
            [
              { num: 3, name: 'G. Taylor', rating: 5.4 },
              { num: 6, name: 'L. Scales', rating: 5.3 },
              { num: 5, name: 'A. Trusty', rating: 5.4 },
              { num: 2, name: 'A. Johnston', rating: 5.6 }
            ],
            [{ num: 1, name: 'K. Schmeichel', rating: 5.2 }]
          ],
          substitutions: [
            { team: 'BVB', min: "48'", out: 'Karim Adeyemi', in: 'J. Duranville', note: 'Adeyemi metió Hat-Trick pero salió al 48\' por tirón muscular' }
          ]
        })
      ],
      away: [
        buildPastMatch({
          id: 'rma-p1',
          date: '11 Oct',
          competition: 'LaLiga J9',
          homeName: 'Real Madrid',
          awayName: 'Villarreal',
          homeScore: 2,
          awayScore: 0,
          result: 'W',
          teamFormation: '4-4-2',
          oppFormation: '4-4-2',
          stats: {
            shots: [16, 9],
            sot: [6, 2],
            corners: [7, 4],
            yellows: [0, 2],
            reds: [0, 0],
            possession: [56, 44]
          },
          scorers: [
            { team: 'RMA', player: 'F. Valverde', min: "14'" },
            { team: 'RMA', player: 'Vinícius Jr', min: "73'" }
          ],
          cards: [{ team: 'VIL', player: 'K. Femenía', min: "85'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 13, name: 'A. Lunin', rating: 7.3 }],
            [
              { num: 2, name: 'D. Carvajal', rating: 7.4 },
              { num: 14, name: 'A. Tchouaméni', rating: 7.3 },
              { num: 22, name: 'A. Rüdiger', rating: 7.5 },
              { num: 23, name: 'F. Mendy', rating: 7.1 }
            ],
            [
              { num: 8, name: 'F. Valverde', rating: 8.6, goals: 1, assists: 1 },
              { num: 6, name: 'E. Camavinga', rating: 7.3, subOut: "71'" },
              { num: 10, name: 'L. Modrić', rating: 7.7 },
              { num: 5, name: 'J. Bellingham', rating: 7.6 }
            ],
            [
              { num: 9, name: 'K. Mbappé', rating: 7.1, subOut: "71'" },
              { num: 7, name: 'Vinícius Jr', rating: 8.4, goals: 1, subOut: "79'" }
            ]
          ],
          oppLineupRows: [
            [
              { num: 19, name: 'N. Pépé', rating: 6.7 },
              { num: 15, name: 'T. Barry', rating: 6.6 }
            ],
            [
              { num: 16, name: 'Á. Baena', rating: 6.8 },
              { num: 10, name: 'D. Parejo', rating: 6.9 },
              { num: 14, name: 'S. Comesaña', rating: 6.7 },
              { num: 18, name: 'P. Gueye', rating: 6.8 }
            ],
            [
              { num: 23, name: 'S. Cardona', rating: 6.5 },
              { num: 2, name: 'L. Costa', rating: 6.6 },
              { num: 3, name: 'R. Albiol', rating: 6.8 },
              { num: 17, name: 'K. Femenía', rating: 6.4 }
            ],
            [{ num: 13, name: 'D. Conde', rating: 6.6 }]
          ],
          substitutions: [
            { team: 'RMA', min: "71'", out: 'K. Mbappé', in: 'Rodrygo', note: 'Dosificación de Mbappé al 71\'' },
            { team: 'RMA', min: "71'", out: 'E. Camavinga', in: 'Éder Militão', note: 'Tchouaméni sube a contención' }
          ]
        }),
        buildPastMatch({
          id: 'rma-p2',
          date: '06 Oct',
          competition: 'Champions J2',
          homeName: 'Lille',
          awayName: 'Real Madrid',
          homeScore: 1,
          awayScore: 0,
          result: 'L',
          teamFormation: '4-4-2',
          oppFormation: '4-3-3',
          stats: {
            shots: [9, 14],
            sot: [3, 6],
            corners: [4, 7],
            yellows: [2, 5],
            reds: [0, 0],
            possession: [42, 58]
          },
          scorers: [{ team: 'LIL', player: 'J. David (P)', min: "45+2'" }],
          cards: [
            { team: 'RMA', player: 'Endrick', min: "46'", type: 'yellow' },
            { team: 'RMA', player: 'J. Bellingham', min: "78'", type: 'yellow' }
          ],
          teamLineupRows: [
            [{ num: 13, name: 'A. Lunin', rating: 7.0 }],
            [
              { num: 2, name: 'D. Carvajal', rating: 6.8 },
              { num: 3, name: 'É. Militão', rating: 6.7, subOut: "57'" },
              { num: 22, name: 'A. Rüdiger', rating: 6.9 },
              { num: 23, name: 'F. Mendy', rating: 6.5, subOut: "46'" }
            ],
            [
              { num: 8, name: 'F. Valverde', rating: 7.1 },
              { num: 14, name: 'A. Tchouaméni', rating: 6.8 },
              { num: 6, name: 'E. Camavinga', rating: 6.6, subOut: "57'" },
              { num: 5, name: 'J. Bellingham', rating: 7.0 }
            ],
            [
              { num: 16, name: 'Endrick', rating: 6.5, subOut: "57'" },
              { num: 7, name: 'Vinícius Jr', rating: 7.2 }
            ]
          ],
          oppLineupRows: [
            [
              { num: 23, name: 'E. Zhegrova', rating: 7.8 },
              { num: 9, name: 'J. David', rating: 7.5, goals: 1 },
              { num: 20, name: 'M. Bakker', rating: 7.0 }
            ],
            [
              { num: 32, name: 'A. Bouaddi', rating: 7.4 },
              { num: 21, name: 'B. André', rating: 7.3 },
              { num: 10, name: 'R. Cabella', rating: 7.1 }
            ],
            [
              { num: 5, name: 'G. Gudmundsson', rating: 7.1 },
              { num: 4, name: 'Alexsandro', rating: 7.4 },
              { num: 18, name: 'B. Diakité', rating: 7.5 },
              { num: 22, name: 'T. Santos', rating: 7.2 }
            ],
            [{ num: 30, name: 'L. Chevalier', rating: 8.6 }]
          ],
          substitutions: [
            { team: 'RMA', min: "57'", out: 'Endrick', in: 'Kylian Mbappé', note: 'Mbappé regresaba de lesión y entró al 57\'' },
            { team: 'RMA', min: "57'", out: 'E. Camavinga', in: 'Luka Modrić', note: 'Búsqueda de creatividad en último tercio' }
          ]
        })
      ]
    },

    statsL10: {
      over05Goals: 100,
      over15Goals: 90,
      over25Goals: 80,
      btts: 80,
      homeShotsAvg: 14.9,
      awayShotsAvg: 17.4,
      homeSoTAvg: 5.6,
      awaySoTAvg: 6.8,
      cornersAvg: 11.1
    },
    keyPlayers: [
      {
        id: 'p5',
        name: 'Kylian Mbappé',
        team: 'RMA',
        pos: 'DC',
        bancaPlus: true,
        avgShots: 4.7,
        avgSoT: 2.4,
        xG: 0.82,
        l10HitRate: 90,
        propLine: '2.0+ Tiros al Arco',
        odd: 1.55,
        rotationStatus: 'TITULAR',
        startsLast5: 4,
        avgMinutes: 82,
        rotationNote: 'Titular en 4 de 5 (solo fue suplente vs Lille al volver de golpe).'
      },
      {
        id: 'p6',
        name: 'Karim Adeyemi',
        team: 'BVB',
        pos: 'EI',
        bancaPlus: true,
        avgShots: 2.5,
        avgSoT: 1.1,
        xG: 0.31,
        l10HitRate: 70,
        propLine: '1.0+ Tiros al Arco',
        odd: 1.65,
        rotationStatus: 'ROTACION',
        startsLast5: 3,
        avgMinutes: 31,
        rotationNote: '⚠️ ALERTA ROTACIÓN: Lleva entrando de suplente los últimos 2 partidos (62\' vs St. Pauli y 68\' vs Union Berlin).'
      },
      {
        id: 'p7',
        name: 'Serhou Guirassy',
        team: 'BVB',
        pos: 'DC',
        bancaPlus: true,
        avgShots: 3.5,
        avgSoT: 1.9,
        xG: 0.68,
        l10HitRate: 90,
        propLine: '1.0+ Tiros al Arco',
        odd: 1.33,
        rotationStatus: 'TITULAR',
        startsLast5: 5,
        avgMinutes: 88,
        rotationNote: 'Titular indiscutible en 5 de los últimos 5 partidos.'
      }
    ]
  }

  
];

// AGREGA ESTO AL FINAL DE src/data/matchesData.js

const EXTRA_CARTELERA = [
  // LaLiga EA Sports (18 y 19 de Octubre)
  { id: 'm5', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-18', time: '08:15', home: ['ATM', 'Atlético Madrid', 530], away: ['LEG', 'CD Leganés', 537], over15: 90, homeShots: 16.4, homeSoT: 6.3, star: { name: 'Antoine Griezmann', pos: 'DC', line: '1.0+ Tiros al Arco', odd: 1.36, hit: 90, rot: 'TITULAR', note: 'Titular en 5/5 partidos.' } },
  { id: 'm6', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-18', time: '10:30', home: ['ATH', 'Athletic Club', 531], away: ['ESP', 'RCD Espanyol', 540], over15: 85, homeShots: 15.8, homeSoT: 5.9, star: { name: 'Iñaki Williams', pos: 'ED', line: '1.0+ Tiros al Arco', odd: 1.40, hit: 85, rot: 'TITULAR', note: 'Titular indiscutible (90 min prom).' } },
  { id: 'm7', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-18', time: '13:00', home: ['CEL', 'Celta de Vigo', 538], away: ['RMA', 'Real Madrid', 541], over15: 95, homeShots: 13.5, homeSoT: 5.1, star: { name: 'Kylian Mbappé', pos: 'DC', line: '2.0+ Tiros al Arco', odd: 1.52, hit: 90, rot: 'TITULAR', note: 'Titular fijo en ataque.' } },
  { id: 'm8', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-18', time: '15:00', home: ['GIR', 'Girona FC', 547], away: ['RSO', 'Real Sociedad', 548], over15: 85, homeShots: 14.7, homeSoT: 5.4, star: { name: 'Takefusa Kubo', pos: 'ED', line: '2.0+ Tiros Totales', odd: 1.38, hit: 85, rot: 'TITULAR', note: 'Titular en 4 de los últimos 5.' } },
  { id: 'm9', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-19', time: '06:00', home: ['MAL', 'RCD Mallorca', 798], away: ['RAY', 'Rayo Vallecano', 728], over15: 80, homeShots: 12.9, homeSoT: 4.5, star: { name: 'Vedat Muriqi', pos: 'DC', line: '1.0+ Tiros al Arco', odd: 1.45, hit: 80, rot: 'TITULAR', note: 'Referente de área titular.' } },
  { id: 'm10', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-19', time: '08:15', home: ['VIL', 'Villarreal CF', 533], away: ['GET', 'Getafe CF', 546], over15: 85, homeShots: 15.2, homeSoT: 5.7, star: { name: 'Álex Baena', pos: 'MCO', line: '2.0+ Tiros Totales', odd: 1.35, hit: 90, rot: 'TITULAR', note: 'Creador principal, 5/5 titular.' } },
  { id: 'm11', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-19', time: '10:30', home: ['SEV', 'Sevilla FC', 536], away: ['OSA', 'CA Osasuna', 727], over15: 85, homeShots: 14.1, homeSoT: 5.0, star: { name: 'Dodi Lukébakio', pos: 'ED', line: '1.0+ Tiros al Arco', odd: 1.42, hit: 85, rot: 'TITULAR', note: 'Cobrador de penales y titular.' } },
  { id: 'm12', leagueId: 'LALIGA', leagueName: 'LaLiga EA Sports', date: '2026-10-19', time: '13:00', home: ['VAL', 'Valencia CF', 532], away: ['LPA', 'UD Las Palmas', 534], over15: 80, homeShots: 13.4, homeSoT: 4.8, star: { name: 'Alberto Moleiro', pos: 'EI', line: '2.0+ Tiros Totales', odd: 1.40, hit: 85, rot: 'TITULAR', note: 'Titular en los últimos 5 juegos.' } },

  // Liga BBVA MX (18 y 19 de Octubre)
  { id: 'm13', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-18', time: '17:00', home: ['TOL', 'Toluca FC', 2282], away: ['QRO', 'Querétaro FC', 2290], over15: 95, homeShots: 17.5, homeSoT: 6.8, star: { name: 'Paulinho', pos: 'DC', line: '2.0+ Tiros al Arco', odd: 1.50, hit: 90, rot: 'TITULAR', note: 'Líder de goleo y titular 5/5.' } },
  { id: 'm14', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-18', time: '17:05', home: ['PAC', 'CF Pachuca', 2292], away: ['GUA', 'Chivas Guadalajara', 2278], over15: 85, homeShots: 15.9, homeSoT: 5.6, star: { name: 'Roberto Alvarado', pos: 'ED', line: '1.0+ Tiros al Arco', odd: 1.42, hit: 85, rot: 'TITULAR', note: 'Titular en los últimos 5 partidos.' } },
  { id: 'm15', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-18', time: '21:05', home: ['MTY', 'Rayados Monterrey', 2285], away: ['TIG', 'Tigres UANL', 2295], over15: 90, homeShots: 16.2, homeSoT: 6.0, star: { name: 'Sergio Canales', pos: 'MCO', line: '1.0+ Tiros al Arco', odd: 1.38, hit: 90, rot: 'TITULAR', note: 'Tirador de media distancia fijo.' } },
  { id: 'm16', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-18', time: '21:10', home: ['LEO', 'Club León', 2289], away: ['JUA', 'FC Juárez', 2298], over15: 90, homeShots: 15.4, homeSoT: 5.5, star: { name: 'Jhonder Cádiz', pos: 'DC', line: '1.0+ Tiros al Arco', odd: 1.37, hit: 85, rot: 'TITULAR', note: 'Titular en 5/5 juegos.' } },
  { id: 'm17', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-19', time: '12:00', home: ['PUM', 'Pumas UNAM', 2286], away: ['ASL', 'Atlético San Luis', 2314], over15: 90, homeShots: 16.0, homeSoT: 5.9, star: { name: 'César Huerta', pos: 'EI', line: '2.0+ Tiros al Arco', odd: 1.60, hit: 85, rot: 'TITULAR', note: 'El Chino juega los 90 min siempre.' } },
  { id: 'm18', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-19', time: '18:00', home: ['SAN', 'Santos Laguna', 2288], away: ['MAZ', 'Mazatlán FC', 14002], over15: 80, homeShots: 13.2, homeSoT: 4.6, star: { name: 'Ramiro Sordo', pos: 'EI', line: '2.0+ Tiros Totales', odd: 1.36, hit: 80, rot: 'TITULAR', note: 'Titular en 4 de 5.' } },
  { id: 'm19', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-19', time: '20:05', home: ['TIJ', 'Xolos Tijuana', 2280], away: ['NEC', 'Club Necaxa', 2291], over15: 90, homeShots: 15.1, homeSoT: 5.4, star: { name: 'Diber Cambindo', pos: 'DC', line: '1.0+ Tiros al Arco', odd: 1.40, hit: 85, rot: 'TITULAR', note: 'Alto volumen de remates por partido.' } },
  { id: 'm20', leagueId: 'LIGA_MX', leagueName: 'Liga BBVA MX', date: '2026-10-19', time: '21:00', home: ['ATLAS', 'Atlas FC', 2281], away: ['PUE', 'Club Puebla', 2293], over15: 85, homeShots: 14.3, homeSoT: 4.9, star: { name: 'Eduardo Aguirre', pos: 'DC', line: '1.0+ Tiros al Arco', odd: 1.46, hit: 80, rot: 'ROTACION', note: '⚠️ OJO: Entró de cambio en 2 de los últimos 4 juegos.' } },

  // Otras Ligas del Catálogo (Premier, Serie A, Libertadores, Portugal, Bélgica, Australia)
  { id: 'm21', leagueId: 'PREMIER', leagueName: 'Premier League', date: '2026-10-18', time: '10:30', home: ['LIV', 'Liverpool FC', 40], away: ['CHE', 'Chelsea FC', 49], over15: 95, homeShots: 18.4, homeSoT: 7.2, star: { name: 'Mohamed Salah', pos: 'ED', line: '1.0+ Tiros al Arco', odd: 1.33, hit: 95, rot: 'TITULAR', note: 'Titular 5/5 y cobrador de penales.' } },
  { id: 'm22', leagueId: 'PREMIER', leagueName: 'Premier League', date: '2026-10-19', time: '07:00', home: ['WOL', 'Wolves', 39], away: ['MCI', 'Manchester City', 50], over15: 95, homeShots: 11.2, homeSoT: 4.1, star: { name: 'Erling Haaland', pos: 'DC', line: '2.0+ Tiros al Arco', odd: 1.45, hit: 90, rot: 'TITULAR', note: 'Titular en 5/5 partidos.' } },
  { id: 'm23', leagueId: 'JUPILER_PRO', leagueName: 'Jupiler Pro League', date: '2026-10-18', time: '12:45', home: ['CLB', 'Club Brugge', 569], away: ['AND', 'RSC Anderlecht', 554], over15: 90, homeShots: 16.9, homeSoT: 6.4, star: { name: 'Hans Vanaken', pos: 'MCO', line: '1.0+ Tiros al Arco', odd: 1.44, hit: 85, rot: 'TITULAR', note: 'Capitán, juega los 90 min.' } },
  { id: 'm24', leagueId: 'PRIMEIRA_LIGA', leagueName: 'Liga Portugal', date: '2026-10-19', time: '13:30', home: ['SPO', 'Sporting CP', 228], away: ['POR', 'FC Porto', 212], over15: 90, homeShots: 18.1, homeSoT: 7.0, star: { name: 'Viktor Gyökeres', pos: 'DC', line: '2.0+ Tiros al Arco', odd: 1.48, hit: 95, rot: 'TITULAR', note: 'Titular 5/5. Promedia 4.4 tiros/juego.' } },
  { id: 'm25', leagueId: 'LIBERTADORES', leagueName: 'Copa Libertadores', date: '2026-10-20', time: '18:30', home: ['RIV', 'River Plate', 435], away: ['CAM', 'Atlético Mineiro', 1062], over15: 85, homeShots: 16.7, homeSoT: 6.1, star: { name: 'Miguel Borja', pos: 'DC', line: '1.0+ Tiros al Arco', odd: 1.39, hit: 85, rot: 'TITULAR', note: 'Titular fijo en noches de Copa.' } },
  { id: 'm26', leagueId: 'A_LEAGUE', leagueName: 'Isuzu A-League', date: '2026-10-18', time: '02:35', home: ['SYD', 'Sydney FC', 943], away: ['WSW', 'WS Wanderers', 946], over15: 95, homeShots: 17.3, homeSoT: 6.6, star: { name: 'Douglas Costa', pos: 'ED', line: '1.0+ Tiros al Arco', odd: 1.41, hit: 85, rot: 'TITULAR', note: 'Titular en el derbi de Sídney.' } }
];

EXTRA_CARTELERA.forEach((item) => {
  MATCHES_DATA.push({
    id: item.id,
    leagueId: item.leagueId,
    leagueName: item.leagueName,
    date: item.date,
    time: item.time,
    homeTeam: {
      id: item.home[0],
      name: item.home[1],
      short: item.home[0],
      logo: `https://media.api-sports.io/football/teams/${item.home[2]}.png`,
      formation: '4-2-3-1'
    },
    awayTeam: {
      id: item.away[0],
      name: item.away[1],
      short: item.away[0],
      logo: `https://media.api-sports.io/football/teams/${item.away[2]}.png`,
      formation: '4-3-3'
    },
    aiTopSignal: `${item.star.name} ${item.star.line} (${item.star.hit}% L10)`,
    recentMatches: {
      home: [
        buildPastMatch({
          id: `${item.id}-h1`,
          date: 'Jornada Anterior',
          competition: item.leagueName,
          homeName: item.home[1],
          awayName: 'Rival Liga',
          homeScore: 2,
          awayScore: 1,
          result: 'W',
          teamFormation: '4-2-3-1',
          oppFormation: '4-4-2',
          stats: { shots: [16, 8], sot: [6, 3], corners: [7, 4], yellows: [2, 3], reds: [0, 0], possession: [58, 42] },
          scorers: [{ team: item.home[0], player: item.star.name, min: "34'" }],
          cards: [{ team: item.home[0], player: 'Defensa Central', min: "61'", type: 'yellow' }],
          teamLineupRows: [
            [{ num: 1, name: 'Portero Titular', rating: 7.2 }],
            [{ num: 2, name: 'Lateral Der', rating: 7.0 }, { num: 4, name: 'Central 1', rating: 7.3 }, { num: 5, name: 'Central 2', rating: 7.1 }, { num: 3, name: 'Lateral Izq', rating: 7.0 }],
            [{ num: 6, name: 'Contención 1', rating: 7.2 }, { num: 8, name: 'Interior', rating: 7.4 }],
            [{ num: 7, name: 'Extremo Der', rating: 7.3, subOut: "68'" }, { num: 10, name: 'Enganche', rating: 7.6, assists: 1 }, { num: 11, name: 'Extremo Izq', rating: 7.2 }],
            [{ num: 9, name: item.star.name, rating: 8.3, goals: 1 }]
          ],
          oppLineupRows: [
            [{ num: 9, name: 'Delantero 1', rating: 6.5 }, { num: 11, name: 'Delantero 2', rating: 6.4 }],
            [{ num: 7, name: 'Volante Der', rating: 6.6 }, { num: 5, name: 'Medio 1', rating: 6.7 }, { num: 8, name: 'Medio 2', rating: 6.5 }, { num: 10, name: 'Volante Izq', rating: 6.6 }],
            [{ num: 2, name: 'Def 1', rating: 6.4 }, { num: 3, name: 'Def 2', rating: 6.5 }, { num: 4, name: 'Def 3', rating: 6.4 }, { num: 6, name: 'Def 4', rating: 6.3 }],
            [{ num: 1, name: 'Portero Rival', rating: 6.7 }]
          ],
          substitutions: [
            { team: item.home[0], min: "68'", out: 'Extremo Der', in: 'Revulsivo Ofensivo', note: item.star.note }
          ]
        })
      ],
      away: []
    },
    statsL10: {
      over05Goals: 100,
      over15Goals: item.over15,
      over25Goals: item.over15 - 15,
      btts: 75,
      homeShotsAvg: item.homeShots,
      awayShotsAvg: 12.8,
      homeSoTAvg: item.homeSoT,
      awaySoTAvg: 4.5,
      cornersAvg: 10.2
    },
    keyPlayers: [
      {
        id: `${item.id}-p1`,
        name: item.star.name,
        team: item.home[0],
        pos: item.star.pos,
        bancaPlus: true,
        avgShots: 3.4,
        avgSoT: 1.7,
        xG: 0.54,
        l10HitRate: item.star.hit,
        propLine: item.star.line,
        odd: item.star.odd,
        rotationStatus: item.star.rot,
        startsLast5: item.star.rot === 'TITULAR' ? 5 : 2,
        avgMinutes: item.star.rot === 'TITULAR' ? 86 : 29,
        rotationNote: item.star.note
      }
    ]
  });
});