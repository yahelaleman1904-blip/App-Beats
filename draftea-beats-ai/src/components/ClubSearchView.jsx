// src/components/ClubSearchView.jsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  X
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import {
  InteractivePitchNode,
  PlayerPitchDetailModal,
  SquadConvocadosTable
} from './InteractivePitchAndTable';

export default function ClubSearchView({ apiBaseUrl }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [selectedClub, setSelectedClub] = useState(null);
  const [clubProfile, setClubProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [inspectedMatch, setInspectedMatch] = useState(null);
  const [activeClubTab, setActiveClubTab] = useState('lineup');
  const [modalPlayer, setModalPlayer] = useState(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/teams/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        if (active && data.ok) {
          setSuggestions(data.teams || []);
        }
      } catch {
        // Silencioso
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, apiBaseUrl]);

  const handleSelectClub = async (club) => {
    triggerHaptic('medium');
    setSelectedClub(club);
    setLoadingProfile(true);
    setClubProfile(null);
    setInspectedMatch(null);

    try {
      const url = `${apiBaseUrl}/api/team-profile?team_id=${encodeURIComponent(
        club.teamId
      )}&league_slug=${encodeURIComponent(
        club.leagueSlug
      )}&team_name=${encodeURIComponent(
        club.name
      )}&team_abbr=${encodeURIComponent(
        club.short
      )}&team_logo=${encodeURIComponent(club.logo || '')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setClubProfile(data);
        setInspectedMatch(data.latestMatch || data.last5Matches?.[0] || null);
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingProfile(false);
    }
  };

  const getResultBadge = (res) => {
    if (res === 'W') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (res === 'D') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-red-500/20 text-red-400 border-red-500/40';
  };

  return (
    <div className="space-y-3">
      {/* BUSCADOR */}
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar club (ej. Barcelona, Real Madrid, Betis, América...)"
            className="w-full bg-[#0b0d13] border border-gray-800 focus:border-purple-500 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-gray-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setQuery('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-1 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Buscando...</span>
            </div>
          ) : (
            suggestions.map((club) => {
              const isSelected = selectedClub?.teamId === club.teamId;
              return (
                <button
                  key={`${club.leagueSlug}-${club.teamId}`}
                  type="button"
                  onClick={() => handleSelectClub(club)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/25 border-purple-400 text-white'
                      : 'bg-[#0b0d13] border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {club.logo && (
                    <img src={club.logo} alt={club.name} className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-[11px] font-extrabold">{club.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* PERFIL DEL CLUB */}
      {loadingProfile && (
        <div className="bg-[#141824] border border-gray-800 rounded-2xl p-8 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-xs font-bold text-gray-300">
            Cargando partidos de {selectedClub?.name}...
          </span>
        </div>
      )}

      {clubProfile && !loadingProfile && (
        <div className="space-y-3">
          {/* CABECERA COMPACTA DEL CLUB */}
          <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {clubProfile.club.logo && (
                <img
                  src={clubProfile.club.logo}
                  alt={clubProfile.club.name}
                  className="w-9 h-9 object-contain shrink-0"
                />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white truncate">
                  {clubProfile.club.name}
                </h3>
                <span className="text-[10px] font-bold text-purple-300 block truncate">
                  GF: {clubProfile.tactics?.avgGoalsFor}/J • GC: {clubProfile.tactics?.avgGoalsAgainst}/J • Arco: {clubProfile.tactics?.avgSoT}/J
                </span>
              </div>
            </div>
          </div>

          {/* TIRA DE ÚLTIMOS 5 PARTIDOS CON POSICIÓN EN LA TABLA (#) */}
          <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-2">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 block">
              ÚLTIMOS 5 PARTIDOS OFICIALES
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
              {clubProfile.last5Matches?.map((m) => {
                const active = inspectedMatch?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setInspectedMatch(m);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-purple-600/25 border-purple-400'
                        : 'bg-[#0b0d13] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${getResultBadge(
                          m.result
                        )}`}
                      >
                        {m.result}
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">{m.date}</span>
                    </div>
                    <p className="text-[11px] font-extrabold text-white truncate">
                      {m.homeRank ? `#${m.homeRank} ` : ''}{m.homeAbbr}{' '}
                      <span className="text-emerald-400">{m.homeScore}-{m.awayScore}</span>{' '}
                      {m.awayRank ? `#${m.awayRank} ` : ''}{m.awayAbbr}
                    </p>
                    <span className="text-[9px] font-bold text-purple-300 block truncate mt-0.5">
                      {m.competition}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INSPECTOR DEL PARTIDO SELECCIONADO */}
          {inspectedMatch && (
            <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-800 pb-2.5">
                <div>
                  <span className="text-[9px] font-extrabold text-purple-400 uppercase block">
                    {inspectedMatch.competition} • {inspectedMatch.fullDate}
                  </span>
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    {inspectedMatch.homeRank ? `#${inspectedMatch.homeRank} ` : ''}
                    {inspectedMatch.homeName}{' '}
                    <span className="text-emerald-400">
                      {inspectedMatch.homeScore} - {inspectedMatch.awayScore}
                    </span>{' '}
                    {inspectedMatch.awayRank ? `#${inspectedMatch.awayRank} ` : ''}
                    {inspectedMatch.awayName}
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { id: 'lineup', label: 'Alineación' },
                    { id: 'squad', label: 'Convocados' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveClubTab(t.id);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-all ${
                        activeClubTab === t.id
                          ? 'bg-white text-black'
                          : 'bg-[#0b0d13] text-gray-300 border border-gray-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                {[
                  { label: 'Tiros', vals: inspectedMatch.stats.shots },
                  { label: 'Al Arco', vals: inspectedMatch.stats.sot },
                  { label: 'Atajadas', vals: inspectedMatch.stats.saves || [0, 0] },
                  { label: 'Córners', vals: inspectedMatch.stats.corners },
                  { label: 'Tarjetas', vals: inspectedMatch.stats.cards || [0, 0] },
                  { label: 'Posesión', vals: inspectedMatch.stats.possession }
                ].map((st) => (
                  <div
                    key={st.label}
                    className="bg-[#0b0d13] border border-gray-800 rounded-lg p-1.5"
                  >
                    <span className="text-[9px] text-gray-400 block">{st.label}</span>
                    <span className="text-[11px] font-black text-white">
                      {st.vals[0]} - {st.vals[1]}
                    </span>
                  </div>
                ))}
              </div>

              {activeClubTab === 'lineup' && (
                <div className="rounded-xl overflow-hidden border border-emerald-700/60 bg-[#35684c] relative">
                  {/* Cabecera Equipo Local (Arriba) */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-black/25 border-b border-white/15 text-[10px] font-extrabold text-white">
                    <div className="flex items-center gap-1.5">
                      {inspectedMatch.homeLogo && (
                        <img src={inspectedMatch.homeLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                      )}
                      <span>{inspectedMatch.homeName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-black/40 text-emerald-300">
                      {inspectedMatch.homeFormation || inspectedMatch.teamFormation}
                    </span>
                  </div>

                  {/* Mitad Superior: Portero Arriba -> Delanteros en el Centro */}
                  <div className="py-3.5 px-1.5 space-y-3.5 border-b border-white/30 relative">
                    <div className="w-28 h-10 border-b border-x border-white/25 mx-auto -mt-3.5 mb-1 pointer-events-none" />
                    {(inspectedMatch.homeLineupRows || inspectedMatch.teamLineupRows || []).map((row, rIdx) => (
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
                    {[...(inspectedMatch.awayLineupRows || inspectedMatch.oppLineupRows || [])]
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

                  {/* Pie Equipo Visitante (Abajo) */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-black/25 border-t border-white/15 text-[10px] font-extrabold text-white">
                    <div className="flex items-center gap-1.5">
                      {inspectedMatch.awayLogo && (
                        <img src={inspectedMatch.awayLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                      )}
                      <span>{inspectedMatch.awayName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-black/40 text-sky-300">
                      {inspectedMatch.awayFormation || inspectedMatch.oppFormation}
                    </span>
                  </div>
                </div>
              )}

              {activeClubTab === 'squad' && (
                <SquadConvocadosTable
                  squadTable={{
                    home: inspectedMatch.mySquad || inspectedMatch.squadTable?.home || [],
                    away: inspectedMatch.oppSquad || inspectedMatch.squadTable?.away || [],
                    all: inspectedMatch.mySquad || inspectedMatch.squadTable?.all || []
                  }}
                  homeName={selectedClub.name}
                  awayName="Rival de ese partido"
                  onSelectPlayer={setModalPlayer}
                />
              )}
            </div>
          )}
        </div>
      )}

      <PlayerPitchDetailModal
        player={modalPlayer}
        onClose={() => setModalPlayer(null)}
      />
    </div>
  );
}