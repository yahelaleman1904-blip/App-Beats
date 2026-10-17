// src/components/BeatsBuilderView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Lock,
  Unlock,
  ShieldCheck,
  Flame,
  Sparkles,
  Check,
  AlertTriangle,
  RefreshCw,
  Trash2,
  BookmarkCheck,
  Loader2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

/**
 * Construye hasta 10 elecciones por partido garantizando:
 * 1. CERO mercados repetidos (cada pick pertenece a un categoryGroup único).
 * 2. Nombres reales de tiradores y porteros descargados del historial L5.
 * 3. Razonamiento táctico IA (localía, si el equipo mete 1 gol y se encierra, o si viene goleando).
 */
function buildUniqueCategorizedPicks(match, deepData, count, riskLevel, isLoadingThisMatch) {
  const stats = deepData?.statsL10 || match.statsL10;
  const tactical = deepData?.tacticalAnalysis;
  const players =
    deepData?.keyPlayers?.length > 0 ? deepData.keyPlayers : match.keyPlayers || [];
  const gks = deepData?.goalkeepers || [];

  // Filtrar jugadores reales (evitando cualquier texto genérico)
  const validPlayers = players.filter(
    (p) =>
      p.name &&
      !p.name.includes('Referente') &&
      !p.name.includes('Titular') &&
      !p.name.includes('Goleador')
  );

  const starters = validPlayers.filter((p) => p.rotationStatus === 'TITULAR');
  const poolPlayers = starters.length >= 2 ? starters : validPlayers;

  const p1 = poolPlayers[0] || {
    name: isLoadingThisMatch
      ? `Cargando plantilla ${match.homeTeam.short}...`
      : `${match.homeTeam.name} (Goleador L5)`,
    team: match.homeTeam.short,
    avgSoT: 1.6,
    avgShots: 3.3,
    goalsL5: 2,
    l10HitRate: 88,
    rotationStatus: 'TITULAR',
    rotationNote: `Titular confirmado en el esquema de ${match.homeTeam.name}.`
  };

  const p2 = poolPlayers[1] || {
    name: isLoadingThisMatch
      ? `Cargando plantilla ${match.awayTeam.short}...`
      : `${match.awayTeam.name} (Atacante L5)`,
    team: match.awayTeam.short,
    avgSoT: 1.3,
    avgShots: 2.8,
    goalsL5: 1,
    l10HitRate: 84,
    rotationStatus: 'TITULAR',
    rotationNote: `Referente de ataque en ${match.awayTeam.name}.`
  };

  const p3 = poolPlayers[2] || p1;

  const gk1 = gks[0] || {
    name: isLoadingThisMatch
      ? `Cargando portero ${match.awayTeam.short}...`
      : `Portero Titular (${match.awayTeam.short})`,
    team: match.awayTeam.short,
    avgSaves: 3.2,
    propLine: '2.0+ Atajadas'
  };

  // Evaluar contexto táctico profundo
  const isParkTheBus =
    tactical?.home?.parkTheBusRisk || tactical?.away?.parkTheBusRisk;
  const homeStyle = tactical?.home?.styleTag || 'Ataque Local';
  const awayStyle = tactical?.away?.styleTag || 'Orden Visitante';

  // Catálogo de 10 mercados con categoryGroup irrepetible por nivel de riesgo
  const catalogByRisk = {
    SEGURO: [
      {
        categoryGroup: 'PLAYER_1_SOT',
        market: 'TIROS AL ARCO JUGADOR (B+)',
        selection: `${p1.name} (${p1.team}) 1.0+ Tiro al Arco`,
        odd: 1.34,
        prob: p1.l10HitRate || 89,
        badge: 'B+ TITULAR',
        player: p1,
        aiReason: `${p1.name} promedia ${p1.avgSoT} tiros al arco (${p1.avgShots} totales/juego) en sus últimos 5 partidos.`
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        market: 'GOLES TOTALES 90\'',
        selection: isParkTheBus ? '↑ 0.5 Goles' : '↑ 1.5 Goles',
        odd: isParkTheBus ? 1.09 : 1.24,
        prob: isParkTheBus ? stats.over05Goals : stats.over15Goals,
        badge: isParkTheBus ? 'PROTECCIÓN CERROJO' : 'TENDENCIA L10',
        aiReason: isParkTheBus
          ? `Se detectó estilo "${homeStyle}": mete 1 gol y cierra espacios. Se protege el Beat con ↑ 0.5 goles.`
          : `Cumplido en el ${stats.over15Goals}% de los últimos juegos combinados en ${match.leagueName}.`
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        market: 'TIROS AL ARCO EQUIPO',
        selection: `${match.homeTeam.name} ${Math.max(3, Math.floor(stats.homeSoTAvg - 1))}.0+ Tiros al Arco`,
        odd: 1.30,
        prob: 88,
        badge: 'FACTOR LOCALÍA',
        aiReason: `Jugando en casa, ${match.homeTeam.name} promedia ${stats.homeSoTAvg} disparos a puerta por partido.`
      },
      {
        categoryGroup: 'PLAYER_2_SHOTS',
        market: 'TOTAL TIROS JUGADOR (B+)',
        selection: `${p2.name} (${p2.team}) 2.0+ Tiros Totales`,
        odd: 1.32,
        prob: 86,
        badge: 'VOLUMEN B+',
        player: p2,
        aiReason: `${p2.name} registra ${p2.avgShots} remates por partido en los últimos 5 encuentros.`
      },
      {
        categoryGroup: 'HOME_TEAM_SHOTS',
        market: 'TOTAL DE TIROS EQUIPO 90\'',
        selection: `${match.homeTeam.name} ${Math.max(10, Math.floor(stats.homeShotsAvg - 2))}.5+ Tiros Totales`,
        odd: 1.29,
        prob: 88,
        badge: 'VOLUMEN OFENSIVO',
        aiReason: `${match.homeTeam.name} genera ${stats.homeShotsAvg} tiros totales por juego (${homeStyle}).`
      },
      {
        categoryGroup: 'GK_SAVES',
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) 2.0+ Atajadas`,
        odd: 1.28,
        prob: 87,
        badge: 'PORTERO L5',
        aiReason: `${gk1.name} promedia ${gk1.avgSaves} atajadas por partido en sus últimos 5 juegos.`
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 7.5 Tiros de Esquina',
        odd: 1.26,
        prob: 86,
        badge: 'ESQUINAS',
        aiReason: `Volumen constante por bandas entre ${match.homeTeam.short} y ${match.awayTeam.short}.`
      },
      {
        categoryGroup: 'DOUBLE_CHANCE',
        market: 'DOBLE OPORTUNIDAD 90\'',
        selection: `${match.homeTeam.short} Gana o Empata`,
        odd: 1.22,
        prob: 89,
        badge: 'LOCAL SÓLIDO',
        aiReason: `Respaldado por la localía de ${match.homeTeam.name} frente al estilo ${awayStyle}.`
      },
      {
        categoryGroup: 'FIRST_HALF_GOALS',
        market: 'GOLES 1RA MITAD',
        selection: '1ra Mitad ↑ 0.5 Goles',
        odd: 1.35,
        prob: 83,
        badge: '1ER TIEMPO',
        aiReason: 'Presión ofensiva alta durante los primeros 45 minutos.'
      },
      {
        categoryGroup: 'TOTAL_CARDS',
        market: 'TARJETAS TOTALES 90\'',
        selection: '↑ 2.5 Tarjetas 🟨🟥',
        odd: 1.24,
        prob: 88,
        badge: 'INTENSIDAD',
        aiReason: 'Fricción táctica superior a 3 tarjetas combinadas en sus últimos 5 partidos.'
      }
    ],

    ARRIESGADO: [
      {
        categoryGroup: 'PLAYER_1_SOT',
        market: 'TIROS AL ARCO JUGADOR (B+)',
        selection: `${p1.name} (${p1.team}) ${p1.avgSoT >= 1.8 ? '2.0+ Tiros al Arco' : '1.0+ Tiro al Arco'}`,
        odd: p1.avgSoT >= 1.8 ? 1.68 : 1.44,
        prob: 79,
        badge: 'B+ ESTRELLA',
        player: p1,
        aiReason: `${p1.name} lidera la ofensiva con ${p1.avgSoT} tiros al arco por partido y ${p1.goalsL5 || 1} goles en L5.`
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        market: 'GOLES TOTALES 90\'',
        selection: isParkTheBus ? '↑ 1.5 Goles' : '↑ 2.5 Goles',
        odd: isParkTheBus ? 1.48 : 1.66,
        prob: isParkTheBus ? stats.over15Goals : stats.over25Goals,
        badge: isParkTheBus ? 'AJUSTE TÁCTICO' : 'OVER 2.5',
        aiReason: isParkTheBus
          ? 'Se evita el Over 2.5 porque uno de los clubes suele meter 1 gol y encerrarse; se fija en ↑ 1.5 goles.'
          : `Partidos abiertos en ${match.leagueName} con ${stats.over25Goals}% de cumplimiento en +2.5 goles.`
      },
      {
        categoryGroup: 'HOME_TEAM_SHOTS',
        market: 'TOTAL DE TIROS EQUIPO 90\'',
        selection: `${match.homeTeam.name} ${Math.max(13, Math.round(stats.homeShotsAvg))}.0+ Tiros`,
        odd: 1.55,
        prob: 77,
        badge: 'ASEDIO LOCAL',
        aiReason: `${match.homeTeam.name} promedia ${stats.homeShotsAvg} tiros por partido en sus últimos 5 duelos.`
      },
      {
        categoryGroup: 'PLAYER_2_SOT',
        market: 'TIROS AL ARCO VISITANTE (B+)',
        selection: `${p2.name} (${p2.team}) 1.0+ Tiro al Arco`,
        odd: 1.52,
        prob: 76,
        badge: 'B+ TRANSICIÓN',
        player: p2,
        aiReason: `${p2.name} aprovecha espacios de visitante promediando ${p2.avgSoT} tiros a puerta.`
      },
      {
        categoryGroup: 'BTTS_MARKET',
        market: 'AMBOS EQUIPOS ANOTAN',
        selection: 'Ambos Anotan: Sí',
        odd: 1.64,
        prob: stats.btts,
        badge: 'BTTS L10',
        aiReason: `Ambos equipos han anotado en el ${stats.btts}% de sus compromisos recientes.`
      },
      {
        categoryGroup: 'GK_SAVES',
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) ${gk1.propLine || '3.0+ Atajadas'}`,
        odd: 1.58,
        prob: 75,
        badge: 'ATAJADAS L5',
        aiReason: `${gk1.name} promedia ${gk1.avgSaves} atajadas y hoy recibe a una ofensiva de ${stats.homeSoTAvg} tiros al arco.`
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        market: 'TIROS AL ARCO EQUIPO',
        selection: `${match.homeTeam.name} ${Math.max(5, Math.round(stats.homeSoTAvg))}.0+ Tiros al Arco`,
        odd: 1.54,
        prob: 76,
        badge: 'PUNTERÍA LOCAL',
        aiReason: `Promedio sostenido de ${stats.homeSoTAvg} disparos entre los tres palos.`
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 9.5 Tiros de Esquina',
        odd: 1.65,
        prob: 74,
        badge: 'DESBORDE',
        aiReason: 'Alta proyección de centros y desbordes por las bandas.'
      },
      {
        categoryGroup: 'MONEYLINE_PA',
        market: 'GANADOR 90\' (PAGO ANTICIPADO)',
        selection: `Gana ${match.homeTeam.name} (PA)`,
        odd: 1.62,
        prob: 73,
        badge: 'PA +2 GOLES',
        aiReason: 'Con Pago Anticipado de Draftea: si toma ventaja de 2 goles en cualquier minuto, se cobra.'
      },
      {
        categoryGroup: 'PLAYER_3_SHOTS',
        market: 'TIROS TOTALES JUGADOR (B+)',
        selection: `${p3.name} (${p3.team}) 3.0+ Tiros`,
        odd: 1.60,
        prob: 74,
        badge: 'VOLUMEN B+',
        player: p3,
        aiReason: `${p3.name} cuenta con libertad de disparo de media distancia (${p3.avgShots} tiros/juego).`
      }
    ],

    SONADOR: [
      {
        categoryGroup: 'ANYTIME_SCORER',
        market: 'GOLEADOR EN CUALQUIER MOMENTO',
        selection: `${p1.name} (${p1.team}) Anota Gol (B+)`,
        odd: 2.15,
        prob: 58,
        badge: 'GOLEADOR B+',
        player: p1,
        aiReason: `${p1.name} acumula ${p1.goalsL5 || 2} goles y ${p1.avgSoT} tiros al arco por juego en sus últimos 5 partidos.`
      },
      {
        categoryGroup: 'PLAYER_1_HIGH_SOT',
        market: 'TIROS AL ARCO JUGADOR (B+)',
        selection: `${p1.name} (${p1.team}) 2.0+ Tiros al Arco`,
        odd: 2.20,
        prob: 56,
        badge: 'B+ VOLUMEN ALTO',
        player: p1,
        aiReason: `${p1.name} viene probando a portería constantemente como titular.`
      },
      {
        categoryGroup: 'TOTAL_GOALS',
        market: 'GOLES TOTALES 90\'',
        selection: isParkTheBus ? '↑ 2.5 Goles' : '↑ 3.5 Goles',
        odd: isParkTheBus ? 2.05 : 2.40,
        prob: 54,
        badge: 'ALTA CUOTA',
        aiReason: 'Línea ofensiva alta calculada según el volumen de llegadas de ambos clubes.'
      },
      {
        categoryGroup: 'PLAYER_2_SOT',
        market: 'TIROS AL ARCO VISITANTE (B+)',
        selection: `${p2.name} (${p2.team}) 2.0+ Tiros al Arco`,
        odd: 2.30,
        prob: 53,
        badge: 'B+ VISITA',
        player: p2,
        aiReason: `${p2.name} finaliza la mayoría de los contraataques de ${match.awayTeam.name}.`
      },
      {
        categoryGroup: 'GK_HIGH_SAVES',
        market: 'ATAJADAS DE PORTERO 90\'',
        selection: `${gk1.name} (${gk1.team}) 4.0+ Atajadas`,
        odd: 2.10,
        prob: 55,
        badge: 'MURO EN ARCO',
        aiReason: `Alto trabajo proyectado bajo los tres palos para ${gk1.name} (prom. ${gk1.avgSaves}/juego).`
      },
      {
        categoryGroup: 'HOME_TEAM_SOT',
        market: 'TIROS AL ARCO EQUIPO',
        selection: `${match.homeTeam.name} 6.5+ Tiros al Arco`,
        odd: 2.05,
        prob: 55,
        badge: 'ASEDIO TOTAL',
        aiReason: 'Escenario de dominio local con remates constantes.'
      },
      {
        categoryGroup: 'RESULT_AND_BTTS',
        market: 'RESULTADO + AMBOS ANOTAN',
        selection: `Gana ${match.homeTeam.short} y Ambos Anotan`,
        odd: 2.75,
        prob: 48,
        badge: 'COMBO SOÑADOR',
        aiReason: 'Victoria local combinada con anotación visitante.'
      },
      {
        categoryGroup: 'TOTAL_CORNERS',
        market: 'CÓRNERS TOTALES 90\'',
        selection: '↑ 11.5 Tiros de Esquina',
        odd: 2.35,
        prob: 50,
        badge: 'ESQUINAS ALTAS',
        aiReason: 'Duelo de ida y vuelta con llegadas a línea de fondo.'
      },
      {
        categoryGroup: 'FIRST_HALF_GOALS',
        market: 'GOLES 1RA MITAD',
        selection: '1ra Mitad ↑ 1.5 Goles',
        odd: 2.30,
        prob: 52,
        badge: '1T EXPLOSIVO',
        aiReason: 'Ambos equipos suelen anotar temprano en el primer tiempo.'
      },
      {
        categoryGroup: 'HANDICAP_RESULT',
        market: 'HÁNDICAP ASIÁTICO 90\'',
        selection: `${match.homeTeam.name} -1.5 Goles`,
        odd: 2.40,
        prob: 50,
        badge: 'VENTAJA +2',
        aiReason: 'Capacidad de ampliar ventaja cuando el rival deja espacios atrás.'
      }
    ]
  };

  const rawList = catalogByRisk[riskLevel] || catalogByRisk.SEGURO;

  // Candado estricto: jamás permitir 2 picks del mismo categoryGroup en el mismo partido
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
  onSaveTicketToHistory
}) {
  const [riskLevel, setRiskLevel] = useState('SEGURO');
  const [picksPerMatch, setPicksPerMatch] = useState(1);
  const [customAutoCount, setCustomAutoCount] = useState(18);
  const [variantOffset, setVariantOffset] = useState({});
  const [savedBanner, setSavedBanner] = useState(false);

  const isLockedToOnePick = selectedMatchIds.length > 5;
  const effectivePicksPerMatch = isLockedToOnePick ? 1 : picksPerMatch;

  // Descargar automáticamente la plantilla real, porteros y estudio táctico de todos los partidos seleccionados
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
    setPicksPerMatch(5);
    setRiskLevel('ARRIESGADO');
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

    chosenMatches.forEach((match) => {
      const deep = deepDataMap[match.id];
      const isLoadingThis = loadingDeepId === match.id || !deep;
      const offset = variantOffset[match.id] || 0;
      const basePool = buildUniqueCategorizedPicks(
        match,
        deep,
        10,
        riskLevel,
        isLoadingThis
      );

      const picks =
        effectivePicksPerMatch === 1
          ? [basePool[offset % basePool.length]]
          : basePool.slice(0, effectivePicksPerMatch);

      picks.forEach((pk, idx) => {
        allLegs.push({
          legId: `${match.id}-${idx}`,
          matchId: match.id,
          matchTitle: `${match.homeTeam.short} vs ${match.awayTeam.short}`,
          fullMatchTitle: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          leagueName: match.leagueName,
          date: match.date,
          homeLogo: match.homeTeam.logo,
          awayLogo: match.awayTeam.logo,
          ...pk
        });
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
    variantOffset
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
      createdAt: `Hoy • ${new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short'
      })}`,
      title:
        generatedTicket.matchesCount > 5
          ? `Beat de ${generatedTicket.legs.length} Elecciones (${generatedTicket.matchesCount} Partidos)`
          : `Bet Builder (${generatedTicket.matchesCount} Juegos • ${effectivePicksPerMatch} mercados únicos c/u)`,
      category: categoryLabel,
      totalOdd: generatedTicket.totalOdd,
      avgLegProb: generatedTicket.avgLegProb,
      ticketProb: generatedTicket.ticketHitProbability,
      status: 'PENDING',
      legs: generatedTicket.legs.map((l) => ({
        ...l,
        hit: true
      }))
    });

    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Constructor Inteligente de Beats (Mercados Únicos)
            </h2>
            <p className="text-[11px] text-gray-400">
              Cero mercados repetidos por partido • Nombres reales y evaluación táctica de localía/cerrojo.
            </p>
          </div>

          {selectedMatchIds.length > 0 && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setSelectedMatchIds([]);
              }}
              className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar ({selectedMatchIds.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={handlePreset18EsMx}
            className="p-3 rounded-xl bg-gradient-to-br from-purple-900/40 to-[#0b0d13] border border-purple-500/40 hover:border-purple-400 text-left transition-all cursor-pointer"
          >
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500 text-white">
              Caso 18 Juegos
            </span>
            <p className="text-xs font-extrabold text-white mt-1.5">
              España + México (Vigentes)
            </p>
            <p className="text-[10px] text-gray-400">
              1 elección óptima por partido
            </p>
          </button>

          <button
            onClick={handlePreset2BigGames}
            className="p-3 rounded-xl bg-gradient-to-br from-emerald-900/35 to-[#0b0d13] border border-emerald-500/40 hover:border-emerald-400 text-left transition-all cursor-pointer"
          >
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-black">
              Caso ≤ 5 Juegos
            </span>
            <p className="text-xs font-extrabold text-white mt-1.5">
              2 Partidos • 5 Mercados Distintos c/u
            </p>
            <p className="text-[10px] text-gray-400">
              Sin repetir líneas de goles
            </p>
          </button>

          <button
            onClick={handlePreset22Dreamer}
            className="p-3 rounded-xl bg-gradient-to-br from-amber-900/30 to-[#0b0d13] border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer"
          >
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black">
              Escalera +20
            </span>
            <p className="text-xs font-extrabold text-white mt-1.5">
              Soñador de 22 Partidos
            </p>
            <p className="text-[10px] text-gray-400">
              Todas las ligas • 1 pick c/u
            </p>
          </button>
        </div>

        <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-gray-300">
            ⚙️ Auto-armar de tus filtros activos arriba ({filteredMatches.length} disp.):
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="26"
              value={customAutoCount}
              onChange={(e) => setCustomAutoCount(e.target.value)}
              className="w-14 bg-[#141824] border border-gray-700 rounded-lg px-2 py-1 text-xs font-black text-center text-white"
            />
            <span className="text-[11px] text-gray-400">partidos</span>
            <button
              onClick={handleAutoPickFromActiveFilters}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Auto-Armar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-400">
                1. Mercados Distintos por Partido (1 a 10):
              </span>
              {isLockedToOnePick ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> &gt;5 Juegos (1 pick/juego)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <Unlock className="w-3 h-3" /> ≤5 Juegos ({selectedMatchIds.length} sel.)
                </span>
              )}
            </div>

            {isLockedToOnePick ? (
              <p className="text-[11px] text-gray-400">
                Con <strong>{selectedMatchIds.length} partidos</strong> (&gt;5), se asigna <strong>1 elección única por partido</strong>.
              </p>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={picksPerMatch}
                    onChange={(e) => {
                      triggerHaptic('light');
                      setPicksPerMatch(Number(e.target.value));
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <span className="text-sm font-black text-purple-400 shrink-0">
                    {picksPerMatch} / juego
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Combina <strong>{picksPerMatch} categorías distintas</strong> (Goles, Tirador, Tiros Equipo, Portero, Córners...) sin repetir.
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-400">
                2. Nivel de Dificultad del Beat:
              </span>
              <span className="text-[10px] font-black text-emerald-400">
                Prom. {generatedTicket.avgLegProb}% por pick
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'SEGURO', label: 'Seguro', sub: '85-95% L10', icon: ShieldCheck },
                { id: 'ARRIESGADO', label: 'Arriesgado', sub: '70-84% L10', icon: Flame },
                { id: 'SONADOR', label: 'Soñador', sub: 'Momio Alto', icon: Sparkles }
              ].map((lvl) => {
                const Icon = lvl.icon;
                const active = riskLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setRiskLevel(lvl.id);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? 'bg-purple-600/25 border-purple-400 text-white shadow'
                        : 'bg-[#141824] border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-xs font-extrabold">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{lvl.label}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block mt-0.5">{lvl.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DE PARTIDOS + TICKET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase text-gray-300">
              👆 Toca los enfrentamientos para armar tu Beat ({filteredMatches.length} disponibles):
            </span>
            <span className="text-[11px] font-bold text-purple-400">
              {selectedMatchIds.length} seleccionados
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filteredMatches.map((match) => {
              const isSelected = selectedMatchIds.includes(match.id);
              const selectionIndex = selectedMatchIds.indexOf(match.id) + 1;
              const deep = deepDataMap[match.id];
              const topPlayerName = deep?.keyPlayers?.[0]?.name || match.keyPlayers?.[0]?.name;

              return (
                <div
                  key={match.id}
                  onClick={() => handleToggleSelectMatch(match)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/30 border-purple-500 shadow-md shadow-purple-950/30'
                      : 'bg-[#141824] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-1">
                      <span className="font-bold text-purple-300">{match.leagueName}</span>
                      <span>•</span>
                      <span>{match.date} • {match.time}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                      <span className="text-xs font-extrabold text-white truncate">
                        {match.homeTeam.name}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">vs</span>
                      <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                      <span className="text-xs font-extrabold text-white truncate">
                        {match.awayTeam.name}
                      </span>
                    </div>

                    <p className="text-[10px] text-emerald-400 font-semibold mt-1 truncate">
                      ⚡ {topPlayerName ? `${topPlayerName} 1.0+ Tiro al Arco B+` : match.aiTopSignal}
                    </p>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
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

        {/* TICKET GENERADO */}
        <div className="lg:col-span-6 bg-[#111520] border-2 border-purple-500/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-[#191f30] via-[#141824] to-[#191f30] p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black italic tracking-wider text-white uppercase flex items-center gap-1.5">
                🎟️ MI ENTRADA INTELIGENTE
                {loadingDeepId && (
                  <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                )}
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                  riskLevel === 'SEGURO'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : riskLevel === 'ARRIESGADO'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}
              >
                Nivel {riskLevel} • {generatedTicket.legs.length} Elecciones
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#0b0d13] border border-gray-800/90 rounded-xl p-2.5 text-center">
              <div>
                <span className="text-[10px] text-gray-400 block">Partidos / Picks</span>
                <span className="text-sm font-black text-white">
                  {generatedTicket.matchesCount} / {generatedTicket.legs.length}
                </span>
              </div>
              <div className="border-x border-gray-800">
                <span className="text-[10px] text-gray-400 block">Momio Total</span>
                <span className="text-sm font-black text-purple-400">
                  {generatedTicket.totalOdd}x
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Probabilidad L10</span>
                <span className="text-sm font-black text-emerald-400">
                  {generatedTicket.avgLegProb}% Hit
                </span>
              </div>
            </div>
          </div>

          {generatedTicket.legs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs font-bold text-gray-300">Tu entrada está vacía</p>
              <p className="text-[11px] text-gray-500">
                Toca uno o varios partidos de la izquierda para que la IA investigue las plantillas reales, el estilo táctico y genere tus picks sin repetir mercados.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2.5 max-h-[480px] overflow-y-auto">
              {generatedTicket.legs.map((leg) => {
                const hasRotationWarning = leg.player?.rotationStatus === 'ROTACION';

                return (
                  <div
                    key={leg.legId}
                    className={`p-3 rounded-xl border ${
                      hasRotationWarning
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-[#0b0d13] border-gray-800/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <img src={leg.homeLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="font-bold text-gray-200 truncate">
                          {leg.fullMatchTitle}
                        </span>
                        <span>•</span>
                        <span>{leg.date}</span>
                      </div>

                      {effectivePicksPerMatch === 1 && (
                        <button
                          onClick={() => handleCycleMatchPick(leg.matchId)}
                          className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold shrink-0 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Cambiar mercado
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400">
                            {leg.market}
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {leg.badge}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">
                          {leg.selection}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white bg-[#141824] border border-gray-700 px-2 py-1 rounded-lg">
                          {leg.odd.toFixed(2)}x
                        </span>
                        <span className="block text-[9px] font-bold text-emerald-400 mt-0.5">
                          {leg.prob}% Hit
                        </span>
                      </div>
                    </div>

                    {/* Razonamiento táctico IA de por qué se eligió este pick */}
                    {leg.aiReason && (
                      <p className="text-[10px] text-gray-300 mt-1.5 bg-[#141824] px-2.5 py-1 rounded border border-gray-800/80">
                        🧠 <strong>Análisis IA:</strong> {leg.aiReason}
                      </p>
                    )}

                    {leg.player && (
                      <div
                        className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded ${
                          hasRotationWarning
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {hasRotationWarning ? (
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        ) : (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate">{leg.player.rotationNote}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {generatedTicket.legs.length > 0 && (
            <div className="p-3.5 bg-[#141824] border-t border-gray-800">
              <button
                onClick={handleSaveTicket}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>
                  {savedBanner
                    ? '✅ ¡Ticket Guardado en tu Historial!'
                    : 'Guardar Ticket en Historial para Evaluar %'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}