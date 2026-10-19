// src/App.jsx
import ClubSearchView from './components/ClubSearchView';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TopHeaderAndFilters from './components/TopHeaderAndFilters';
import BottomNav from './components/BottomNav';
import StatsExplorerView from './components/StatsExplorerView';
import BeatsBuilderView from './components/BeatsBuilderView';
import HistoryVaultView from './components/HistoryVaultView';
import { INITIAL_HISTORY_TICKETS, INITIAL_LEARNING_LOGS } from './data/historyData';
import { purgeExpiredMatchesCache } from './utils/cacheCleaner';
import { API_BASE_URL } from './utils/apiConfig';

const PINNED_CLUB_RULES = {
  BAR: { keyword: 'barcelona', leagues: ['LALIGA', 'UCL', 'UEL'] },
  RMA: { keyword: 'real madrid', leagues: ['LALIGA', 'UCL', 'UEL'] },
  BET: { keyword: 'betis', leagues: ['LALIGA', 'UCL', 'UEL'] },
  DOR: { keyword: 'dortmund', leagues: ['BUNDESLIGA', 'UCL', 'UEL'] },
  MCI: { keyword: 'manchester city', leagues: ['PREMIER', 'FA_CUP', 'UCL'] },
  CAZ: { keyword: 'cruz azul', leagues: ['LIGA_MX'] }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [pinnedTeams, setPinnedTeams] = useState(['BAR', 'RMA']);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);

  const [liveMatches, setLiveMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const [deepDataMap, setDeepDataMap] = useState({});
  const [loadingDeepId, setLoadingDeepId] = useState(null);

  // Nueva llave v2_real para arrancar sin los tickets de adorno pre-cargados
  const [savedTickets, setSavedTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('draftea_ai_tickets_v2_real');
      return saved ? JSON.parse(saved) : INITIAL_HISTORY_TICKETS;
    } catch {
      return INITIAL_HISTORY_TICKETS;
    }
  });

  const [learningLogs, setLearningLogs] = useState(() => {
    try {
      const savedLogs = localStorage.getItem('draftea_ai_learning_v2');
      return savedLogs ? JSON.parse(savedLogs) : INITIAL_LEARNING_LOGS;
    } catch {
      return INITIAL_LEARNING_LOGS;
    }
  });

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
      localStorage.setItem('draftea_ai_tickets_v2_real', JSON.stringify(savedTickets));
    } catch {
      // Ignorar
    }
  }, [savedTickets]);

  useEffect(() => {
    try {
      localStorage.setItem('draftea_ai_learning_v2', JSON.stringify(learningLogs));
    } catch {
      // Ignorar
    }
  }, [learningLogs]);

  // Auto-Verificador de Beats contra ESPN
  const handleAutoVerifyTickets = useCallback(async () => {
    if (savedTickets.length === 0) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: savedTickets,
          learningLogs
        })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.tickets)) {
        setSavedTickets(data.tickets);
        if (Array.isArray(data.learningLogs)) {
          setLearningLogs(data.learningLogs);
        }
      }
    } catch (err) {
      console.error('Error auto-verificando tickets:', err);
    } finally {
      setIsVerifying(false);
    }
  }, [savedTickets, learningLogs]);

  const globalAccuracy = useMemo(() => {
    const settledLegs = savedTickets.reduce(
      (acc, t) => acc + t.legs.filter((l) => l.hit === true || l.hit === false).length,
      0
    );
    const hitLegs = savedTickets.reduce(
      (acc, t) => acc + t.legs.filter((l) => l.hit === true).length,
      0
    );
    return settledLegs > 0 ? ((hitLegs / settledLegs) * 100).toFixed(1) : 'En espera';
  }, [savedTickets]);

  const isMatchPinned = useCallback(
    (match) => {
      if (!pinnedTeams.length) return false;
      const homeName = match.homeTeam.name.toLowerCase();
      const awayName = match.awayTeam.name.toLowerCase();

      return pinnedTeams.some((pinId) => {
        const rule = PINNED_CLUB_RULES[pinId];
        if (!rule) return false;
        const nameMatch =
          homeName.includes(rule.keyword) || awayName.includes(rule.keyword);
        return nameMatch && rule.leagues.includes(match.leagueId);
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

  const handleAddCustomLearningRule = (newRule) => {
    setLearningLogs((prev) => [newRule, ...prev]);
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
            return { ...leg, hit: nextHit };
          })
        };
      })
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
                learningLogs={learningLogs}
              />
            )}
            
              {activeTab === 'search' && (
              <ClubSearchView allMatches={liveMatches} />
            )}

            {activeTab === 'history' && (
              <HistoryVaultView
                tickets={savedTickets}
                onToggleLegResult={handleToggleLegResult}
                onToggleArchiveTicket={handleToggleArchiveTicket}
                onAutoVerifyTickets={handleAutoVerifyTickets}
                isVerifying={isVerifying}
                learningLogs={learningLogs}
                onAddCustomLearningRule={handleAddCustomLearningRule}
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