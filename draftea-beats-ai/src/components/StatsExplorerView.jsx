// src/components/StatsExplorerView.jsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  X
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import {
  InteractivePitchNode,
  PlayerPitchDetailModal,
  SquadConvocadosTable
} from './InteractivePitchAndTable';

export default function StatsExplorerView({
  matches,
  isMatchPinned,
  deepDataMap,
  loadingDeepId,
  onEnsureDeepStats
}) {
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('stats');
  const [selectedPastMatch, setSelectedPastMatch] = useState(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const [playerTeamFilter, setPlayerTeamFilter] = useState('ALL');
  const [modalPlayer, setModalPlayer] = useState(null);

  const handleToggleMatch = async (match) => {
    triggerHaptic('light');
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null);
      setSelectedPastMatch(null);
      return;
    }

    setExpandedMatchId(match.id);
    setActiveSubTab('stats');
    setSelectedPastMatch(null);
    setPlayerTeamFilter('ALL');
    await onEnsureDeepStats(match);
  };

  const handleSelectPastMatch = (pastMatch) => {
    triggerHaptic('medium');
    setSelectedPastMatch((prev) => (prev?.id === pastMatch.id ? null : pastMatch));
  };

  const getResultBadge = (res) => {
    if (res === 'W') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (res === 'D') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-red-500/20 text-red-400 border-red-500/40';
  };

  const extractOnlyClubSquad = (pastMatchObj, clubName, clubShort) => {
    if (!pastMatchObj) return [];
    if (Array.isArray(pastMatchObj.mySquad) && pastMatchObj.mySquad.length > 0) {
      return pastMatchObj.mySquad;
    }
    const sq = pastMatchObj.squadTable;
    if (!sq) return [];

    const cName = (clubName || '').toLowerCase();
    const cShort = (clubShort || '').toLowerCase();
    const pmHomeName = (pastMatchObj.homeName || '').toLowerCase();
    const pmHomeAbbr = (pastMatchObj.homeAbbr || '').toLowerCase();

    const wasHomeInThatGame =
      pmHomeAbbr === cShort ||
      pmHomeName.includes(cName.slice(0, 5)) ||
      cName.includes(pmHomeName.slice(0, 5));

    const candidateList = wasHomeInThatGame ? sq.home || [] : sq.away || [];
    const strictFiltered = (sq.all || candidateList).filter(
      (p) => (p.team || '').toLowerCase() === cShort
    );
    return strictFiltered.length > 0 ? strictFiltered : candidateList;
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
          PARTIDOS VIGENTES ({matches.length})
        </h2>
      </div>

      {matches.map((match) => {
        const isExpanded = expandedMatchId === match.id;
        const isPinned = isMatchPinned ? isMatchPinned(match) : false;

        const deep = deepDataMap[match.id];
        const recentHome = deep?.recentMatches?.home || [];
        const recentAway = deep?.recentMatches?.away || [];
        const confirmedLineup = deep?.confirmedLineup;
        const statsL10 = deep?.statsL10 || match.statsL10 || {};
        const keyPlayers =
          deep?.keyPlayers?.length > 0 ? deep.keyPlayers : match.keyPlayers || [];
        const isFetchingThis = loadingDeepId === match.id;

        // Toma exclusivamente la posición verificada de la competencia actual del enfrentamiento
        const homeRank = match.homeTeam.rank || deep?.homeRank || null;
        const awayRank = match.awayTeam.rank || deep?.awayRank || null;

        // Pronóstico de Tiros al Arco y Tiros Totales de Equipo (Calibrado con líneas de Draftea)
        const homeSoTPred =
          statsL10.drafteaHomeSoTOpenLine ||
          Math.max(2, Math.round((statsL10.homeSoTAvg || 4.5) - 0.3));
        const awaySoTPred =
          statsL10.drafteaAwaySoTOpenLine ||
          Math.max(2, Math.round((statsL10.awaySoTAvg || 3.8) - 0.3));
        const homeShotsPred =
          statsL10.drafteaHomeShotsOpenLine ||
          Math.max(9, Math.round((statsL10.homeShotsAvg || 13) - 1.2));
        const awayShotsPred =
          statsL10.drafteaAwayShotsOpenLine ||
          Math.max(8, Math.round((statsL10.awayShotsAvg || 11) - 1.2));

        const filteredPlayers = keyPlayers.filter((p) => {
          if (playerTeamFilter === 'HOME') return p.team === match.homeTeam.short;
          if (playerTeamFilter === 'AWAY') return p.team === match.awayTeam.short;
          return true;
        });

        const homeOnlySquad = extractOnlyClubSquad(
          recentHome[0],
          match.homeTeam.name,
          match.homeTeam.short
        );
        const awayOnlySquad = extractOnlyClubSquad(
          recentAway[0],
          match.awayTeam.name,
          match.awayTeam.short
        );

        const activeSquadTable = confirmedLineup?.squadTable
          ? confirmedLineup.squadTable
          : homeOnlySquad.length > 0 || awayOnlySquad.length > 0
          ? {
              home: homeOnlySquad,
              away: awayOnlySquad,
              all: [...homeOnlySquad, ...awayOnlySquad].sort(
                (a, b) => (b.rating || 0) - (a.rating || 0)
              )
            }
          : null;

        const healthyTopPlayer = keyPlayers.find((p) => !p.isInjuredOrOut) || keyPlayers[0];

        return (
          <div
            key={match.id}
            className={`rounded-2xl border transition-all overflow-hidden ${
              isExpanded
                ? 'bg-[#141824] border-purple-500/70 shadow-xl'
                : isPinned
                ? 'bg-[#141824]/95 border-amber-500/40'
                : 'bg-[#141824]/80 border-gray-800/90 hover:border-gray-700'
            }`}
          >
            {/* CABECERA DEL ENFRENTAMIENTO CON POSICIÓN EN LA TABLA (#) */}
            <div
              onClick={() => handleToggleMatch(match)}
              className="p-3 cursor-pointer select-none"
            >
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded truncate">
                    {match.leagueName}
                  </span>
                  <span className="font-semibold text-gray-300 shrink-0">
                    {match.date} • {match.time.split(' ')[0]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isPinned && (
                    <span className="text-[9px] font-extrabold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full uppercase">
                      Fijado
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-purple-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 items-center gap-2">
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <img
                    src={match.homeTeam.logo}
                    alt={match.homeTeam.name}
                    className="w-7 h-7 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {homeRank && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                          #{homeRank}
                        </span>
                      )}
                      <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {match.homeTeam.name}
                      </p>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold block">
                      LOCAL
                    </span>
                  </div>
                </div>

                <div className="col-span-1 flex justify-center">
                  <span className="text-[9px] font-black text-gray-500 bg-[#0b0d13] px-2 py-0.5 rounded-full border border-gray-800">
                    VS
                  </span>
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2 text-right min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {match.awayTeam.name}
                      </p>
                      {awayRank && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">
                          #{awayRank}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-sky-400 font-bold block">
                      VISITANTE
                    </span>
                  </div>
                  <img
                    src={match.awayTeam.logo}
                    alt={match.awayTeam.name}
                    className="w-7 h-7 object-contain shrink-0"
                  />
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-bold truncate">
                  {healthyTopPlayer
                    ? `${healthyTopPlayer.name} (${healthyTopPlayer.team}) ${healthyTopPlayer.propLine}`
                    : (match.aiTopSignal || '').replace(' B+', '')}
                </span>
                <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">
                  {isExpanded ? 'Cerrar' : 'Detalles'}
                </span>
              </div>
            </div>

            {/* CONTENIDO DESPLEGABLE (ESTADÍSTICAS ES EL PRIMER BLOQUE) */}
            {isExpanded && (
              <div className="border-t border-gray-800 bg-[#0e121b] p-3 space-y-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'stats', label: 'Estadísticas' },
                    { id: 'lineups', label: 'Alineaciones' },
                    { id: 'squad', label: 'Convocados' },
                    { id: 'last5', label: 'Últimos 5' }
                  ].map((tab) => {
                    const active = activeSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveSubTab(tab.id);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-black border-white'
                            : 'bg-[#181d2a] text-gray-300 border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {isFetchingThis ? (
                  <div className="py-8 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-xs font-bold text-gray-300">Cargando datos...</span>
                  </div>
                ) : (
                  <>
                    {/* 1. ESTADÍSTICAS */}
                    {activeSubTab === 'stats' && (
                      <div className="space-y-3">
                        {/* PROBABILIDAD DE VICTORIA */}
                        <div className="bg-[#141824] border border-gray-800 rounded-xl p-3 space-y-2">
                          <span className="text-[10px] font-extrabold uppercase text-purple-400 block">
                            PROBABILIDAD DE VICTORIA (LOCALÍA Y FORMA L5 GLOBAL)
                          </span>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-[#0b0d13] border border-emerald-500/30 rounded-lg p-2">
                              <span className="text-[9px] text-gray-400 font-bold block truncate">
                                {homeRank ? `#${homeRank} ` : ''}{match.homeTeam.name}
                              </span>
                              <span className="text-sm font-black text-emerald-400">
                                {statsL10.winProbHome ?? 48}%
                              </span>
                            </div>

                            <div className="bg-[#0b0d13] border border-gray-800 rounded-lg p-2">
                              <span className="text-[9px] text-gray-400 font-bold block">
                                Empate
                              </span>
                              <span className="text-sm font-black text-amber-300">
                                {statsL10.winProbDraw ?? 26}%
                              </span>
                            </div>

                            <div className="bg-[#0b0d13] border border-sky-500/30 rounded-lg p-2">
                              <span className="text-[9px] text-gray-400 font-bold block truncate">
                                {awayRank ? `#${awayRank} ` : ''}{match.awayTeam.name}
                              </span>
                              <span className="text-sm font-black text-sky-400">
                                {statsL10.winProbAway ?? 26}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-800">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${statsL10.winProbHome ?? 48}%` }}
                            />
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${statsL10.winProbDraw ?? 26}%` }}
                            />
                            <div
                              className="h-full bg-sky-500"
                              style={{ width: `${statsL10.winProbAway ?? 26}%` }}
                            />
                          </div>
                        </div>

                        {/* PRONÓSTICO DE TIROS Y TIROS AL ARCO POR EQUIPO (CALIBRADO CON DRAFTEA) */}
                        <div className="bg-[#141824] border border-emerald-500/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-emerald-400">
                              PRONÓSTICO DE TIROS POR EQUIPO (LÍNEAS DRAFTEA)
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">
                              Últimos 5 Globales
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#0b0d13] border border-gray-800 rounded-lg p-2.5 space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 block truncate">
                                {match.homeTeam.name}
                              </span>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-white">
                                  Tiros al Arco:
                                </span>
                                <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded">
                                  +{homeSoTPred}.0 al arco
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-400 font-semibold">
                                  Tiros Totales:
                                </span>
                                <span className="font-black text-gray-200">
                                  +{homeShotsPred}.0 tiros
                                </span>
                              </div>
                            </div>

                            <div className="bg-[#0b0d13] border border-gray-800 rounded-lg p-2.5 space-y-1">
                              <span className="text-[10px] font-bold text-gray-400 block truncate">
                                {match.awayTeam.name}
                              </span>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-white">
                                  Tiros al Arco:
                                </span>
                                <span className="text-xs font-black text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded">
                                  +{awaySoTPred}.0 al arco
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-400 font-semibold">
                                  Tiros Totales:
                                </span>
                                <span className="font-black text-gray-200">
                                  +{awayShotsPred}.0 tiros
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* QUIÉN ANOTA EL PRIMER GOL */}
                        <div className="bg-[#141824] border border-gray-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-emerald-400">
                              QUIÉN ANOTA EL 1ER GOL DEL ENCUENTRO
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">
                              1er Gol L5: {match.homeTeam.short} {statsL10.homeScoredFirstRate ?? 60}% vs {match.awayTeam.short} {statsL10.awayScoredFirstRate ?? 40}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#0b0d13] border border-gray-800 rounded-lg p-2.5 flex items-center justify-between">
                              <span className="text-xs font-extrabold text-white truncate pr-2">
                                1er Gol: {match.homeTeam.name}
                              </span>
                              <span className="text-xs font-black text-emerald-400 shrink-0">
                                {statsL10.homeFirstGoalProb ?? 56}%
                              </span>
                            </div>

                            <div className="bg-[#0b0d13] border border-gray-800 rounded-lg p-2.5 flex items-center justify-between">
                              <span className="text-xs font-extrabold text-white truncate pr-2">
                                1er Gol: {match.awayTeam.name}
                              </span>
                              <span className="text-xs font-black text-sky-400 shrink-0">
                                {statsL10.awayFirstGoalProb ?? 38}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* LÍNEAS DE GOLES */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: 'Goles ↑ 1.5', val: statsL10.over15Goals ?? 82 },
                            { label: 'Goles ↓ 3.5', val: statsL10.under35Goals ?? 78 },
                            { label: 'Goles ↑ 2.5', val: statsL10.over25Goals ?? 64 },
                            { label: 'Ambos Anotan', val: statsL10.btts ?? 68 }
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="bg-[#141824] border border-gray-800 rounded-lg p-2 text-center"
                            >
                              <span className="text-[9px] text-gray-400 font-bold block truncate">
                                {item.label}
                              </span>
                              <span className="text-xs font-black text-emerald-400">
                                {item.val}%
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* PROMEDIOS CARA A CARA */}
                        <div className="bg-[#141824] border border-gray-800 rounded-xl p-3 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-extrabold text-white border-b border-gray-800 pb-1.5">
                            <span className="text-emerald-400 truncate">{match.homeTeam.name}</span>
                            <span className="text-[9px] text-gray-400 uppercase shrink-0 px-2">
                              PROMEDIOS L5 GLOBAL
                            </span>
                            <span className="text-sky-400 truncate">{match.awayTeam.name}</span>
                          </div>

                          {[
                            {
                              label: 'Goles',
                              home: statsL10.homeGoalsAvg ?? 1.6,
                              away: statsL10.awayGoalsAvg ?? 1.3
                            },
                            {
                              label: 'Tiros Totales',
                              home: statsL10.homeShotsAvg ?? 13.2,
                              away: statsL10.awayShotsAvg ?? 11.4
                            },
                            {
                              label: 'Tiros al Arco',
                              home: statsL10.homeSoTAvg ?? 4.8,
                              away: statsL10.awaySoTAvg ?? 4.1
                            },
                            {
                              label: 'Córners',
                              home: statsL10.homeCornersAvg ?? 5.2,
                              away: statsL10.awayCornersAvg ?? 4.6
                            },
                            {
                              label: 'Tarjetas',
                              home: statsL10.homeCardsAvg ?? 2.1,
                              away: statsL10.awayCardsAvg ?? 2.3
                            }
                          ].map((row) => {
                            const total = Math.max(0.1, Number(row.home) + Number(row.away));
                            const homePct = Math.round((Number(row.home) / total) * 100);
                            return (
                              <div key={row.label} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-white">{row.home}</span>
                                  <span className="text-[10px] text-gray-400">{row.label}</span>
                                  <span className="text-white">{row.away}</span>
                                </div>
                                <div className="w-full h-1.5 bg-sky-500/30 rounded-full overflow-hidden flex">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${homePct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* TIRADORES Y DISPONIBILIDAD L5 */}
                        <div className="bg-[#141824] border border-gray-800 rounded-xl p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-extrabold text-white uppercase">
                              TIRADORES Y DISPONIBILIDAD L5
                            </h4>

                            <div className="flex items-center gap-1 bg-[#0b0d13] p-0.5 rounded-lg border border-gray-800 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => setPlayerTeamFilter('ALL')}
                                className={`px-2 py-0.5 rounded cursor-pointer ${
                                  playerTeamFilter === 'ALL'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                Todos
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlayerTeamFilter('HOME')}
                                className={`px-2 py-0.5 rounded cursor-pointer ${
                                  playerTeamFilter === 'HOME'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                {match.homeTeam.short}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlayerTeamFilter('AWAY')}
                                className={`px-2 py-0.5 rounded cursor-pointer ${
                                  playerTeamFilter === 'AWAY'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                {match.awayTeam.short}
                              </button>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-800/80">
                            {filteredPlayers.map((player) => {
                              const isOut = Boolean(player.isInjuredOrOut);
                              const isRotationRisk = player.rotationStatus === 'ROTACION';
                              const pKey = `${match.id}-${player.id}`;
                              const isPlayerOpen = expandedPlayerId === pKey;

                              return (
                                <div
                                  key={pKey}
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setExpandedPlayerId(isPlayerOpen ? null : pKey);
                                  }}
                                  className={`py-2.5 first:pt-1 last:pb-1 cursor-pointer ${
                                    isOut ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-white truncate">
                                          {player.name}
                                        </span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-800 text-gray-300">
                                          {player.team} • {player.pos}
                                        </span>
                                        <span
                                          className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                            isOut
                                              ? 'bg-red-500/25 text-red-300 border border-red-500/40'
                                              : isRotationRisk
                                              ? 'bg-amber-500/20 text-amber-300'
                                              : 'bg-emerald-500/15 text-emerald-300'
                                          }`}
                                        >
                                          {isOut
                                            ? 'BAJA / AUSENTE'
                                            : isRotationRisk
                                            ? 'Rotación'
                                            : 'Titular'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2.5 text-[10px] text-gray-400 mt-1">
                                        <span>
                                          Al Arco/J: <strong className="text-emerald-400">{player.avgSoT}</strong>
                                        </span>
                                        <span>
                                          Tiros/J: <strong className="text-white">{player.avgShots}</strong>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span
                                        className={`text-xs font-black block ${
                                          isOut ? 'text-red-400 line-through' : 'text-emerald-400'
                                        }`}
                                      >
                                        {player.propLine}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        {isPlayerOpen ? 'Cerrar' : 'L5'}
                                      </span>
                                    </div>
                                  </div>

                                  {isPlayerOpen && player.matchLogs?.length > 0 && (
                                    <div className="mt-2 bg-[#0b0d13] rounded-lg p-2 border border-gray-800 space-y-1">
                                      {player.matchLogs.map((log, lIdx) => (
                                        <div
                                          key={lIdx}
                                          className="flex items-center justify-between text-[10px] bg-[#141824] px-2 py-1 rounded"
                                        >
                                          <div className="truncate pr-2">
                                            <span className="font-bold text-gray-200">
                                              {log.score}
                                            </span>
                                            <span className="text-purple-300 ml-1">
                                              ({log.competition || log.date})
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-gray-300">
                                              Tiros: <strong className="text-white">{log.shots}</strong>
                                            </span>
                                            <span className="text-emerald-400 font-bold">
                                              Arco: {log.sot}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. ALINEACIONES CONFIRMADAS (ORIENTACIÓN ESPEJO CARA A CARA) */}
                    {activeSubTab === 'lineups' && (
                      <div className="bg-[#141824] border border-gray-800 rounded-xl p-3">
                        {confirmedLineup?.confirmed ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-extrabold text-white">
                              <span>ALINEACIONES CONFIRMADAS</span>
                              <span className="text-[10px] text-gray-400">
                                {confirmedLineup.homeFormation} vs {confirmedLineup.awayFormation}
                              </span>
                            </div>

                            <div className="rounded-xl overflow-hidden border border-emerald-700/60 bg-[#35684c] relative">
                              {/* Cabecera Equipo Local (Arriba) */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-black/25 border-b border-white/15 text-[10px] font-extrabold text-white">
                                <div className="flex items-center gap-1.5">
                                  <img src={match.homeTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />
                                  <span>{match.homeTeam.name}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-black/40 text-emerald-300">
                                  {confirmedLineup.homeFormation}
                                </span>
                              </div>

                              {/* Mitad Superior: Portero Arriba -> Delanteros en el Centro */}
                              <div className="py-3.5 px-1.5 space-y-3.5 border-b border-white/30 relative">
                                <div className="w-28 h-10 border-b border-x border-white/25 mx-auto -mt-3.5 mb-1 pointer-events-none" />
                                {confirmedLineup.homeRows.map((row, rIdx) => (
                                  <div key={rIdx} className="flex items-center justify-around gap-1">
                                    {row.map((player, pIdx) => (
                                      <InteractivePitchNode
                                        key={pIdx}
                                        player={player}
                                        onSelectPlayer={setModalPlayer}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>

                              {/* Círculo Central */}
                              <div className="w-16 h-16 rounded-full border border-white/25 mx-auto -my-8 pointer-events-none" />

                              {/* Mitad Inferior Invertida: Delanteros en el Centro -> Portero Hasta Abajo */}
                              <div className="py-3.5 px-1.5 space-y-3.5 relative">
                                {[...(confirmedLineup.awayRows || [])].reverse().map((row, rIdx) => (
                                  <div key={rIdx} className="flex items-center justify-around gap-1">
                                    {[...row].reverse().map((player, pIdx) => (
                                      <InteractivePitchNode
                                        key={pIdx}
                                        player={player}
                                        onSelectPlayer={setModalPlayer}
                                      />
                                    ))}
                                  </div>
                                ))}
                                <div className="w-28 h-10 border-t border-x border-white/25 mx-auto mt-1 -mb-3.5 pointer-events-none" />
                              </div>

                              {/* Pie Equipo Visitante (Abajo) */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-black/25 border-t border-white/15 text-[10px] font-extrabold text-white">
                                <div className="flex items-center gap-1.5">
                                  <img src={match.awayTeam.logo} alt="" className="w-3.5 h-3.5 object-contain" />
                                  <span>{match.awayTeam.name}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-black/40 text-sky-300">
                                  {confirmedLineup.awayFormation}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center">
                            <p className="text-xs font-extrabold text-gray-300">
                              ALINEACIONES NO CONFIRMADAS
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. CONVOCADOS */}
                    {activeSubTab === 'squad' && (
                      <SquadConvocadosTable
                        squadTable={activeSquadTable}
                        homeName={match.homeTeam.name}
                        awayName={match.awayTeam.name}
                        onSelectPlayer={setModalPlayer}
                      />
                    )}

                    {/* 4. ÚLTIMOS 5 PARTIDOS CON POSICIÓN EN LA TABLA (#) Y CANCHA ESPEJO CARA A CARA */}
                    {activeSubTab === 'last5' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="bg-[#141824] border border-gray-800 rounded-xl p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                              <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                              <span className="text-xs font-extrabold text-white truncate">
                                {homeRank ? `#${homeRank} ` : ''}{match.homeTeam.name}
                              </span>
                            </div>

                            {recentHome.map((pm) => {
                              const isSelected = selectedPastMatch?.id === pm.id;
                              return (
                                <button
                                  key={pm.id}
                                  type="button"
                                  onClick={() => handleSelectPastMatch(pm)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600/25 border-purple-400'
                                      : 'bg-[#0b0d13] border-gray-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center border shrink-0 ${getResultBadge(
                                        pm.result
                                      )}`}
                                    >
                                      {pm.result}
                                    </span>
                                    <div className="truncate">
                                      <p className="text-[11px] font-bold text-white truncate">
                                        {pm.homeRank ? <span className="text-emerald-300 font-black">#{pm.homeRank} </span> : null}
                                        {pm.homeName}{' '}
                                        <span className="text-emerald-400 font-black">
                                          {pm.homeScore}-{pm.awayScore}
                                        </span>{' '}
                                        {pm.awayRank ? <span className="text-sky-300 font-black">#{pm.awayRank} </span> : null}
                                        {pm.awayName}
                                      </p>
                                      <span className="text-[9px] font-bold text-purple-300">
                                        {pm.competition} • {pm.date}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-bold text-gray-400 shrink-0 ml-1">
                                    {isSelected ? 'Cerrar' : 'Ver'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="bg-[#141824] border border-gray-800 rounded-xl p-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                              <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                              <span className="text-xs font-extrabold text-white truncate">
                                {awayRank ? `#${awayRank} ` : ''}{match.awayTeam.name}
                              </span>
                            </div>

                            {recentAway.map((pm) => {
                              const isSelected = selectedPastMatch?.id === pm.id;
                              return (
                                <button
                                  key={pm.id}
                                  type="button"
                                  onClick={() => handleSelectPastMatch(pm)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600/25 border-purple-400'
                                      : 'bg-[#0b0d13] border-gray-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center border shrink-0 ${getResultBadge(
                                        pm.result
                                      )}`}
                                    >
                                      {pm.result}
                                    </span>
                                    <div className="truncate">
                                      <p className="text-[11px] font-bold text-white truncate">
                                        {pm.homeRank ? <span className="text-emerald-300 font-black">#{pm.homeRank} </span> : null}
                                        {pm.homeName}{' '}
                                        <span className="text-emerald-400 font-black">
                                          {pm.homeScore}-{pm.awayScore}
                                        </span>{' '}
                                        {pm.awayRank ? <span className="text-sky-300 font-black">#{pm.awayRank} </span> : null}
                                        {pm.awayName}
                                      </p>
                                      <span className="text-[9px] font-bold text-purple-300">
                                        {pm.competition} • {pm.date}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-bold text-gray-400 shrink-0 ml-1">
                                    {isSelected ? 'Cerrar' : 'Ver'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {selectedPastMatch && (
                          <div className="bg-[#0b0d13] border border-purple-500/40 rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                              <div>
                                <span className="text-[9px] font-bold text-purple-400 uppercase block">
                                  {selectedPastMatch.competition} • {selectedPastMatch.date}
                                </span>
                                <h4 className="text-xs font-black text-white">
                                  {selectedPastMatch.homeRank ? `#${selectedPastMatch.homeRank} ` : ''}
                                  {selectedPastMatch.homeName} {selectedPastMatch.homeScore} - {selectedPastMatch.awayScore}{' '}
                                  {selectedPastMatch.awayRank ? `#${selectedPastMatch.awayRank} ` : ''}
                                  {selectedPastMatch.awayName}
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedPastMatch(null)}
                                className="p-1 rounded-lg bg-gray-800 text-gray-300 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                              {[
                                { label: 'Tiros', vals: selectedPastMatch.stats.shots },
                                { label: 'Al Arco', vals: selectedPastMatch.stats.sot },
                                { label: 'Atajadas', vals: selectedPastMatch.stats.saves || [0, 0] },
                                { label: 'Córners', vals: selectedPastMatch.stats.corners },
                                { label: 'Tarjetas', vals: selectedPastMatch.stats.cards || [0, 0] },
                                { label: 'Posesión', vals: selectedPastMatch.stats.possession }
                              ].map((st) => (
                                <div
                                  key={st.label}
                                  className="bg-[#141824] border border-gray-800 rounded-lg p-1.5"
                                >
                                  <span className="text-[9px] text-gray-400 block">{st.label}</span>
                                  <span className="text-[11px] font-black text-white">
                                    {st.vals[0]} - {st.vals[1]}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="rounded-xl overflow-hidden border border-emerald-700/60 bg-[#35684c] relative">
                              {/* Cabecera Equipo de Arriba (Local del Partido) */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-black/25 border-b border-white/15 text-[10px] font-extrabold text-white">
                                <div className="flex items-center gap-1.5">
                                  {selectedPastMatch.homeLogo && (
                                    <img src={selectedPastMatch.homeLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                                  )}
                                  <span>{selectedPastMatch.homeName}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-black/40 text-emerald-300">
                                  {selectedPastMatch.homeFormation || selectedPastMatch.teamFormation}
                                </span>
                              </div>

                              {/* Mitad Superior: Portero Arriba -> Delanteros Abajo */}
                              <div className="py-3.5 px-1.5 space-y-3.5 border-b border-white/30 relative">
                                <div className="w-28 h-10 border-b border-x border-white/25 mx-auto -mt-3.5 mb-1 pointer-events-none" />
                                {(selectedPastMatch.homeLineupRows || selectedPastMatch.teamLineupRows || []).map((row, rIdx) => (
                                  <div key={rIdx} className="flex items-center justify-around gap-1">
                                    {row.map((player, pIdx) => (
                                      <InteractivePitchNode
                                        key={pIdx}
                                        player={player}
                                        onSelectPlayer={setModalPlayer}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>

                              {/* Círculo Central */}
                              <div className="w-16 h-16 rounded-full border border-white/25 mx-auto -my-8 pointer-events-none" />

                              {/* Mitad Inferior Invertida: Delanteros en el Centro -> Portero Hasta Abajo */}
                              <div className="py-3.5 px-1.5 space-y-3.5 relative">
                                {[...(selectedPastMatch.awayLineupRows || selectedPastMatch.oppLineupRows || [])]
                                  .reverse()
                                  .map((row, rIdx) => (
                                    <div key={rIdx} className="flex items-center justify-around gap-1">
                                      {[...row].reverse().map((player, pIdx) => (
                                        <InteractivePitchNode
                                          key={pIdx}
                                          player={player}
                                          onSelectPlayer={setModalPlayer}
                                        />
                                      ))}
                                    </div>
                                  ))}
                                <div className="w-28 h-10 border-t border-x border-white/25 mx-auto mt-1 -mb-3.5 pointer-events-none" />
                              </div>

                              {/* Pie Equipo de Abajo (Visitante del Partido) */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-black/25 border-t border-white/15 text-[10px] font-extrabold text-white">
                                <div className="flex items-center gap-1.5">
                                  {selectedPastMatch.awayLogo && (
                                    <img src={selectedPastMatch.awayLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                                  )}
                                  <span>{selectedPastMatch.awayName}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-black/40 text-sky-300">
                                  {selectedPastMatch.awayFormation || selectedPastMatch.oppFormation}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <PlayerPitchDetailModal
        player={modalPlayer}
        onClose={() => setModalPlayer(null)}
      />
    </div>
  );
}