import React from 'react';
import {
  Palette,
  X,
  Check,
  Smartphone,
  Moon,
  Flame,
  LayoutGrid,
  Sparkles,
  Zap,
  Sliders,
  Shield
} from 'lucide-react';

export type UxTheme = 'fotmob_pro' | 'matchday_fjellsdalen' | 'dark_arena' | 'sideline_coach';

interface DesignSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: UxTheme;
  onSelectTheme: (theme: UxTheme) => void;
}

export const DesignSwitcherModal: React.FC<DesignSwitcherModalProps> = ({
  isOpen,
  onClose,
  activeTheme,
  onSelectTheme
}) => {
  if (!isOpen) return null;

  const themes: {
    id: UxTheme;
    title: string;
    badge: string;
    icon: React.ReactNode;
    colorClasses: string;
    tagline: string;
    description: string;
    highlights: string[];
  }[] = [
    {
      id: 'fotmob_pro',
      title: 'FotMob Pro (Standard)',
      badge: 'Rask & Datatett',
      icon: <LayoutGrid className="w-5 h-5 text-[#165094]" />,
      colorClasses: 'from-blue-600 to-indigo-700',
      tagline: 'Klassisk skandinavisk sportsportal-design',
      description:
        'Lyst, lynraskt og ryddig oppsett inspirert av FotMob og Sofascore. Bønes ILs kongeblå og dype røde klubbfarger med kompakte kort og umiddelbar tilgang til kamper, tabeller og tropper.',
      highlights: [
        'Kongeblå og rød klubbidentitet (#165094 / #dc2626)',
        'Kompakte Sofascore-kampkort med minutt-for-minutt',
        '⭐ Integrert Banens Beste med direkte stemmegivning',
        'Rask lagfilter-stripe for alle 16 Bønes-lag'
      ]
    },
    {
      id: 'matchday_fjellsdalen',
      title: 'Matchday Fjellsdalen',
      badge: 'Arena & Fellesskap',
      icon: <Flame className="w-5 h-5 text-amber-500" />,
      colorClasses: 'from-amber-600 to-rose-700',
      tagline: 'Stadionfølelse og samlingspunkt rundt Fjellsdalen',
      description:
        'Løfter frem kampdagen på Fjellsdalen idrettsplass! Stor visuell toppbanner med dynamisk nedtelling til neste hjemmekamp, kunstgress- og værvarsel, samt live publikumsavstemning for Banens Beste.',
      highlights: [
        'Nedtelling til neste kamp på Fjellsdalen (Dager:Timer:Min:Sek)',
        'Banestatus og vær for Fjellsdalen kunstgress',
        'Fremhevet "Stem på Banens Beste" for publikum på tribunen',
        'Klubbvegg og arena-veibeskrivelse'
      ]
    },
    {
      id: 'dark_arena',
      title: 'Dark Mode Arena',
      badge: 'Flomlys & Kveldskamp',
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
      colorClasses: 'from-slate-900 to-blue-950',
      tagline: 'Mørk midnattsprofil for kveldstitting og flomlys',
      description:
        'Skånsom mot øynene i mørket på sidelinjen. Dyp midnattsblå bakgrunn med glødende røde og grønne live-indikatorer, gullfargede stjerner for Banens Beste og høykontrast-elementer.',
      highlights: [
        'Dyp midnattsblå (#071322) og marineblå kortflater',
        'Glødende neon-indikatorer for live kamper og scoringer',
        'Mindre blending på mobilen i kveldsmørket',
        'Gullskinnende kåring av Banens Beste'
      ]
    },
    {
      id: 'sideline_coach',
      title: 'Sidelinje & Trener',
      badge: 'Taktisk & Berøringssikkert',
      icon: <Zap className="w-5 h-5 text-emerald-500" />,
      colorClasses: 'from-emerald-600 to-teal-800',
      tagline: 'Tilpasset bruk på sidelinjen med regn og kalde fingre',
      description:
        'Store berøringsflater og hurtigtaster spesialbygget for lagledere, trenere og tilskuere som følger kampen ute i vestlandsværet. Ett trykk for å registrere mål, bytter, assist eller stemme!',
      highlights: [
        'Ekstra store knapper og trykksoner for mobiler i regnvær',
        'Hurtig-dokk for mål, målgivende, bytter og kort',
        'Direkte 1-trykks avstemning for Banens Beste',
        'Høykontrast-skrift som er lett å lese i farten'
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bønes Accent Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#165094] via-[#dc2626] to-[#165094]" />

        {/* Header */}
        <div className="bg-[#0c1e38] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg">Velg UX & Visuelt Design</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  4 Stiler
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Tilpass hvordan Bønes IL-appen oppleves etter dine behov
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
          {themes.map((theme) => {
            const isSelected = activeTheme === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`rounded-2xl border-2 p-4 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-50/50 border-[#165094] shadow-md ring-2 ring-[#165094]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      {theme.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-base">
                          {theme.title}
                        </h4>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {theme.badge}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#165094]">
                        {theme.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Radio / Selection Circle */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                      isSelected
                        ? 'bg-[#165094] border-[#165094] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {theme.description}
                </p>

                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700">
                  {theme.highlights.map((h, i) => (
                    <div key={i} className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#165094] shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Valgt design lagres automatisk på enheten.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#165094] hover:bg-[#0c1e38] text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
          >
            Ferdig / Bruk design
          </button>
        </div>
      </div>
    </div>
  );
};
