// src/components/HistoryVaultView.jsx
import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  Flame,
  CheckCheck,
  Filter,
  EyeOff,
  Eye
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export default function HistoryVaultView({
  tickets,
  onToggleLegResult,
  onMarkAllTicketResult,
  onToggleArchiveTicket,
  learningLogs
}) {
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  const handleToggleAccordion = (ticketId) => {
    triggerHaptic('light');
    setExpandedTicketId((prev) => (prev === ticketId ? null : ticketId));
  };

  // PUNTO 1 Y 2: Los porcentajes se calculan sobre TODOS los tickets (incluso los ocultos/archivados)
  // y solo cuentan las selecciones que YA se jugaron (hit === true o hit === false, ignorando hit === null)
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
        ticketWinPct: settledTickets > 0 ? Math.round((wonTickets / settledTickets) * 100) : 0,
        hitLegs,
        totalLegs: settledLegs,
        legHitPct: settledLegs > 0 ? ((hitLegs / settledLegs) * 100).toFixed(1) : '0.0'
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

  const hiddenCount = useMemo(
    () => tickets.filter((t) => t.archived).length,
    [tickets]
  );

  const getCategoryStyle = (cat) => {
    if (cat === 'SEGURO') {
      return {
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        label: '🟢 Beat Seguro'
      };
    }
    if (cat === 'ARRIESGADO') {
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: '🟡 Beat Arriesgado'
      };
    }
    return {
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      label: '🟣 Beat Soñador (+18)'
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. TABLERO DE % DE EFECTIVIDAD (Siempre conserva los datos de los tickets ocultos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-[#141824] border border-emerald-500/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Beats Seguros
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              {metrics.SEGURO.wonTickets}/{metrics.SEGURO.totalTickets} Ganados
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.SEGURO.legHitPct}%
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              {metrics.SEGURO.hitLegs}/{metrics.SEGURO.totalLegs} Picks Verdes
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${metrics.SEGURO.legHitPct}%` }}
            />
          </div>
        </div>

        <div className="bg-[#141824] border border-amber-500/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Beats Arriesgados
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              {metrics.ARRIESGADO.wonTickets}/{metrics.ARRIESGADO.totalTickets} Ganados
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.ARRIESGADO.legHitPct}%
            </span>
            <span className="text-[11px] font-bold text-amber-300">
              {metrics.ARRIESGADO.hitLegs}/{metrics.ARRIESGADO.totalLegs} Picks Verdes
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${metrics.ARRIESGADO.legHitPct}%` }}
            />
          </div>
        </div>

        <div className="bg-[#141824] border border-purple-500/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold uppercase text-purple-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Soñadores (+18 Picks)
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              {metrics.SONADOR.wonTickets}/{metrics.SONADOR.totalTickets} Completos
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.SONADOR.legHitPct}%
            </span>
            <span className="text-[11px] font-bold text-purple-300">
              {metrics.SONADOR.hitLegs}/{metrics.SONADOR.totalLegs} Picks Verdes
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${metrics.SONADOR.legHitPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. FILTROS + BOTÓN PARA VER/OCULTAR TICKETS ARCHIVADOS */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-[#141824] border border-gray-800 rounded-xl p-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-300">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>Tickets Visibles ({visibleTickets.length}):</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
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
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-gray-800 text-gray-300 border border-gray-700 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>{showArchived ? 'Ocultar archivados' : `Ver ocultos (${hiddenCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. LISTA DE TICKETS */}
      <div className="space-y-2.5">
        {visibleTickets.map((ticket) => {
          const isExpanded = expandedTicketId === ticket.id;
          const totalLegs = ticket.legs.length;
          const hitLegs = ticket.legs.filter((l) => l.hit === true).length;
          const failLegs = ticket.legs.filter((l) => l.hit === false).length;
          const pendingLegs = ticket.legs.filter((l) => l.hit === null || l.hit === undefined).length;
          const settledCount = hitLegs + failLegs;
          const hitPct = settledCount > 0 ? Math.round((hitLegs / settledCount) * 100) : 0;

          const isTicketWon = totalLegs > 0 && pendingLegs === 0 && hitLegs === totalLegs;
          const isTicketInProgress = pendingLegs > 0;
          const catStyle = getCategoryStyle(ticket.category);

          return (
            <div
              key={ticket.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'bg-[#141824] border-purple-500/80 shadow-xl shadow-purple-950/30'
                  : isTicketWon
                  ? 'bg-[#141824]/95 border-emerald-500/40'
                  : isTicketInProgress
                  ? 'bg-[#141824]/95 border-sky-500/40'
                  : 'bg-[#141824]/90 border-gray-800'
              }`}
            >
              <div
                onClick={() => handleToggleAccordion(ticket.id)}
                className="p-3.5 cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catStyle.badge}`}
                    >
                      {catStyle.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {ticket.createdAt}
                    </span>
                    <span className="text-[10px] font-black text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded">
                      Momio {ticket.totalOdd}x
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                    {ticket.title}
                  </h3>
                </div>

                {/* PUNTO 1 Y 2: ESTADO EN CURSO + BOTÓN OCULTAR VISUALMENTE */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-800/70">
                  <div className="text-left sm:text-right">
                    {isTicketInProgress ? (
                      <span className="text-xs font-black text-sky-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> EN CURSO ({hitLegs}/{totalLegs} • {pendingLegs} por jugar)
                      </span>
                    ) : isTicketWon ? (
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> GANADO ({hitLegs}/{totalLegs})
                      </span>
                    ) : (
                      <span className="text-xs font-black text-amber-300">
                        {hitLegs}/{totalLegs} Aciertos ({hitPct}%)
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 block">
                      {isExpanded ? 'Clic para cerrar ▲' : 'Toca para calificar picks ▼'}
                    </span>
                  </div>

                  {/* Botón para ocultar de la vista sin borrar del historial estadístico */}
                  <button
                    title="Ocultar de la lista (se conserva en tus % de efectividad)"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      onToggleArchiveTicket(ticket.id);
                    }}
                    className="p-2 rounded-xl bg-[#0b0d13] border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-7 h-7 rounded-full bg-[#0b0d13] border border-gray-700 flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-800 bg-[#0d1018] p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141824] border border-gray-800 rounded-xl p-2.5">
                    <span className="text-[11px] text-gray-300 font-semibold">
                      💡 Toca cada selección conforme avance el partido: <strong className="text-sky-400">⏳ En Curso</strong> → <strong className="text-emerald-400">✅ Acertada</strong> → <strong className="text-red-400">❌ Fallada</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          triggerHaptic('success');
                          onMarkAllTicketResult(ticket.id, true);
                        }}
                        className="flex items-center gap-1 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Todo Verde ✅
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {ticket.legs.map((leg) => {
                      const isPending = leg.hit === null || leg.hit === undefined;
                      const isHit = leg.hit === true;

                      return (
                        <div
                          key={leg.legId}
                          onClick={() => {
                            triggerHaptic('medium');
                            onToggleLegResult(ticket.id, leg.legId);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isPending
                              ? 'bg-[#121726] border-sky-500/30 hover:border-sky-400'
                              : isHit
                              ? 'bg-[#111622] border-emerald-500/30 hover:border-emerald-500/60'
                              : 'bg-red-950/20 border-red-500/50 hover:border-red-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                            <span className="font-bold text-gray-200">{leg.fullMatchTitle}</span>
                            <span className="font-bold text-gray-400">{leg.market}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-xs sm:text-sm font-black ${
                                isPending
                                  ? 'text-sky-300'
                                  : isHit
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {leg.selection}
                            </p>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-black text-white bg-[#141824] border border-gray-700 px-2 py-0.5 rounded">
                                {Number(leg.odd).toFixed(2)}x
                              </span>
                              {isPending ? (
                                <span className="text-[10px] font-black text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> En Curso
                                </span>
                              ) : isHit ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. BITÁCORA DE AUTO-APRENDIZAJE */}
      <div className="bg-[#141824] border border-purple-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Reglas Activas de Auto-Aprendizaje IA
            </h3>
            <p className="text-[10px] text-gray-400">
              Ajustes aplicados automáticamente a tus próximos Beats según las selecciones evaluadas:
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {learningLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded">
                  {log.tag}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">
                  {log.source}
                </span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">{log.rule}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}