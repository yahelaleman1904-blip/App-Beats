// src/components/HistoryVaultView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  EyeOff,
  Eye,
  RefreshCw,
  Upload
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { analyzeDrafteaTicketImage } from '../utils/ticketVisionAnalyzer';

export default function HistoryVaultView({
  tickets,
  onToggleLegResult,
  onToggleArchiveTicket,
  onAutoVerifyTickets,
  isVerifying,
  learningLogs,
  onAddCustomLearningRule
}) {
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');

  useEffect(() => {
    const hasPending = tickets.some((tk) =>
      tk.legs.some((l) => l.hit === null || l.hit === undefined)
    );
    if (hasPending && onAutoVerifyTickets) {
      onAutoVerifyTickets();
    }
  }, []);

  const handleToggleAccordion = (ticketId) => {
    triggerHaptic('light');
    setExpandedTicketId((prev) => (prev === ticketId ? null : ticketId));
  };

  const handleAutoAnalyzeImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    triggerHaptic('medium');
    setIsScanningImage(true);

    try {
      for (let i = 0; i < files.length; i++) {
        setScanStatusText(`Procesando ${i + 1}/${files.length}...`);
        const learnedRule = await analyzeDrafteaTicketImage(files[i]);
        if (onAddCustomLearningRule && learnedRule) {
          onAddCustomLearningRule(learnedRule);
        }
      }
      triggerHaptic('success');
      setScanStatusText('Capturas procesadas.');
      setTimeout(() => setScanStatusText(''), 4000);
    } catch {
      setScanStatusText('Error al leer captura.');
    } finally {
      setIsScanningImage(false);
      e.target.value = '';
    }
  };

  const metrics = useMemo(() => {
    const calcByCategory = (cat) => {
      const list = tickets.filter((t) => t.category === cat);
      let settledTickets = 0;
      let wonTickets = 0;
      let hitLegs = 0;
      let settledLegs = 0;

      list.forEach((tk) => {
        const hasPending = tk.legs.some((l) => l.hit === null || l.hit === undefined);
        const allHit = tk.legs.length > 0 && tk.legs.every((l) => l.hit === true);
        if (!hasPending && tk.legs.length > 0) {
          settledTickets += 1;
          if (allHit) wonTickets += 1;
        }
        tk.legs.forEach((l) => {
          if (l.hit === true || l.hit === false) {
            settledLegs += 1;
            if (l.hit === true) hitLegs += 1;
          }
        });
      });

      return {
        totalTickets: settledTickets,
        wonTickets,
        hitLegs,
        totalLegs: settledLegs,
        legHitPct: settledLegs > 0 ? ((hitLegs / settledLegs) * 100).toFixed(1) : null
      };
    };

    return {
      SEGURO: calcByCategory('SEGURO'),
      ARRIESGADO: calcByCategory('ARRIESGADO'),
      SONADOR: calcByCategory('SONADOR')
    };
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesArchive = showArchived ? true : !t.archived;
      const matchesCat = filterCategory === 'ALL' || t.category === filterCategory;
      return matchesArchive && matchesCat;
    });
  }, [tickets, filterCategory, showArchived]);

  const hiddenCount = useMemo(() => tickets.filter((t) => t.archived).length, [tickets]);

  const getCategoryStyle = (cat) => {
    if (cat === 'SEGURO') {
      return {
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        label: 'SEGURO'
      };
    }
    if (cat === 'ARRIESGADO') {
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: 'ARRIESGADO'
      };
    }
    return {
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      label: 'SOÑADOR'
    };
  };

  const stripEmojis = (str) =>
    String(str || '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '')
      .trim();

  return (
    <div className="space-y-3">
      {/* 1. TABLERO DE EFECTIVIDAD EN 3 COLUMNAS HORIZONTALES (MÓVIL Y PC) */}
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
            EFECTIVIDAD
          </h2>

          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{isScanningImage ? 'Escaneando...' : 'Subir Ticket'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isScanningImage}
                onChange={handleAutoAnalyzeImages}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onAutoVerifyTickets) onAutoVerifyTickets();
              }}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-extrabold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Verificando' : 'Verificar'}</span>
            </button>
          </div>
        </div>

        {scanStatusText && (
          <div className="bg-[#0b0d13] border border-indigo-500/30 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-indigo-300">
            {scanStatusText}
          </div>
        )}

        {/* 3 COLUMNAS SIEMPRE HORIZONTALES */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'SEGURO', title: 'Seguros' },
            { key: 'ARRIESGADO', title: 'Arriesgados' },
            { key: 'SONADOR', title: 'Soñadores' }
          ].map((box) => {
            const stat = metrics[box.key];
            return (
              <div
                key={box.key}
                className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-gray-300 truncate">
                    {box.title}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 shrink-0">
                    {stat.wonTickets}/{stat.totalTickets}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-base sm:text-xl font-black text-white">
                    {stat.legHitPct === null ? '0.0%' : `${stat.legHitPct}%`}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400">
                    {stat.hitLegs}/{stat.totalLegs}
                  </span>
                </div>

                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${stat.legHitPct || 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. FILTROS DE TICKETS */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-[#141824] border border-gray-800 rounded-xl p-2.5">
        <span className="text-xs font-extrabold text-gray-300 uppercase">
          ENTRADAS ({visibleTickets.length})
        </span>

        <div className="flex items-center flex-wrap gap-1">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'SEGURO', label: 'Seguros' },
            { id: 'ARRIESGADO', label: 'Arriesgados' },
            { id: 'SONADOR', label: 'Soñadores' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                triggerHaptic('light');
                setFilterCategory(f.id);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                filterCategory === f.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#0b0d13] text-gray-400 border border-gray-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowArchived((p) => !p)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-gray-800 text-gray-300 border border-gray-700 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>{showArchived ? 'Ocultar' : `Ocultos (${hiddenCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. LISTA DE TICKETS */}
      <div className="space-y-2">
        {visibleTickets.map((ticket) => {
          const isExpanded = expandedTicketId === ticket.id;
          const totalLegs = ticket.legs.length;
          const hitLegs = ticket.legs.filter((l) => l.hit === true).length;
          const pendingLegs = ticket.legs.filter((l) => l.hit === null || l.hit === undefined).length;

          const isTicketWon = totalLegs > 0 && pendingLegs === 0 && hitLegs === totalLegs;
          const isTicketInProgress = pendingLegs > 0;
          const catStyle = getCategoryStyle(ticket.category);

          const matchGroups = {};
          ticket.legs.forEach((leg) => {
            const key = leg.matchId || leg.fullMatchTitle;
            if (!matchGroups[key]) {
              matchGroups[key] = {
                title: leg.fullMatchTitle,
                date: leg.date,
                homeLogo: leg.homeLogo,
                awayLogo: leg.awayLogo,
                liveScore: leg.liveScore,
                legs: []
              };
            }
            matchGroups[key].legs.push(leg);
          });

          return (
            <div
              key={ticket.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'bg-[#090b10] border-purple-500/80 shadow-xl'
                  : isTicketWon
                  ? 'bg-[#141824]/95 border-emerald-500/40'
                  : isTicketInProgress
                  ? 'bg-[#141824]/95 border-sky-500/40'
                  : 'bg-[#141824]/90 border-red-500/30'
              }`}
            >
              <div
                onClick={() => handleToggleAccordion(ticket.id)}
                className="p-3 cursor-pointer select-none flex items-center justify-between gap-2"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${catStyle.badge}`}
                    >
                      {catStyle.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {ticket.createdAt}
                    </span>
                    <span className="text-[10px] font-black text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded">
                      {ticket.totalOdd}x
                    </span>
                  </div>

                  <h3 className="text-xs font-extrabold text-white truncate">
                    {ticket.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {isTicketInProgress ? (
                      <span className="text-[11px] font-black text-sky-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {hitLegs}/{totalLegs}
                      </span>
                    ) : isTicketWon ? (
                      <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {hitLegs}/{totalLegs}
                      </span>
                    ) : (
                      <span className="text-[11px] font-black text-red-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> {hitLegs}/{totalLegs}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      onToggleArchiveTicket(ticket.id);
                    }}
                    className="p-1.5 rounded-lg bg-[#0b0d13] border border-gray-700 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-purple-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-800 bg-[#090b10] p-3.5 divide-y divide-gray-800/80">
                  {Object.values(matchGroups).map((grp, gIdx) => {
                    const names = (grp.title || 'Local vs Visitante').split(' vs ');
                    return (
                      <div key={gIdx} className="py-3 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1.5">
                          <span className="font-bold">
                            {grp.liveScore?.statusText || grp.date}
                          </span>
                        </div>

                        <div className="space-y-1 mb-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {grp.homeLogo && (
                                <img src={grp.homeLogo} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span className="text-xs font-bold text-white">{names[0]}</span>
                            </div>
                            {grp.liveScore && (
                              <span className="text-xs font-black text-white">
                                {grp.liveScore.homeScore}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {grp.awayLogo && (
                                <img src={grp.awayLogo} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span className="text-xs font-bold text-white">{names[1]}</span>
                            </div>
                            {grp.liveScore && (
                              <span className="text-xs font-black text-white">
                                {grp.liveScore.awayScore}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-2 pl-3.5 border-l-2 border-dashed border-gray-700 space-y-3">
                          {grp.legs.map((leg) => {
                            const isPending = leg.hit === null || leg.hit === undefined;
                            const isHit = leg.hit === true;
                            const actual =
                              leg.actualValue ?? (isHit ? Math.ceil(leg.targetValue || 2) : 0);
                            const target = leg.targetValue || 1.5;
                            const barPct = isPending
                              ? 0
                              : Math.min(
                                  100,
                                  Math.max(15, Math.round((actual / Math.max(1, target)) * 75))
                                );

                            return (
                              <div
                                key={leg.legId}
                                onClick={() => onToggleLegResult(ticket.id, leg.legId)}
                                className="relative cursor-pointer"
                              >
                                <span className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-[#090b10] border-2 border-gray-500" />

                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[9px] font-bold uppercase text-gray-400 block">
                                      {leg.market}
                                    </span>
                                    <p
                                      className={`text-xs font-extrabold ${
                                        isPending
                                          ? 'text-white'
                                          : isHit
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      {leg.selection}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {leg.notStarterBadge && (
                                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                        {leg.notStarterBadge}
                                      </span>
                                    )}
                                    <span className="text-[11px] font-bold text-gray-400">
                                      {Number(leg.odd).toFixed(2)}x
                                    </span>
                                    {isPending ? (
                                      <span className="text-[9px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full">
                                        En Curso
                                      </span>
                                    ) : isHit ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-400" />
                                    )}
                                  </div>
                                </div>

                                {!isPending && (
                                  <div className="mt-1.5 relative flex items-center">
                                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          isHit ? 'bg-emerald-400' : 'bg-red-400'
                                        }`}
                                        style={{ width: `${barPct}%` }}
                                      />
                                    </div>
                                    <span
                                      className={`ml-2 w-5 h-4 rounded-full text-[9px] font-black flex items-center justify-center border shrink-0 ${
                                        isHit
                                          ? 'bg-[#090b10] text-emerald-400 border-emerald-400'
                                          : 'bg-[#090b10] text-red-400 border-red-400'
                                      }`}
                                    >
                                      {actual}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. REGLAS ACTIVAS COMPACTAS Y SIN EMOJIS */}
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3 space-y-2">
        <h3 className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider">
          REGLAS DE AJUSTE ({learningLogs.length})
        </h3>

        <div className="space-y-1.5">
          {learningLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded uppercase">
                  {stripEmojis(log.tag)}
                </span>
                <span className="text-[9px] text-gray-500 font-semibold truncate">
                  {stripEmojis(log.source)}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-snug">
                {stripEmojis(log.rule)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}