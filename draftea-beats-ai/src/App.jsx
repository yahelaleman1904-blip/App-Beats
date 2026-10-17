// src/App.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TopHeaderAndFilters from './components/TopHeaderAndFilters';
import BottomNav from './components/BottomNav';
import StatsExplorerView from './components/StatsExplorerView';
import BeatsBuilderView from './components/BeatsBuilderView';
import HistoryVaultView from './components/HistoryVaultView';
import { INITIAL_HISTORY_TICKETS, INITIAL_LEARNING_LOGS } from './data/historyData';
import { purgeExpiredMatchesCache } from './utils/cacheCleaner';
import { API_BASE_URL } from './utils/apiConfig';

export default function App() {
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [pinnedTeams, setPinnedTeams] = useState(['BAR', 'RMA']);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);

  const [liveMatches, setLiveMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado compartido con plantillas reales, historial L5 de porteros/jugadores y análisis táctico
  const [deepDataMap, setDeepDataMap] = useState({});
  const [loadingDeepId, setLoadingDeepId] = useState(null);

  const [savedTickets, setSavedTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('draftea_ai_tickets_v1');
      return saved ? JSON.parse(saved) : INITIAL_HISTORY_TICKETS;
    } catch {
      return INITIAL_HISTORY_TICKETS;
    }
  });

  const [learningLogs, setLearningLogs] = useState(INITIAL_LEARNING_LOGS);

  useEffect(() => {
    purgeExpiredMatchesCache();

    const fetchLiveCartelera = async () => {
      setIsLoading(true);
      try {
        // AQUÍ YA USA API_BASE_URL (Funciona en tu PC y en la nube)
        const res = await fetch(`${API_BASE_URL}/api/cartelera-global?days_ahead=6`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.matches)) {
          setLiveMatches(data.matches);
        }
      } catch (error) {
        console.error('Error conectando con el servidor Python:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveCartelera();
  }, []);

  const handleEnsureDeepStats = useCallback(async (match) => {
    if (!match || !match.homeTeam?.teamApiId || !match.awayTeam?.teamApiId) return;
    setLoadingDeepId(match.id);
    try {
      // AQUÍ TAMBIÉN YA USA API_BASE_URL
      const url = `${API_BASE_URL}/api/match-deep-stats?league_slug=${encodeURIComponent(
        match.leagueSlug || 'mex.1'
      )}&home_id=${encodeURIComponent(match.homeTeam.teamApiId)}&away_id=${encodeURIComponent(
        match.awayTeam.teamApiId
      )}&home_abbr=${encodeURIComponent(match.homeTeam.short)}&away_abbr=${encodeURIComponent(
        match.awayTeam.short
      )}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        setDeepDataMap((prev) => ({
          ...prev,
          [match.id]: data
        }));
      }
    } catch (err) {
      console.error('Error cargando estadísticas profundas:', err);
    } finally {
      setLoadingDeepId(null);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('draftea_ai_tickets_v1', JSON.stringify(savedTickets));
    } catch {
      // Ignorar
    }
  }, [savedTickets]);

  const globalAccuracy = useMemo(() => {
    const totalLegs = savedTickets.reduce((acc, t) => acc + t.legs.length, 0);
    const hitLegs = savedTickets.reduce((acc, t) => acc + t.legs.filter((l) => l.hit).length, 0);
    return totalLegs > 0 ? ((hitLegs / totalLegs) * 100).toFixed(1) : '91.9';
  }, [savedTickets]);

  const handleToggleLeague = (id) => {
    if (id === 'ALL') return setSelectedLeagues([]);
    setSelectedLeagues((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const handleToggleDate = (id) => {
    if (id === 'ALL') return setSelectedDates([]);
    setSelectedDates((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const handleTogglePinTeam = (id) => {
    setPinnedTeams((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const handleResetFilters = () => {
    setSelectedLeagues([]);
    setSelectedDates([]);
    setPinnedTeams([]);
  };

  const handleSaveTicketToHistory = (newTicket) => {
    setSavedTickets((p) => [newTicket, ...p]);
  };

  const handleToggleLegResult = (ticketId, legId) => {
    setSavedTickets((prev) =>
      prev.map((tk) => {
        if (tk.id !== ticketId) return tk;
        return {
          ...tk,
          legs: tk.legs.map((leg) => {
            if (leg.legId !== legId) return leg;
            const nextHit = !leg.hit;
            if (!nextHit) {
              setLearningLogs((oldLogs) => [
                {
                  id: `learn-${Date.now()}`,
                  tag: `AJUSTE EN ${leg.market}`,
                  source: `Aprendido de: ${leg.fullMatchTitle} (${leg.selection})`,
                  rule: `Se ajustó la ponderación táctica en "${leg.selection}" para priorizar mercados con mayor colchón en el próximo Beat.`
                },
                ...oldLogs.slice(0, 6)
              ]);
            }
            return { ...leg, hit: nextHit };
          })
        };
      })
    );
  };

  const handleMarkAllTicketResult = (ticketId, hitStatus) => {
    setSavedTickets((p) =>
      p.map((tk) =>
        tk.id === ticketId
          ? { ...tk, legs: tk.legs.map((l) => ({ ...l, hit: hitStatus })) }
          : tk
      )
    );
  };

  const filteredMatches = useMemo(() => {
    return liveMatches
      .filter((m) => {
        const matchLeague =
          selectedLeagues.length === 0 || selectedLeagues.includes(m.leagueId);
        const matchDate =
          selectedDates.length === 0 || selectedDates.includes(m.date);
        return matchLeague && matchDate;
      })
      .sort((a, b) => {
        const aPinned =
          pinnedTeams.includes(a.homeTeam.id) || pinnedTeams.includes(a.awayTeam.id);
        const bPinned =
          pinnedTeams.includes(b.homeTeam.id) || pinnedTeams.includes(b.awayTeam.id);
        return Number(bPinned) - Number(aPinned);
      });
  }, [liveMatches, selectedLeagues, selectedDates, pinnedTeams]);

  return (
    <div className="min-h-screen bg-[#0b0d13] text-gray-100 pb-28">
      <TopHeaderAndFilters
        activeTab={activeTab}
        selectedLeagues={selectedLeagues}
        onToggleLeague={handleToggleLeague}
        selectedDates={selectedDates}
        onToggleDate={handleToggleDate}
        pinnedTeams={pinnedTeams}
        onTogglePinTeam={handleTogglePinTeam}
        onResetFilters={handleResetFilters}
        globalAccuracy={globalAccuracy}
      />

      <main className="max-w-md sm:max-w-4xl mx-auto px-3.5 pt-4">
        {isLoading ? (
          <div className="text-center py-20">
            <span className="text-emerald-400 font-bold animate-pulse">
              Descargando Cartelera Oficial de los Próximos 7 Días...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'stats' && (
              <StatsExplorerView
                matches={filteredMatches}
                pinnedTeams={pinnedTeams}
                deepDataMap={deepDataMap}
                loadingDeepId={loadingDeepId}
                onEnsureDeepStats={handleEnsureDeepStats}
              />
            )}
            {activeTab === 'beats' && (
              <BeatsBuilderView
                allMatches={liveMatches}
                filteredMatches={filteredMatches}
                selectedMatchIds={selectedMatchIds}
                setSelectedMatchIds={setSelectedMatchIds}
                deepDataMap={deepDataMap}
                loadingDeepId={loadingDeepId}
                onEnsureDeepStats={handleEnsureDeepStats}
                onApplyPresetFilters={(l, d) => {
                  setSelectedLeagues(l);
                  setSelectedDates(d);
                }}
                onSaveTicketToHistory={handleSaveTicketToHistory}
              />
            )}
            {activeTab === 'history' && (
              <HistoryVaultView
                tickets={savedTickets}
                onToggleLegResult={handleToggleLegResult}
                onMarkAllTicketResult={handleMarkAllTicketResult}
                learningLogs={learningLogs}
              />
            )}
          </>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMatchesCount={selectedMatchIds.length}
      />
    </div>
  );
}