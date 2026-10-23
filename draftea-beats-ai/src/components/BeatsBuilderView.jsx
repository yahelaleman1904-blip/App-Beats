// src/components/BeatsBuilderView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  BookmarkCheck,
  Loader2,
  Minus,
  Plus
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

function analyzeMatchByMatchMetrics(match, deepData, learningLogs = []) {
  const recentHome = deepData?.recentMatches?.home || [];
  const recentAway = deepData?.recentMatches?.away || [];
  const stats = deepData?.statsL10 || match.statsL10 || {};

  const homeNameLower = match.homeTeam.name.toLowerCase();
  const awayNameLower = match.awayTeam.name.toLowerCase();
  const homeShortLower = match.homeTeam.short.toLowerCase();
  const awayShortLower = match.awayTeam.short.toLowerCase();

  const teamSpecificLogs = learningLogs.filter((log) => {
    if (!Array.isArray(log.targetTeams) || log.targetTeams.length === 0) {
      return false;
    }
    return log.targetTeams.some(
      (kw) =>
        homeNameLower.includes(kw) ||
        awayNameLower.includes(kw) ||
        homeShortLower === kw ||
        awayShortLower === kw
    );
  });

  const teamFailedGoalsBefore = teamSpecificLogs.some(
    (l) =>
      l.outcome === 'FAIL' &&
      (l.marketType?.includes('GOLES') || l.tag?.includes('GOLES'))
  );

  const homeSotList = recentHome.map((m) => Number(m._mySoT ?? m.stats?.sot?.[0] ?? 5));
  const awaySotList = recentAway.map((m) => Number(m._mySoT ?? m.stats?.sot?.[1] ?? 4));
  const homeShotsList = recentHome.map((m) => Number(m._myShots ?? m.stats?.shots?.[0] ?? 13));

  // LÍNEAS REALES ABIERTAS EN DRAFTEA (Sin el tope falso de 5.0+)
  // En Draftea (DAF 12), Barcelona abre en 7.0+ (1.42x) y Real Madrid en 5.0+ (1.69x)
  const homeAvgSoT =
    stats.homeSoTAvg ||
    (homeSotList.length > 0
      ? homeSotList.reduce((a, b) => a + b, 0) / homeSotList.length
      : 5.2);
  const awayAvgSoT =
    stats.awaySoTAvg ||
    (awaySotList.length > 0
      ? awaySotList.reduce((a, b) => a + b, 0) / awaySotList.length
      : 4.2);

  const openHomeSotLine =
    stats.drafteaHomeSoTOpenLine || Math.max(3, Math.round(homeAvgSoT - 0.25));
  const openAwaySotLine =
    stats.drafteaAwaySoTOpenLine || Math.max(3, Math.round(awayAvgSoT - 0.25));
  const openHomeShotsLine =
    stats.drafteaHomeShotsOpenLine || Math.max(10, Math.round((stats.homeShotsAvg || 13) - 1.2));

  // Calcular cuántas veces en los últimos 5 juegos cumplió esa línea exacta que pide Draftea
  const homeSotHitsAtOpenLine = homeSotList.filter((v) => v >= openHomeSotLine).length;
  const homeSotOpenProb =
    homeSotList.length > 0
      ? Math.round((homeSotHitsAtOpenLine / homeSotList.length) * 100)
      : 78;

  const awaySotHitsAtOpenLine = awaySotList.filter((v) => v >= openAwaySotLine).length;
  const awaySotOpenProb =
    awaySotList.length > 0
      ? Math.round((awaySotHitsAtOpenLine / awaySotList.length) * 100)
      : 74;

  const allRecent = [...recentHome, ...recentAway];
  const gamesOneGoalOrLess = allRecent.filter(
    (m) => (m._totalGoals ?? m.homeScore + m.awayScore) <= 1
  ).length;

  // Detectar si ↑ 1.5 está bloqueado con candado en Draftea (ej. Barcelona vs Real Madrid en DAF12)
  const isOver15Locked =
    Boolean(stats.isOver15Locked) ||
    (stats.over25Goals ?? 0) >= 65 ||
    (stats.expectedTotalGoals ?? 0) >= 2.75;

  return {
    openHomeSotLine,
    openAwaySotLine,
    openHomeShotsLine,
    homeSotOpenProb: Math.max(62, Math.min(92, homeSotOpenProb)),
    awaySotOpenProb: Math.max(60, Math.min(90, awaySotOpenProb)),
    isOver15Locked,
    isHighRiskUnder: gamesOneGoalOrLess >= 3 || teamFailedGoalsBefore,
    stats
  };
}

function buildUniqueCategorizedPicks(
  match,
  deepData,
  count,
  riskLevel,
  isLoadingThisMatch,
  learningLogs = [],
  lineAdjustments = {}
) {
  const mMetrics = analyzeMatchByMatchMetrics(match, deepData, learningLogs);
  const stats = mMetrics.stats;
  const tactical = deepData?.tacticalAnalysis;
  const players =
    deepData?.keyPlayers?.length > 0 ? deepData.keyPlayers : match.keyPlayers || [];
  const gks = deepData?.goalkeepers || [];

  // Clasificar jugadores usando su línea REAL desbloqueada en Draftea (ej. Gordon 3.0+ Tiros = 1.36x)
  const validPlayers = players
    .filter(
      (p) =>
        p.name &&
        !p.name.includes('Referente') &&
        !p.name.includes('Titular') &&
        !p.name.includes('Goleador')
    )
    .map((p) => {
      const avgSh = Number(p.avgShots || 2.5);
      const avgSot = Number(p.avgSoT || 1.2);
      const openShotsLine =
        p.openShotsLine || (avgSh >= 3.1 ? Math.max(3, Math.floor(avgSh)) : avgSh >= 1.9 ? 2 : 1);
      const openSoTLine = p.openSoTLine || (avgSot >= 1.95 ? 2 : 1);
      const openShotsOdd = p.openShotsOdd || (openShotsLine >= 3 ? 1.36 : 1.31);
      const openSoTOdd = p.openSoTOdd || (openSoTLine >= 2 ? 1.44 : 1.30);

      const logs = p.matchLogs || [];
      const hitsSoT = logs.filter((l) => l.sot >= openSoTLine).length;
      const hitsShots = logs.filter((l) => l.shots >= openShotsLine).length;

      return {
        ...p,
        openShotsLine,
        openSoTLine,
        openShotsOdd,
        openSoTOdd,
        hitsSoT,
        hitsShots,
        consistencyScore:
          (p.rotationStatus === 'TITULAR' ? 10 : 0) +
          Math.max(hitsSoT, hitsShots) * 3 +
          (p.isHome ? 2 : 0)
      };
    })
    .sort((a, b) => b.consistencyScore - a.consistencyScore);

  const p1 = validPlayers[0] || {
    name: isLoadingThisMatch ? `Cargando ${match.homeTeam.short}...` : `${match.homeTeam.name}`,
    team: match.homeTeam.short,
    openSoTLine: 1,
    openSoTOdd: 1.30,
    openShotsLine: 3,
    openShotsOdd: 1.36,
    l10HitRate: 88
  };

  const p2 = validPlayers[1] || {
    name: isLoadingThisMatch ? `Cargando ${match.awayTeam.short}...` : `${match.awayTeam.name}`,
    team: match.awayTeam.short,
    openSoTLine: 1,
    openSoTOdd: 1.32,
    openShotsLine: 3,
    openShotsOdd: 1.36,
    l10HitRate: 85
  };

  const p3 = validPlayers[2] || p1;

  const gk1 = gks[0] || {
    name: isLoadingThisMatch
      ? `Portero ${match.awayTeam.short}`
      : `Portero (${match.awayTeam.short})`,
    team: match.awayTeam.short,
    openSavesLine: 2,
    avgSaves: 3.0
  };

  const isParkTheBus =
    tactical?.home?.parkTheBusRisk ||
    tactical?.away?.parkTheBusRisk ||
    mMetrics.isHighRiskUnder;

  const favIsHome = (stats.winProbHome ?? 50) >= (stats.winProbAway ?? 25);
  const favTeam = favIsHome ? match.homeTeam : match.awayTeam;
  const favWinProb = Math.max(stats.winProbHome ?? 50, stats.winProbAway ?? 25);

  const pa1FavOdd = favIsHome ? stats.pa1HomeOdd ?? 1.25 : stats.pa1AwayOdd ?? 1.45;
  const dcFavOdd = favIsHome ? stats.dcHomeDrawOdd ?? 1.23 : stats.dcAwayDrawOdd ?? 1.32;
  const dcFavLabel = favIsHome
    ? `${match.homeTeam.short}/EMPATE`
    : `${match.awayTeam.short}/EMPATE`;

  // REGLA DE GOLES TOTALES Y GOLES POR EQUIPO EN DRAFTEA (DAF 12 y DAF12):
  // Si ↑ 1.5 está bloqueado con candado en Draftea (isOver15Locked = true), NUNCA sugerimos ↑ 1.5:
  // En su lugar usamos "Total de goles [Equipo] ↑ 1.5" o "Goles Totales ↑ 2.5" o "↓ 3.5"
  let safeGoalMarketTitle = 'GOLES TOTALES ↑/↓ 90\'';
  let baseSafeGoalLine = 1.5;
  let safeGoalDirection = '↑';
  let safeGoalPrefix = '';
  let safeGoalOdd = 1.28;
  let safeGoalProb = stats.over15Goals ?? 84;

  if (mMetrics.isOver15Locked) {
    // Caso Barcelona vs Real Madrid (DAF12): ↑ 1.5 general está bloqueado con candado 🔒
    // Pero en DAF 12 están abiertos: Total de goles Real Madrid ↑ 0.5 / ↑ 1.5 y Goles Totales ↑ 2.5
    safeGoalMarketTitle = `TOTAL DE GOLES ${favTeam.name.toUpperCase()} ↑/↓ 90'`;
    baseSafeGoalLine = 1.5;
    safeGoalDirection = '↑';
    safeGoalOdd = 1.38;
    safeGoalProb = Math.min(89, (stats.over25Goals ?? 70) + 14);
  } else if (isParkTheBus) {
    safeGoalMarketTitle = 'GOLES TOTALES ↑/↓ 90\'';
    baseSafeGoalLine = 3.5;
    safeGoalDirection = '↓';
    safeGoalOdd = 1.25;
    safeGoalProb = stats.under35Goals ?? 85;
  }

  // Aplicar ajustes manuales [ - ] / [ + ] si el usuario movió alguna línea para empatar con su pantalla de Draftea
  const getAdj = (groupKey) => Number(lineAdjustments[`${match.id}_${groupKey}`] || 0);

  const adjP1Sot = Math.max(1, (p1.openSoTLine || 1) + getAdj('PLAYER_1_SOT'));
  const adjP2Shots = Math.max(1, (p2.openShotsLine || 3) + getAdj('PLAYER_2_SHOTS'));
  const adjHomeSot = Math.max(2, mMetrics.openHomeSotLine + getAdj('HOME_TEAM_SOT'));
  const adjAwaySot = Math.max(2, mMetrics.openAwaySotLine + getAdj('AWAY_TEAM_SOT'));
  const adjGoalLine = Math.max(0.5, baseSafeGoalLine + getAdj('TOTAL_GOALS'));
  const adjHomeShots = Math.max(6, mMetrics.openHomeShotsLine + getAdj('HOME_TEAM_SHOTS'));
  const adjGkSaves = Math.max(1, (gk1.openSavesLine || 2) + getAdj('GK_SAVES'));

  const catalogByRisk = {
    SEGURO: [
      {
        categoryGroup: 'PLAYER_1_SOT',
        adjustable: true,
        market: 'TIROS AL ARCO BANCA+ 90\'',
        selection: `${p1.name} ${p1.team} | ${adjP1Sot}.0+`,
        odd: Number((p1.openSoTOdd + getAdj('PLAYER_1_SOT') * 0.28).toFixed(2)),
        prob: p1.openSoTHitRate || 88,
        badge: 'BANCA+ 90\''
      },
      {
        categoryGroup: 'MONEYLINE_PA1',
        adjustable: false,
        market: 'MONEY LINE (PAGO ANTICIPADO POR 1 GOL) PA(1) 90\'',
        selection: `${favTeam.short} (${favTeam.name})`,
        odd: pa1FavOdd,
        prob: Math.min(91, favWinProb + 26),
        badge: 'PA(1) 90\''
      },
      {
        categoryGroup: 'PLAYER_2_SHOTS',
        adjustable: true,
        market: 'TIROS BANCA+ 90\'',
        selection: `${p2.name} ${p2.team} | ${adjP2Shots}.0+`,
        odd: Number((p2.openShotsOdd + getAdj('PLAYER_2_SHOTS') * 0.25).toFixed(2)),
        prob: p2.openShotsHitRate || 84,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'DOUBLE_CHANCE',
        adjustable: false,
        market: 'DOBLE OPORTUNIDAD 90\'',
        selection: dcFavLabel,
        odd: dcFavOdd,
        prob: Math.min(92, favWinProb + 25),
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        adjustable: true,
        market: `TOTAL DE TIROS AL ARCO ${match.homeTeam.name.toUpperCase()} 90'`,
        selection: `${match.homeTeam.name} | ${adjHomeSot}.0+`,
        odd: Number((1.42 + getAdj('HOME_TEAM_SOT') * 0.18).toFixed(2)),
        prob: mMetrics.homeSotOpenProb,
        badge: '90\''
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        adjustable: true,
        market: safeGoalMarketTitle,
        selection: `${safeGoalPrefix}${safeGoalDirection} ${adjGoalLine}`,
        odd: Number((safeGoalOdd + getAdj('TOTAL_GOALS') * 0.22).toFixed(2)),
        prob: safeGoalProb,
        badge: '90\''
      },
      {
        categoryGroup: 'AWAY_TEAM_SOT',
        adjustable: true,
        market: `TOTAL DE TIROS AL ARCO ${match.awayTeam.name.toUpperCase()} 90'`,
        selection: `${match.awayTeam.name} | ${adjAwaySot}.0+`,
        odd: Number((1.52 + getAdj('AWAY_TEAM_SOT') * 0.18).toFixed(2)),
        prob: mMetrics.awaySotOpenProb,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SHOTS',
        adjustable: true,
        market: 'TOTAL DE TIROS EQUIPO 90\'',
        selection: `${match.homeTeam.name} | ${adjHomeShots}.0+`,
        odd: 1.32,
        prob: 85,
        badge: '90\''
      },
      {
        categoryGroup: 'GK_SAVES',
        adjustable: true,
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) | ${adjGkSaves}.0+`,
        odd: 1.35,
        prob: 84,
        badge: '90\''
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        adjustable: false,
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 8.5 Tiros de Esquina',
        odd: 1.33,
        prob: 83,
        badge: '90\''
      }
    ],

    ARRIESGADO: [
      {
        categoryGroup: 'TOTAL_GOALS',
        adjustable: true,
        market: 'GOLES TOTALES ↑/↓ 90\'',
        selection: `↑ ${Math.max(1.5, 2.5 + getAdj('TOTAL_GOALS'))}`,
        odd: 1.58,
        prob: stats.over25Goals ?? 74,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_GOALS',
        adjustable: false,
        market: `TOTAL DE GOLES ${match.homeTeam.name.toUpperCase()} ↑/↓ 90'`,
        selection: `↑ ${stats.drafteaHomeTeamGoalLine === 1.5 ? '2.5' : '1.5'}`,
        odd: 1.82,
        prob: 72,
        badge: '90\''
      },
      {
        categoryGroup: 'AWAY_TEAM_GOALS',
        adjustable: false,
        market: `TOTAL DE GOLES ${match.awayTeam.name.toUpperCase()} ↑/↓ 90'`,
        selection: '↑ 1.5',
        odd: 1.86,
        prob: 70,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        adjustable: true,
        market: `TOTAL DE TIROS AL ARCO ${match.homeTeam.name.toUpperCase()} 90'`,
        selection: `${match.homeTeam.name} | ${adjHomeSot}.0+`,
        odd: 1.42,
        prob: mMetrics.homeSotOpenProb,
        badge: '90\''
      },
      {
        categoryGroup: 'AWAY_TEAM_SOT',
        adjustable: true,
        market: `TOTAL DE TIROS AL ARCO ${match.awayTeam.name.toUpperCase()} 90'`,
        selection: `${match.awayTeam.name} | ${adjAwaySot}.0+`,
        odd: 1.69,
        prob: mMetrics.awaySotOpenProb,
        badge: '90\''
      },
      {
        categoryGroup: 'MONEYLINE_PA',
        adjustable: false,
        market: 'MONEY LINE PA 90\'',
        selection: `${favTeam.short} (${favTeam.name})`,
        odd: favIsHome ? stats.mlHomeOdd ?? 1.60 : stats.mlAwayOdd ?? 1.85,
        prob: favWinProb,
        badge: 'PA 90\''
      },
      {
        categoryGroup: 'PLAYER_2_SHOTS',
        adjustable: true,
        market: 'TIROS BANCA+ 90\'',
        selection: `${p2.name} ${p2.team} | ${adjP2Shots}.0+`,
        odd: p2.openShotsOdd,
        prob: p2.openShotsHitRate || 78,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'PLAYER_1_SOT',
        adjustable: true,
        market: 'TIROS AL ARCO BANCA+ 90\'',
        selection: `${p1.name} ${p1.team} | ${adjP1Sot + 1}.0+`,
        odd: 1.62,
        prob: 73,
        badge: 'BANCA+ 90\''
      },
      {
        categoryGroup: 'BTTS_MARKET',
        adjustable: false,
        market: 'AMBOS EQUIPOS ANOTAN',
        selection: 'Ambos Anotan: Sí',
        odd: 1.56,
        prob: stats.btts,
        badge: '90\''
      },
      {
        categoryGroup: 'PLAYER_3_SHOTS',
        adjustable: false,
        market: 'TIROS BANCA+ 90\'',
        selection: `${p3.name} ${p3.team} | ${p3.openShotsLine || 3}.0+`,
        odd: 1.48,
        prob: 74,
        badge: 'B+ 90\''
      }
    ],

    SONADOR: [
      {
        categoryGroup: 'PLAYER_2_HIGH_SHOTS',
        adjustable: true,
        market: 'TIROS BANCA+ 90\'',
        selection: `${p2.name} ${p2.team} | ${adjP2Shots + 1}.0+`,
        odd: 2.00,
        prob: 58,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'HOME_TEAM_HIGH_SOT',
        adjustable: true,
        market: `TOTAL DE TIROS AL ARCO ${match.homeTeam.name.toUpperCase()} 90'`,
        selection: `${match.homeTeam.name} | ${adjHomeSot + 1}.0+`,
        odd: 1.85,
        prob: 60,
        badge: '90\''
      },
      {
        categoryGroup: 'AWAY_TEAM_HIGH_SOT',
        adjustable: true,
        market: `TOTAL DE TIROS AL ARCO ${match.awayTeam.name.toUpperCase()} 90'`,
        selection: `${match.awayTeam.name} | ${adjAwaySot + 1}.0+`,
        odd: 2.05,
        prob: 56,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_GOALS',
        adjustable: false,
        market: `TOTAL DE GOLES ${match.homeTeam.name.toUpperCase()} ↑/↓ 90'`,
        selection: '↑ 2.5',
        odd: 1.82,
        prob: 62,
        badge: '90\''
      },
      {
        categoryGroup: 'AWAY_TEAM_GOALS',
        adjustable: false,
        market: `TOTAL DE GOLES ${match.awayTeam.name.toUpperCase()} ↑/↓ 90'`,
        selection: '↑ 1.5',
        odd: 1.86,
        prob: 60,
        badge: '90\''
      },
      {
        categoryGroup: 'PLAYER_1_HIGH_SOT',
        adjustable: true,
        market: 'TIROS AL ARCO BANCA+ 90\'',
        selection: `${p1.name} ${p1.team} | 2.0+`,
        odd: 1.95,
        prob: 57,
        badge: 'BANCA+ 90\''
      },
      {
        categoryGroup: 'ANYTIME_SCORER',
        adjustable: false,
        market: 'GOLEADOR BANCA+ 90\'',
        selection: `${p1.name} (${p1.team}) Anota Gol`,
        odd: 2.05,
        prob: 55,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        adjustable: true,
        market: 'GOLES TOTALES ↑/↓ 90\'',
        selection: '↑ 3.5',
        odd: 2.15,
        prob: 54,
        badge: '90\''
      },
      {
        categoryGroup: 'GK_HIGH_SAVES',
        adjustable: true,
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) | 4.0+`,
        odd: 2.10,
        prob: 55,
        badge: '90\''
      },
      {
        categoryGroup: 'HANDICAP_RESULT',
        adjustable: false,
        market: 'HÁNDICAP 90\'',
        selection: `${favTeam.name} -1.5`,
        odd: 2.35,
        prob: 50,
        badge: '90\''
      }
    ]
  };

  // En modo SEGURO ordenamos los mercados abiertos por mayor probabilidad real de acierto
  const rawList = [...(catalogByRisk[riskLevel] || catalogByRisk.SEGURO)];
  if (riskLevel === 'SEGURO') {
    rawList.sort((a, b) => b.prob - a.prob);
  }

  const seenGroups = new Set();
  const uniquePicks = [];

  for (const item of rawList) {
    if (!seenGroups.has(item.categoryGroup)) {
      seenGroups.add(item.categoryGroup);
      uniquePicks.push(item);
    }
    if (uniquePicks.length >= count) break;
  }

  return uniquePicks;
}

export default function BeatsBuilderView({
  allMatches,
  filteredMatches,
  selectedMatchIds,
  setSelectedMatchIds,
  deepDataMap,
  loadingDeepId,
  onEnsureDeepStats,
  onApplyPresetFilters,
  onSaveTicketToHistory,
  learningLogs = []
}) {
  const [riskLevel, setRiskLevel] = useState('SEGURO');
  const [picksPerMatch, setPicksPerMatch] = useState(1);
  const [customAutoCount, setCustomAutoCount] = useState(18);
  const [variantOffset, setVariantOffset] = useState({});
  // Permite subir o bajar medio/un punto cualquier línea si en Draftea cambió en vivo
  const [lineAdjustments, setLineAdjustments] = useState({});
  const [savedBanner, setSavedBanner] = useState(false);

  const isLockedToOnePick = selectedMatchIds.length > 5;
  const effectivePicksPerMatch = isLockedToOnePick ? 1 : picksPerMatch;

  useEffect(() => {
    let cancelled = false;
    const chosen = allMatches.filter((m) => selectedMatchIds.includes(m.id));

    const loadMissingDeepData = async () => {
      for (const m of chosen) {
        if (cancelled) break;
        if (!deepDataMap[m.id]) {
          await onEnsureDeepStats(m);
        }
      }
    };

    if (chosen.length > 0) {
      loadMissingDeepData();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedMatchIds, allMatches, deepDataMap, onEnsureDeepStats]);

  const handleToggleSelectMatch = (match) => {
    triggerHaptic('medium');
    setSelectedMatchIds((prev) =>
      prev.includes(match.id)
        ? prev.filter((id) => id !== match.id)
        : [...prev, match.id]
    );
  };

  const handleAdjustLine = (matchId, categoryGroup, delta) => {
    triggerHaptic('light');
    const key = `${matchId}_${categoryGroup}`;
    setLineAdjustments((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + delta
    }));
  };

  const handlePreset18EsMx = () => {
    triggerHaptic('success');
    onApplyPresetFilters(['LALIGA', 'LIGA_MX'], []);
    const targetMatches = allMatches
      .filter((m) => ['LALIGA', 'LIGA_MX'].includes(m.leagueId))
      .slice(0, 18);
    setSelectedMatchIds(targetMatches.map((m) => m.id));
    setRiskLevel('SEGURO');
  };

  const handlePreset2BigGames = () => {
    triggerHaptic('success');
    const top2 = filteredMatches.slice(0, 2);
    setSelectedMatchIds(top2.map((m) => m.id));
    setPicksPerMatch(4);
    setRiskLevel('SEGURO');
  };

  const handlePreset22Dreamer = () => {
    triggerHaptic('success');
    onApplyPresetFilters([], []);
    setSelectedMatchIds(allMatches.slice(0, 22).map((m) => m.id));
    setRiskLevel('SEGURO');
  };

  const handleAutoPickFromActiveFilters = () => {
    triggerHaptic('success');
    const desired = Math.max(1, Math.min(26, Number(customAutoCount) || 18));
    const pool = filteredMatches.slice(0, desired).map((m) => m.id);
    setSelectedMatchIds(pool);
  };

  const handleCycleMatchPick = (matchId) => {
    triggerHaptic('light');
    setVariantOffset((prev) => ({
      ...prev,
      [matchId]: ((prev[matchId] || 0) + 1) % 6
    }));
  };

  const generatedTicket = useMemo(() => {
    const chosenMatches = allMatches.filter((m) => selectedMatchIds.includes(m.id));
    const allLegs = [];
    const groupedByMatch = [];

    chosenMatches.forEach((match) => {
      const deep = deepDataMap[match.id];
      const isLoadingThis = loadingDeepId === match.id || !deep;
      const offset = variantOffset[match.id] || 0;
      const basePool = buildUniqueCategorizedPicks(
        match,
        deep,
        10,
        riskLevel,
        isLoadingThis,
        learningLogs,
        lineAdjustments
      );

      const picks =
        effectivePicksPerMatch === 1
          ? [basePool[offset % basePool.length]]
          : basePool.slice(0, effectivePicksPerMatch);

      const matchLegs = picks.map((pk, idx) => {
        const legObj = {
          legId: `${match.id}-${idx}`,
          matchId: match.id,
          leagueSlug: match.leagueSlug || 'esp.1',
          matchTitle: `${match.homeTeam.short} vs ${match.awayTeam.short}`,
          fullMatchTitle: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          leagueName: match.leagueName,
          date: match.date,
          time: match.time,
          homeLogo: match.homeTeam.logo,
          awayLogo: match.awayTeam.logo,
          ...pk
        };
        allLegs.push(legObj);
        return legObj;
      });

      groupedByMatch.push({
        match,
        legs: matchLegs
      });
    });

    const totalOdd = allLegs.reduce((acc, leg) => acc * leg.odd, 1);
    const avgLegProb =
      allLegs.length > 0
        ? allLegs.reduce((acc, leg) => acc + leg.prob, 0) / allLegs.length
        : 0;

    const ticketHitProbability =
      allLegs.length > 0
        ? Math.max(
            4,
            Math.round(avgLegProb * Math.pow(0.965, Math.max(0, allLegs.length - 1)))
          )
        : 0;

    return {
      matchesCount: chosenMatches.length,
      legs: allLegs,
      groupedByMatch,
      totalOdd: totalOdd.toFixed(2),
      avgLegProb: avgLegProb.toFixed(1),
      ticketHitProbability
    };
  }, [
    allMatches,
    selectedMatchIds,
    deepDataMap,
    loadingDeepId,
    effectivePicksPerMatch,
    riskLevel,
    variantOffset,
    learningLogs,
    lineAdjustments
  ]);

  const handleSaveTicket = () => {
    if (generatedTicket.legs.length === 0) return;
    triggerHaptic('success');

    const categoryLabel =
      generatedTicket.legs.length >= 15 || riskLevel === 'SONADOR'
        ? 'SONADOR'
        : riskLevel;

    onSaveTicketToHistory({
      id: `tk-${Date.now()}`,
      createdAt: `${new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short'
      })}`,
      title:
        generatedTicket.matchesCount > 5
          ? `Beat (${generatedTicket.matchesCount} Partidos • ${generatedTicket.legs.length} Picks)`
          : `Bet Builder (${generatedTicket.matchesCount} Juegos • ${effectivePicksPerMatch} Mercados c/u)`,
      category: categoryLabel,
      totalOdd: generatedTicket.totalOdd,
      avgLegProb: generatedTicket.avgLegProb,
      ticketProb: generatedTicket.ticketHitProbability,
      status: 'PENDING',
      archived: false,
      legs: generatedTicket.legs.map((l) => ({
        ...l,
        hit: null
      }))
    });

    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
            CONSTRUCTOR DE BEATS
          </h2>

          {selectedMatchIds.length > 0 && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setSelectedMatchIds([]);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Limpiar ({selectedMatchIds.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handlePreset18EsMx}
            className="p-2.5 rounded-xl bg-gradient-to-br from-purple-900/40 to-[#0b0d13] border border-purple-500/40 hover:border-purple-400 text-center transition-all cursor-pointer"
          >
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500 text-white block w-fit mx-auto">
              18 JUEGOS
            </span>
            <p className="text-[11px] sm:text-xs font-extrabold text-white mt-1.5 truncate">
              España + México
            </p>
          </button>

          <button
            onClick={handlePreset2BigGames}
            className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-900/35 to-[#0b0d13] border border-emerald-500/40 hover:border-emerald-400 text-center transition-all cursor-pointer"
          >
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-black block w-fit mx-auto">
              BET BUILDER
            </span>
            <p className="text-[11px] sm:text-xs font-extrabold text-white mt-1.5 truncate">
              2 Juegos • 4 Picks
            </p>
          </button>

          <button
            onClick={handlePreset22Dreamer}
            className="p-2.5 rounded-xl bg-gradient-to-br from-amber-900/30 to-[#0b0d13] border border-amber-500/40 hover:border-amber-400 text-center transition-all cursor-pointer"
          >
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black block w-fit mx-auto">
              ESCALERA
            </span>
            <p className="text-[11px] sm:text-xs font-extrabold text-white mt-1.5 truncate">
              22 Partidos
            </p>
          </button>
        </div>

        <div className="bg-[#0b0d13] border border-gray-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-gray-300">
            Auto-armar ({filteredMatches.length} disp.):
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              max="26"
              value={customAutoCount}
              onChange={(e) => setCustomAutoCount(e.target.value)}
              className="w-12 bg-[#141824] border border-gray-700 rounded-lg px-1.5 py-1 text-xs font-black text-center text-white"
            />
            <button
              onClick={handleAutoPickFromActiveFilters}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-lg cursor-pointer"
            >
              Armar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase text-gray-400">
                MERCADOS POR PARTIDO
              </span>
              <span className="text-xs font-black text-purple-400">
                {effectivePicksPerMatch} / juego
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              disabled={isLockedToOnePick}
              value={effectivePicksPerMatch}
              onChange={(e) => {
                triggerHaptic('light');
                setPicksPerMatch(Number(e.target.value));
              }}
              className="w-full accent-purple-500 cursor-pointer disabled:opacity-40"
            />
          </div>

          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-extrabold uppercase text-gray-400">
                NIVEL
              </span>
              <span className="text-[10px] font-black text-emerald-400">
                {generatedTicket.avgLegProb}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'SEGURO', label: 'Seguro' },
                { id: 'ARRIESGADO', label: 'Arriesgado' },
                { id: 'SONADOR', label: 'Soñador' }
              ].map((lvl) => {
                const active = riskLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setRiskLevel(lvl.id);
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-extrabold text-center transition-all cursor-pointer ${
                      active
                        ? 'bg-purple-600/25 border-purple-400 text-white'
                        : 'bg-[#141824] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE PARTIDOS + BOLETO CALIBRADO CON DRAFTEA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-extrabold uppercase text-gray-400">
              PARTIDOS ({filteredMatches.length})
            </span>
            <span className="text-[10px] font-bold text-purple-400">
              {selectedMatchIds.length} seleccionados
            </span>
          </div>

          <div className="space-y-1.5 max-h-[420px] sm:max-h-[540px] overflow-y-auto pr-1">
            {filteredMatches.map((match) => {
              const isSelected = selectedMatchIds.includes(match.id);
              const selectionIndex = selectedMatchIds.indexOf(match.id) + 1;

              return (
                <div
                  key={match.id}
                  onClick={() => handleToggleSelectMatch(match)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500'
                      : 'bg-[#141824] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 mb-1">
                      <span className="font-bold text-purple-300 truncate">{match.leagueName}</span>
                      <span>•</span>
                      <span className="shrink-0">{match.date} • {match.time.split(' ')[0]}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                      <span className="text-xs font-extrabold text-white truncate">
                        {match.homeTeam.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">vs</span>
                      <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                      <span className="text-xs font-extrabold text-white truncate">
                        {match.awayTeam.name}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-[#0b0d13] text-gray-500 border-gray-700'
                    }`}
                  >
                    {isSelected ? selectionIndex : '+'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#090b10] border-2 border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-[#0e121a] p-3.5 border-b border-gray-800/80 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs font-black italic tracking-widest text-white uppercase">
                MI ENTRADA
              </span>
              {loadingDeepId && (
                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[9px] text-gray-400 block uppercase">Partidos / Picks</span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {generatedTicket.matchesCount} / {generatedTicket.legs.length}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 block uppercase">Momio</span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {generatedTicket.totalOdd}x
                </span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 block uppercase">Nivel</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400">
                  {riskLevel}
                </span>
              </div>
            </div>
          </div>

          {generatedTicket.groupedByMatch.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs font-bold text-gray-500">Sin selecciones</p>
            </div>
          ) : (
            <div className="p-3.5 divide-y divide-gray-800/80 max-h-[480px] overflow-y-auto">
              {generatedTicket.groupedByMatch.map(({ match, legs }) => (
                <div key={match.id} className="py-3 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-400">
                      {match.date} ({match.time.split(' ')[0]}) • {match.leagueName}
                    </span>
                    {effectivePicksPerMatch === 1 && (
                      <button
                        onClick={() => handleCycleMatchPick(match.id)}
                        className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Cambiar
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 mb-2.5">
                    <div className="flex items-center gap-2">
                      <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                      <span className="text-xs font-bold text-white">{match.homeTeam.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                      <span className="text-xs font-bold text-white">{match.awayTeam.name}</span>
                    </div>
                  </div>

                  <div className="ml-2 pl-3.5 border-l-2 border-dashed border-gray-700 space-y-2.5">
                    {legs.map((leg) => (
                      <div key={leg.legId} className="relative">
                        <span className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-[#090b10] border-2 border-gray-500" />

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">
                                {leg.market}
                              </span>
                              <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-gray-800 text-gray-300 shrink-0">
                                {leg.badge}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-white mt-0.5">
                              {leg.selection}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Botones [-] y [+] para calibrar cualquier línea en 1 clic si Draftea la movió */}
                            {leg.adjustable && (
                              <div className="flex items-center gap-0.5 bg-[#141824] border border-gray-700 rounded-md p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustLine(match.id, leg.categoryGroup, -1)}
                                  className="p-0.5 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustLine(match.id, leg.categoryGroup, 1)}
                                  className="p-0.5 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}

                            <span className="text-xs font-bold text-emerald-400 min-w-[36px] text-right">
                              {leg.odd.toFixed(2)}x
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {generatedTicket.legs.length > 0 && (
            <div className="p-3 bg-[#141824] border-t border-gray-800">
              <button
                onClick={handleSaveTicket}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{savedBanner ? 'GUARDADO EN HISTORIAL' : 'GUARDAR ENTRADA'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}