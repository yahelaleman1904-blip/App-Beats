// src/components/ClubSearchView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
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

  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [activeClubTab, setActiveClubTab] = useState('overview');
  const [modalPlayer, setModalPlayer] = useState(null);

  const stripEmojis = (str) =>
    String(str || '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '')
      .trim();

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
        // Ignorar
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
    <div className="space-y-3">
      {/* BUSCADOR LIMPIO */}
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-2.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
          BUSCADOR DE CLUBES
        </h2>

        <div className="relative">
          <div className="flex items-center bg-[#0b0d13] border border-gray-700 focus-within:border-purple-400 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar club..."
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

          {(searchQuery.trim().length > 0 || !selectedClub) &&
            suggestions.length > 0 && (
              <div className="mt-2 bg-[#0b0d13] border border-gray-800 rounded-xl divide-y divide-gray-800/80 max-h-60 overflow-y-auto">
                {suggestions.map((club) => (
                  <button
                    key={`${club.teamId}-${club.name}`}
                    onClick={() => handleSelectClub(club)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-600/20 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={club.name}
                          className="w-6 h-6 object-contain shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-800 text-[9px] font-black flex items-center justify-center text-white">
                          {club.short}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-extrabold text-white truncate">
                          {club.name}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {club.leagueName} • {club.short}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-400 shrink-0">
                      Abrir
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {isLoadingProfile && (
        <div className="py-12 flex items-center justify-center gap-2 bg-[#141824] rounded-2xl border border-gray-800">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-xs font-bold text-gray-300">Cargando club...</span>
        </div>
      )}

      {!isLoadingProfile && selectedClub && clubProfile && (
        <div className="space-y-3">
          {/* CABECERA DEL CLUB */}
          <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3.5 flex items-center gap-3">
            {selectedClub.logo && (
              <img
                src={selectedClub.logo}
                alt={selectedClub.name}
                className="w-11 h-11 object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {selectedClub.name}
                </h3>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {selectedClub.short}
                </span>
              </div>
              <p className="text-[11px] font-bold text-emerald-400 mt-0.5">
                {stripEmojis(clubProfile.tactics?.styleTag)}
              </p>
            </div>
          </div>

          {/* BOTONES DE VISTAS SOLO CON TÍTULOS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'overview', label: 'Resumen' },
              { id: 'squad', label: 'Convocados' },
              { id: 'lineup', label: 'Alineación' },
              { id: 'stats', label: 'Estadísticas' }
            ].map((btn) => {
              const active = activeClubTab === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveClubTab(btn.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-black border-white'
                      : 'bg-[#181d2a] text-gray-300 border-gray-700'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* TIRA HORIZONTAL DE ÚLTIMOS 5 PARTIDOS */}
          {clubProfile.last5Matches?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {clubProfile.last5Matches.map((m, idx) => {
                const isCurrent = activeMatchIndex === idx;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveMatchIndex(idx);
                    }}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-purple-600/25 border-purple-400'
                        : 'bg-[#141824] border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-bold text-purple-300 mb-0.5">
                      <span className="truncate">{m.competition}</span>
                      <span className="shrink-0 ml-1">{m.date}</span>
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
          )}

          {inspectedMatch && (
            <>
              {activeClubTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                  <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                    <div className="bg-black/45 px-3 py-2 flex items-center justify-between border-b border-white/15">
                      <span className="text-xs font-extrabold text-white">
                        {inspectedMatch.homeName} {inspectedMatch.homeScore} - {inspectedMatch.awayScore} {inspectedMatch.awayName}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-bold">
                        {inspectedMatch.competition}
                      </span>
                    </div>

                    <div className="py-3 px-1.5 space-y-3.5 border-b border-white/25">
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

                    <div className="py-3 px-1.5 space-y-3.5">
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

                  <div className="lg:col-span-5 bg-[#141824] border border-gray-800 rounded-2xl p-3.5 space-y-3">
                    <h4 className="text-xs font-black text-white uppercase border-b border-gray-800 pb-2">
                      ESTADÍSTICAS DEL PARTIDO
                    </h4>

                    {[
                      { label: 'Remates', vals: inspectedMatch.stats.shots },
                      { label: 'Remates al Arco', vals: inspectedMatch.stats.sot },
                      { label: 'Posesión %', vals: inspectedMatch.stats.possession },
                      { label: 'Atajadas', vals: inspectedMatch.stats.saves || [0, 0] },
                      { label: 'Córners', vals: inspectedMatch.stats.corners },
                      { label: 'Tarjetas', vals: inspectedMatch.stats.cards || [0, 0] }
                    ].map((st) => {
                      const total = Math.max(1, Number(st.vals[0]) + Number(st.vals[1]));
                      const hPct = Math.round((Number(st.vals[0]) / total) * 100);
                      return (
                        <div key={st.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-emerald-400">{st.vals[0]}</span>
                            <span className="text-[10px] text-gray-300">{st.label}</span>
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

              {activeClubTab === 'lineup' && (
                <div className="rounded-2xl overflow-hidden border border-emerald-700/60 bg-gradient-to-b from-[#256343] via-[#2b724e] to-[#256343]">
                  <div className="py-3 px-1.5 space-y-3.5 border-b border-white/25">
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
                  <div className="py-3 px-1.5 space-y-3.5">
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

              {activeClubTab === 'stats' && (
                <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3.5">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
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
                        className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2"
                      >
                        <span className="text-[10px] text-gray-400 block">{st.label}</span>
                        <span className="text-xs font-black text-white">
                          {st.vals[0]} - {st.vals[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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