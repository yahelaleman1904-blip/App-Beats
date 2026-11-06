// draftea-beats-ai/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import * as HistorySeedModule from './data/historyData';
import { triggerHaptic } from './utils/haptics';

const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const RAW_API_URL = (
  IS_LOCALHOST
    ? 'http://localhost:8000'
    : (import.meta.env.VITE_API_URL || 'https://app-beats.onrender.com')
).trim();

const API_BASE_URL = (
  !IS_LOCALHOST && RAW_API_URL.includes('localhost')
    ? 'https://app-beats.onrender.com'
    : RAW_API_URL
)
  .trim()
  .replace(/\s+/g, '')
  .replace(/\/+$/, '');

// LLAVE ÚNICA DE CHECKPOINT (Evita saturar los 5MB de localStorage del teléfono)
const MASTER_TICKETS_KEY = 'draftea_checkpoint_tickets_v2';
const MASTER_LOGS_KEY = 'draftea_checkpoint_logs_v2';

const LEGACY_TICKET_KEYS = [
  'draftea_history_vault',
  'beats_history_vault',
  'historyVault',
  'draftea_tickets',
  'tickets',
  'draftea_beats_history',
  'savedTickets'
];

const LEGACY_LOG_KEYS = [
  'draftea_learning_logs',
  'beats_learning_logs',
  'learningLogs',
  'draftea_rules',
  'rules',
  'aiLearningRules'
];

// Extrae semillas estáticas de src/data/historyData.js solo si la bóveda está completamente vacía
function getStaticSeedData(type) {
  try {
    if (!HistorySeedModule) return [];
    if (type === 'tickets') {
      const candidates = [
        HistorySeedModule.INITIAL_TICKETS,
        HistorySeedModule.HISTORY_VAULT,
        HistorySeedModule.INITIAL_HISTORY_VAULT,
        HistorySeedModule.DEFAULT_TICKETS,
        HistorySeedModule.tickets,
        HistorySeedModule.default?.tickets,
        Array.isArray(HistorySeedModule.default) ? HistorySeedModule.default : null
      ];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0 && c[0] && Array.isArray(c[0].legs)) {
          return c;
        }
      }
    } else {
      const candidates = [
        HistorySeedModule.INITIAL_LEARNING_LOGS,
        HistorySeedModule.LEARNING_LOGS,
        HistorySeedModule.DEFAULT_LEARNING_LOGS,
        HistorySeedModule.INITIAL_RULES,
        HistorySeedModule.learningLogs,
        HistorySeedModule.default?.learningLogs
      ];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) {
          return c;
        }
      }
    }
  } catch (e) {
    // continuar
  }
  return [];
}

// Genera un ID determinístico para cualquier ticket (incluso antiguos que no tuvieran id fijo)
function getTicketStableId(tk) {
  if (!tk || typeof tk !== 'object') return '';
  if (tk.id) return String(tk.id);
  if (tk.ticketId) return String(tk.ticketId);
  const legSig = Array.isArray(tk.legs)
    ? tk.legs
        .map((l) => `${l?.matchId || l?.matchup || ''}:${l?.selection || l?.prop || ''}`)
        .join('_')
    : '';
  return `tk_${tk.createdAt || tk.date || 'nodate'}_${tk.totalOdd || ''}_${legSig}`;
}

// Huella única universal para cada regla (sin depender de índices para que nunca se pierdan al recargar)
function getRuleSignature(lg) {
  if (!lg || typeof lg !== 'object') return '';
  if (lg.id) return `ID:${String(lg.id)}`;

  const parts = [
    lg.title || lg.header || lg.tag || '',
    lg.clubCode || lg.club || lg.team || '',
    lg.marketType || lg.market || lg.prop || '',
    lg.selection || lg.pick || '',
    lg.rule || lg.description || lg.text || lg.note || lg.get || lg.message || '',
    lg.source || lg.ticketName || lg.matchup || '',
    lg.outcome !== undefined ? String(lg.outcome) : '',
    lg.hit !== undefined ? String(lg.hit) : ''
  ].map((x) => String(x || '').trim());

  const joined = parts.join('|');
  if (joined.replace(/\|/g, '').length > 0) {
    return joined;
  }

  try {
    return JSON.stringify(lg);
  } catch (e) {
    return String(Math.random());
  }
}

// Une dos versiones del mismo ticket respetando SIEMPRE el último Checkpoint de oculto y verificación
function mergeTwoTickets(oldTk, newTk) {
  if (!oldTk) return newTk;
  if (!newTk) return oldTk;

  const oldTime = Number(oldTk._lastModified || 0);
  const newTime = Number(newTk._lastModified || 0);
  const base = newTime >= oldTime ? { ...oldTk, ...newTk } : { ...newTk, ...oldTk };

  // Respetar estrictamente la acción más reciente de Ocultar o Mostrar (archived / hidden)
  const oldArchTime = Number(oldTk._archivedUpdatedAt || oldTime || 0);
  const newArchTime = Number(newTk._archivedUpdatedAt || newTime || 0);

  if (newArchTime > oldArchTime) {
    base.archived = Boolean(newTk.archived);
    if (newTk.hidden !== undefined) base.hidden = Boolean(newTk.hidden);
    base._archivedUpdatedAt = newArchTime;
  } else if (oldArchTime > newArchTime) {
    base.archived = Boolean(oldTk.archived);
    if (oldTk.hidden !== undefined) base.hidden = Boolean(oldTk.hidden);
    base._archivedUpdatedAt = oldArchTime;
  } else {
    // Si tienen la misma marca de tiempo, respetar el segundo argumento (newTk) si define archived explícitamente
    if (typeof newTk.archived === 'boolean') {
      base.archived = newTk.archived;
    } else if (typeof oldTk.archived === 'boolean') {
      base.archived = oldTk.archived;
    }
  }

  base._lastModified = Math.max(oldTime, newTime);
  base.id = getTicketStableId(base);

  const oldLegs = Array.isArray(oldTk.legs) ? oldTk.legs : [];
  const newLegs = Array.isArray(newTk.legs) ? newTk.legs : [];

  if (oldLegs.length === newLegs.length && oldLegs.length > 0) {
    base.legs = newLegs.map((nLeg, idx) => {
      const oLeg = oldLegs[idx] || {};
      const comb = newTime >= oldTime ? { ...oLeg, ...nLeg } : { ...nLeg, ...oLeg };

      // REGLA DE ORO: Si un partido ya fue verificado (hit === true o false), NUNCA regresa a null ("En Curso")
      const nHasHit = nLeg && (nLeg.hit === true || nLeg.hit === false);
      const oHasHit = oLeg && (oLeg.hit === true || oLeg.hit === false);

      if (!nHasHit && oHasHit) {
        comb.hit = oLeg.hit;
        if (oLeg.actualResult !== undefined) comb.actualResult = oLeg.actualResult;
        if (oLeg.finalScore !== undefined) comb.finalScore = oLeg.finalScore;
        if (oLeg.statValue !== undefined) comb.statValue = oLeg.statValue;
        if (oLeg.statusText !== undefined) comb.statusText = oLeg.statusText;
      } else if (nHasHit && !oHasHit) {
        comb.hit = nLeg.hit;
        if (nLeg.actualResult !== undefined) comb.actualResult = nLeg.actualResult;
        if (nLeg.finalScore !== undefined) comb.finalScore = nLeg.finalScore;
        if (nLeg.statValue !== undefined) comb.statValue = nLeg.statValue;
        if (nLeg.statusText !== undefined) comb.statusText = nLeg.statusText;
      }

      if (oLeg.isVoid || nLeg.isVoid) {
        comb.isVoid = true;
      }

      return comb;
    });
  } else if (oldLegs.length > 0 && newLegs.length === 0) {
    base.legs = oldLegs;
  }

  const checkLegs = Array.isArray(base.legs) ? base.legs : [];
  if (
    checkLegs.length > 0 &&
    checkLegs.every((l) => l && (l.isVoid || l.hit === true || l.hit === false))
  ) {
    base.fullyVerified = true;
  } else {
    base.fullyVerified = false;
  }

  return base;
}

// Une listas de tickets manteniendo el orden (los recién creados arriba) y sin perder verificaciones ni ocultos
function mergeTicketLists(listA = [], listB = []) {
  const map = new Map();
  const order = [];

  const safeA = Array.isArray(listA) ? listA : [];
  const safeB = Array.isArray(listB) ? listB : [];

  [...safeA, ...safeB].forEach((tk) => {
    if (!tk || typeof tk !== 'object') return;
    const key = getTicketStableId(tk);
    if (!key) return;
    const normalizedTk = { ...tk, id: key };

    if (!map.has(key)) {
      order.push(key);
      map.set(key, normalizedTk);
    } else {
      map.set(key, mergeTwoTickets(map.get(key), normalizedTk));
    }
  });

  return order.map((k) => map.get(k));
}

// Une listas de reglas conservando todas las reglas nuevas + las 2,202 anteriores
function mergeRuleLists(listA = [], listB = []) {
  const map = new Map();
  const order = [];

  const safeA = Array.isArray(listA) ? listA : [];
  const safeB = Array.isArray(listB) ? listB : [];

  [...safeA, ...safeB].forEach((lg) => {
    if (!lg || typeof lg !== 'object') return;
    const sig = getRuleSignature(lg);
    if (!sig) return;
    if (!map.has(sig)) {
      order.push(sig);
      map.set(sig, lg);
    } else {
      map.set(sig, { ...map.get(sig), ...lg });
    }
  });

  return order.map((k) => map.get(k));
}

// Guarda el Checkpoint liberando espacio de llaves duplicadas viejas para que NUNCA falle por QuotaExceededError
function saveMasterCheckpointToLocal(tickets, logs) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  // 1. Guardar Tickets en la llave maestra
  if (Array.isArray(tickets) && tickets.length > 0) {
    const serializedTk = JSON.stringify(tickets);
    try {
      window.localStorage.setItem(MASTER_TICKETS_KEY, serializedTk);
      // Limpiar llaves duplicadas viejas para liberar megabytes en el celular
      LEGACY_TICKET_KEYS.forEach((oldKey) => {
        window.localStorage.removeItem(oldKey);
      });
    } catch (quotaErr) {
      // Si estaba lleno por llaves viejas, limpiar primero y volver a guardar
      LEGACY_TICKET_KEYS.forEach((oldKey) => window.localStorage.removeItem(oldKey));
      LEGACY_LOG_KEYS.forEach((oldKey) => window.localStorage.removeItem(oldKey));
      try {
        window.localStorage.setItem(MASTER_TICKETS_KEY, serializedTk);
      } catch (e2) {
        console.error('Error crítico guardando tickets en Checkpoint:', e2);
      }
    }
  }

  // 2. Guardar Reglas en la llave maestra
  if (Array.isArray(logs) && logs.length > 0) {
    const serializedLg = JSON.stringify(logs);
    try {
      window.localStorage.setItem(MASTER_LOGS_KEY, serializedLg);
      LEGACY_LOG_KEYS.forEach((oldKey) => {
        window.localStorage.removeItem(oldKey);
      });
    } catch (quotaErr) {
      LEGACY_LOG_KEYS.forEach((oldKey) => window.localStorage.removeItem(oldKey));
      try {
        window.localStorage.setItem(MASTER_LOGS_KEY, serializedLg);
      } catch (e2) {
        console.error('Error crítico guardando reglas en Checkpoint:', e2);
      }
    }
  }
}

// Lee el último Checkpoint guardado (y si es la primera vez, rescata y migra las llaves antiguas)
function readMasterCheckpointFromLocal(type) {
  const seedItems = getStaticSeedData(type);
  if (typeof window === 'undefined' || !window.localStorage) return seedItems;

  try {
    const masterKey = type === 'tickets' ? MASTER_TICKETS_KEY : MASTER_LOGS_KEY;
    const legacyKeys = type === 'tickets' ? LEGACY_TICKET_KEYS : LEGACY_LOG_KEYS;

    let combined = [];

    // 1. Leer primero la llave maestra de Checkpoint (la más reciente)
    const masterRaw = window.localStorage.getItem(masterKey);
    if (masterRaw) {
      try {
        const parsedMaster = JSON.parse(masterRaw);
        if (Array.isArray(parsedMaster) && parsedMaster.length > 0) {
          combined = parsedMaster;
        }
      } catch (e) {
        // continuar
      }
    }

    // 2. Rescatar cualquier dato de las llaves antiguas si aún existieran
    for (const key of legacyKeys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        let arr = [];
        if (Array.isArray(parsed)) {
          arr = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed[type])) arr = parsed[type];
          else if (type === 'tickets' && Array.isArray(parsed.historyVault)) arr = parsed.historyVault;
          else if (type === 'learningLogs' && Array.isArray(parsed.rules)) arr = parsed.rules;
        }
        if (arr.length > 0) {
          // Ponemos combined (maestra) al final para que su estado más reciente mande sobre las copias viejas
          combined =
            type === 'tickets'
              ? mergeTicketLists(arr, combined)
              : mergeRuleLists(combined, arr);
        }
      } catch (e) {
        // continuar
      }
    }

    // 3. Si había semillas iniciales, unirlas dando prioridad absoluta a lo guardado en el Checkpoint
    if (seedItems.length > 0) {
      combined =
        type === 'tickets'
          ? mergeTicketLists(seedItems, combined)
          : mergeRuleLists(combined, seedItems);
    }

    return combined;
  } catch (err) {
    console.error('Error leyendo Checkpoint local:', err);
    return seedItems;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('stats');
  const [matches, setMatches] = useState([]);
  const [deepDataMap, setDeepDataMap] = useState({});
  const [loadingCartelera, setLoadingCartelera] = useState(false);
  const [loadingDeepId, setLoadingDeepId] = useState(null);
  const [networkDebug, setNetworkDebug] = useState(null);

  // Estados de filtros superiores
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('ALL');
  const [selectedFavTeams, setSelectedFavTeams] = useState([]);

  // Estados de Beats y Bóveda de Historial inicializados desde el Checkpoint Maestro
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [historyVault, setHistoryVault] = useState(() => readMasterCheckpointFromLocal('tickets'));
  const [learningLogs, setLearningLogs] = useState(() => readMasterCheckpointFromLocal('learningLogs'));
  const [isVerifying, setIsVerifying] = useState(false);

  const ticketsRef = useRef(historyVault);
  const logsRef = useRef(learningLogs);
  // Contador de mutación local: evita que respuestas viejas de red pisen cambios que el usuario acaba de hacer
  const mutationVersionRef = useRef(0);
  const syncTimerRef = useRef(null);

  useEffect(() => {
    ticketsRef.current = historyVault;
  }, [historyVault]);

  useEffect(() => {
    logsRef.current = learningLogs;
  }, [learningLogs]);

  // Al arrancar por primera vez, compactar el Checkpoint en localStorage para liberar las llaves duplicadas
  useEffect(() => {
    saveMasterCheckpointToLocal(ticketsRef.current, logsRef.current);
  }, []);

  // 1. Cargar cartelera global desde el backend
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

  // 3. FUNCIÓN MAESTRA DE CHECKPOINT: Guarda al instante en teléfono y sincroniza con el backend sin condiciones de carrera
  const commitCheckpoint = useCallback((nextTickets, nextLogs, immediateSync = false) => {
    mutationVersionRef.current += 1;
    const currentVersion = mutationVersionRef.current;

    ticketsRef.current = nextTickets;
    logsRef.current = nextLogs;
    setHistoryVault(nextTickets);
    setLearningLogs(nextLogs);

    // Guardado físico instantáneo en el teléfono
    saveMasterCheckpointToLocal(nextTickets, nextLogs);

    if (nextTickets.length === 0 && nextLogs.length === 0) return;

    const performBackendSync = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/history/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickets: ticketsRef.current,
            learningLogs: logsRef.current
          })
        });
        const data = await res.json();
        // Solo fusionar respuesta del servidor si el usuario NO hizo otro clic mientras viajaba la petición
        if (data && data.ok && mutationVersionRef.current === currentVersion) {
          const syncedTk = mergeTicketLists(data.tickets || [], ticketsRef.current);
          const syncedLg = mergeRuleLists(logsRef.current, data.learningLogs || []);
          ticketsRef.current = syncedTk;
          logsRef.current = syncedLg;
          setHistoryVault(syncedTk);
          setLearningLogs(syncedLg);
          saveMasterCheckpointToLocal(syncedTk, syncedLg);
        }
      } catch (err) {
        console.error('Error sincronizando Checkpoint con el backend:', err);
      }
    };

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    if (immediateSync) {
      performBackendSync();
    } else {
      // Agrupa múltiples clics rápidos (ej. ocultar 55 Beats seguidos) en un solo envío limpio
      syncTimerRef.current = setTimeout(performBackendSync, 600);
    }
  }, []);

  // 4. Cargar y fusionar al abrir la app (dando siempre prioridad al Checkpoint local del usuario)
  const fetchHistory = useCallback(async () => {
    const versionAtStart = mutationVersionRef.current;
    const localTickets = readMasterCheckpointFromLocal('tickets');
    const localLogs = readMasterCheckpointFromLocal('learningLogs');

    if (localTickets.length > 0) {
      ticketsRef.current = localTickets;
      setHistoryVault(localTickets);
    }
    if (localLogs.length > 0) {
      logsRef.current = localLogs;
      setLearningLogs(localLogs);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/history`, { cache: 'no-store' });
      const data = await res.json();

      // Si el usuario ya creó un Beat u ocultó algo mientras cargaba, no interrumpirlo
      if (mutationVersionRef.current !== versionAtStart) return;

      const remoteTickets = Array.isArray(data.tickets) ? data.tickets : [];
      const remoteLogs = Array.isArray(data.learningLogs) ? data.learningLogs : [];

      // localTickets va primero en orden (para mantener los nuevos Beats arriba) y además gana en mergeTwoTickets por _lastModified
      const mergedTickets = mergeTicketLists(localTickets, remoteTickets);
      const mergedLogs = mergeRuleLists(localLogs, remoteLogs);

      ticketsRef.current = mergedTickets;
      logsRef.current = mergedLogs;
      setHistoryVault(mergedTickets);
      setLearningLogs(mergedLogs);
      saveMasterCheckpointToLocal(mergedTickets, mergedLogs);

      if (mergedTickets.length > 0 || mergedLogs.length > 0) {
        await fetch(`${API_BASE_URL}/api/history/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickets: mergedTickets,
            learningLogs: mergedLogs
          })
        });
      }
    } catch (err) {
      console.error('Error cargando historial remoto, usando Checkpoint local:', err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // CHECKPOINT 1: Crear / Guardar una nueva predicción (Beat) -> Se queda fija arriba y guarda Checkpoint inmediato
  const handleSaveTicketToHistory = useCallback(
    (ticketObj) => {
      const nowTs = Date.now();
      const stableId =
        ticketObj.id || `beat-${nowTs}-${Math.random().toString(36).slice(2, 7)}`;
      const newTicket = {
        ...ticketObj,
        id: String(stableId),
        archived: Boolean(ticketObj.archived),
        _lastModified: nowTs,
        _archivedUpdatedAt: nowTs
      };

      // Poner la nueva predicción al principio de la lista y guardar Checkpoint inmediato
      const updatedTickets = mergeTicketLists([newTicket], ticketsRef.current);
      commitCheckpoint(updatedTickets, logsRef.current, true);
    },
    [commitCheckpoint]
  );

  // CHECKPOINT 2: Cambiar resultado manual de un partido dentro de un Beat
  const handleToggleLegResult = useCallback(
    (ticketId, legIdx) => {
      const nowTs = Date.now();
      const targetId = String(ticketId);
      const updatedTickets = ticketsRef.current.map((tk) => {
        if (String(getTicketStableId(tk)) !== targetId) return tk;
        const newLegs = (tk.legs || []).map((leg, idx) => {
          if (idx !== legIdx) return leg;
          const nextHit = leg.hit === true ? false : leg.hit === false ? null : true;
          return { ...leg, hit: nextHit };
        });
        const allDone =
          newLegs.length > 0 &&
          newLegs.every((l) => l.isVoid || l.hit === true || l.hit === false);
        return {
          ...tk,
          id: targetId,
          legs: newLegs,
          fullyVerified: allDone,
          _lastModified: nowTs
        };
      });

      commitCheckpoint(updatedTickets, logsRef.current, false);
    },
    [commitCheckpoint]
  );

  // CHECKPOINT 3: Ocultar o Mostrar un Beat (se queda oculto al recargar, y si lo desocultas se queda visible)
  const handleToggleArchiveTicket = useCallback(
    (ticketId) => {
      const nowTs = Date.now();
      const targetId = String(ticketId);
      const updatedTickets = ticketsRef.current.map((t) => {
        if (String(getTicketStableId(t)) !== targetId) return t;
        const nextArchived = !Boolean(t.archived);
        return {
          ...t,
          id: targetId,
          archived: nextArchived,
          hidden: nextArchived,
          _lastModified: nowTs,
          _archivedUpdatedAt: nowTs
        };
      });

      commitCheckpoint(updatedTickets, logsRef.current, false);
    },
    [commitCheckpoint]
  );

  // CHECKPOINT 4: Agregar regla manual
  const handleAddCustomLearningRule = useCallback(
    (ruleObj) => {
      const withId = {
        ...ruleObj,
        id: ruleObj.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: ruleObj.createdAt || new Date().toISOString()
      };
      const updatedLogs = mergeRuleLists([withId], logsRef.current);
      commitCheckpoint(ticketsRef.current, updatedLogs, true);
    },
    [commitCheckpoint]
  );

  // CHECKPOINT 5: Verificar partidos -> Califica pendientes, anexa nuevas reglas, actualiza % HIT y sella el Checkpoint
  const handleAutoVerifyTickets = useCallback(async () => {
    const currentTickets = ticketsRef.current;
    if (currentTickets.length === 0 || isVerifying) return;

    // Filtrar únicamente los Beats que todavía tengan al menos un partido pendiente (hit === null o undefined)
    const pendingTickets = currentTickets.filter((tk) => {
      const legs = Array.isArray(tk.legs) ? tk.legs : [];
      if (legs.length === 0) return false;
      return legs.some((l) => !l.isVoid && l.hit !== true && l.hit !== false);
    });

    if (pendingTickets.length === 0) {
      // Aunque todos estén ya verificados, sellar Checkpoint por seguridad
      commitCheckpoint(currentTickets, logsRef.current, true);
      triggerHaptic('success');
      return;
    }

    setIsVerifying(true);
    triggerHaptic('medium');
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: pendingTickets,
          learningLogs: logsRef.current
        })
      });
      const data = await res.json();
      if (data && data.ok) {
        const nowTs = Date.now();

        // Tomar los tickets verificados por el servidor PERO respetando el estado actual en ticketsRef (por si ocultaste alguno mientras verificaba)
        const verifiedMap = new Map();
        (Array.isArray(data.tickets) ? data.tickets : []).forEach((vtk) => {
          const vid = getTicketStableId(vtk);
          if (vid) verifiedMap.set(vid, vtk);
        });

        const updatedTickets = ticketsRef.current.map((currentTk) => {
          const cid = getTicketStableId(currentTk);
          const vTk = verifiedMap.get(cid);
          if (!vTk) return currentTk;

          // Unir conservando los resultados recién verificados de vTk pero respetando el archived actual de currentTk
          const merged = mergeTwoTickets(currentTk, {
            ...vTk,
            id: cid,
            archived: Boolean(currentTk.archived),
            hidden: Boolean(currentTk.hidden),
            _archivedUpdatedAt: currentTk._archivedUpdatedAt || nowTs,
            _lastModified: nowTs
          });
          return merged;
        });

        // Asignar ID permanente a cada regla nueva generada en esta verificación
        const incomingRules = (Array.isArray(data.learningLogs) ? data.learningLogs : []).map(
          (r) => ({
            ...r,
            id: r.id || `verified-${getRuleSignature(r)}`
          })
        );

        // Poner las reglas nuevas al principio y conservar las 2,202+ existentes
        const updatedLogs = mergeRuleLists(incomingRules, logsRef.current);

        // GUARDAR CHECKPOINT DEFINITIVO DE VERIFICACIÓN (Local + Backend)
        commitCheckpoint(updatedTickets, updatedLogs, true);
        triggerHaptic('success');
      }
    } catch (err) {
      console.error('Error verificando tickets:', err);
    } finally {
      setIsVerifying(false);
    }
  }, [commitCheckpoint, isVerifying]);

  // 5. Generar dinámicamente las píldoras de fecha
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

  // 6. Calcular % de efectividad global (siempre persiste el % HIT de todos los Beats verificados, visibles u ocultos)
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

  // 7. Filtrado de partidos por Liga, Fecha y Equipos Favoritos
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

      {/* PANEL DE DIAGNÓSTICO DE RED */}
      {networkDebug && (
        <div className="max-w-5xl mx-auto mt-2 px-3">
          <div className="bg-red-950/90 border border-red-500 text-red-200 px-3 py-2 rounded-xl text-[11px] font-mono break-all">
            <strong>DIAGNÓSTICO DE CONEXIÓN:</strong> {networkDebug}
          </div>
        </div>
      )}

      {/* BARRA DE CÍRCULOS DE LIGAS, FECHAS Y EQUIPOS FAVORITOS */}
      {(activeTab === 'stats' || activeTab === 'builder') && (
        <div className="max-w-5xl mx-auto px-3 pt-3 space-y-2.5">
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