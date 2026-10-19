// src/components/InteractivePitchAndTable.jsx
import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export function getRatingBadgeStyle(r) {
  if (r >= 8.5) return 'bg-blue-600 text-white';
  if (r >= 7.0) return 'bg-emerald-600 text-white';
  if (r >= 6.5) return 'bg-amber-500 text-black';
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
      className="flex flex-col items-center relative w-14 sm:w-20 group cursor-pointer focus:outline-none"
    >
      <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#182232] group-hover:bg-purple-900 border-2 border-white/90 group-hover:border-purple-300 flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
        <span className="text-[10px] font-black text-white">{player.num}</span>

        {player.subbedOut && (
          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
            <ArrowDownLeft className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}

        {player.goals > 0 && (
          <span className="absolute -top-1 -right-1 px-1 rounded-full bg-emerald-400 text-black text-[8px] font-black flex items-center justify-center shadow">
            G{player.goals > 1 ? player.goals : ''}
          </span>
        )}

        {player.assists > 0 && !player.goals && (
          <span className="absolute -top-1 -right-1 px-1 rounded-full bg-sky-400 text-black text-[8px] font-black flex items-center justify-center shadow">
            A
          </span>
        )}

        {(player.yellowCards > 0 || player.redCards > 0) && (
          <span
            className={`absolute top-2 -left-1.5 w-2 h-3 rounded-[2px] border border-black/40 shadow ${
              player.redCards > 0 ? 'bg-red-600' : 'bg-amber-400'
            }`}
          />
        )}

        <span
          className={`absolute -bottom-1.5 px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-black shadow ${getRatingBadgeStyle(
            player.rating || 7.0
          )}`}
        >
          {(player.rating || 7.0).toFixed(1)}
        </span>
      </div>

      <span className="mt-1.5 text-[9px] sm:text-[10px] font-bold text-white text-center leading-tight drop-shadow truncate max-w-full">
        {player.name}
      </span>
    </button>
  );
}

export function PlayerPitchDetailModal({ player, onClose }) {
  if (!player) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#121622] border border-purple-500/60 rounded-2xl p-4 space-y-3 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#1b2436] border border-purple-400 flex items-center justify-center text-xs font-black text-white">
              #{player.num}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  {player.fullName || player.name}
                </h4>
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-black ${getRatingBadgeStyle(
                    player.rating || 7.0
                  )}`}
                >
                  {(player.rating || 7.0).toFixed(1)}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold">
                {player.team} • {player.posLabel || player.pos} •{' '}
                {player.starter ? 'Titular' : 'Suplente'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {(player.subbedOut || player.replacedBy) && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <ArrowDownLeft className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-red-300 uppercase block">
                Cambio {player.replacedMin ? `(${player.replacedMin})` : ''}
              </span>
              <span className="font-bold text-white">
                Entró: <strong className="text-emerald-400">{player.replacedBy || 'Suplente'}</strong>
              </span>
            </div>
          </div>
        )}

        {player.subbedIn && player.replacedWho && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2.5 flex items-center gap-2 text-xs">
            <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                Entró {player.enteredMin ? `(${player.enteredMin})` : ''}
              </span>
              <span className="font-bold text-white">
                Salió: <strong className="text-red-300">{player.replacedWho}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2">
            <span className="text-[9px] text-gray-400 block">Disparos</span>
            <span className="text-xs font-black text-white">{player.shots ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2">
            <span className="text-[9px] text-gray-400 block">Al Arco</span>
            <span className="text-xs font-black text-emerald-400">{player.sot ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2">
            <span className="text-[9px] text-gray-400 block">xG</span>
            <span className="text-xs font-black text-purple-300">
              {(player.xg ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2">
            <span className="text-[9px] text-gray-400 block">Goles</span>
            <span className="text-xs font-black text-white">{player.goals ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2">
            <span className="text-[9px] text-gray-400 block">Asistencias</span>
            <span className="text-xs font-black text-sky-400">{player.assists ?? 0}</span>
          </div>
          <div className="bg-[#0b0d13] border border-gray-800 rounded-xl p-2">
            <span className="text-[9px] text-gray-400 block">
              {player.pos === 'G' ? 'Atajadas' : 'Faltas Rec.'}
            </span>
            <span className="text-xs font-black text-amber-300">
              {player.pos === 'G' ? player.saves ?? 0 : player.foulsSuffered ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SquadConvocadosTable({
  squadTable,
  homeName,
  awayName,
  onSelectPlayer
}) {
  const [teamFilter, setTeamFilter] = useState('ALL');

  if (!squadTable) {
    return (
      <div className="p-4 text-center text-xs text-gray-400 bg-[#141824] rounded-xl border border-gray-800">
        Sin datos de plantilla.
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
    <div className="bg-[#0c1118] border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-2.5 border-b border-gray-800 flex items-center justify-between bg-[#111722]">
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="bg-[#0c1118] border border-gray-700 rounded-lg px-2.5 py-1 text-xs font-extrabold text-white cursor-pointer"
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] font-bold text-gray-400 bg-[#0e141f]">
              <th className="py-2 px-2.5">Jugador</th>
              <th className="py-2 px-1.5 text-center">Rating</th>
              <th className="py-2 px-1.5 text-center">Tiros</th>
              <th className="py-2 px-1.5 text-center">Arco</th>
              <th className="py-2 px-1.5 text-center">xG</th>
              <th className="py-2 px-1.5 text-center">G/A</th>
              <th className="py-2 px-2.5 text-right">Rol</th>
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
                className="hover:bg-white/[0.04] cursor-pointer"
              >
                <td className="py-2 px-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative w-7 h-7 rounded-full bg-[#1a2333] border border-gray-700 flex items-center justify-center text-[10px] font-black text-gray-200 shrink-0">
                      {p.num || '-'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-white truncate max-w-[110px] sm:max-w-none">
                        {p.name}
                      </p>
                      <span className="text-[9px] text-gray-400 block">
                        {p.posLabel} • {p.team}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-2 px-1.5 text-center">
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-black ${getRatingBadgeStyle(
                      p.rating || 6.8
                    )}`}
                  >
                    {(p.rating || 6.8).toFixed(1)}
                  </span>
                </td>

                <td className="py-2 px-1.5 text-center font-bold text-white">
                  {p.shots > 0 ? p.shots : '-'}
                </td>

                <td className="py-2 px-1.5 text-center font-bold text-emerald-400">
                  {p.sot > 0 ? p.sot : '-'}
                </td>

                <td className="py-2 px-1.5 text-center text-gray-300">
                  {p.xg > 0 ? p.xg.toFixed(2) : '-'}
                </td>

                <td className="py-2 px-1.5 text-center font-bold text-white">
                  {p.goals > 0 || p.assists > 0
                    ? `${p.goals || 0}/${p.assists || 0}`
                    : '-'}
                </td>

                <td className="py-2 px-2.5 text-right text-[10px]">
                  {p.subbedOut ? (
                    <span className="text-red-400 font-bold">
                      Sal. {p.replacedMin || ''}
                    </span>
                  ) : p.subbedIn ? (
                    <span className="text-emerald-400 font-bold">
                      Ent. {p.enteredMin || ''}
                    </span>
                  ) : p.starter ? (
                    <span className="text-gray-300">Titular</span>
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