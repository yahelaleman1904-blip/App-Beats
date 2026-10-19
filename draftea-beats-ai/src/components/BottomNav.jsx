// src/components/BottomNav.jsx
import React from 'react';
import { BarChart3, Zap, Search, Trophy } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export default function BottomNav({ activeTab, setActiveTab, selectedMatchesCount }) {
  const navItems = [
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
    {
      id: 'beats',
      label: 'Crear Beats',
      icon: Zap,
      badge: selectedMatchesCount > 0 ? selectedMatchesCount : null
    },
    { id: 'search', label: 'Buscador', icon: Search },
    { id: 'history', label: 'Historial y %', icon: Trophy }
  ];

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-40 px-3 pointer-events-none">
      <div className="max-w-md mx-auto bg-[#141824]/95 backdrop-blur-md border border-gray-800/90 rounded-2xl p-1.5 shadow-2xl shadow-black/80 flex items-center justify-around pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`relative flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-extrabold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>

              {item.badge && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-400 text-black">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}