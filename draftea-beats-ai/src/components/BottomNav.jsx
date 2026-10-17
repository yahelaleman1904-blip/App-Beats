// src/components/BottomNav.jsx
import React from 'react';
import { BarChart3, Zap, Trophy } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export default function BottomNav({ activeTab, setActiveTab, selectedMatchesCount = 0 }) {
  const navItems = [
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
    { id: 'beats', label: 'Crear Beats', icon: Zap, badge: selectedMatchesCount },
    { id: 'history', label: 'Historial y %', icon: Trophy }
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#141824]/95 backdrop-blur-xl border border-gray-700/80 rounded-full px-2.5 py-1.5 shadow-2xl shadow-black/90 flex items-center gap-1.5">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{item.label}</span>

              {item.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-400 text-black font-black rounded-full text-[10px]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}