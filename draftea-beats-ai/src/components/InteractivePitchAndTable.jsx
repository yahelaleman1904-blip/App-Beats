// src/components/InteractivePitchAndTable.jsx
import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Target,
  Shield,
  Sparkles
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export function getRatingBadgeStyle(r) {
  if (r >= 8.5) return 'bg-blue-600 text-white'; // Azul élite como el 9.0 de Caicedo en Imagen 1
  if (r >= 7.0) return 'bg-emerald-600 text-white'; // Verde como 7.6 / 7.1 en Imagen 1
  if (r >= 6.5) return 'bg-amber-500 text-black'; // Naranja/Amarillo como 6.9 / 6.8 en Imagen 1
  return 'bg-red-500 text-white';
}

export function InteractivePitchNode({ player, onSelectPlayer }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        triggerHaptic('medium');
        if (onSelectPlayer) onSelectPlayer(player);
      }}
      className="flex flex-col items-center relative w-16 sm:w-20 group cursor-pointer focus:outline-none"
    >
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#182232] group-hover:bg-purple-900 border-2 border-white/90 group-hover:border-purple-300 flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
        <span className="text-[10px] font-black text-white">{player.num}</span>

        {/* Flecha roja si salió de cambio */}
        {player.subbedOut && (
          <span
            title={
              player.replacedBy
                ? `Salió por ${player.replacedBy} (${player.replacedMin || ''})`
                : 'Salió de cambio'
            }
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
          >
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}

        {/* Balón de gol */}
        {player.goals > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-black text-[9px] font-black flex items-center justify-center shadow">
            ⚽{player.goals > 1 ? player.goals : ''}
          </span>
        )}

        {/* Zapato de asistencia */}
        {player.assists > 0 && !player.goals && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-400 text-black text-[8px] font-black flex items-center justify-center shadow">
            👟
          </span>
        )}

        {/* Tarjeta amarilla o roja */}
        {(player.yellowCards > 0 || player.redCards > 0) && (
          <span
            className={`absolute top-2.5 -left-1.5 w-2.5 h-3.5 rounded-[2px] border border-black/40 shadow ${
              player.redCards > 0 ? 'bg-red-600' : 'bg-amber-400'
            }`}
          />
        )}

        {/* Rating oficial */}
        <span
          className={`absolute -bottom-1.5 px-1.5 py-0.2 rounded text-[9px] font-black shadow ${getRatingBadgeStyle(
            player.rating || 7.0
          )}`}
        >
          {(player.rating || 7.0).toFixed(1)}
        </span>
      </div>

      <span className="mt-2 text-[9px] sm:text-[10px] font-bold text-white group-hover:text-purple-200 text-center leading-tight drop-shadow truncate max-w-full">
        {player.num} {player.name}
      </span>
    </button>
  );
}

/**
 * Modal Flotante que se abre al dar clic sobre el círculo de cualquier jugador en la alineación
 */
export function PlayerPitchDetailModal({ player, onClose }) {
  if (!player) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#121622] border-2 border-purple-500/60 rounded-3xl p-4 space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#1b2436] border-2 border-purple-400 flex items-center justify-center text-sm font-black text-white">
              #{player.num}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  {player.fullName || player.name}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-black ${getRatingBadgeStyle(
                    player.rating || 7.0
                  )}`}
                >
                  {(player.rating || 7.0).toFixed(1)} ★
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-semibold">
                {player.team} • {player.posLabel || player.pos} •{' '}
                {player.starter ? 'Titular' : 'Suplente'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SI SALIÓ DE CAMBIO: MOSTRAR POR QUIÉN SALIÓ Y AL MINUTO */}
        {(player.subbedOut || player.replacedBy) && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-red-300 uppercase block">
                  Sustituido en el partido {player.replacedMin ? `(${player.replacedMin})` : ''}
                </span>
                <span className="font-extrabold text-white">
                  Entró en su lugar:{' '}
                  <strong className="text-emerald-400">
                    {player.replacedBy || 'Suplente táctico'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SI ENTRÓ DE CAMBIO: MOSTRAR A QUIÉN REEMPLAZÓ */}
        {player.subbedIn && player.replacedWho && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                  Entró de cambio {player.enteredMin ? `(${player.enteredMin})` : ''}
                </span>
                <span className="font-extrabold text-white">
                  Salió: <strong className="text-red-300">{player.replacedWho}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ESTADÍSTICAS REALES DEL JUGADOR EN ESE PARTIDO */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block">Disparos Totales</span>
            <span className="text-sm font-black text-white">{player.shots ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block">Tiros al Arco</span>
            <span className="text-sm font-black text-emerald-400">{player.sot ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block">Goles Esp. (xG)</span>
            <span className="text-sm font-black text-purple-300">
              {(player.xg ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block">Goles ⚽</span>
            <span className="text-sm font-black text-white">{player.goals ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block">Asistencias 👟</span>
            <span className="text-sm font-black text-sky-400">{player.assists ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-400 block">
              {player.pos === 'G' ? 'Atajadas 🧤' : 'Faltas Recib.'}
            </span>
            <span className="text-sm font-black text-amber-300">
              {player.pos === 'G' ? player.saves ?? 0 : player.foulsSuffered ?? 0}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] bg-[#0b0d13] px-3 py-2 rounded-xl border border-gray-800 text-gray-300">
          <span>
            Faltas cometidas: <strong className="text-white">{player.foulsCommitted ?? 0}</strong>
          </span>
          <span>
            Tarjetas:{' '}
            <strong className="text-white">
              {player.redCards > 0
                ? '🟥 Roja'
                : player.yellowCards > 0
                ? '🟨 Amarilla'
                : 'Limpias (0)'}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Tabla de Convocados estilo Imagen 1 (Con selector TODOS / Local / Visitante y Rating en cuadros de color)
 */
export function SquadConvocadosTable({
  squadTable,
  homeName,
  awayName,
  onSelectPlayer
}) {
  const [teamFilter, setTeamFilter] = useState('ALL');

  if (!squadTable) {
    return (
      <div className="p-6 text-center text-xs text-gray-400 bg-[#141824] rounded-2xl border border-gray-800">
        Selecciona uno de los últimos 5 partidos jugados para ver la tabla completa de convocados y sus calificaciones.
      </div>
    );
  }

  const rows =
    teamFilter === 'HOME'
      ? squadTable.home || []
      : teamFilter === 'AWAY'
      ? squadTable.away || []
      : squadTable.all || [];

  return (
    <div className="bg-[#0c1118] border border-gray-800 rounded-2xl overflow-hidden">
      {/* Cabecera con selector desplegable idéntico a Imagen 1 */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between gap-2 bg-[#111722]">
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-[#0c1118] border border-gray-700 rounded-xl px-3 py-1.5 text-xs font-extrabold text-white cursor-pointer"
        >
          <option value="ALL">TODOS ({squadTable.all?.length || 0})</option>
          {homeName && (
            <option value="HOME">
              {homeName} ({squadTable.home?.length || 0})
            </option>
          )}
          {awayName && (
            <option value="AWAY">
              {awayName} ({squadTable.away?.length || 0})
            </option>
          )}
        </select>

        <span className="text-[10px] text-gray-400 font-semibold">
          Toca cualquier jugador para ver su ficha y cambios
        </span>
      </div>

      {/* Tabla estilo Imagen 1 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] font-bold text-gray-400 bg-[#0e141f]">
              <th className="py-2.5 px-3">Jugador</th>
              <th className="py-2.5 px-2 text-center">Rating ▼</th>
              <th className="py-2.5 px-2 text-center">Disparos totales</th>
              <th className="py-2.5 px-2 text-center">Tiros al arco</th>
              <th className="py-2.5 px-2 text-center">Goles esp. (xG)</th>
              <th className="py-2.5 px-2 text-center">Goles / Asist.</th>
              <th className="py-2.5 px-3 text-right">Estado / Cambio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/70 text-xs">
            {rows.map((p, idx) => (
              <tr
                key={`${p.team}-${p.fullName}-${idx}`}
                onClick={() => {
                  triggerHaptic('light');
                  if (onSelectPlayer) onSelectPlayer(p);
                }}
                className="hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full bg-[#1a2333] border border-gray-700 flex items-center justify-center text-[10px] font-black text-gray-200 shrink-0">
                      {p.num || '-'}
                      {p.teamLogo && (
                        <img
                          src={p.teamLogo}
                          alt=""
                          className="w-3.5 h-3.5 object-contain absolute -bottom-0.5 -right-0.5 bg-[#0c1118] rounded-full p-0.5"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-white truncate">
                        {p.name}
                      </p>
                      <span className="text-[10px] text-gray-400 block">
                        {p.posLabel} • {p.team}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-2.5 px-2 text-center">
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-black ${getRatingBadgeStyle(
                      p.rating || 6.8
                    )}`}
                  >
                    {(p.rating || 6.8).toFixed(1)}
                  </span>
                </td>

                <td className="py-2.5 px-2 text-center font-bold text-white">
                  {p.shots > 0 ? (
                    <span
                      className={
                        p.shots >= 4
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-black'
                          : ''
                      }
                    >
                      {p.shots}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>

                <td className="py-2.5 px-2 text-center font-bold text-emerald-400">
                  {p.sot > 0 ? p.sot : <span className="text-gray-600">-</span>}
                </td>

                <td className="py-2.5 px-2 text-center font-semibold text-gray-300">
                  {p.xg > 0 ? p.xg.toFixed(2) : <span className="text-gray-600">-</span>}
                </td>

                <td className="py-2.5 px-2 text-center">
                  {p.goals > 0 || p.assists > 0 ? (
                    <span className="text-[11px] font-black text-white">
                      {p.goals > 0 ? `⚽${p.goals} ` : ''}
                      {p.assists > 0 ? `👟${p.assists}` : ''}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>

                <td className="py-2.5 px-3 text-right text-[10px]">
                  {p.subbedOut ? (
                    <span className="text-red-400 font-bold block">
                      ↓ Salió {p.replacedMin || ''}
                      {p.replacedBy ? ` (${p.replacedBy})` : ''}
                    </span>
                  ) : p.subbedIn ? (
                    <span className="text-emerald-400 font-bold block">
                      ↑ Entró {p.enteredMin || ''}
                      {p.replacedWho ? ` (x ${p.replacedWho})` : ''}
                    </span>
                  ) : p.starter ? (
                    <span className="text-gray-300 font-semibold">90&apos; Titular</span>
                  ) : (
                    <span className="text-gray-500">Banca</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}