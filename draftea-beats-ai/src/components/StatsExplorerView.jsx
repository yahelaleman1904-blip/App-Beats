// src/components/StatsExplorerView.jsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  ShieldAlert,
  Shield,
  Target,
  Loader2,
  Brain,
  X
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

function PitchPlayerNode({ player }) {
  const getRatingColor = (r) => {
    if (r >= 8.0) return 'bg-emerald-500 text-black';
    if (r >= 7.0) return 'bg-lime-500 text-black';
    if (r >= 6.5) return 'bg-amber-400 text-black';
    return 'bg-orange-500 text-white';
  };

  return (
    <div className="flex flex-col items-center relative w-16 sm:w-20">
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#182232] border-2 border-white/85 flex items-center justify-center shadow-md">
        <span className="text-[10px] font-black text-white">{player.num}</span>

        {player.subOut && (
          <span
            title="Salió de cambio"
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
          >
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}

        {player.goals && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black text-[9px] font-black flex items-center justify-center shadow">
            ⚽{player.goals > 1 ? player.goals : ''}
          </span>
        )}

        {player.assists && !player.goals && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-400 text-black text-[8px] font-black flex items-center justify-center shadow">
            👟
          </span>
        )}

        <span
          className={`absolute -bottom-1.5 px-1.5 py-0.2 rounded text-[9px] font-black shadow ${getRatingColor(
            player.rating || 7.0
          )}`}
        >
          {(player.rating || 7.0).toFixed(1)}
        </span>
      </div>

      <span className="mt-2 text-[9px] sm:text-[10px] font-bold text-white text-center leading-tight drop-shadow truncate max-w-full">
        {player.num} {player.name}
      </span>
    </div>
  );
}

export default function StatsExplorerView({
  matches,
  pinnedTeams,
  deepDataMap,
  loadingDeepId,
  onEnsureDeepStats
}) {
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [selectedPastMatch, setSelectedPastMatch] = useState(null);
  // Estados para abrir el desglose partido por partido al dar clic en un Portero o Jugador
  const [expandedGkKey, setExpandedGkKey] = useState(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  const handleToggleMatch = async (match) => {
    triggerHaptic('light');
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null);
      setSelectedPastMatch(null);
      return;
    }

    setExpandedMatchId(match.id);
    setSelectedPastMatch(null);
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
            📊 Explorador de Enfrentamientos Vigentes ({matches.length})
          </h2>
          <p className="text-[11px] text-gray-400">
            Toca un partido para ver sus Últimos 5 Juegos, Estudio Táctico y desglose por juego de Porteros y Tiradores.
          </p>
        </div>
      </div>

      {matches.map((match) => {
        const isExpanded = expandedMatchId === match.id;
        const isPinned =
          pinnedTeams.includes(match.homeTeam.id) ||
          pinnedTeams.includes(match.awayTeam.id);

        const deep = deepDataMap[match.id];
        const recentHome = deep?.recentMatches?.home || [];
        const recentAway = deep?.recentMatches?.away || [];
        const tactical = deep?.tacticalAnalysis;
        const statsL10 = deep?.statsL10 || match.statsL10;
        const keyPlayers =
          deep?.keyPlayers?.length > 0 ? deep.keyPlayers : match.keyPlayers;
        const goalkeepers = deep?.goalkeepers || [];
        const isFetchingThis = loadingDeepId === match.id;

        return (
          <div
            key={match.id}
            className={`rounded-2xl border transition-all overflow-hidden ${
              isExpanded
                ? 'bg-[#141824] border-purple-500/70 shadow-xl shadow-purple-950/20'
                : isPinned
                ? 'bg-[#141824]/95 border-amber-500/40'
                : 'bg-[#141824]/80 border-gray-800/90 hover:border-gray-700'
            }`}
          >
            {/* CABECERA COMPACTA DEL PARTIDO */}
            <div
              onClick={() => handleToggleMatch(match)}
              className="p-3.5 cursor-pointer select-none"
            >
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded">
                    {match.leagueName}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-gray-300">
                    {match.date} • {match.time}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isPinned && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5" /> Fila Cero
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
                <div className="col-span-3 flex items-center gap-2.5">
                  <img
                    src={match.homeTeam.logo}
                    alt={match.homeTeam.name}
                    className="w-7 h-7 object-contain shrink-0"
                  />
                  <div className="truncate">
                    <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {match.homeTeam.name}
                    </p>
                    <span className="text-[9px] text-emerald-400 font-bold">LOCAL</span>
                  </div>
                </div>

                <div className="col-span-1 flex justify-center">
                  <span className="text-[10px] font-black text-gray-500 bg-[#0b0d13] px-2 py-0.5 rounded-full border border-gray-800">
                    VS
                  </span>
                </div>

                <div className="col-span-3 flex items-center justify-end gap-2.5 text-right">
                  <div className="truncate">
                    <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {match.awayTeam.name}
                    </p>
                    <span className="text-[9px] text-sky-400 font-bold">VISITANTE</span>
                  </div>
                  <img
                    src={match.awayTeam.logo}
                    alt={match.awayTeam.name}
                    className="w-7 h-7 object-contain shrink-0"
                  />
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Pick Top IA:{' '}
                    {keyPlayers?.[0]
                      ? `${keyPlayers[0].name} (${keyPlayers[0].team}) ${keyPlayers[0].propLine}`
                      : match.aiTopSignal}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {isExpanded ? 'Ocultar' : 'Abrir Investigación IA y Stats'}
                </span>
              </div>
            </div>

            {/* CAJÓN DESPLEGABLE */}
            {isExpanded && (
              <div className="border-t border-gray-800 bg-[#0e121b] p-3.5 space-y-5">
                {isFetchingThis ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <p className="text-xs font-extrabold text-white">
                      Investigando últimos 5 partidos, estilo táctico, tiradores reales y atajadas de {match.homeTeam.name} vs {match.awayTeam.name}...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* =========================================================
                        1. ÚLTIMOS 5 PARTIDOS JUGADOS DE CADA EQUIPO
                       ========================================================= */}
                    <div className="bg-[#141824] border border-purple-500/30 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-purple-400" />
                        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                          1. Últimos 5 Partidos Jugados (Toca uno para ver Stats y Alineación Real)
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Últimos 5 Local */}
                        <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center gap-2 pb-1.5 border-b border-gray-800">
                            <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                            <span className="text-xs font-extrabold text-white">
                              Últimos de {match.homeTeam.name} (Local hoy)
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {recentHome.map((pm) => {
                              const isSelected = selectedPastMatch?.id === pm.id;
                              return (
                                <button
                                  key={pm.id}
                                  onClick={() => handleSelectPastMatch(pm)}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600/25 border-purple-400 shadow'
                                      : 'bg-[#141824] border-gray-800/90 hover:border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center border shrink-0 ${getResultBadge(
                                        pm.result
                                      )}`}
                                    >
                                      {pm.result}
                                    </span>
                                    <div className="truncate">
                                      <p className="text-[11px] font-bold text-white truncate">
                                        {pm.homeName}{' '}
                                        <span className="text-emerald-400 font-black">
                                          {pm.homeScore} - {pm.awayScore}
                                        </span>{' '}
                                        {pm.awayName}
                                      </p>
                                      <span className="text-[9px] text-gray-400">
                                        {pm.date} • {pm.competition}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-purple-300 shrink-0 ml-2">
                                    {isSelected ? 'Abierto ▲' : 'Ver Cancha ▼'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Últimos 5 Visitante */}
                        <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center gap-2 pb-1.5 border-b border-gray-800">
                            <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
                            <span className="text-xs font-extrabold text-white">
                              Últimos de {match.awayTeam.name} (Visita hoy)
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {recentAway.map((pm) => {
                              const isSelected = selectedPastMatch?.id === pm.id;
                              return (
                                <button
                                  key={pm.id}
                                  onClick={() => handleSelectPastMatch(pm)}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-600/25 border-purple-400 shadow'
                                      : 'bg-[#141824] border-gray-800/90 hover:border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center border shrink-0 ${getResultBadge(
                                        pm.result
                                      )}`}
                                    >
                                      {pm.result}
                                    </span>
                                    <div className="truncate">
                                      <p className="text-[11px] font-bold text-white truncate">
                                        {pm.homeName}{' '}
                                        <span className="text-emerald-400 font-black">
                                          {pm.homeScore} - {pm.awayScore}
                                        </span>{' '}
                                        {pm.awayName}
                                      </p>
                                      <span className="text-[9px] text-gray-400">
                                        {pm.date} • {pm.competition}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-purple-300 shrink-0 ml-2">
                                    {isSelected ? 'Abierto ▲' : 'Ver Cancha ▼'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* RADIOGRAFÍA DEL PARTIDO PASADO SELECCIONADO */}
                      {selectedPastMatch && (
                        <div className="mt-3 pt-3 border-t border-purple-500/40 bg-[#0b0d13] rounded-2xl p-3.5 space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                            <div>
                              <span className="text-[10px] font-bold text-purple-400 uppercase">
                                📋 Radiografía Oficial • {selectedPastMatch.competition} ({selectedPastMatch.date})
                              </span>
                              <h4 className="text-sm font-black text-white">
                                {selectedPastMatch.homeName}{' '}
                                <span className="text-emerald-400 px-1">
                                  {selectedPastMatch.homeScore} - {selectedPastMatch.awayScore}
                                </span>{' '}
                                {selectedPastMatch.awayName}
                              </h4>
                            </div>
                            <button
                              onClick={() => setSelectedPastMatch(null)}
                              className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* PUNTO 1 CORREGIDO: "Tarjetas 🟨🟥" en vez de "Amarillas" */}
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                            {[
                              { label: 'Tiros Totales', vals: selectedPastMatch.stats.shots },
                              { label: 'Tiros al Arco', vals: selectedPastMatch.stats.sot },
                              { label: 'Atajadas 🧤', vals: selectedPastMatch.stats.saves || [0, 0] },
                              { label: 'Córners', vals: selectedPastMatch.stats.corners },
                              { label: 'Tarjetas 🟨🟥', vals: selectedPastMatch.stats.cards || selectedPastMatch.stats.yellows || [0, 0] },
                              { label: 'Posesión %', vals: selectedPastMatch.stats.possession }
                            ].map((st) => (
                              <div
                                key={st.label}
                                className="bg-[#141824] border border-gray-800 rounded-xl p-2"
                              >
                                <span className="text-[10px] text-gray-400 block">{st.label}</span>
                                <span className="text-xs font-black text-white">
                                  {st.vals[0]} <span className="text-gray-500">vs</span> {st.vals[1]}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Goleadores y Tarjetas */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="bg-[#141824] border border-gray-800 rounded-xl p-2.5">
                              <span className="text-[10px] font-extrabold text-emerald-400 uppercase block mb-1.5">
                                ⚽ Goles del Partido
                              </span>
                              {selectedPastMatch.scorers?.length > 0 ? (
                                <div className="space-y-1">
                                  {selectedPastMatch.scorers.map((sc, i) => (
                                    <div key={i} className="flex justify-between text-[11px]">
                                      <span className="font-bold text-white">
                                        {sc.player} <span className="text-gray-400">({sc.team})</span>
                                      </span>
                                      <span className="font-black text-emerald-400">{sc.min}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-500">Sin goles registrados</span>
                              )}
                            </div>

                            <div className="bg-[#141824] border border-gray-800 rounded-xl p-2.5">
                              <span className="text-[10px] font-extrabold text-amber-400 uppercase block mb-1.5">
                                🟨🟥 Tarjetas Registradas
                              </span>
                              {selectedPastMatch.cards?.length > 0 ? (
                                <div className="space-y-1">
                                  {selectedPastMatch.cards.map((cd, i) => (
                                    <div key={i} className="flex justify-between text-[11px]">
                                      <span className="font-bold text-white">
                                        {cd.type === 'red' ? '🟥' : '🟨'} {cd.player}{' '}
                                        <span className="text-gray-400">({cd.team})</span>
                                      </span>
                                      <span className="font-black text-amber-300">{cd.min}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-500">Sin tarjetas</span>
                              )}
                            </div>
                          </div>

                          {/* CANCHA TÁCTICA REAL */}
                          <div className="rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                            <div className="bg-black/40 px-3.5 py-2 flex items-center justify-between border-b border-white/15">
                              <span className="text-xs font-extrabold text-white">
                                🏟️ Alineación Usada ({selectedPastMatch.teamFormation})
                              </span>
                              <span className="text-[10px] font-bold text-emerald-300">
                                Titulares Reales de ese Partido
                              </span>
                            </div>

                            <div className="py-4 px-2 space-y-4 border-b-2 border-white/25">
                              {selectedPastMatch.teamLineupRows?.map((row, rIdx) => (
                                <div key={rIdx} className="flex items-center justify-around gap-1">
                                  {row.map((player, pIdx) => (
                                    <PitchPlayerNode key={pIdx} player={player} />
                                  ))}
                                </div>
                              ))}
                            </div>

                            <div className="py-4 px-2 space-y-4">
                              {selectedPastMatch.oppLineupRows?.map((row, rIdx) => (
                                <div key={rIdx} className="flex items-center justify-around gap-1">
                                  {row.map((player, pIdx) => (
                                    <PitchPlayerNode key={pIdx} player={player} />
                                  ))}
                                </div>
                              ))}
                            </div>

                            <div className="bg-black/40 px-3.5 py-2 flex items-center justify-between border-t border-white/15">
                              <span className="text-xs font-extrabold text-white">
                                Rival ({selectedPastMatch.oppFormation})
                              </span>
                            </div>
                          </div>

                          {selectedPastMatch.substitutions?.length > 0 && (
                            <div className="bg-[#141824] border border-gray-800 rounded-xl p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                                <ShieldAlert className="w-4 h-4 text-purple-400" />
                                <span>Sustituciones Reales (Quién entró por quién)</span>
                              </div>
                              <div className="space-y-1.5">
                                {selectedPastMatch.substitutions.map((sub, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-[#0b0d13] border border-gray-800 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                        {sub.team} • {sub.min}
                                      </span>
                                      <span className="flex items-center gap-1 text-red-400 font-semibold">
                                        <ArrowDownLeft className="w-3.5 h-3.5" /> {sub.out}
                                      </span>
                                      <span className="text-gray-500">→</span>
                                      <span className="flex items-center gap-1 text-emerald-400 font-extrabold">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> {sub.in}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-amber-300 font-medium">
                                      {sub.note}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* =========================================================
                        PUNTO 6: INVESTIGACIÓN TÁCTICA MINUCIOSA (LOCALÍA, ESTILO Y LIGA)
                       ========================================================= */}
                    {tactical && (
                      <div className="bg-gradient-to-br from-[#161c2e] to-[#111522] border border-indigo-500/40 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Brain className="w-4 h-4 text-indigo-400" />
                            2. Investigación Táctica IA (Localía, Estilo de Juego y Liga)
                          </h3>
                          <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                            {match.leagueProfile || 'Análisis de Competencia'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3 space-y-1">
                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase block">
                              🏠 Local: {match.homeTeam.name}
                            </span>
                            <p className="font-black text-white">{tactical.home.styleTag}</p>
                            <p className="text-[11px] text-gray-300 leading-relaxed">
                              {tactical.home.summary}
                            </p>
                          </div>

                          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3 space-y-1">
                            <span className="text-[10px] font-extrabold text-sky-400 uppercase block">
                              ✈️ Visitante: {match.awayTeam.name}
                            </span>
                            <p className="font-black text-white">{tactical.away.styleTag}</p>
                            <p className="text-[11px] text-gray-300 leading-relaxed">
                              {tactical.away.summary}
                            </p>
                          </div>
                        </div>

                        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-2.5 text-xs text-indigo-200 font-semibold">
                          🎯 <strong>Lectura de Partido IA:</strong> {tactical.matchScript}
                        </div>
                      </div>
                    )}

                    {/* =========================================================
                        3. TENDENCIAS, PORTEROS (DESPLEGABLES) Y JUGADORES (DESPLEGABLES)
                       ========================================================= */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-extrabold text-gray-300 uppercase tracking-wider px-1">
                        3. Estadísticas L10, Atajadas por Partido y Tiradores por Partido
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: 'Goles ↑ 0.5', val: statsL10.over05Goals },
                          { label: 'Goles ↑ 1.5', val: statsL10.over15Goals },
                          { label: 'Goles ↑ 2.5', val: statsL10.over25Goals },
                          { label: 'Ambos Anotan', val: statsL10.btts }
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="bg-[#141824] border border-gray-800 rounded-xl p-2.5"
                          >
                            <div className="flex justify-between text-[11px] font-bold mb-1">
                              <span className="text-gray-400">{item.label}</span>
                              <span className="text-emerald-400">{item.val}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${item.val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Promedio de Tiros por Equipo */}
                      <div className="bg-[#141824] border border-gray-800 rounded-xl p-3">
                        <h4 className="text-[11px] font-extrabold text-gray-300 uppercase mb-2">
                          🎯 Promedio Real de Tiros por Partido
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-[#0b0d13] p-2.5 rounded-lg border border-gray-800/80">
                            <span className="text-gray-400 block text-[10px]">
                              {match.homeTeam.name} (Local)
                            </span>
                            <span className="font-black text-white">
                              {statsL10.homeShotsAvg} tiros totales / juego
                            </span>
                            <span className="block text-[11px] text-emerald-400 font-bold">
                              {statsL10.homeSoTAvg} tiros al arco / juego
                            </span>
                          </div>
                          <div className="bg-[#0b0d13] p-2.5 rounded-lg border border-gray-800/80">
                            <span className="text-gray-400 block text-[10px]">
                              {match.awayTeam.name} (Visitante)
                            </span>
                            <span className="font-black text-white">
                              {statsL10.awayShotsAvg} tiros totales / juego
                            </span>
                            <span className="block text-[11px] text-emerald-400 font-bold">
                              {statsL10.awaySoTAvg} tiros al arco / juego
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PUNTO 2: PORTEROS CON CLIC PARA VER ATAJADAS EN CADA UNO DE LOS ÚLTIMOS 5 PARTIDOS */}
                      {goalkeepers.length > 0 && (
                        <div className="bg-[#141824] border border-sky-500/30 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-extrabold text-sky-400 uppercase flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" /> 🧤 Rendimiento y Atajadas de los Porteros (Toca el portero para ver por partido)
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {goalkeepers.map((gk, idx) => {
                              const gkKey = `${match.id}-gk-${idx}`;
                              const isGkOpen = expandedGkKey === gkKey;

                              return (
                                <div
                                  key={gkKey}
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setExpandedGkKey(isGkOpen ? null : gkKey);
                                  }}
                                  className="bg-[#0b0d13] border border-gray-800 hover:border-sky-500/50 rounded-xl p-3 cursor-pointer transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-extrabold text-white underline decoration-sky-500/50">
                                          {gk.name}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                                          {gk.team} • POR
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-400 mt-0.5">
                                        Total L5: <strong className="text-white">{gk.totalSaves} atajadas</strong> en {gk.games} juegos ({gk.conceded} goles rec.)
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-black text-sky-400 block">
                                        Prom. {gk.avgSaves} / juego
                                      </span>
                                      <span className="text-[10px] font-bold text-emerald-400">
                                        {isGkOpen ? 'Ocultar juegos ▲' : 'Ver por partido ▼'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* DESGLOSE DE ATAJADAS POR PARTIDO AL DAR CLIC */}
                                  {isGkOpen && gk.matchLogs?.length > 0 && (
                                    <div className="mt-2.5 pt-2.5 border-t border-gray-800 space-y-1.5">
                                      <span className="text-[10px] font-extrabold text-sky-300 uppercase block">
                                        Atajadas en sus últimos {gk.matchLogs.length} partidos:
                                      </span>
                                      {gk.matchLogs.map((log, lIdx) => (
                                        <div
                                          key={lIdx}
                                          className="flex items-center justify-between bg-[#141824] px-2.5 py-1.5 rounded-lg text-xs border border-gray-800/80"
                                        >
                                          <span className="font-bold text-gray-200">
                                            {log.score} <span className="text-[10px] text-gray-500">({log.date})</span>
                                          </span>
                                          <span className="font-black text-sky-400">
                                            🧤 {log.saves} {log.saves === 1 ? 'atajada' : 'atajadas'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* PUNTO 3: JUGADORES CON CLIC PARA VER TIROS, TIROS AL ARCO Y GOLES EN CADA PARTIDO */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-extrabold text-emerald-400 uppercase flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" /> 🔥 Top Jugadores con Más Tiros al Arco (Toca cualquiera para ver partido por partido)
                        </h4>

                        {keyPlayers.map((player) => {
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
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isRotationRisk
                                  ? 'bg-amber-950/15 border-amber-500/40 hover:border-amber-400'
                                  : 'bg-[#141824] border-gray-800 hover:border-emerald-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-white underline decoration-emerald-500/50">
                                    {player.name}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                    {player.team} • {player.pos}
                                  </span>
                                  {player.bancaPlus && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                      B+
                                    </span>
                                  )}
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-black text-emerald-400 block">
                                    {player.propLine} ({player.odd}x)
                                  </span>
                                  <span className="text-[10px] font-bold text-purple-300">
                                    {isPlayerOpen ? 'Ocultar partidos ▲' : 'Ver juego x juego ▼'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 mb-2">
                                {player.totalSoTL5 !== undefined && (
                                  <span>
                                    Acumulado L5: <strong className="text-emerald-400">{player.totalSoTL5} al arco</strong> ({player.totalShotsL5} totales)
                                  </span>
                                )}
                                <span>
                                  Tiros/Juego: <strong className="text-white">{player.avgShots}</strong>
                                </span>
                                <span>
                                  Al Arco/Juego: <strong className="text-emerald-400">{player.avgSoT}</strong>
                                </span>
                                <span>
                                  Goles L5: <strong className="text-purple-300">{player.goalsL5 || 0}</strong>
                                </span>
                              </div>

                              <div
                                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${
                                  isRotationRisk
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                }`}
                              >
                                {isRotationRisk ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                                <span>{player.rotationNote}</span>
                              </div>

                              {/* DESGLOSE PARTIDO POR PARTIDO DEL JUGADOR AL DAR CLIC */}
                              {isPlayerOpen && player.matchLogs?.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-gray-800 space-y-1.5">
                                  <span className="text-[10px] font-extrabold text-emerald-300 uppercase block">
                                    Desglose partido por partido de {player.name} (Últimos {player.matchLogs.length} juegos):
                                  </span>
                                  {player.matchLogs.map((log, lIdx) => (
                                    <div
                                      key={lIdx}
                                      className="flex flex-wrap items-center justify-between gap-2 bg-[#0b0d13] px-3 py-2 rounded-lg text-xs border border-gray-800"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{log.score}</span>
                                        <span className="text-[10px] text-gray-400">({log.date})</span>
                                        <span
                                          className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                            log.role === 'Titular'
                                              ? 'bg-emerald-500/15 text-emerald-300'
                                              : 'bg-amber-500/20 text-amber-300'
                                          }`}
                                        >
                                          {log.role}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3 text-[11px]">
                                        <span className="text-gray-300">
                                          Tiros: <strong className="text-white">{log.shots}</strong>
                                        </span>
                                        <span className="text-gray-300">
                                          Al Arco: <strong className="text-emerald-400">{log.sot}</strong>
                                        </span>
                                        <span className="text-gray-300">
                                          Goles: <strong className="text-purple-300">⚽ {log.goals}</strong>
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
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}