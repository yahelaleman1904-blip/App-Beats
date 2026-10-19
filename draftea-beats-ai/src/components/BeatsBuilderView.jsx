// src/components/BeatsBuilderView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  BookmarkCheck,
  Loader2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

function analyzeMatchByMatchMetrics(match, deepData, learningLogs = []) {
  const recentHome = deepData?.recentMatches?.home || [];
  const recentAway = deepData?.recentMatches?.away || [];
  const stats = deepData?.statsL10 || match.statsL10;

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

  const teamFailedSotBefore = teamSpecificLogs.some(
    (l) =>
      l.outcome === 'FAIL' &&
      (l.marketType?.includes('TIROS AL ARCO') || l.tag?.includes('TIROS AL ARCO'))
  );

  const homeSotList = recentHome.map((m) => Number(m._mySoT ?? m.stats?.sot?.[0] ?? 4));
  const awaySotList = recentAway.map((m) => Number(m._mySoT ?? m.stats?.sot?.[1] ?? 3));
  const homeShotsList = recentHome.map((m) => Number(m._myShots ?? m.stats?.shots?.[0] ?? 12));

  const calcSafeFloor = (arr, fallback, maxCap) => {
    if (!arr || arr.length === 0) return Math.min(maxCap, fallback);
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = sorted.length >= 4 ? 1 : 0;
    const rawFloor = Math.max(2, sorted[idx]);
    return Math.min(maxCap, rawFloor);
  };

  const rawSafeHomeSot = calcSafeFloor(homeSotList, 4, 5);
  const safeHomeSotLine = teamFailedSotBefore
    ? Math.max(2, rawSafeHomeSot - 1)
    : rawSafeHomeSot;

  const safeAwaySotLine = calcSafeFloor(awaySotList, 3, 4);
  const safeHomeShotsLine = calcSafeFloor(homeShotsList, 10, 12);

  const allRecent = [...recentHome, ...recentAway];
  const gamesOneGoalOrLess = allRecent.filter(
    (m) => (m._totalGoals ?? m.homeScore + m.awayScore) <= 1
  ).length;

  return {
    safeHomeSotLine,
    safeAwaySotLine,
    safeHomeShotsLine,
    isHighRiskUnder: gamesOneGoalOrLess >= 3 || teamFailedGoalsBefore,
    stats
  };
}

function buildUniqueCategorizedPicks(match, deepData, count, riskLevel, isLoadingThisMatch, learningLogs = []) {
  const mMetrics = analyzeMatchByMatchMetrics(match, deepData, learningLogs);
  const stats = mMetrics.stats;
  const tactical = deepData?.tacticalAnalysis;
  const players =
    deepData?.keyPlayers?.length > 0 ? deepData.keyPlayers : match.keyPlayers || [];
  const gks = deepData?.goalkeepers || [];

  const validPlayers = players
    .filter(
      (p) =>
        p.name &&
        !p.name.includes('Referente') &&
        !p.name.includes('Titular') &&
        !p.name.includes('Goleador')
    )
    .map((p) => {
      const logs = p.matchLogs || [];
      const gamesWith1SoT = logs.filter((l) => l.sot >= 1).length;
      return {
        ...p,
        gamesWith1SoT,
        consistencyScore:
          (p.rotationStatus === 'TITULAR' ? 10 : 0) +
          gamesWith1SoT * 3 +
          (p.isHome ? 2 : 0)
      };
    })
    .sort((a, b) => b.consistencyScore - a.consistencyScore);

  const p1 = validPlayers[0] || {
    name: isLoadingThisMatch
      ? `Cargando ${match.homeTeam.short}...`
      : `${match.homeTeam.name}`,
    team: match.homeTeam.short,
    avgSoT: 1.5,
    avgShots: 3.1,
    l10HitRate: 88
  };

  const p2 = validPlayers[1] || {
    name: isLoadingThisMatch
      ? `Cargando ${match.awayTeam.short}...`
      : `${match.awayTeam.name}`,
    team: match.awayTeam.short,
    avgSoT: 1.2,
    avgShots: 2.6,
    l10HitRate: 84
  };

  const p3 = validPlayers[2] || p1;

  const gk1 = gks[0] || {
    name: isLoadingThisMatch
      ? `Portero ${match.awayTeam.short}`
      : `Portero (${match.awayTeam.short})`,
    team: match.awayTeam.short,
    avgSaves: 3.0
  };

  const isParkTheBus =
    tactical?.home?.parkTheBusRisk ||
    tactical?.away?.parkTheBusRisk ||
    mMetrics.isHighRiskUnder;

  const catalogByRisk = {
    SEGURO: [
      {
        categoryGroup: 'PLAYER_1_SOT',
        market: 'TIROS AL ARCO B+ 90\'',
        selection: `${p1.name} ${p1.team} | 1.0+`,
        odd: 1.28,
        prob: p1.l10HitRate || 90,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        market: 'GOLES TOTALES 90\'',
        selection: isParkTheBus ? '↑ 0.5' : '↑ 1.5',
        odd: isParkTheBus ? 1.10 : 1.24,
        prob: isParkTheBus ? stats.over05Goals : stats.over15Goals,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        market: 'TOTAL DE TIROS AL ARCO 90\'',
        selection: `${match.homeTeam.name} | ${mMetrics.safeHomeSotLine}.0+`,
        odd: 1.30,
        prob: 89,
        badge: '90\''
      },
      {
        categoryGroup: 'PLAYER_2_SHOTS',
        market: 'TIROS B+ 90\'',
        selection: `${p2.name} ${p2.team} | 2.0+`,
        odd: 1.31,
        prob: 87,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SHOTS',
        market: 'TOTAL DE TIROS EQUIPO 90\'',
        selection: `${match.homeTeam.name} | ${mMetrics.safeHomeShotsLine}.0+`,
        odd: 1.27,
        prob: 88,
        badge: '90\''
      },
      {
        categoryGroup: 'GK_SAVES',
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) | 2.0+`,
        odd: 1.28,
        prob: 87,
        badge: '90\''
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 7.5 Tiros de Esquina',
        odd: 1.25,
        prob: 86,
        badge: '90\''
      },
      {
        categoryGroup: 'DOUBLE_CHANCE',
        market: 'DOBLE OPORTUNIDAD 90\'',
        selection: `${match.homeTeam.name} Gana o Empata`,
        odd: 1.22,
        prob: 89,
        badge: '90\''
      },
      {
        categoryGroup: 'FIRST_HALF_GOALS',
        market: 'GOLES 1RA MITAD',
        selection: '1ra Mitad ↑ 0.5',
        odd: 1.34,
        prob: 83,
        badge: '1T'
      },
      {
        categoryGroup: 'TOTAL_CARDS',
        market: 'TARJETAS TOTALES 90\'',
        selection: '↑ 2.5 Tarjetas',
        odd: 1.24,
        prob: 88,
        badge: '90\''
      }
    ],

    ARRIESGADO: [
      {
        categoryGroup: 'PLAYER_1_SOT',
        market: 'TIROS AL ARCO B+ 90\'',
        selection: `${p1.name} ${p1.team} | ${p1.avgSoT >= 1.9 ? '2.0+' : '1.0+'}`,
        odd: p1.avgSoT >= 1.9 ? 1.58 : 1.38,
        prob: 79,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        market: 'GOLES TOTALES 90\'',
        selection: isParkTheBus ? '↑ 1.5' : '↑ 2.5',
        odd: isParkTheBus ? 1.38 : 1.58,
        prob: isParkTheBus ? stats.over15Goals : stats.over25Goals,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        market: 'TOTAL DE TIROS AL ARCO 90\'',
        selection: `${match.homeTeam.name} | ${Math.min(6, mMetrics.safeHomeSotLine + 1)}.0+`,
        odd: 1.48,
        prob: 77,
        badge: '90\''
      },
      {
        categoryGroup: 'PLAYER_2_SOT',
        market: 'TIROS AL ARCO B+ 90\'',
        selection: `${p2.name} ${p2.team} | 1.0+`,
        odd: 1.46,
        prob: 76,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'MONEYLINE_PA',
        market: 'GANA PA 90\'',
        selection: `${match.homeTeam.name}`,
        odd: 1.58,
        prob: 74,
        badge: 'PA 90\''
      },
      {
        categoryGroup: 'BTTS_MARKET',
        market: 'AMBOS EQUIPOS ANOTAN',
        selection: 'Ambos Anotan: Sí',
        odd: 1.62,
        prob: stats.btts,
        badge: '90\''
      },
      {
        categoryGroup: 'GK_SAVES',
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) | 3.0+`,
        odd: 1.56,
        prob: 75,
        badge: '90\''
      },
      {
        categoryGroup: 'AWAY_TEAM_SOT',
        market: 'TOTAL DE TIROS AL ARCO VISITA 90\'',
        selection: `${match.awayTeam.name} | ${mMetrics.safeAwaySotLine}.0+`,
        odd: 1.50,
        prob: 76,
        badge: '90\''
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 9.5 Tiros de Esquina',
        odd: 1.62,
        prob: 73,
        badge: '90\''
      },
      {
        categoryGroup: 'PLAYER_3_SHOTS',
        market: 'TIROS B+ 90\'',
        selection: `${p3.name} ${p3.team} | 3.0+`,
        odd: 1.55,
        prob: 74,
        badge: 'B+ 90\''
      }
    ],

    SONADOR: [
      {
        categoryGroup: 'PLAYER_1_HIGH_SOT',
        market: 'TIROS AL ARCO B+ 90\'',
        selection: `${p1.name} ${p1.team} | 2.0+`,
        odd: 2.05,
        prob: 58,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'ANYTIME_SCORER',
        market: 'GOLEADOR B+ 90\'',
        selection: `${p1.name} (${p1.team}) Anota Gol`,
        odd: 2.15,
        prob: 56,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        market: 'GOLES TOTALES 90\'',
        selection: '↑ 2.5',
        odd: 1.95,
        prob: stats.over25Goals,
        badge: '90\''
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        market: 'TOTAL DE TIROS AL ARCO 90\'',
        selection: `${match.homeTeam.name} | 6.0+`,
        odd: 1.98,
        prob: 57,
        badge: '90\''
      },
      {
        categoryGroup: 'PLAYER_2_SOT',
        market: 'TIROS AL ARCO B+ 90\'',
        selection: `${p2.name} ${p2.team} | 2.0+`,
        odd: 2.20,
        prob: 53,
        badge: 'B+ 90\''
      },
      {
        categoryGroup: 'GK_HIGH_SAVES',
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) | 4.0+`,
        odd: 2.10,
        prob: 55,
        badge: '90\''
      },
      {
        categoryGroup: 'RESULT_AND_BTTS',
        market: 'GANA PA + AMBOS ANOTAN',
        selection: `Gana ${match.homeTeam.short} y Ambos Anotan`,
        odd: 2.65,
        prob: 48,
        badge: '90\''
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 10.5 Tiros de Esquina',
        odd: 2.15,
        prob: 52,
        badge: '90\''
      },
      {
        categoryGroup: 'FIRST_HALF_GOALS',
        market: 'GOLES 1RA MITAD',
        selection: '1ra Mitad ↑ 1.5',
        odd: 2.25,
        prob: 51,
        badge: '1T'
      },
      {
        categoryGroup: 'HANDICAP_RESULT',
        market: 'HÁNDICAP 90\'',
        selection: `${match.homeTeam.name} -1.5`,
        odd: 2.35,
        prob: 50,
        badge: '90\''
      }
    ]
  };

  const rawList = catalogByRisk[riskLevel] || catalogByRisk.SEGURO;
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
        learningLogs
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
    learningLogs
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
      {/* PANEL DE CONTROL COMPACTO (3 COLUMNAS EN MÓVIL Y PC) */}
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

        {/* 3 BOTONES EN FILA HORIZONTAL TAMBIÉN EN TELÉFONO */}
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

        {/* AUTO-ARMAR COMPACTO */}
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

        {/* CONTROLES DE MERCADOS Y NIVEL (SOLO TÍTULOS) */}
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

      {/* LISTA DE PARTIDOS + BOLETO */}
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

        {/* MI ENTRADA ESTILO DRAFTEA */}
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
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                {leg.market}
                              </span>
                              <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-gray-800 text-gray-300">
                                {leg.badge}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-white mt-0.5">
                              {leg.selection}
                            </p>
                          </div>

                          <span className="text-xs font-bold text-gray-300 shrink-0">
                            {leg.odd.toFixed(2)}x
                          </span>
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