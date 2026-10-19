// src/components/TopHeaderAndFilters.jsx
import React, { useMemo } from 'react';
import { Globe, RotateCcw } from 'lucide-react';
import { LEAGUES_CATALOG, FAVORITE_TEAMS } from '../data/leaguesData';
import { triggerHaptic } from '../utils/haptics';

function buildDynamic7Days() {
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const result = [{ id: 'ALL', label: 'TODOS' }];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    const dayLabel = i === 0 ? 'HOY' : dayNames[d.getDay()];
    const monthLabel = monthNames[d.getMonth()];
    result.push({
      id: isoDate,
      label: `${dayLabel} ${d.getDate()} ${monthLabel}`
    });
  }
  return result;
}

export default function TopHeaderAndFilters({
  activeTab,
  selectedLeagues,
  onToggleLeague,
  selectedDates,
  onToggleDate,
  pinnedTeams,
  onTogglePinTeam,
  onResetFilters,
  globalAccuracy
}) {
  const isAllLeagues = selectedLeagues.length === 0;
  const isAllDates = selectedDates.length === 0;
  const dynamicDays = useMemo(() => buildDynamic7Days(), []);

  const accuracyLabel =
    globalAccuracy === 'En espera' ? 'SIN DATOS' : `${globalAccuracy}% HIT`;

  return (
    <header className="relative z-30 bg-[#0b0d13] border-b border-gray-800/80">
      <div className="max-w-4xl mx-auto px-3 pt-2.5 pb-2 space-y-2.5">
        {/* BARRA SUPERIOR COMERCIAL */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow">
              D
            </div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                DRAFTEA
              </h1>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                BEATS AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-black text-emerald-400">
                {accuracyLabel}
              </span>
            </div>

            {(selectedLeagues.length > 0 || selectedDates.length > 0) && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onResetFilters();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800/90 text-[10px] font-bold text-gray-300 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {(activeTab === 'stats' || activeTab === 'beats') && (
          <>
            {/* CARRUSEL DE LIGAS COMPACTO */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleLeague('ALL');
                }}
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isAllLeagues
                      ? 'bg-purple-600/25 border-purple-400 shadow'
                      : 'bg-[#141824] border-gray-800 opacity-70'
                  }`}
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                </div>
                <span
                  className={`text-[9px] font-extrabold ${
                    isAllLeagues ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Todas
                </span>
              </button>

              {LEAGUES_CATALOG.map((lg) => {
                const isSelected = selectedLeagues.includes(lg.id);
                return (
                  <button
                    key={lg.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onToggleLeague(lg.id);
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer max-w-[58px]"
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-1.5 flex items-center justify-center border-2 transition-all bg-white ${
                        isSelected
                          ? 'border-purple-400 scale-105 shadow'
                          : 'border-gray-800 opacity-80'
                      }`}
                    >
                      <img
                        src={lg.logo}
                        alt={lg.short}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span
                      className={`text-[9px] font-bold truncate w-full text-center ${
                        isSelected ? 'text-purple-300 font-extrabold' : 'text-gray-400'
                      }`}
                    >
                      {lg.short}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* BARRA DE DÍAS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {dynamicDays.map((d) => {
                const active =
                  d.id === 'ALL' ? isAllDates : selectedDates.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onToggleDate(d.id);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                      active
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-[#141824] text-gray-400 border-gray-800 hover:text-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            {/* FAVORITOS / FILA CERO */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {FAVORITE_TEAMS.map((team) => {
                const pinned = pinnedTeams.includes(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onTogglePinTeam(team.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                      pinned
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/50'
                        : 'bg-[#141824] text-gray-400 border-gray-800'
                    }`}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-3.5 h-3.5 object-contain"
                    />
                    <span>{team.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </header>
  );
}