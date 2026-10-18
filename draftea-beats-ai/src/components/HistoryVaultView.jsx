// src/components/HistoryVaultView.jsx
import React, { useState, useMemo, useEffect } from 'react';
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
  Filter,
  EyeOff,
  Eye,
  RefreshCw,
  Upload,
  Camera
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

  // Estados para el Escáner Visual Automático (100% sin escribir texto)
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');

  // Auto-verificar automáticamente al abrir la pestaña si hay tickets con partidos pendientes
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

  // En cuanto eliges 1 o varias fotos de tus Beats, la IA las lee e interpreta sola sin escribir nada
  const handleAutoAnalyzeImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    triggerHaptic('medium');
    setIsScanningImage(true);

    try {
      for (let i = 0; i < files.length; i++) {
        setScanStatusText(
          `🔍 Escaneando e interpretando captura ${i + 1} de ${files.length} (${files[i].name})...`
        );
        const learnedRule = await analyzeDrafteaTicketImage(files[i]);
        if (onAddCustomLearningRule && learnedRule) {
          onAddCustomLearningRule(learnedRule);
        }
      }
      triggerHaptic('success');
      setScanStatusText(
        `✅ ¡${files.length} captura(s) interpretadas con éxito! El algoritmo ya ajustó sus reglas.`
      );
      setTimeout(() => setScanStatusText(''), 5500);
    } catch (err) {
      console.error('Error escaneando imagen:', err);
      setScanStatusText('⚠️ No se pudo procesar una imagen, intenta con otra captura.');
    } finally {
      setIsScanningImage(false);
      e.target.value = '';
    }
  };

  // Cálculo de precisión 100% real (solo sobre partidos ya verificados/finalizados)
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
      label: '🟣 Beat Soñador'
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. TABLERO DE % DE PREDICCIÓN REAL */}
      <div className="bg-[#141824] border border-gray-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
              🎯 Precisión Real Verificada del Algoritmo IA
            </h2>
            <p className="text-[10px] text-gray-400">
              Se calcula automáticamente conforme terminan los partidos reales de tus Beats creados.
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              if (onAutoVerifyTickets) onAutoVerifyTickets();
            }}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold cursor-pointer shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verificando con ESPN...' : 'Auto-Verificar Resultados'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { key: 'SEGURO', title: 'Beats Seguros', icon: ShieldCheck },
            { key: 'ARRIESGADO', title: 'Beats Arriesgados', icon: Flame },
            { key: 'SONADOR', title: 'Beats Soñadores', icon: Sparkles }
          ].map((box) => {
            const stat = metrics[box.key];
            const Icon = box.icon;
            return (
              <div
                key={box.key}
                className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase text-gray-300 flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5 text-purple-400" /> {box.title}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {stat.wonTickets}/{stat.totalTickets} Beats
                  </span>
                </div>

                {stat.legHitPct === null ? (
                  <div className="py-1">
                    <span className="text-sm font-extrabold text-gray-400 block">
                      Sin juegos finalizados aún
                    </span>
                    <span className="text-[10px] text-gray-500">
                      0/0 picks liquidados
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white">
                        {stat.legHitPct}%
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400">
                        {stat.hitLegs}/{stat.totalLegs} Picks Verdes
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${stat.legHitPct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. ESCÁNER VISUAL AUTOMÁTICO DE FOTOS (CERO ESCRITURA MANUAL) */}
      <div className="bg-[#141824] border border-indigo-500/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                📸 Escáner Visual IA de tus Beats (100% Automático)
              </h3>
              <p className="text-[11px] text-gray-400">
                Solo sube tus capturas de Draftea: la IA lee sola qué falló o qué acertó y ajusta el algoritmo sin que escribas nada.
              </p>
            </div>
          </div>

          <label
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer shrink-0 shadow-lg ${
              isScanningImage
                ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-500/40'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/20'
            }`}
          >
            {isScanningImage ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Interpretando captura...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Subir Captura(s) de Draftea</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isScanningImage}
              onChange={handleAutoAnalyzeImages}
              className="hidden"
            />
          </label>
        </div>

        {scanStatusText && (
          <div className="bg-[#0b0d13] border border-indigo-500/30 rounded-xl px-3 py-2 text-xs font-bold text-indigo-300">
            {scanStatusText}
          </div>
        )}
      </div>

      {/* 3. FILTROS DE TUS TICKETS GUARDADOS */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-[#141824] border border-gray-800 rounded-xl p-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-300">
          <Filter className="w-3.5 h-3.5 text-purple-400" />
          <span>Mis Beats Guardados ({visibleTickets.length}):</span>
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

      {/* 4. LISTA DE TICKETS CON VISTA AGRUPADA POR PARTIDO Y BARRAS ESTILO DRAFTEA */}
      <div className="space-y-2.5">
        {visibleTickets.map((ticket) => {
          const isExpanded = expandedTicketId === ticket.id;
          const totalLegs = ticket.legs.length;
          const hitLegs = ticket.legs.filter((l) => l.hit === true).length;
          const failLegs = ticket.legs.filter((l) => l.hit === false).length;
          const pendingLegs = ticket.legs.filter((l) => l.hit === null || l.hit === undefined).length;

          const isTicketWon = totalLegs > 0 && pendingLegs === 0 && hitLegs === totalLegs;
          const isTicketInProgress = pendingLegs > 0;
          const catStyle = getCategoryStyle(ticket.category);

          // Agrupar selecciones por partido (estilo Draftea)
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
                      <span className="text-xs font-black text-red-400 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> FINALIZADO ({hitLegs}/{totalLegs} verdes • {failLegs} rojos)
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 block">
                      {isExpanded ? 'Cerrar entrada ▲' : 'Ver desglose por partido ▼'}
                    </span>
                  </div>

                  <button
                    title="Ocultar visualmente (se mantiene en el % de efectividad)"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      onToggleArchiveTicket(ticket.id);
                    }}
                    className="p-2 rounded-xl bg-[#0b0d13] border border-gray-700 text-gray-400 hover:text-white cursor-pointer"
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

              {/* DESGLOSE AGRUPADO POR PARTIDO CON BARRAS ESTILO DRAFTEA */}
              {isExpanded && (
                <div className="border-t border-gray-800 bg-[#090b10] p-4 divide-y divide-gray-800/80">
                  {Object.values(matchGroups).map((grp, gIdx) => {
                    const names = (grp.title || 'Local vs Visitante').split(' vs ');
                    return (
                      <div key={gIdx} className="py-3.5 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                          <span className="font-bold">
                            {grp.liveScore?.statusText || `Fecha: ${grp.date}`}
                          </span>
                        </div>

                        {/* Cabecera de Equipos y Goles reales si ya terminó */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {grp.homeLogo && (
                                <img src={grp.homeLogo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-sm font-bold text-white">{names[0]}</span>
                            </div>
                            {grp.liveScore && (
                              <span className="text-sm font-black text-white">
                                {grp.liveScore.homeScore}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {grp.awayLogo && (
                                <img src={grp.awayLogo} alt="" className="w-5 h-5 object-contain" />
                              )}
                              <span className="text-sm font-bold text-white">{names[1]}</span>
                            </div>
                            {grp.liveScore && (
                              <span className="text-sm font-black text-white">
                                {grp.liveScore.awayScore}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Selecciones del Partido con Barra de Progreso Verde/Roja estilo Draftea */}
                        <div className="ml-2.5 pl-4 border-l-2 border-dashed border-gray-700 space-y-3.5">
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
                                <span className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full bg-[#090b10] border-2 border-gray-500" />

                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-gray-400 block">
                                      {leg.market}
                                    </span>
                                    <p
                                      className={`text-xs sm:text-sm font-extrabold ${
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

                                  <div className="flex items-center gap-2">
                                    {leg.notStarterBadge && (
                                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                                        {leg.notStarterBadge}
                                      </span>
                                    )}
                                    <span className="text-xs font-bold text-gray-400">
                                      {Number(leg.odd).toFixed(2)}x
                                    </span>
                                    {isPending ? (
                                      <span className="text-[10px] font-bold text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-full">
                                        En Curso
                                      </span>
                                    ) : isHit ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-400" />
                                    )}
                                  </div>
                                </div>

                                {/* BARRA DE PROGRESO CON CÍRCULO NUMÉRICO IDÉNTICA A DRAFTEA */}
                                {!isPending && (
                                  <div className="mt-2 relative flex items-center">
                                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          isHit ? 'bg-emerald-400' : 'bg-red-400'
                                        }`}
                                        style={{ width: `${barPct}%` }}
                                      />
                                    </div>
                                    <span
                                      className={`ml-2 w-6 h-5 rounded-full text-[10px] font-black flex items-center justify-center border shrink-0 ${
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

      {/* 5. REGLAS ACTIVAS DE AUTO-APRENDIZAJE IA */}
      <div className="bg-[#141824] border border-purple-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Cerebro Evolutivo IA ({learningLogs.length} Reglas Activas)
            </h3>
            <p className="text-[10px] text-gray-400">
              Reglas aprendidas automáticamente de tus capturas de Draftea y de la auto-verificación de partidos:
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {learningLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#0b0d13] border border-gray-800 rounded-xl p-3 space-y-1"
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
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