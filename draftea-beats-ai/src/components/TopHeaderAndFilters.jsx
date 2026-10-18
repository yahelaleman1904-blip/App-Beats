// src/components/TopHeaderAndFilters.jsx
import React, { useState } from 'react';
import { Wifi, Check, RotateCcw, Calendar, Pin, Globe, Trophy } from 'lucide-react';
import { LEAGUES_CATALOG, AVAILABLE_DATES, QUICK_PIN_TEAMS } from '../data/leaguesData';
import { triggerHaptic } from '../utils/haptics';

function LeagueBadgeLogo({ league }) {
  const [imgError, setImgError] = useState(false);

  if (league.id === 'ALL' || !league.logo || imgError) {
    return (
      <div className="flex flex-col items-center justify-center">
        {league.id === 'ALL' ? (
          <Globe className="w-5 h-5 text-purple-400" />
        ) : (
          <span className="text-[11px] font-black text-white tracking-tighter">
            {league.short}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-white/95 p-1 flex items-center justify-center shadow-inner">
      <img
        src={league.logo}
        alt={league.officialName}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  );
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
  globalAccuracy = 91.9
}) {
  const isHistoryView = activeTab === 'history';

  return (
    <header className="relative z-30 bg-[#0b0d13] border-b border-gray-800/80">
      <div className="max-w-md sm:max-w-3xl mx-auto px-3.5 pt-3">
        
        {/* BARRA SUPERIOR (Siempre visible pero sin dinero) */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-purple-600/25">
              D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-wider text-white text-sm sm:text-base">
                  DRAFTEA
                </span>
                <span className="text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                  BEATS AI
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {isHistoryView
                  ? 'Registro de Tickets, Efectividad y Auto-Aprendizaje'
                  : 'Stats L10 • Control de Rotaciones • Banca+ (B+)'}
              </p>
            </div>
          </div>

          {/* Estado Online + Precisión */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400">
                {globalAccuracy}% Hit
              </span>
            </div>

            <div className="flex items-center gap-1 bg-[#141824] border border-gray-800 px-2.5 py-1 rounded-full">
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-gray-300">LIVE</span>
            </div>
          </div>
        </div>

        {/* SI ESTAMOS EN HISTORIAL: Mostrar solo un banner limpio de Tickets */}
        {isHistoryView ? (
          <div className="bg-gradient-to-r from-purple-900/30 via-[#141824] to-indigo-900/20 border border-purple-500/25 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Bóveda de Tickets y Efectividad IA
                </h1>
                <p className="text-[11px] text-gray-400">
                  Toca cualquier ticket para desplegar sus selecciones y auditoría de fallos.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* SI ESTAMOS EN ESTADÍSTICAS O CREAR BEATS: Mostrar Competiciones, Fechas y Fila Cero */
          <>
            {/* Encabezado de Competiciones */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                🌍 {LEAGUES_CATALOG.length - 1} Competiciones Oficiales:
              </span>
              {(selectedLeagues.length > 0 || selectedDates.length > 0 || pinnedTeams.length > 0) && (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    onResetFilters();
                  }}
                  className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar filtros
                </button>
              )}
            </div>

            {/* CARRUSEL CON LOGOS OFICIALES */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1.5">
              {LEAGUES_CATALOG.map((league) => {
                const isAll = league.id === 'ALL';
                const isActive = isAll
                  ? selectedLeagues.length === 0
                  : selectedLeagues.includes(league.id);

                return (
                  <button
                    key={league.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onToggleLeague(league.id);
                    }}
                    title={league.officialName}
                    className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer w-[62px]"
                  >
                    <div
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                        isActive
                          ? 'bg-purple-600/25 border-purple-500 shadow-md shadow-purple-600/30 scale-105'
                          : 'bg-[#141824] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <LeagueBadgeLogo league={league} />

                      {isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold text-center leading-tight line-clamp-1 w-full ${
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                    >
                      {league.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* BARRA DE FECHAS (Multi-selección) */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 shrink-0 mr-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                <span>DÍAS:</span>
              </div>

              {AVAILABLE_DATES.map((dateObj) => {
                const isAll = dateObj.id === 'ALL';
                const isActive = isAll
                  ? selectedDates.length === 0
                  : selectedDates.includes(dateObj.id);

                return (
                  <button
                    key={dateObj.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onToggleDate(dateObj.id);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-600/30'
                        : 'bg-[#141824] text-gray-400 border-gray-800 hover:text-gray-200'
                    }`}
                  >
                    {dateObj.label}
                  </button>
                );
              })}
            </div>

            {/* FILA CERO: EQUIPOS FIJADOS (PIN) */}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-800/60 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0 mr-1">
                <Pin className="w-3 h-3" />
                <span>FILA CERO:</span>
              </div>

              {QUICK_PIN_TEAMS.map((team) => {
                const isPinned = pinnedTeams.includes(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => {
                      triggerHaptic('medium');
                      onTogglePinTeam(team.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer border ${
                      isPinned
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-[#141824]/90 text-gray-400 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-3.5 h-3.5 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span>{team.name}</span>
                    {isPinned && <span className="text-amber-400">📌</span>}
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