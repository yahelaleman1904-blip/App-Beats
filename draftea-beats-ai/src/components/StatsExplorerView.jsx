// src/components/StatsExplorerView.jsx
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pin,
  Sparkles,
  History,
  Shield,
  Target,
  Loader2,
  Brain,
  Users,
  BarChart3,
  Table2,
  Clock,
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
  // Botones internos: 'general' | 'lineups' | 'squad' | 'stats' | 'last5'
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [selectedPastMatch, setSelectedPastMatch] = useState(null);
  const [expandedGkKey, setExpandedGkKey] = useState(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const [playerTeamFilter, setPlayerTeamFilter] = useState('ALL');
  // Jugador seleccionado al tocar su círculo en la cancha
  const [modalPlayer, setModalPlayer] = useState(null);

  const handleToggleMatch = async (match) => {
    triggerHaptic('light');
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null);
      setSelectedPastMatch(null);
      return;
    }

    setExpandedMatchId(match.id);
    setActiveSubTab('general');
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
            📊 Explorador de Enfrentamientos Vigentes ({matches.length})
          </h2>
          <p className="text-[11px] text-gray-400">
            Toca un partido para ver Información General, Alineaciones Interactivas, Tabla de Convocados y Últimos 5 Multi-Torneo.
          </p>
        </div>
      </div>

      {matches.map((match) => {
        const isExpanded = expandedMatchId === match.id;
        const isPinned = isMatchPinned ? isMatchPinned(match) : false;

        const deep = deepDataMap[match.id];
        const recentHome = deep?.recentMatches?.home || [];
        const recentAway = deep?.recentMatches?.away || [];
        const tactical = deep?.tacticalAnalysis;
        const confirmedLineup = deep?.confirmedLineup;
        const statsL10 = deep?.statsL10 || match.statsL10;
        const keyPlayers =
          deep?.keyPlayers?.length > 0 ? deep.keyPlayers : match.keyPlayers || [];
        const goalkeepers = deep?.goalkeepers || [];
        const isFetchingThis = loadingDeepId === match.id;

        const filteredPlayers = keyPlayers.filter((p) => {
          if (playerTeamFilter === 'HOME') return p.team === match.homeTeam.short;
          if (playerTeamFilter === 'AWAY') return p.team === match.awayTeam.short;
          return true;
        });

        // Para la tabla de convocados: usa la del partido pasado seleccionado o la del último partido de ambos clubes
        const activeSquadTable =
          selectedPastMatch?.squadTable ||
          confirmedLineup?.squadTable ||
          (recentHome[0]?.squadTable && recentAway[0]?.squadTable
            ? {
                home: recentHome[0].squadTable.home,
                away: recentAway[0].squadTable.home,
                all: [
                  ...(recentHome[0].squadTable.home || []),
                  ...(recentAway[0].squadTable.home || [])
                ].sort((a, b) => b.rating - a.rating)
              }
            : recentHome[0]?.squadTable || null);

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
            {/* CABECERA DEL PARTIDO */}
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
                    className="w-8 h-8 object-contain shrink-0"
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
                    className="w-8 h-8 object-contain shrink-0"
                  />
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Pick Top IA:{' '}
                    {keyPlayers?.[0]
                      ? `${keyPlayers[0].name} (${keyPlayers[0].team}) ${keyPlayers[0].propLine}`
                      : match.aiTopSignal}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold shrink-0 ml-2">
                  {isExpanded ? 'Cerrar ▲' : 'Abrir ▼'}
                </span>
              </div>
            </div>

            {/* CAJÓN DESPLEGABLE CON LOS 5 BOTONES DE NAVEGACIÓN */}
            {isExpanded && (
              <div className="border-t border-gray-800 bg-[#0e121b] p-3.5 space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'general', label: 'Información general', icon: Brain },
                    { id: 'lineups', label: 'Alineaciones', icon: Users },
                    { id: 'squad', label: 'Convocados (Tabla)', icon: Table2 },
                    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
                    { id: 'last5', label: 'Últimos 5 partidos', icon: History }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveSubTab(tab.id);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-black border-white shadow-md'
                            : 'bg-[#181d2a] text-gray-300 border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {isFetchingThis ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <p className="text-xs font-extrabold text-white">
                      Descargando últimos 5 juegos de Liga/Champions/Copa, convocados y tiradores reales...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* BOTÓN 1: INFORMACIÓN GENERAL */}
                    {activeSubTab === 'general' && (
                      <div className="space-y-4">
                        {tactical && (
                          <div className="bg-[#141824] border border-indigo-500/30 rounded-2xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold text-indigo-300 uppercase flex items-center gap-1.5">
                                <Brain className="w-4 h-4 text-indigo-400" /> Opinión y Lectura Táctica IA
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">
                                {match.leagueName}
                              </span>
                            </div>

                            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-2.5 text-xs text-indigo-100 leading-relaxed">
                              {tactical.matchScript}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="bg-[#0b0d13] border border-gray-800/80 rounded-xl p-2.5">
                                <span className="text-[10px] font-bold text-emerald-400 block">
                                  🏠 {match.homeTeam.name}
                                </span>
                                <span className="font-extrabold text-white text-[11px] block mt-0.5">
                                  {tactical.home.styleTag}
                                </span>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {tactical.home.summary}
                                </p>
                              </div>

                              <div className="bg-[#0b0d13] border border-gray-800/80 rounded-xl p-2.5">
                                <span className="text-[10px] font-bold text-sky-400 block">
                                  ✈️ {match.awayTeam.name}
                                </span>
                                <span className="font-extrabold text-white text-[11px] block mt-0.5">
                                  {tactical.away.styleTag}
                                </span>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {tactical.away.summary}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              <Target className="w-4 h-4 text-emerald-400" /> Jugadores Clave y Tiros al Arco
                            </h4>

                            <div className="flex items-center gap-1 bg-[#0b0d13] p-1 rounded-xl border border-gray-800 text-[10px] font-bold">
                              <button
                                onClick={() => setPlayerTeamFilter('ALL')}
                                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                                  playerTeamFilter === 'ALL'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                Ambos
                              </button>
                              <button
                                onClick={() => setPlayerTeamFilter('HOME')}
                                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                                  playerTeamFilter === 'HOME'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400'
                                }`}
                              >
                                {match.homeTeam.short}
                              </button>
                              <button
                                onClick={() => setPlayerTeamFilter('AWAY')}
                                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
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
                                  className="py-3 first:pt-1 last:pb-1 cursor-pointer transition-colors hover:bg-white/[0.02]"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                                          {player.name}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-800 text-gray-300">
                                          {player.team} • {player.pos}
                                        </span>
                                        <span
                                          className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                            isRotationRisk
                                              ? 'bg-amber-500/20 text-amber-300'
                                              : 'bg-emerald-500/15 text-emerald-300'
                                          }`}
                                        >
                                          {isRotationRisk ? '⚠️ Rotación' : '✓ Titular'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                                        <span>
                                          Al Arco/J: <strong className="text-emerald-400">{player.avgSoT}</strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                          Tiros/J: <strong className="text-white">{player.avgShots}</strong>
                                        </span>
                                        {player.totalSoTL5 !== undefined && (
                                          <>
                                            <span>•</span>
                                            <span>
                                              L5: <strong className="text-purple-300">{player.totalSoTL5} al arco</strong>
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="text-xs font-black text-emerald-400 block">
                                        {player.propLine}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-semibold">
                                        {isPlayerOpen ? 'Ocultar ▲' : 'Ver L5 ▼'}
                                      </span>
                                    </div>
                                  </div>

                                  {isPlayerOpen && player.matchLogs?.length > 0 && (
                                    <div className="mt-2.5 bg-[#0b0d13] rounded-xl p-2.5 border border-gray-800 space-y-1.5">
                                      <p className="text-[10px] text-gray-400 font-semibold">
                                        {player.rotationNote}
                                      </p>
                                      {player.matchLogs.map((log, lIdx) => (
                                        <div
                                          key={lIdx}
                                          className="flex items-center justify-between text-[11px] bg-[#141824] px-2.5 py-1.5 rounded-lg"
                                        >
                                          <div className="truncate pr-2">
                                            <span className="font-bold text-gray-200">
                                              {log.score}
                                            </span>
                                            <span className="text-[10px] text-purple-300 ml-1.5">
                                              ({log.competition || log.date})
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2.5 shrink-0">
                                            <span className="text-gray-300">
                                              Tiros: <strong className="text-white">{log.shots}</strong>
                                            </span>
                                            <span className="text-emerald-400 font-bold">
                                              Al arco: {log.sot}
                                            </span>
                                            {log.goals > 0 && (
                                              <span className="text-purple-300 font-bold">
                                                ⚽ {log.goals}
                                              </span>
                                            )}
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

                        {goalkeepers.length > 0 && (
                          <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3.5 space-y-2.5">
                            <h4 className="text-xs font-extrabold text-sky-400 flex items-center gap-1.5">
                              <Shield className="w-4 h-4" /> Porteros y Atajadas (Toca para ver por partido)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                    className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-xs font-extrabold text-white">
                                          {gk.name} ({gk.team})
                                        </span>
                                        <span className="block text-[10px] text-gray-400">
                                          {gk.totalSaves} atajadas en {gk.games} juegos
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs font-black text-sky-400 block">
                                          {gk.avgSaves} / juego
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                          {isGkOpen ? 'Cerrar ▲' : 'Ver L5 ▼'}
                                        </span>
                                      </div>
                                    </div>

                                    {isGkOpen && gk.matchLogs?.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-800 space-y-1">
                                        {gk.matchLogs.map((log, lIdx) => (
                                          <div
                                            key={lIdx}
                                            className="flex justify-between text-[11px] bg-[#141824] px-2 py-1 rounded"
                                          >
                                            <span className="text-gray-200 font-semibold truncate">
                                              {log.score} • <span className="text-purple-300">{log.competition || log.date}</span>
                                            </span>
                                            <span className="text-sky-400 font-black shrink-0 ml-2">
                                              🧤 {log.saves} atajadas
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
                      </div>
                    )}

                    {/* BOTÓN 2: ALINEACIONES INTERACTIVAS */}
                    {activeSubTab === 'lineups' && (
                      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-4">
                        {confirmedLineup?.confirmed ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-emerald-400">
                                ✅ Alineaciones Oficiales Confirmadas (Toca un jugador para ver detalle)
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {confirmedLineup.homeFormation} vs {confirmedLineup.awayFormation}
                              </span>
                            </div>

                            <div className="rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                              <div className="py-4 px-2 space-y-4 border-b-2 border-white/25">
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
                              <div className="py-4 px-2 space-y-4">
                                {confirmedLineup.awayRows.map((row, rIdx) => (
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
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center space-y-2.5">
                            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                              <Clock className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-white">
                              Alineaciones aún no confirmadas para este partido
                            </h4>
                            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                              Los clubes publican el 11 titular oficial aproximadamente <strong>60 minutos antes del inicio</strong> ({match.date} • {match.time}).
                            </p>
                            <p className="text-[11px] text-purple-300 font-semibold pt-1">
                              💡 Toca el botón &quot;Últimos 5 partidos&quot; arriba para abrir la cancha interactiva de sus juegos previos y tocar a cada jugador.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* BOTÓN 3: TABLA DE CONVOCADOS ESTILO IMAGEN 1 */}
                    {activeSubTab === 'squad' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-bold text-gray-300">
                            📋 Rendimiento y Calificación de la Plantilla Convocada (Último Partido Oficial):
                          </span>
                        </div>
                        <SquadConvocadosTable
                          squadTable={activeSquadTable}
                          homeName={match.homeTeam.name}
                          awayName={match.awayTeam.name}
                          onSelectPlayer={setModalPlayer}
                        />
                      </div>
                    )}

                    {/* BOTÓN 4: ESTADÍSTICAS GENERALES */}
                    {activeSubTab === 'stats' && (
                      <div className="space-y-4">
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

                        <div className="bg-[#141824] border border-gray-800 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs font-extrabold text-white border-b border-gray-800 pb-2">
                            <span className="text-emerald-400">{match.homeTeam.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase">
                              Promedios por Partido (Últimos 5 Multi-Torneo)
                            </span>
                            <span className="text-sky-400">{match.awayTeam.name}</span>
                          </div>

                          {[
                            {
                              label: 'Goles Promediados',
                              home: statsL10.homeGoalsAvg ?? 1.6,
                              away: statsL10.awayGoalsAvg ?? 1.3
                            },
                            {
                              label: 'Tiros Totales',
                              home: statsL10.homeShotsAvg,
                              away: statsL10.awayShotsAvg
                            },
                            {
                              label: 'Tiros al Arco',
                              home: statsL10.homeSoTAvg,
                              away: statsL10.awaySoTAvg
                            },
                            {
                              label: 'Tiros de Esquina (Córners)',
                              home: statsL10.homeCornersAvg ?? 5.2,
                              away: statsL10.awayCornersAvg ?? 4.6
                            },
                            {
                              label: 'Tarjetas por Partido 🟨🟥',
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
                                  <span className="text-[11px] text-gray-400">{row.label}</span>
                                  <span className="text-white">{row.away}</span>
                                </div>
                                <div className="w-full h-2 bg-sky-500/30 rounded-full overflow-hidden flex">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${homePct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOTÓN 5: ÚLTIMOS 5 PARTIDOS MULTI-TORNEO (LIGA / CHAMPIONS / COPA) */}
                    {activeSubTab === 'last5' && (
                      <div className="bg-[#141824] border border-purple-500/30 rounded-2xl p-3.5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Últimos 5 Local */}
                          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 space-y-2">
                            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-800">
                              <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                              <span className="text-xs font-extrabold text-white">
                                Últimos 5 de {match.homeTeam.name} (Todos los Torneos)
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
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            {pm.competition}
                                          </span>
                                          <span className="text-[9px] text-gray-400">
                                            {pm.date}
                                          </span>
                                        </div>
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
                                Últimos 5 de {match.awayTeam.name} (Todos los Torneos)
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
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            {pm.competition}
                                          </span>
                                          <span className="text-[9px] text-gray-400">
                                            {pm.date}
                                          </span>
                                        </div>
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

                        {/* RADIOGRAFÍA INTERACTIVA DEL PARTIDO PASADO SELECCIONADO */}
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

                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                              {[
                                { label: 'Tiros Totales', vals: selectedPastMatch.stats.shots },
                                { label: 'Tiros al Arco', vals: selectedPastMatch.stats.sot },
                                { label: 'Atajadas 🧤', vals: selectedPastMatch.stats.saves || [0, 0] },
                                { label: 'Córners', vals: selectedPastMatch.stats.corners },
                                { label: 'Tarjetas 🟨🟥', vals: selectedPastMatch.stats.cards || [0, 0] },
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

                            {/* CANCHA TÁCTICA INTERACTIVA (TOCA UN JUGADOR PARA VER SUS STATS Y CAMBIOS) */}
                            <div className="rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                              <div className="bg-black/45 px-3.5 py-2 flex items-center justify-between border-b border-white/15">
                                <span className="text-xs font-extrabold text-white">
                                  🏟️ Alineación Interactiva ({selectedPastMatch.teamFormation})
                                </span>
                                <span className="text-[10px] font-bold text-emerald-300">
                                  👆 Toca cualquier círculo de jugador para ver sus stats y por quién salió
                                </span>
                              </div>

                              <div className="py-4 px-2 space-y-4 border-b-2 border-white/25">
                                {selectedPastMatch.teamLineupRows?.map((row, rIdx) => (
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

                              <div className="py-4 px-2 space-y-4">
                                {selectedPastMatch.oppLineupRows?.map((row, rIdx) => (
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
                            </div>

                            {/* TABLA DE CONVOCADOS DE ESE PARTIDO */}
                            <SquadConvocadosTable
                              squadTable={selectedPastMatch.squadTable}
                              homeName={selectedPastMatch.homeName}
                              awayName={selectedPastMatch.awayName}
                              onSelectPlayer={setModalPlayer}
                            />
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

      {/* MODAL FLOTANTE AL DAR CLIC EN UN JUGADOR DE LA CANCHA O DE LA TABLA */}
      <PlayerPitchDetailModal
        player={modalPlayer}
        onClose={() => setModalPlayer(null)}
      />
    </div>
  );
}