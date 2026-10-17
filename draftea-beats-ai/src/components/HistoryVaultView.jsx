// src/components/HistoryVaultView.jsx
import React, { useState, useMemo } from 'react';
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  Flame,
  CheckCheck,
  Filter
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export default function HistoryVaultView({
  tickets,
  onToggleLegResult,
  onMarkAllTicketResult,
  learningLogs
}) {
  // Por defecto NINGÚN ticket está desplegado (null) hasta que el usuario le dé clic
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'SEGURO' | 'ARRIESGADO' | 'SONADOR'

  const handleToggleAccordion = (ticketId) => {
    triggerHaptic('light');
    setExpandedTicketId((prev) => (prev === ticketId ? null : ticketId));
  };

  // Cálculo matemático en tiempo real de % de Efectividad por Categoría y por Selección Individual
  const metrics = useMemo(() => {
    const calcByCategory = (cat) => {
      const list = tickets.filter((t) => t.category === cat);
      if (list.length === 0) return { totalTickets: 0, wonTickets: 0, ticketWinPct: 0, hitLegs: 0, totalLegs: 0, legHitPct: 0 };

      let wonTickets = 0;
      let hitLegs = 0;
      let totalLegs = 0;

      list.forEach((tk) => {
        const allHit = tk.legs.length > 0 && tk.legs.every((l) => l.hit);
        if (allHit) wonTickets += 1;
        tk.legs.forEach((l) => {
          totalLegs += 1;
          if (l.hit) hitLegs += 1;
        });
      });

      return {
        totalTickets: list.length,
        wonTickets,
        ticketWinPct: Math.round((wonTickets / list.length) * 100),
        hitLegs,
        totalLegs,
        legHitPct: totalLegs > 0 ? ((hitLegs / totalLegs) * 100).toFixed(1) : '0.0'
      };
    };

    const allLegsCount = tickets.reduce((acc, t) => acc + t.legs.length, 0);
    const allHitLegsCount = tickets.reduce(
      (acc, t) => acc + t.legs.filter((l) => l.hit).length,
      0
    );

    return {
      globalLegPct: allLegsCount > 0 ? ((allHitLegsCount / allLegsCount) * 100).toFixed(1) : '0.0',
      allHitLegsCount,
      allLegsCount,
      SEGURO: calcByCategory('SEGURO'),
      ARRIESGADO: calcByCategory('ARRIESGADO'),
      SONADOR: calcByCategory('SONADOR')
    };
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    if (filterCategory === 'ALL') return tickets;
    return tickets.filter((t) => t.category === filterCategory);
  }, [tickets, filterCategory]);

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
      {/* 1. TABLERO SUPERIOR DE % DE EFECTIVIDAD SEPARADO POR CATEGORÍA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Tarjeta Beats Seguros */}
        <div className="bg-[#141824] border border-emerald-500/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold uppercase text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Beats Seguros
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              {metrics.SEGURO.wonTickets}/{metrics.SEGURO.totalTickets} Tickets
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.SEGURO.ticketWinPct}%
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              Picks: {metrics.SEGURO.legHitPct}% ({metrics.SEGURO.hitLegs}/{metrics.SEGURO.totalLegs})
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${metrics.SEGURO.ticketWinPct}%` }}
            />
          </div>
        </div>

        {/* Tarjeta Beats Arriesgados */}
        <div className="bg-[#141824] border border-amber-500/30 rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Beats Arriesgados
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              {metrics.ARRIESGADO.wonTickets}/{metrics.ARRIESGADO.totalTickets} Tickets
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {metrics.ARRIESGADO.legHitPct}%
            </span>
            <span className="text-[11px] font-bold text-amber-300">
              {metrics.ARRIESGADO.hitLegs}/{metrics.ARRIESGADO.totalLegs} Picks Acertados
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${metrics.ARRIESGADO.legHitPct}%` }}
            />
          </div>
        </div>

        {/* Tarjeta Beats Soñadores (+18) */}
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
              {metrics.SONADOR.hitLegs}/{metrics.SONADOR.totalLegs} Picks Acertados
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

      {/* 2. FILTRO RÁPIDO DE CATEGORÍA DE TICKETS */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-[#141824] border border-gray-800 rounded-xl p-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-300">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>Tus Tickets Guardados ({visibleTickets.length}):</span>
        </div>

        <div className="flex items-center gap-1.5">
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
        </div>
      </div>

      {/* 3. LISTA DE TICKETS EN ACORDEÓN (Cerrados por defecto hasta hacer clic) */}
      <div className="space-y-2.5">
        {visibleTickets.map((ticket) => {
          const isExpanded = expandedTicketId === ticket.id;
          const totalLegs = ticket.legs.length;
          const hitLegs = ticket.legs.filter((l) => l.hit).length;
          const hitPct = totalLegs > 0 ? Math.round((hitLegs / totalLegs) * 100) : 0;
          const isTicketWon = totalLegs > 0 && hitLegs === totalLegs;
          const catStyle = getCategoryStyle(ticket.category);

          return (
            <div
              key={ticket.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'bg-[#141824] border-purple-500/80 shadow-xl shadow-purple-950/30'
                  : isTicketWon
                  ? 'bg-[#141824]/95 border-emerald-500/40 hover:border-emerald-500/60'
                  : 'bg-[#141824]/90 border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* BARRA RESUMEN DEL TICKET (Lo único visible cuando está cerrado) */}
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

                {/* Indicador Derecha: Aciertos + Botón Desplegar */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-800/70">
                  <div className="text-left sm:text-right">
                    <div className="flex items-center gap-1.5">
                      {isTicketWon ? (
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> GANADO ({hitLegs}/{totalLegs})
                        </span>
                      ) : (
                        <span className="text-xs font-black text-amber-300">
                          {hitLegs}/{totalLegs} Aciertos ({hitPct}%)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block">
                      {isExpanded ? 'Clic para cerrar ticket ▲' : 'Toca para abrir selecciones ▼'}
                    </span>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-[#0b0d13] border border-gray-700 flex items-center justify-center">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* CONTENIDO DESPLEGABLE DEL TICKET (Solo se muestra al darle clic) */}
              {isExpanded && (
                <div className="border-t border-gray-800 bg-[#0d1018] p-3.5 space-y-3">
                  {/* Barra de acciones rápidas del ticket */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141824] border border-gray-800 rounded-xl p-2.5">
                    <span className="text-[11px] text-gray-300 font-semibold">
                      💡 Toca cualquier selección abajo para cambiarla entre <strong className="text-emerald-400">Verde ✅</strong> o <strong className="text-red-400">Rojo ❌</strong>:
                    </span>

                    <button
                      onClick={() => {
                        triggerHaptic('success');
                        onMarkAllTicketResult(ticket.id, true);
                      }}
                      className="flex items-center gap-1 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg hover:bg-emerald-500/30 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Marcar Todo Acertado ✅
                    </button>
                  </div>

                  {/* Lista de las elecciones de ese ticket estilo Draftea */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {ticket.legs.map((leg) => (
                      <div
                        key={leg.legId}
                        onClick={() => {
                          triggerHaptic('medium');
                          onToggleLegResult(ticket.id, leg.legId);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          leg.hit
                            ? 'bg-[#111622] border-emerald-500/30 hover:border-emerald-500/60'
                            : 'bg-red-950/20 border-red-500/50 hover:border-red-400'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span className="font-bold text-gray-200">{leg.fullMatchTitle}</span>
                          <span className="font-bold text-gray-400">{leg.market}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p
                              className={`text-xs sm:text-sm font-black ${
                                leg.hit ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {leg.selection}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-black text-white bg-[#141824] border border-gray-700 px-2 py-0.5 rounded">
                              {Number(leg.odd).toFixed(2)}x
                            </span>
                            {leg.hit ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                        </div>

                        {/* Barra de progreso estilo Draftea */}
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${
                              leg.hit ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: leg.hit ? '100%' : '45%' }}
                          />
                        </div>

                        {/* Nota de auditoría si falló */}
                        {!leg.hit && leg.failReason && (
                          <p className="mt-2 text-[10px] font-semibold text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded">
                            🔍 Auditoría IA: {leg.failReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. BITÁCORA DE AUTO-APRENDIZAJE (Cómo mejora la IA con base en tus tickets) */}
      <div className="bg-[#141824] border border-purple-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Reglas Activas de Auto-Aprendizaje IA
            </h3>
            <p className="text-[10px] text-gray-400">
              Ajustes aplicados automáticamente a tus próximos Beats según las selecciones marcadas en rojo:
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