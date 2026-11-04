// src/App.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Globe,
  RefreshCw,
  BarChart2,
  Zap,
  Search,
  Trophy,
  Loader2
} from 'lucide-react';
import StatsExplorerView from './components/StatsExplorerView';
import BeatsBuilderView from './components/BeatsBuilderView';
import HistoryVaultView from './components/HistoryVaultView';
import ClubSearchView from './components/ClubSearchView';
import { LEAGUES_CATALOG, FAVORITE_TEAMS } from './data/leaguesData';
import { triggerHaptic } from './utils/haptics';

const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const RAW_API_URL = (
  IS_LOCALHOST
    ? 'http://localhost:8000'
    : (import.meta.env.VITE_API_URL || 'https://app-beats.onrender.com')
).trim();

// .trim() y .replace(/\s+/g, '') eliminan cualquier espacio oculto metido en Vercel
const API_BASE_URL = (
  !IS_LOCALHOST && RAW_API_URL.includes('localhost')
    ? 'https://app-beats.onrender.com'
    : RAW_API_URL
)
  .trim()
  .replace(/\s+/g, '')
  .replace(/\/+$/, '');

export default function App() {
  const [activeTab, setActiveTab] = useState('stats');
  const [matches, setMatches] = useState([]);
  const [deepDataMap, setDeepDataMap] = useState({});
  const [loadingCartelera, setLoadingCartelera] = useState(false);
  const [loadingDeepId, setLoadingDeepId] = useState(null);
  const [networkDebug, setNetworkDebug] = useState(null);

// Función de rescate: busca tus tickets y reglas en TODAS las llaves posibles del localStorage de tu celular
  const recoverFromLocalStorage = (type) => {
    if (typeof window === 'undefined') return [];
    const ticketKeys = [
      'draftea_history_vault',
      'beats_history_vault',
      'historyVault',
      'draftea_tickets',
      'tickets'
    ];
    const logKeys = [
      'draftea_learning_logs',
      'beats_learning_logs',
      'learningLogs',
      'draftea_rules',
      'rules'
    ];

    const targetKeys = type === 'tickets' ? ticketKeys : logKeys;

    // 1. Buscar en llaves directas conocidas
    for (const k of targetKeys) {
      try {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          if (parsed && Array.isArray(parsed[type]) && parsed[type].length > 0) {
            return parsed[type];
          }
        }
      } catch (e) {
        // continuar
      }
    }

    // 2. Escaneo profundo de TODAS las llaves del teléfono por si tenía otro nombre
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      try {
        const raw = window.localStorage.getItem(k);
        if (!raw || (!raw.startsWith('[') && !raw.startsWith('{'))) continue;
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (type === 'tickets' && first && Array.isArray(first.legs)) {
            return parsed;
          }
          if (
            type === 'learningLogs' &&
            first &&
            (first.rule || first.outcome || first.marketType || first.tag)
          ) {
            return parsed;
          }
        } else if (parsed && typeof parsed === 'object') {
          if (type === 'tickets' && Array.isArray(parsed.tickets) && parsed.tickets.length > 0) {
            return parsed.tickets;
          }
          if (
            type === 'learningLogs' &&
            Array.isArray(parsed.learningLogs) &&
            parsed.learningLogs.length > 0
          ) {
            return parsed.learningLogs;
          }
        }
      } catch (e) {
        // continuar
      }
    }
    return [];
  };

  // Estados de Beats y Bóveda de Historial inicializados con rescate local
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [historyVault, setHistoryVault] = useState(() => recoverFromLocalStorage('tickets'));
  const [learningLogs, setLearningLogs] = useState(() => recoverFromLocalStorage('learningLogs'));
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Cargar cartelera global desde el backend con diagnóstico en vivo
  const fetchLiveMatches = useCallback(async (force = false) => {
    setLoadingCartelera(true);
    setNetworkDebug(null);
    const url = `${API_BASE_URL}/api/cartelera-global?days_ahead=7${
      force ? '&force_refresh=true' : ''
    }`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        setNetworkDebug(`HTTP Error ${res.status} al pedir: ${url}`);
        return;
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.matches)) {
        setMatches(data.matches);
        if (data.matches.length === 0) {
          setNetworkDebug(`El servidor respondió OK pero con 0 partidos desde: ${url}`);
        }
      } else {
        setNetworkDebug(
          `Respuesta inválida desde ${url}: ${JSON.stringify(data).slice(0, 120)}`
        );
      }
    } catch (err) {
      console.error('Error cargando cartelera:', err);
      setNetworkDebug(
        `Fallo de Red/CORS (${err.message}) intentando conectar a: ${url}`
      );
    } finally {
      setLoadingCartelera(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMatches(false);
  }, [fetchLiveMatches]);

  // 2. Descargar estadísticas profundas verificadas
  const handleEnsureDeepStats = useCallback(
    async (match) => {
      if (!match) return;
      const cached = deepDataMap[match.id];
      const hasValidRecent =
        cached?.recentMatches?.home?.length > 0 ||
        cached?.recentMatches?.away?.length > 0;

      if (cached && hasValidRecent) return;

      setLoadingDeepId(match.id);
      try {
        const url = `${API_BASE_URL}/api/match-deep-stats?league_slug=${encodeURIComponent(
          match.leagueSlug || 'esp.1'
        )}&home_id=${encodeURIComponent(
          match.homeTeam?.teamApiId || ''
        )}&away_id=${encodeURIComponent(
          match.awayTeam?.teamApiId || ''
        )}&home_abbr=${encodeURIComponent(
          match.homeTeam?.short || 'LOC'
        )}&away_abbr=${encodeURIComponent(
          match.awayTeam?.short || 'VIS'
        )}&event_id=${encodeURIComponent(match.id)}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.ok) {
          setDeepDataMap((prev) => ({
            ...prev,
            [match.id]: data
          }));
        }
      } catch (err) {
        console.error('Error cargando deep stats:', err);
      } finally {
        setLoadingDeepId(null);
      }
    },
    [deepDataMap]
  );

  // 3. Sincronización Inteligente: UNE lo del teléfono con lo del servidor (NUNCA sobrescribe con vacío)
  const saveHistoryToBackend = useCallback(async (newTickets, newLogs) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('draftea_history_vault', JSON.stringify(newTickets));
        window.localStorage.setItem('draftea_learning_logs', JSON.stringify(newLogs));
      }
      // Protección: Nunca mandar un arreglo vacío que pueda borrar el servidor
      if (newTickets.length === 0 && newLogs.length === 0) return;

      await fetch(`${API_BASE_URL}/api/history/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: newTickets,
          learningLogs: newLogs
        })
      });
    } catch (err) {
      console.error('Error sincronizando historial:', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const localTickets = recoverFromLocalStorage('tickets');
    const localLogs = recoverFromLocalStorage('learningLogs');

    try {
      const res = await fetch(`${API_BASE_URL}/api/history`, { cache: 'no-store' });
      const data = await res.json();
      const remoteTickets = Array.isArray(data.tickets) ? data.tickets : [];
      const remoteLogs = Array.isArray(data.learningLogs) ? data.learningLogs : [];

      // Combinar sin duplicados (conserva todo lo del celular + todo lo del servidor)
      const mergedTicketsMap = new Map();
      [...localTickets, ...remoteTickets].forEach((tk) => {
        if (tk && tk.id) mergedTicketsMap.set(tk.id, tk);
      });
      const finalTickets = Array.from(mergedTicketsMap.values());

      const mergedLogsMap = new Map();
      [...localLogs, ...remoteLogs].forEach((lg, idx) => {
        if (lg) {
          const key = lg.id || `${lg.clubCode || ''}-${lg.marketType || ''}-${lg.selection || ''}-${idx}`;
          mergedLogsMap.set(key, lg);
        }
      });
      const finalLogs = Array.from(mergedLogsMap.values());

      setHistoryVault(finalTickets);
      setLearningLogs(finalLogs);

      if (typeof window !== 'undefined') {
        if (finalTickets.length > 0) {
          window.localStorage.setItem('draftea_history_vault', JSON.stringify(finalTickets));
        }
        if (finalLogs.length > 0) {
          window.localStorage.setItem('draftea_learning_logs', JSON.stringify(finalLogs));
        }
      }

      // Si el celular tenía más datos que Render (porque Render se reinició), resincronizar hacia Render
      if (finalTickets.length > remoteTickets.length || finalLogs.length > remoteLogs.length) {
        saveHistoryToBackend(finalTickets, finalLogs);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
      if (localTickets.length > 0) setHistoryVault(localTickets);
      if (localLogs.length > 0) setLearningLogs(localLogs);
    }
  }, [saveHistoryToBackend]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 4. Generar dinámicamente las píldoras de fecha (HOY, MAÑANA y siguientes días)
  const datePills = useMemo(() => {
    const daysEs = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    const monthsEs = [
      'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
      'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
    ];
    const out = [{ key: 'ALL', label: 'TODOS' }];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const isoKey = `${yyyy}-${mm}-${dd}`;
      const dayNum = d.getDate();
      const monthLabel = monthsEs[d.getMonth()];
      const dayLabel = i === 0 ? 'HOY' : daysEs[d.getDay()];

      out.push({
        key: isoKey,
        label: `${dayLabel} ${dayNum} ${monthLabel}`
      });
    }
    return out;
  }, []);

  // 5. Calcular % de efectividad global verificado desde el historial
  const hitRateStats = useMemo(() => {
    let totalSettled = 0;
    let totalHits = 0;
    historyVault.forEach((tk) => {
      (tk.legs || []).forEach((l) => {
        if (!l.isVoid && (l.hit === true || l.hit === false)) {
          totalSettled += 1;
          if (l.hit === true) totalHits += 1;
        }
      });
    });
    if (totalSettled === 0) return null;
    return ((totalHits / totalSettled) * 100).toFixed(1);
  }, [historyVault]);

  // 6. Filtrado de partidos por Liga, Fecha y Equipos Favoritos
  const isMatchPinned = useCallback(
    (match) => {
      if (selectedMatchIds.includes(match.id)) return true;
      if (selectedFavTeams.length === 0) return false;
      const hName = (match.homeTeam?.name || '').toLowerCase();
      const aName = (match.awayTeam?.name || '').toLowerCase();
      const hShort = (match.homeTeam?.short || '').toUpperCase();
      const aShort = (match.awayTeam?.short || '').toUpperCase();

      return selectedFavTeams.some((favId) => {
        const favObj = FAVORITE_TEAMS.find((f) => f.id === favId);
        if (!favObj) return false;
        const favLower = favObj.name.toLowerCase();
        return (
          hShort === favObj.id ||
          aShort === favObj.id ||
          hName.includes(favLower) ||
          aName.includes(favLower)
        );
      });
    },
    [selectedMatchIds, selectedFavTeams]
  );

  const filteredMatches = useMemo(() => {
    const list = matches.filter((m) => {
      if (selectedLeague !== 'ALL' && m.leagueId !== selectedLeague) {
        return false;
      }
      if (selectedDate !== 'ALL' && m.date !== selectedDate) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const pinA = isMatchPinned(a) ? 1 : 0;
      const pinB = isMatchPinned(b) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
    });
  }, [matches, selectedLeague, selectedDate, isMatchPinned]);

  const handleToggleFavoriteTeam = (teamId) => {
    triggerHaptic('light');
    setSelectedFavTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleResetAllFilters = () => {
    triggerHaptic('medium');
    setSelectedLeague('ALL');
    setSelectedDate('ALL');
    setSelectedFavTeams([]);
    fetchLiveMatches(true);
  };

  const handleApplyPresetFilters = (leaguesArr, teamsArr) => {
    if (Array.isArray(leaguesArr) && leaguesArr.length === 1) {
      setSelectedLeague(leaguesArr[0]);
    } else {
      setSelectedLeague('ALL');
    }
    if (Array.isArray(teamsArr)) {
      setSelectedFavTeams(teamsArr);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-white pb-24 font-sans selection:bg-purple-500/30">
      {/* CABECERA SUPERIOR */}
      <header className="sticky top-0 z-40 bg-[#090b10]/95 backdrop-blur-md border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-xs shadow-lg shadow-purple-900/30">
            D
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-tight text-white">
              DRAFTEA
            </span>
            <span className="text-[10px] font-extrabold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md">
              BEATS AI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{hitRateStats ? `${hitRateStats}% HIT` : `${matches.length} JUEGOS`}</span>
          </div>

          <button
            type="button"
            onClick={handleResetAllFilters}
            disabled={loadingCartelera}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141824] border border-gray-700 hover:border-gray-500 text-[10px] font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-3 h-3 ${
                loadingCartelera ? 'animate-spin text-purple-400' : ''
              }`}
            />
            <span>{loadingCartelera ? 'Cargando' : 'Limpiar'}</span>
          </button>
        </div>
      </header>

      {/* PANEL DE DIAGNÓSTICO DE RED (Solo aparece si ocurre un error al conectar) */}
      {networkDebug && (
        <div className="max-w-5xl mx-auto mt-2 px-3">
          <div className="bg-red-950/90 border border-red-500 text-red-200 px-3 py-2 rounded-xl text-[11px] font-mono break-all">
            <strong>DIAGNÓSTICO DE CONEXIÓN:</strong> {networkDebug}
          </div>
        </div>
      )}

      {/* BARRA DE CÍRCULOS DE LIGAS, FECHAS Y EQUIPOS FAVORITOS (Visible en Estadísticas y Crear Beats) */}
      {(activeTab === 'stats' || activeTab === 'builder') && (
        <div className="max-w-5xl mx-auto px-3 pt-3 space-y-2.5">
          {/* 1. CARRUSEL DE LAS 26 LIGAS (INCLUYE MLS Y J1 LEAGUE JAPÓN) */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1.5 no-scrollbar">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedLeague('ALL');
              }}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  selectedLeague === 'ALL'
                    ? 'bg-purple-600/25 border-purple-400 shadow-lg shadow-purple-900/30'
                    : 'bg-[#141824] border-gray-800 group-hover:border-gray-600'
                }`}
              >
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span
                className={`text-[10px] font-extrabold ${
                  selectedLeague === 'ALL' ? 'text-white' : 'text-gray-400'
                }`}
              >
                Todas
              </span>
            </button>

            {LEAGUES_CATALOG.map((lg) => {
              const active = selectedLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedLeague(active ? 'ALL' : lg.id);
                    if (!active && (lg.id === 'MLS' || lg.id === 'J1_LEAGUE')) {
                      setSelectedDate('ALL');
                    }
                  }}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-white p-2 flex items-center justify-center border-2 transition-all ${
                      active
                        ? 'border-purple-400 ring-2 ring-purple-500/40 scale-105'
                        : 'border-gray-800 opacity-90 group-hover:opacity-100'
                    }`}
                  >
                    <img
                      src={lg.logo}
                      alt={lg.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    className={`text-[10px] font-extrabold ${
                      active ? 'text-purple-300' : 'text-gray-400'
                    }`}
                  >
                    {lg.short}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. BARRA DE FILTRO POR FECHAS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {datePills.map((pill) => {
              const active = selectedDate === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedDate(pill.key);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
                    active
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/30'
                      : 'bg-[#141824] text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* 3. BARRA DE EQUIPOS FAVORITOS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FAVORITE_TEAMS.map((team) => {
              const active = selectedFavTeams.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handleToggleFavoriteTeam(team.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#141824] border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="w-4 h-4 object-contain"
                  />
                  <span>{team.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL DE VISTAS */}
      <main className="max-w-5xl mx-auto px-3 pt-3">
        {loadingCartelera && matches.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-xs font-extrabold text-gray-300">
              Cargando cartelera oficial y tablas de posiciones de ESPN...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'stats' && (
              <StatsExplorerView
                matches={filteredMatches}
                isMatchPinned={isMatchPinned}
                deepDataMap={deepDataMap}
                loadingDeepId={loadingDeepId}
                onEnsureDeepStats={handleEnsureDeepStats}
              />
            )}

            {activeTab === 'builder' && (
              <BeatsBuilderView
                allMatches={matches}
                filteredMatches={filteredMatches}
                selectedMatchIds={selectedMatchIds}
                setSelectedMatchIds={setSelectedMatchIds}
                deepDataMap={deepDataMap}
                loadingDeepId={loadingDeepId}
                onEnsureDeepStats={handleEnsureDeepStats}
                onApplyPresetFilters={handleApplyPresetFilters}
                onSaveTicketToHistory={handleSaveTicketToHistory}
                learningLogs={learningLogs}
              />
            )}

            {activeTab === 'search' && (
              <ClubSearchView apiBaseUrl={API_BASE_URL} />
            )}

            {activeTab === 'history' && (
              <HistoryVaultView
                tickets={historyVault}
                learningLogs={learningLogs}
                onToggleLegResult={handleToggleLegResult}
                onToggleArchiveTicket={handleToggleArchiveTicket}
                onAutoVerifyTickets={handleAutoVerifyTickets}
                isVerifying={isVerifying}
                onAddCustomLearningRule={handleAddCustomLearningRule}
              />
            )}
          </>
        )}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR FLOTANTE */}
      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-[#141824]/95 backdrop-blur-md border border-gray-800 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl">
        {[
          { id: 'stats', label: 'Estadísticas', icon: BarChart2 },
          { id: 'builder', label: 'Crear Beats', icon: Zap },
          { id: 'search', label: 'Buscador', icon: Search },
          { id: 'history', label: 'Historial y %', icon: Trophy }
        ].map((item) => {
          const IconComponent = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.id === 'builder' && selectedMatchIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-400 text-black text-[9px] font-black">
                  {selectedMatchIds.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}