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

function buildContextualDrafteaPredictions(
  match,
  deepData,
  count,
  riskLevel,
  isLoadingThisMatch,
  learningLogs = [],
  lineAdjustments = {}
) {
  const recentHome = deepData?.recentMatches?.home || [];
  const recentAway = deepData?.recentMatches?.away || [];
  const allRecent = [...recentHome, ...recentAway];
  const stats = deepData?.statsL10 || match.statsL10 || {};
  const tactical = deepData?.tacticalAnalysis;
  const players =
    deepData?.keyPlayers?.length > 0 ? deepData.keyPlayers : match.keyPlayers || [];
  const gks = deepData?.goalkeepers || [];

  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;
  const homeShort = match.homeTeam.short;
  const awayShort = match.awayTeam.short;

  // 1. MEMORIA EVOLUTIVA POR CLUB INDIVIDUAL (SIN VETO: en reserva hasta que las estadísticas favorezcan el mercado)
  const matchClubLogs = (clubNameStr, clubShortStr) => {
    const cName = (clubNameStr || '').toLowerCase();
    const cShort = (clubShortStr || '').toLowerCase();
    return learningLogs.filter((log) => {
      if (!Array.isArray(log.targetTeams) || log.targetTeams.length === 0) return false;
      return log.targetTeams.some(
        (kw) =>
          (kw.length >= 3 && cName.includes(kw)) ||
          cShort === kw ||
          (log.clubName && log.clubName.toLowerCase().includes(cName.slice(0, 5)))
      );
    });
  };

  const homeClubMemory = matchClubLogs(homeName, homeShort);
  const awayClubMemory = matchClubLogs(awayName, awayShort);

  const awayConcedesGoalsAvg =
    recentAway.length > 0
      ? recentAway.reduce((acc, m) => acc + Number(m._oppGoals ?? 1.2), 0) / recentAway.length
      : 1.3;
  const homeConcedesGoalsAvg =
    recentHome.length > 0
      ? recentHome.reduce((acc, m) => acc + Number(m._oppGoals ?? 1.0), 0) / recentHome.length
      : 1.1;

  const homeOpponentWeaknessBonus = awayConcedesGoalsAvg >= 1.5 ? 6 : 0;
  const awayOpponentWeaknessBonus = homeConcedesGoalsAvg >= 1.5 ? 6 : 0;

  const evaluateClubLearnedEdge = (
    clubMemoryList,
    marketKeyword,
    isPlayingAtHome,
    opponentVulnerabilityBonus = 0
  ) => {
    let wins = 0;
    let fails = 0;

    clubMemoryList.forEach((log) => {
      const mText = `${log.marketType || ''} ${log.tag || ''}`.toUpperCase();
      if (!mText.includes(marketKeyword)) return;
      if (log.outcome === 'WIN') wins += 1;
      else if (log.outcome === 'FAIL') fails += 1;
    });

    const total = wins + fails;
    if (total === 0) {
      return { probShift: opponentVulnerabilityBonus, lineShift: 0 };
    }

    const empiricalWinRate = (wins / total) * 100;
    const localBonus = isPlayingAtHome ? 4 : 0;

    // Si ha fallado antes, reduce temporalmente la prioridad para no usarlo en partidos dudosos;
    // pero si hoy las estadísticas L5 + debilidad del rival + localía son muy altas, vuelve a activarse sin veto.
    let rawShift =
      Math.round((empiricalWinRate - 68) * 0.38) + localBonus + opponentVulnerabilityBonus;

    if (fails > wins && opponentVulnerabilityBonus >= 5 && isPlayingAtHome) {
      rawShift += 6;
    }

    const lineShift = fails > wins ? -1 : 0;

    return {
      probShift: Math.max(-18, Math.min(18, rawShift)),
      lineShift
    };
  };

  const getMemoryModifier = (marketKeyword, side = 'BOTH') => {
    if (side === 'HOME') {
      return evaluateClubLearnedEdge(
        homeClubMemory,
        marketKeyword,
        true,
        homeOpponentWeaknessBonus
      ).probShift;
    }
    if (side === 'AWAY') {
      return evaluateClubLearnedEdge(
        awayClubMemory,
        marketKeyword,
        false,
        awayOpponentWeaknessBonus
      ).probShift;
    }
    const hEdge = evaluateClubLearnedEdge(
      homeClubMemory,
      marketKeyword,
      true,
      homeOpponentWeaknessBonus
    ).probShift;
    const aEdge = evaluateClubLearnedEdge(
      awayClubMemory,
      marketKeyword,
      false,
      awayOpponentWeaknessBonus
    ).probShift;
    return Math.round((hEdge + aEdge) / 2);
  };

  const getLearnedLineShift = (marketKeyword, side = 'HOME') => {
    if (side === 'HOME') {
      return evaluateClubLearnedEdge(
        homeClubMemory,
        marketKeyword,
        true,
        homeOpponentWeaknessBonus
      ).lineShift;
    }
    return evaluateClubLearnedEdge(
      awayClubMemory,
      marketKeyword,
      false,
      awayOpponentWeaknessBonus
    ).lineShift;
  };

  const getAdj = (groupKey) => Number(lineAdjustments[`${match.id}_${groupKey}`] || 0);

  // 2. Secuencias L5 Globales
  const homeSotSeq = recentHome.map((m) => Number(m._mySoT ?? m.stats?.sot?.[0] ?? 5));
  const awaySotSeq = recentAway.map((m) => Number(m._mySoT ?? m.stats?.sot?.[1] ?? 4));
  const homeShotsSeq = recentHome.map((m) => Number(m._myShots ?? m.stats?.shots?.[0] ?? 13));
  const homeGoalsSeq = recentHome.map((m) => Number(m._myGoals ?? m.homeScore ?? 1));
  const awayGoalsSeq = recentAway.map((m) => Number(m._myGoals ?? m.awayScore ?? 1));

  const totalGoalsSeq = allRecent.map(
    (m) => Number(m._totalGoals ?? (m.homeScore || 0) + (m.awayScore || 0))
  );
  const totalCornersSeq = allRecent.map((m) => {
    const cArr = m.stats?.corners || [5, 4];
    return Number(cArr[0] || 0) + Number(cArr[1] || 0);
  });
  const totalCardsSeq = allRecent.map((m) => {
    const kArr = m.stats?.cards || [2, 2];
    return Number(kArr[0] || 0) + Number(kArr[1] || 0);
  });

  const calcRealHitPct = (seq, minTarget, fallbackPct) => {
    if (!seq || seq.length === 0) return fallbackPct;
    const hits = seq.filter((val) => val >= minTarget).length;
    return Math.round((hits / seq.length) * 100);
  };

  const homeSoTAvg = stats.homeSoTAvg || 5.2;
  const awaySoTAvg = stats.awaySoTAvg || 4.0;
  const homeShotsAvg = stats.homeShotsAvg || 13.5;
  const expectedGoals =
    stats.expectedTotalGoals || (stats.homeGoalsAvg || 1.5) + (stats.awayGoalsAvg || 1.2);
  const combinedCardsAvg = (stats.homeCardsAvg || 2.2) + (stats.awayCardsAvg || 2.3);
  const combinedCornersAvg = stats.cornersAvg || 9.4;

  const isOver15Locked =
    Boolean(stats.isOver15Locked) ||
    (stats.over25Goals ?? 0) >= 65 ||
    expectedGoals >= 2.75;

  const isParkTheBus =
    tactical?.home?.parkTheBusRisk ||
    tactical?.away?.parkTheBusRisk ||
    totalGoalsSeq.filter((g) => g <= 1).length >= 4;

  const winProbHome = stats.winProbHome ?? 48;
  const winProbAway = stats.winProbAway ?? 26;
  const winProbDraw = stats.winProbDraw ?? 26;
  const favIsHome = winProbHome >= winProbAway;
  const favTeam = favIsHome ? match.homeTeam : match.awayTeam;
  const favWinProb = Math.max(winProbHome, winProbAway);

  const isHighTensionMatch =
    combinedCardsAvg >= 4.6 ||
    [
      'LALIGA',
      'LIBERTADORES',
      'SUDAMERICANA',
      'ARGENTINA',
      'LIGA_MX',
      'SERIE_A',
      'COPA_DEL_REY'
    ].includes(match.leagueId);

  // 3. Filtro de jugadores: descarta lesionados/bajas y suplentes habituales
  const evaluatedPlayers = players
    .filter(
      (p) =>
        p.name &&
        !p.isInjuredOrOut &&
        p.rotationStatus !== 'ROTACION' &&
        !p.name.includes('Referente') &&
        !p.name.includes('Titular') &&
        !p.name.includes('Goleador')
    )
    .map((p) => {
      const avgSh = Number(p.avgShots || 2.4);
      const avgSot = Number(p.avgSoT || 1.2);
      const logs = p.matchLogs || [];

      const openShotsLine =
        p.openShotsLine || (avgSh >= 3.1 ? Math.max(3, Math.floor(avgSh)) : avgSh >= 1.9 ? 2 : 1);
      const openSoTLine = p.openSoTLine || (avgSot >= 1.95 ? 2 : 1);

      const hitsAtOpenShots =
        logs.length > 0
          ? logs.filter((l) => l.shots >= openShotsLine).length
          : Math.round((p.openShotsHitRate || 80) / 20);
      const hitsAtOpenSoT =
        logs.length > 0
          ? logs.filter((l) => l.sot >= openSoTLine).length
          : Math.round((p.openSoTHitRate || 82) / 20);

      const gms = Math.max(1, logs.length || p.gamesLast5 || 5);
      const realShotsProb = Math.round((hitsAtOpenShots / gms) * 100);
      const realSoTProb = Math.round((hitsAtOpenSoT / gms) * 100);

      const playerSide = p.team === homeShort ? 'HOME' : 'AWAY';
      const clubEdge = getMemoryModifier('JUGADOR', playerSide);

      return {
        ...p,
        openShotsLine,
        openSoTLine,
        openShotsOdd: p.openShotsOdd || (openShotsLine >= 3 ? 1.36 : 1.31),
        openSoTOdd: p.openSoTOdd || (openSoTLine >= 2 ? 1.44 : 1.29),
        realShotsProb: Math.min(95, Math.max(50, realShotsProb + clubEdge)),
        realSoTProb: Math.min(95, Math.max(50, realSoTProb + clubEdge))
      };
    });

  const bestSoTPlayers = [...evaluatedPlayers].sort((a, b) => b.realSoTProb - a.realSoTProb);
  const bestTotalShotsPlayers = [...evaluatedPlayers].sort(
    (a, b) => b.realShotsProb - a.realShotsProb
  );

  const topSotPlayer = bestSoTPlayers[0];
  const secondSotPlayer = bestSoTPlayers[1];
  const topTotalShotsPlayer =
    bestTotalShotsPlayers.find((p) => p.name !== topSotPlayer?.name) ||
    bestTotalShotsPlayers[0];

  const gk1 = gks[0];

  const candidateMarkets = [];
  const favSideTag = favIsHome ? 'HOME' : 'AWAY';

  // A. DOBLE OPORTUNIDAD 90'
  const dcProb = favIsHome ? winProbHome + winProbDraw : winProbAway + winProbDraw;
  const dcSelection =
    Math.abs(winProbHome - winProbAway) <= 12
      ? `${homeShort}/${awayShort}`
      : favIsHome
      ? `${homeShort}/EMPATE`
      : `${awayShort}/EMPATE`;
  const dcOdd =
    Math.abs(winProbHome - winProbAway) <= 12
      ? 1.19
      : favIsHome
      ? stats.dcHomeDrawOdd ?? 1.23
      : stats.dcAwayDrawOdd ?? 1.34;

  candidateMarkets.push({
    categoryGroup: 'DOUBLE_CHANCE',
    adjustable: false,
    market: 'DOBLE OPORTUNIDAD 90\'',
    selection: dcSelection,
    odd: dcOdd,
    prob: Math.min(95, Math.max(52, dcProb + getMemoryModifier('DOBLE', favSideTag))),
    badge: '90\''
  });

  // B. MONEY LINE PAGO ANTICIPADO POR 1 GOL PA(1) 90'
  const favFirstGoalProb = favIsHome
    ? stats.homeFirstGoalProb ?? 56
    : stats.awayFirstGoalProb ?? 42;
  const pa1Prob = Math.round(favWinProb * 0.55 + favFirstGoalProb * 0.45) + 14;
  const pa1Odd = favIsHome ? stats.pa1HomeOdd ?? 1.25 : stats.pa1AwayOdd ?? 1.52;

  candidateMarkets.push({
    categoryGroup: 'MONEYLINE_PA1',
    adjustable: false,
    market: 'MONEY LINE (PAGO ANTICIPADO POR 1 GOL) PA(1) 90\'',
    selection: `${favTeam.short} (${favTeam.name})`,
    odd: pa1Odd,
    prob: Math.min(94, Math.max(52, pa1Prob + getMemoryModifier('PA', favSideTag))),
    badge: 'PA(1) 90\''
  });

  // C. TARJETAS TOTALES 90'
  const baseCardLine =
    (combinedCardsAvg >= 4.8 ? 3.5 : 2.5) + getAdj('TOTAL_CARDS');
  const cardsHitPct = calcRealHitPct(
    totalCardsSeq,
    Math.ceil(baseCardLine),
    isHighTensionMatch ? 89 : 74
  );
  const tensionBonus = isHighTensionMatch ? 6 : -4;

  candidateMarkets.push({
    categoryGroup: 'TOTAL_CARDS',
    adjustable: true,
    market: 'TARJETAS TOTALES 90\'',
    selection: `↑ ${baseCardLine.toFixed(1)} Tarjetas`,
    odd: Number((1.28 + getAdj('TOTAL_CARDS') * 0.22).toFixed(2)),
    prob: Math.min(95, Math.max(50, cardsHitPct + tensionBonus + getMemoryModifier('TARJETAS'))),
    badge: '90\''
  });

  // D. TOTAL DE GOLES POR EQUIPO LOCAL / VISITANTE
  const homeTeamOpenGoalLine = Math.max(
    0.5,
    (stats.drafteaHomeTeamGoalLine || (stats.homeGoalsAvg >= 1.65 ? 1.5 : 0.5)) +
      getAdj('HOME_TEAM_GOALS')
  );
  const homeTeamGoalHits = calcRealHitPct(
    homeGoalsSeq,
    Math.ceil(homeTeamOpenGoalLine),
    stats.homeGoalsAvg >= 1.8 ? 86 : 78
  );

  candidateMarkets.push({
    categoryGroup: 'HOME_TEAM_GOALS',
    adjustable: true,
    market: `TOTAL DE GOLES ${homeName.toUpperCase()} ↑/↓ 90'`,
    selection: `↑ ${homeTeamOpenGoalLine.toFixed(1)}`,
    odd: Number(
      ((homeTeamOpenGoalLine >= 1.5 ? 1.48 : 1.24) + getAdj('HOME_TEAM_GOALS') * 0.28).toFixed(2)
    ),
    prob: Math.min(
      94,
      Math.max(
        50,
        homeTeamGoalHits + (isOver15Locked ? 6 : 0) + getMemoryModifier('GOLES', 'HOME')
      )
    ),
    badge: '90\''
  });

  const awayTeamOpenGoalLine = Math.max(
    0.5,
    (stats.drafteaAwayTeamGoalLine || (stats.awayGoalsAvg >= 1.65 ? 1.5 : 0.5)) +
      getAdj('AWAY_TEAM_GOALS')
  );
  const awayTeamGoalHits = calcRealHitPct(
    awayGoalsSeq,
    Math.ceil(awayTeamOpenGoalLine),
    stats.awayGoalsAvg >= 1.4 ? 83 : 72
  );

  candidateMarkets.push({
    categoryGroup: 'AWAY_TEAM_GOALS',
    adjustable: true,
    market: `TOTAL DE GOLES ${awayName.toUpperCase()} ↑/↓ 90'`,
    selection: `↑ ${awayTeamOpenGoalLine.toFixed(1)}`,
    odd: Number(
      ((awayTeamOpenGoalLine >= 1.5 ? 1.68 : 1.32) + getAdj('AWAY_TEAM_GOALS') * 0.28).toFixed(2)
    ),
    prob: Math.min(92, Math.max(50, awayTeamGoalHits + getMemoryModifier('GOLES', 'AWAY'))),
    badge: '90\''
  });

  // E. GOLES TOTALES DEL PARTIDO ↑/↓ 90'
  if (isParkTheBus && !isOver15Locked) {
    const uLine = Math.max(2.5, 3.5 + getAdj('TOTAL_GOALS'));
    const underHits =
      totalGoalsSeq.length > 0
        ? Math.round(
            (totalGoalsSeq.filter((g) => g < uLine).length / totalGoalsSeq.length) * 100
          )
        : stats.under35Goals ?? 86;

    candidateMarkets.push({
      categoryGroup: 'TOTAL_GOALS',
      adjustable: true,
      market: 'GOLES TOTALES ↑/↓ 90\'',
      selection: `↓ ${uLine.toFixed(1)}`,
      odd: Number((1.26 - getAdj('TOTAL_GOALS') * 0.15).toFixed(2)),
      prob: Math.min(94, Math.max(50, underHits + 4 + getMemoryModifier('GOLES', 'BOTH'))),
      badge: '90\''
    });
  } else {
    const baseOverLine = (isOver15Locked ? 2.5 : 1.5) + getAdj('TOTAL_GOALS');
    const overHits = calcRealHitPct(
      totalGoalsSeq,
      Math.ceil(baseOverLine),
      baseOverLine >= 2.5 ? stats.over25Goals ?? 74 : stats.over15Goals ?? 84
    );

    candidateMarkets.push({
      categoryGroup: 'TOTAL_GOALS',
      adjustable: true,
      market: 'GOLES TOTALES ↑/↓ 90\'',
      selection: `↑ ${baseOverLine.toFixed(1)}`,
      odd: Number(
        ((baseOverLine >= 2.5 ? 1.52 : 1.28) + getAdj('TOTAL_GOALS') * 0.25).toFixed(2)
      ),
      prob: Math.min(93, Math.max(50, overHits + getMemoryModifier('GOLES', 'BOTH'))),
      badge: '90\''
    });
  }

  // F. TOTAL DE TIROS AL ARCO LOCAL
  const openHomeSotLine = Math.max(
    3,
    (stats.drafteaHomeSoTOpenLine || Math.round(homeSoTAvg - 0.25)) +
      getLearnedLineShift('TIROS AL ARCO', 'HOME') +
      getAdj('HOME_TEAM_SOT')
  );
  const homeSotRealProb = calcRealHitPct(homeSotSeq, openHomeSotLine, 78);

  candidateMarkets.push({
    categoryGroup: 'HOME_TEAM_SOT',
    adjustable: true,
    market: `TOTAL DE TIROS AL ARCO ${homeName.toUpperCase()} 90'`,
    selection: `${homeName} | ${openHomeSotLine}.0+`,
    odd: Number((1.42 + getAdj('HOME_TEAM_SOT') * 0.18).toFixed(2)),
    prob: Math.min(
      94,
      Math.max(50, homeSotRealProb + getMemoryModifier('TIROS AL ARCO', 'HOME'))
    ),
    badge: '90\''
  });

  // G. TOTAL DE TIROS AL ARCO VISITANTE
  const openAwaySotLine = Math.max(
    2,
    (stats.drafteaAwaySoTOpenLine || Math.round(awaySoTAvg - 0.25)) +
      getLearnedLineShift('TIROS AL ARCO', 'AWAY') +
      getAdj('AWAY_TEAM_SOT')
  );
  const awaySotRealProb = calcRealHitPct(awaySotSeq, openAwaySotLine, 75);

  candidateMarkets.push({
    categoryGroup: 'AWAY_TEAM_SOT',
    adjustable: true,
    market: `TOTAL DE TIROS AL ARCO ${awayName.toUpperCase()} 90'`,
    selection: `${awayName} | ${openAwaySotLine}.0+`,
    odd: Number((1.54 + getAdj('AWAY_TEAM_SOT') * 0.18).toFixed(2)),
    prob: Math.min(
      92,
      Math.max(50, awaySotRealProb + getMemoryModifier('TIROS AL ARCO', 'AWAY'))
    ),
    badge: '90\''
  });

  // H. CÓRNERS TOTALES 90'
  const baseCornerLine =
    (combinedCornersAvg >= 10.2 ? 8.5 : 7.5) + getAdj('TOTAL_CORNERS');
  const cornersRealProb = calcRealHitPct(
    totalCornersSeq,
    Math.ceil(baseCornerLine),
    combinedCornersAvg >= 9.8 ? 88 : 76
  );

  candidateMarkets.push({
    categoryGroup: 'TOTAL_CORNERS',
    adjustable: true,
    market: 'CÓRNERS TOTALES 90\'',
    selection: `↑ ${baseCornerLine.toFixed(1)} Tiros de Esquina`,
    odd: Number((1.33 + getAdj('TOTAL_CORNERS') * 0.18).toFixed(2)),
    prob: Math.min(94, Math.max(50, cornersRealProb + getMemoryModifier('CORNERS', 'BOTH'))),
    badge: '90\''
  });

  // I. AMBOS EQUIPOS ANOTAN
  const bttsRealProb = stats.btts ?? 70;
  if (bttsRealProb >= 62 || riskLevel !== 'SEGURO') {
    candidateMarkets.push({
      categoryGroup: 'BTTS_MARKET',
      adjustable: false,
      market: 'AMBOS EQUIPOS ANOTAN 90\'',
      selection: 'Ambos Anotan: Sí',
      odd: 1.54,
      prob: Math.min(
        92,
        Math.max(
          50,
          bttsRealProb + (expectedGoals >= 2.8 ? 6 : 0) + getMemoryModifier('AMBOS', 'BOTH')
        )
      ),
      badge: '90\''
    });
  }

  // J. 1ER GOL DEL PARTIDO 90'
  const firstGoalLeaderIsHome =
    (stats.homeFirstGoalProb ?? 55) >= (stats.awayFirstGoalProb ?? 38);
  const firstGoalLeaderName = firstGoalLeaderIsHome ? homeName : awayName;
  const firstGoalSide = firstGoalLeaderIsHome ? 'HOME' : 'AWAY';
  const firstGoalLeaderProb = Math.max(
    stats.homeFirstGoalProb ?? 55,
    stats.awayFirstGoalProb ?? 38
  );

  candidateMarkets.push({
    categoryGroup: 'FIRST_GOAL_TEAM',
    adjustable: false,
    market: '1ER GOL DEL PARTIDO 90\'',
    selection: `1er Gol: ${firstGoalLeaderName}`,
    odd: 1.46,
    prob: Math.min(
      90,
      Math.max(50, firstGoalLeaderProb + 12 + getMemoryModifier('1ER GOL', firstGoalSide))
    ),
    badge: '90\''
  });

  // K. TIROS AL ARCO 90' (SIN BANCA+)
  if (topSotPlayer) {
    const p1Line = Math.max(1, topSotPlayer.openSoTLine + getAdj('PLAYER_1_SOT'));
    candidateMarkets.push({
      categoryGroup: 'PLAYER_1_SOT',
      adjustable: true,
      market: 'TIROS AL ARCO 90\'',
      selection: `${topSotPlayer.name} ${topSotPlayer.team} | ${p1Line}.0+`,
      odd: Number((topSotPlayer.openSoTOdd + getAdj('PLAYER_1_SOT') * 0.28).toFixed(2)),
      prob: topSotPlayer.realSoTProb,
      badge: '90\''
    });
  }

  // L. TIROS 90' (SIN BANCA+)
  if (topTotalShotsPlayer) {
    const p2Line = Math.max(
      1,
      topTotalShotsPlayer.openShotsLine + getAdj('PLAYER_2_SHOTS')
    );
    candidateMarkets.push({
      categoryGroup: 'PLAYER_2_SHOTS',
      adjustable: true,
      market: 'TIROS 90\'',
      selection: `${topTotalShotsPlayer.name} ${topTotalShotsPlayer.team} | ${p2Line}.0+`,
      odd: Number(
        (topTotalShotsPlayer.openShotsOdd + getAdj('PLAYER_2_SHOTS') * 0.25).toFixed(2)
      ),
      prob: topTotalShotsPlayer.realShotsProb,
      badge: '90\''
    });
  }

  // M. SEGUNDO TIRADOR AL ARCO (SIN BANCA+)
  if (secondSotPlayer && secondSotPlayer.name !== topSotPlayer?.name) {
    const p3Line = Math.max(1, secondSotPlayer.openSoTLine + getAdj('PLAYER_3_SOT'));
    candidateMarkets.push({
      categoryGroup: 'PLAYER_3_SOT',
      adjustable: true,
      market: 'TIROS AL ARCO 90\'',
      selection: `${secondSotPlayer.name} ${secondSotPlayer.team} | ${p3Line}.0+`,
      odd: Number((secondSotPlayer.openSoTOdd + 0.06 + getAdj('PLAYER_3_SOT') * 0.28).toFixed(2)),
      prob: Math.min(92, Math.max(50, secondSotPlayer.realSoTProb)),
      badge: '90\''
    });
  }

  // N. ATAJADAS DE PORTERO 90'
  if (gk1) {
    const oppSoTAvg = gk1.team === homeShort ? awaySoTAvg : homeSoTAvg;
    const gkSide = gk1.team === homeShort ? 'HOME' : 'AWAY';
    const gkOpenLine = Math.max(
      2,
      (gk1.openSavesLine || Math.round(gk1.avgSaves - 0.2)) + getAdj('GK_SAVES')
    );
    const gkLogs = gk1.matchLogs || [];
    const gkHits =
      gkLogs.length > 0
        ? Math.round(
            (gkLogs.filter((l) => l.saves >= gkOpenLine).length / gkLogs.length) * 100
          )
        : 80;
    const siegeBonus = oppSoTAvg >= 5.5 ? 9 : 0;

    candidateMarkets.push({
      categoryGroup: 'GK_SAVES',
      adjustable: true,
      market: 'ATAJADAS DE PORTERO 90\'',
      selection: `${gk1.name} (${gk1.team}) | ${gkOpenLine}.0+`,
      odd: Number((1.36 + getAdj('GK_SAVES') * 0.20).toFixed(2)),
      prob: Math.min(
        95,
        Math.max(50, gkHits + siegeBonus + getMemoryModifier('ATAJADAS', gkSide))
      ),
      badge: '90\''
    });
  }

  // O. TOTAL DE TIROS EQUIPO LOCAL 90'
  const openHomeShotsLine = Math.max(
    8,
    (stats.drafteaHomeShotsOpenLine || Math.round(homeShotsAvg - 1.2)) +
      getLearnedLineShift('TIROS EQUIPO', 'HOME') +
      getAdj('HOME_TEAM_SHOTS')
  );
  const homeShotsRealProb = calcRealHitPct(homeShotsSeq, openHomeShotsLine, 80);

  candidateMarkets.push({
    categoryGroup: 'HOME_TEAM_SHOTS',
    adjustable: true,
    market: 'TOTAL DE TIROS EQUIPO 90\'',
    selection: `${homeName} | ${openHomeShotsLine}.0+`,
    odd: Number((1.34 + getAdj('HOME_TEAM_SHOTS') * 0.15).toFixed(2)),
    prob: Math.min(
      93,
      Math.max(50, homeShotsRealProb + getMemoryModifier('TIROS EQUIPO', 'HOME'))
    ),
    badge: '90\''
  });

  const calibratedPool = candidateMarkets.map((item) => {
    if (riskLevel === 'SEGURO') {
      return item;
    }
    if (riskLevel === 'ARRIESGADO') {
      return {
        ...item,
        odd: Number(Math.max(1.42, item.odd + 0.16).toFixed(2)),
        prob: Math.max(52, item.prob - 9)
      };
    }
    return {
      ...item,
      odd: Number(Math.max(1.85, item.odd + 0.52).toFixed(2)),
      prob: Math.max(42, item.prob - 22)
    };
  });

  calibratedPool.sort((a, b) => {
    if (b.prob !== a.prob) return b.prob - a.prob;
    return a.odd - b.odd;
  });

  const seenGroups = new Set();
  const uniquePicks = [];

  for (const item of calibratedPool) {
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
      [matchId]: ((prev[matchId] || 0) + 1) % 8
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
      const basePool = buildContextualDrafteaPredictions(
        match,
        deep,
        12,
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
              type="button"
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
            type="button"
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
            type="button"
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
            type="button"
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
              type="button"
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
                    type="button"
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

      {/* LISTA DE PARTIDOS + BOLETO CONTEXTUAL */}
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
                        {match.homeTeam.rank ? `#${match.homeTeam.rank} ` : ''}{match.homeTeam.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">vs</span>
                      <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                      <span className="text-xs font-extrabold text-white truncate">
                        {match.awayTeam.rank ? `#${match.awayTeam.rank} ` : ''}{match.awayTeam.name}
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
                <span className="text-[9px] text-gray-400 block uppercase">Certeza Media</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400">
                  {generatedTicket.avgLegProb}%
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
                        type="button"
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
                      <span className="text-xs font-bold text-white">
                        {match.homeTeam.rank ? `#${match.homeTeam.rank} ` : ''}{match.homeTeam.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                      <span className="text-xs font-bold text-white">
                        {match.awayTeam.rank ? `#${match.awayTeam.rank} ` : ''}{match.awayTeam.name}
                      </span>
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
                              <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                                {leg.prob}%
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-white mt-0.5">
                              {leg.selection}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
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
                type="button"
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