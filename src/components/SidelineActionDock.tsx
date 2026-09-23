import React from 'react';
import { Match } from '../types.js';
import { PlusCircle, Trophy, Repeat, ShieldAlert, Sparkles, Palette } from 'lucide-react';

interface SidelineActionDockProps {
  activeMatch?: Match | null;
  onOpenLagleder: (action?: 'goal' | 'sub' | 'assist' | 'card') => void;
  onOpenPOTM: () => void;
  onOpenDesignSwitcher: () => void;
}

export const SidelineActionDock: React.FC<SidelineActionDockProps> = ({
  activeMatch,
  onOpenLagleder,
  onOpenPOTM,
  onOpenDesignSwitcher
}) => {
  return (
    <div className="fixed bottom-3 inset-x-0 z-40 max-w-xl mx-auto px-3 pointer-events-none">
      <div className="bg-[#0c1e38]/95 backdrop-blur-md text-white p-2 rounded-2xl shadow-2xl border border-blue-500/40 pointer-events-auto flex items-center justify-between gap-1.5 sm:gap-2">
        
        {/* Goal Quick Action */}
        <button
          onClick={() => onOpenLagleder('goal')}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] font-black tracking-tight transition-all active:scale-95 shadow-sm cursor-pointer"
          title="Meld inn mål for Bønes"
        >
          <span className="text-sm">⚽</span>
          <span>Mål</span>
        </button>

        {/* Assist Quick Action */}
        <button
          onClick={() => onOpenLagleder('assist')}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1.5 bg-[#165094] hover:bg-blue-600 text-white rounded-xl text-[11px] font-black tracking-tight transition-all active:scale-95 shadow-sm cursor-pointer"
          title="Meld inn målgivende pasning"
        >
          <span className="text-sm">👟</span>
          <span>Assist</span>
        </button>

        {/* Sub Quick Action */}
        <button
          onClick={() => onOpenLagleder('sub')}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black tracking-tight transition-all active:scale-95 shadow-sm cursor-pointer border border-slate-700"
          title="Meld inn spillerbytte"
        >
          <Repeat className="w-3.5 h-3.5 text-blue-400" />
          <span>Bytte</span>
        </button>

        {/* Banens Beste Quick Action */}
        <button
          onClick={onOpenPOTM}
          className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-[11px] font-black tracking-tight transition-all active:scale-95 shadow-md cursor-pointer"
          title="Kåre og stemme på Banens Beste"
        >
          <Trophy className="w-3.5 h-3.5 text-slate-950" />
          <span>Banens Beste</span>
        </button>

        {/* Design Switcher icon button */}
        <button
          onClick={onOpenDesignSwitcher}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs transition-all cursor-pointer shrink-0"
          title="Endre UX design"
        >
          <Palette className="w-4 h-4 text-blue-300" />
        </button>
      </div>
    </div>
  );
};
