// src/components/ClubSearchView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Users,
  BarChart3,
  History,
  Table2,
  Loader2,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';
import { triggerHaptic } from '../utils/haptics';
import {
  InteractivePitchNode,
  PlayerPitchDetailModal,
  SquadConvocadosTable
} from './InteractivePitchAndTable';

export default function ClubSearchView({ allMatches }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [clubProfile, setClubProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Qué partido de los últimos 5 del club estamos inspeccionando (por defecto el más reciente)
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  // Botón activo dentro de la vista del club: 'overview' | 'lineup' | 'stats' | 'squad' | 'last5'
  const [activeClubTab, setActiveClubTab] = useState('overview');
  // Jugador seleccionado al tocar su círculo en la alineación
  const [modalPlayer, setModalPlayer] = useState(null);

  // Construir catálogo local instantáneo desde los partidos cargados + autocompletado del backend
  const localCatalog = useMemo(() => {
    const map = {};
    allMatches.forEach((m) => {
      if (m.homeTeam?.teamApiId) {
        map[m.homeTeam.teamApiId] = {
          teamId: m.homeTeam.teamApiId,
          name: m.homeTeam.name,
          short: m.homeTeam.short,
          logo: m.homeTeam.logo,
          leagueSlug: m.leagueSlug,
          leagueName: m.leagueName
        };
      }
      if (m.awayTeam?.teamApiId) {
        map[m.awayTeam.teamApiId] = {
          teamId: m.awayTeam.teamApiId,
          name: m.awayTeam.name,
          short: m.awayTeam.short,
          logo: m.awayTeam.logo,
          leagueSlug: m.leagueSlug,
          leagueName: m.leagueName
        };
      }
    });
    return Object.values(map);
  }, [allMatches]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSuggestions(localCatalog.slice(0, 10));
      return;
    }

    // Filtrado instantáneo tipo Google mientras escribes "Bar" -> Barcelona, Barracas Central...
    const localFiltered = localCatalog.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q)
    );
    setSuggestions(localFiltered.slice(0, 10));

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/teams/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.teams) && data.teams.length > 0) {
          setSuggestions(data.teams);
        }
      } catch {
        // Usar catálogo local si falla red
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, localCatalog]);

  const handleSelectClub = async (club) => {
    triggerHaptic('medium');
    setSelectedClub(club);
    setSearchQuery('');
    setIsLoadingProfile(true);
    setActiveMatchIndex(0);
    setActiveClubTab('overview');

    try {
      const url = `${API_BASE_URL}/api/team-profile?team_id=${encodeURIComponent(
        club.teamId
      )}&league_slug=${encodeURIComponent(
        club.leagueSlug || 'esp.1'
      )}&team_name=${encodeURIComponent(club.name)}&team_abbr=${encodeURIComponent(
        club.short
      )}&team_logo=${encodeURIComponent(club.logo || '')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setClubProfile(data);
      }
    } catch (err) {
      console.error('Error cargando perfil del club:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const inspectedMatch =
    clubProfile?.last5Matches?.[activeMatchIndex] || clubProfile?.latestMatch;

  return (
    <div className="space-y-4">
      {/* BUSCADOR INTELIGENTE CON AUTOCOMPLETADO ESTILO GOOGLE */}
      <div className="bg-[#141824] border border-purple-500/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-300">
            🔍 Buscador Global de Clubes, Plantillas y Convocados
          </h2>
        </div>

        <div className="relative">
          <div className="flex items-center bg-[#0b0d13] border border-gray-700 focus-within:border-purple-400 rounded-xl px-3.5 py-2.5">
            <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe el nombre de un equipo (ej. Bar → Barcelona, Barracas, Real Madrid, Cruz Azul)..."
              className="w-full bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lista de sugerencias estilo Google */}
          {(searchQuery.trim().length > 0 || !selectedClub) &&
            suggestions.length > 0 && (
              <div className="mt-2 bg-[#0b0d13] border border-gray-800 rounded-xl divide-y divide-gray-800/80 max-h-64 overflow-y-auto shadow-xl">
                {suggestions.map((club) => (
                  <button
                    key={`${club.teamId}-${club.name}`}
                    onClick={() => handleSelectClub(club)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-purple-600/20 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={club.name}
                          className="w-6 h-6 object-contain shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-800 text-[10px] font-black flex items-center justify-center text-white">
                          {club.short}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                          {club.name}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {club.leagueName} • {club.short}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-400 shrink-0">
                      Ver Club →
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* VISTA DEL CLUB SELECCIONADO */}
      {isLoadingProfile && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-center bg-[#141824] rounded-2xl border border-gray-800">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          <p className="text-xs font-extrabold text-white">
            Descargando últimos 5 partidos multi-torneo, plantilla titular y tabla de convocados de {selectedClub?.name}...
          </p>
        </div>
      )}

      {!isLoadingProfile && selectedClub && clubProfile && (
        <div className="space-y-4">
          {/* CABECERA CON LOGO DEL CLUB Y NOMBRE AL LADO */}
          <div className="bg-gradient-to-r from-[#161c2e] via-[#141824] to-[#161c2e] border border-purple-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {selectedClub.logo && (
                <img
                  src={selectedClub.logo}
                  alt={selectedClub.name}
                  className="w-14 h-14 object-contain shrink-0"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {selectedClub.name}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {selectedClub.short}
                  </span>
                </div>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">
                  {clubProfile.tactics?.styleTag}
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  {clubProfile.tactics?.summary}
                </p>
              </div>
            </div>
          </div>

          {/* BOTONES DE NAVEGACIÓN DEL CLUB */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'overview', label: 'Plantilla + Stats (Último Juego)', icon: Sparkles },
              { id: 'squad', label: 'Convocados (Tabla)', icon: Table2 },
              { id: 'lineup', label: 'Alineación Interactiva', icon: Users },
              { id: 'stats', label: 'Estadísticas del Partido', icon: BarChart3 },
              { id: 'last5', label: 'Últimos 5 (Liga/Champions/Copa)', icon: History }
            ].map((btn) => {
              const Icon = btn.icon;
              const active = activeClubTab === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveClubTab(btn.id);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-[#181d2a] text-gray-300 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* SELECTOR RÁPIDO DE LOS ÚLTIMOS 5 PARTIDOS DEL CLUB (CON ETIQUETA DE COMPETICIÓN) */}
          {clubProfile.last5Matches?.length > 0 && (
            <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">
                📅 Últimos 5 Partidos Jugados (Todas las Competiciones — Toca cualquiera para ver su Plantilla, Cambios y Tabla):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {clubProfile.last5Matches.map((m, idx) => {
                  const isCurrent = activeMatchIndex === idx;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveMatchIndex(idx);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-600/25 border-purple-400 shadow'
                          : 'bg-[#0b0d13] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold text-purple-300 mb-1">
                        <span className="truncate">{m.competition}</span>
                        <span>{m.date}</span>
                      </div>
                      <p className="text-xs font-black text-white truncate">
                        {m.homeAbbr || m.homeName}{' '}
                        <span className="text-emerald-400">
                          {m.homeScore}-{m.awayScore}
                        </span>{' '}
                        {m.awayAbbr || m.awayName}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CONTENIDO SEGÚN EL BOTÓN SELECCIONADO */}
          {inspectedMatch && (
            <>
              {/* VISTA PRINCIPAL: PLANTILLA DEL ÚLTIMO PARTIDO Y A UN LADO LAS ESTADÍSTICAS DEL MISMO */}
              {activeClubTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Lado Izquierdo: Cancha Interactiva */}
                  <div className="lg:col-span-7 rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                    <div className="bg-black/45 px-3.5 py-2.5 flex items-center justify-between border-b border-white/15">
                      <div>
                        <span className="text-xs font-extrabold text-white block">
                          🏟️ {inspectedMatch.homeName} {inspectedMatch.homeScore} - {inspectedMatch.awayScore} {inspectedMatch.awayName}
                        </span>
                        <span className="text-[10px] text-emerald-300 font-bold">
                          {inspectedMatch.competition} • Toca cualquier círculo de jugador para ver sus stats y por quién salió
                        </span>
                      </div>
                    </div>

                    <div className="py-4 px-2 space-y-4 border-b-2 border-white/25">
                      {inspectedMatch.teamLineupRows?.map((row, rIdx) => (
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
                      {inspectedMatch.oppLineupRows?.map((row, rIdx) => (
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

                  {/* Lado Derecho: Estadísticas del Partido y Goles/Tarjetas */}
                  <div className="lg:col-span-5 bg-[#141824] border border-gray-800 rounded-2xl p-4 space-y-4">
                    <div className="border-b border-gray-800 pb-2.5">
                      <span className="text-[10px] font-bold text-purple-400 uppercase">
                        {inspectedMatch.competition} • {inspectedMatch.date}
                      </span>
                      <h4 className="text-sm font-black text-white">
                        Estadísticas Oficiales del Partido
                      </h4>
                    </div>

                    {[
                      { label: 'Remates Totales', vals: inspectedMatch.stats.shots },
                      { label: 'Remates al Arco', vals: inspectedMatch.stats.sot },
                      { label: 'Posesión %', vals: inspectedMatch.stats.possession },
                      { label: 'Atajadas 🧤', vals: inspectedMatch.stats.saves || [0, 0] },
                      { label: 'Tiros de Esquina', vals: inspectedMatch.stats.corners },
                      { label: 'Tarjetas 🟨🟥', vals: inspectedMatch.stats.cards || [0, 0] }
                    ].map((st) => {
                      const total = Math.max(1, Number(st.vals[0]) + Number(st.vals[1]));
                      const hPct = Math.round((Number(st.vals[0]) / total) * 100);
                      return (
                        <div key={st.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-emerald-400">{st.vals[0]}</span>
                            <span className="text-[11px] text-gray-300">{st.label}</span>
                            <span className="text-sky-400">{st.vals[1]}</span>
                          </div>
                          <div className="w-full h-1.5 bg-sky-500/30 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${hPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Goles del Partido */}
                    <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase block">
                        ⚽ Goles ({inspectedMatch.homeScore}-{inspectedMatch.awayScore})
                      </span>
                      {inspectedMatch.scorers?.length > 0 ? (
                        inspectedMatch.scorers.map((sc, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-white font-bold">
                              {sc.player} <span className="text-emerald-300">({sc.team})</span>
                            </span>
                            <span className="text-emerald-400 font-black">{sc.min}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-500">0 - 0</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BOTÓN CONVOCADOS (TABLA IDÉNTICA A IMAGEN 1) */}
              {activeClubTab === 'squad' && (
                <SquadConvocadosTable
                  squadTable={inspectedMatch.squadTable}
                  homeName={inspectedMatch.homeName}
                  awayName={inspectedMatch.awayName}
                  onSelectPlayer={setModalPlayer}
                />
              )}

              {/* BOTÓN ALINEACIÓN INTERACTIVA */}
              {activeClubTab === 'lineup' && (
                <div className="rounded-2xl overflow-hidden border-2 border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                  <div className="bg-black/45 px-3.5 py-2.5 flex items-center justify-between border-b border-white/15">
                    <span className="text-xs font-extrabold text-white">
                      🏟️ {inspectedMatch.homeName} vs {inspectedMatch.awayName} ({inspectedMatch.competition})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300">
                      Toca un círculo para abrir estadísticas y cambios del jugador
                    </span>
                  </div>
                  <div className="py-4 px-2 space-y-4 border-b-2 border-white/25">
                    {inspectedMatch.teamLineupRows?.map((row, rIdx) => (
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
                    {inspectedMatch.oppLineupRows?.map((row, rIdx) => (
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
              )}

              {/* BOTÓN ESTADÍSTICAS */}
              {activeClubTab === 'stats' && (
                <div className="bg-[#141824] border border-gray-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-white uppercase">
                    Comparativa Oficial • {inspectedMatch.homeName} vs {inspectedMatch.awayName}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    {[
                      { label: 'Tiros Totales', vals: inspectedMatch.stats.shots },
                      { label: 'Tiros al Arco', vals: inspectedMatch.stats.sot },
                      { label: 'Atajadas 🧤', vals: inspectedMatch.stats.saves || [0, 0] },
                      { label: 'Córners', vals: inspectedMatch.stats.corners },
                      { label: 'Tarjetas 🟨🟥', vals: inspectedMatch.stats.cards || [0, 0] },
                      { label: 'Posesión %', vals: inspectedMatch.stats.possession }
                    ].map((st) => (
                      <div
                        key={st.label}
                        className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5"
                      >
                        <span className="text-[10px] text-gray-400 block">{st.label}</span>
                        <span className="text-xs font-black text-white">
                          {st.vals[0]} vs {st.vals[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÓN ÚLTIMOS 5 PARTIDOS CON TABLA DE JUGADORES ABAJO */}
              {activeClubTab === 'last5' && (
                <div className="space-y-4">
                  <SquadConvocadosTable
                    squadTable={inspectedMatch.squadTable}
                    homeName={inspectedMatch.homeName}
                    awayName={inspectedMatch.awayName}
                    onSelectPlayer={setModalPlayer}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL FLOTANTE AL DAR CLIC EN UN JUGADOR DE LA CANCHA O DE LA TABLA */}
      <PlayerPitchDetailModal
        player={modalPlayer}
        onClose={() => setModalPlayer(null)}
      />
    </div>
  );
}