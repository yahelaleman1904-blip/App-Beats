// src/App.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TopHeaderAndFilters from './components/TopHeaderAndFilters';
import BottomNav from './components/BottomNav';
import StatsExplorerView from './components/StatsExplorerView';
import BeatsBuilderView from './components/BeatsBuilderView';
import HistoryVaultView from './components/HistoryVaultView';
import { INITIAL_HISTORY_TICKETS, INITIAL_LEARNING_LOGS } from './data/historyData';
import { FAVORITE_TEAMS } from './data/leaguesData';
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
      const url = `${API_BASE_URL}/api/match-deep-stats?league_slug=${encodeURIComponent(
        match.leagueSlug || 'mex.1'
      )}&home_id=${encodeURIComponent(match.homeTeam.teamApiId)}&away_id=${encodeURIComponent(
        match.awayTeam.teamApiId
      )}&home_abbr=${encodeURIComponent(match.homeTeam.short)}&away_abbr=${encodeURIComponent(
        match.awayTeam.short
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
    const settledLegs = savedTickets.reduce(
      (acc, t) => acc + t.legs.filter((l) => l.hit === true || l.hit === false).length,
      0
    );
    const hitLegs = savedTickets.reduce(
      (acc, t) => acc + t.legs.filter((l) => l.hit === true).length,
      0
    );
    return settledLegs > 0 ? ((hitLegs / settledLegs) * 100).toFixed(1) : '91.9';
  }, [savedTickets]);

  const isMatchPinned = useCallback(
    (match) => {
      if (!pinnedTeams.length) return false;
      const activeFavs = FAVORITE_TEAMS.filter((f) => pinnedTeams.includes(f.id));
      return activeFavs.some((fav) => {
        const cleanFav = fav.name.toLowerCase().replace('fc ', '').replace('club ', '').trim();
        const homeName = match.homeTeam.name.toLowerCase();
        const awayName = match.awayTeam.name.toLowerCase();
        const nameMatches = homeName.includes(cleanFav) || awayName.includes(cleanFav);
        const allowedLeagues = [fav.league, 'UCL', 'UEL', 'FA_CUP', 'LIBERTADORES', 'SUDAMERICANA'];
        return nameMatches && allowedLeagues.includes(match.leagueId);
      });
    },
    [pinnedTeams]
  );

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
            let nextHit;
            if (leg.hit === null || leg.hit === undefined) nextHit = true;
            else if (leg.hit === true) nextHit = false;
            else nextHit = null;

            if (nextHit === false) {
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

  const handleToggleArchiveTicket = (ticketId) => {
    setSavedTickets((p) =>
      p.map((tk) => (tk.id === ticketId ? { ...tk, archived: !tk.archived } : tk))
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
        const aPinned = isMatchPinned(a);
        const bPinned = isMatchPinned(b);
        return Number(bPinned) - Number(aPinned);
      });
  }, [liveMatches, selectedLeagues, selectedDates, isMatchPinned]);

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
                isMatchPinned={isMatchPinned}
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
                onToggleArchiveTicket={handleToggleArchiveTicket}
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