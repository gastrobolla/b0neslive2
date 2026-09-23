import React, { useState, useRef, useEffect } from 'react';
import { Match, TeamInfo } from '../types.js';
import {
  Calendar,
  CalendarPlus,
  Download,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import {
  getGoogleCalendarUrl,
  downloadTeamScheduleIcs
} from '../utils/calendarExport.js';

interface TeamCalendarExportButtonProps {
  matches: Match[];
  selectedTeamId: string;
  teams?: TeamInfo[];
  seasonFilter?: 'all' | 'host' | 'var';
  className?: string;
}

export const TeamCalendarExportButton: React.FC<TeamCalendarExportButtonProps> = ({
  matches,
  selectedTeamId,
  teams = [],
  seasonFilter = 'all',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const activeTeam = teams.find((t) => t.id === selectedTeamId);
  const teamLabel = activeTeam ? activeTeam.shortName : 'Terminliste';
  const teamFullName = activeTeam ? activeTeam.name : 'Bønes IL';

  // Matches for this team or current list
  const relevantMatches = React.useMemo(() => {
    return matches.filter((m) => {
      if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) {
        return false;
      }
      if (seasonFilter === 'host') {
        const isAutumn = (m.division && m.division.toLowerCase().includes('høst')) || m.season === 'Høst 2026';
        if (!isAutumn) return false;
      }
      if (seasonFilter === 'var') {
        const isSpring = (m.division && m.division.toLowerCase().includes('vår')) || m.season === 'Vår 2026';
        if (!isSpring) return false;
      }
      return true;
    });
  }, [matches, selectedTeamId, seasonFilter]);

  const upcomingMatches = relevantMatches
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const nextMatch = upcomingMatches[0] || relevantMatches[0];

  const handleDownloadAllIcs = () => {
    if (relevantMatches.length === 0) return;
    downloadTeamScheduleIcs(relevantMatches, teamFullName);
    setStatusMessage(`Lastet ned ${relevantMatches.length} kamper for ${teamLabel}!`);
    setTimeout(() => setStatusMessage(null), 3500);
    setIsOpen(false);
  };

  const handleDownloadUpcomingIcs = () => {
    if (upcomingMatches.length === 0) return;
    downloadTeamScheduleIcs(upcomingMatches, `${teamFullName} (Kommende)`);
    setStatusMessage(`Lastet ned ${upcomingMatches.length} kommende kamper!`);
    setTimeout(() => setStatusMessage(null), 3500);
    setIsOpen(false);
  };

  const handleOpenNextMatchInGoogle = () => {
    if (!nextMatch) return;
    const url = getGoogleCalendarUrl(nextMatch);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Main button */}
      <button
        type="button"
        id="btn-calendar-export-team"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-900 border border-slate-200 shadow-2xs hover:border-blue-400 cursor-pointer"
        title="Legg terminlisten til i din kalender (Google, Apple, Outlook)"
      >
        <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>
          {selectedTeamId !== 'all' ? `Kalender: ${teamLabel}` : 'Legg til i kalender'}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100 origin-top-right"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40">
            <span className="font-extrabold text-[12px] text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Synkroniser med kalender</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Importer terminlisten til Apple Kalender, Google Kalender eller Outlook.
            </p>
          </div>

          <div className="p-1 space-y-1">
            {/* Download ALL matches as .ics */}
            <button
              type="button"
              onClick={handleDownloadAllIcs}
              disabled={relevantMatches.length === 0}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100/70 text-blue-600 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-xs text-slate-800 group-hover:text-blue-700">
                    Last ned terminliste (.ics)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Alle {relevantMatches.length} kamper for {teamLabel}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold group-hover:bg-blue-100 group-hover:text-blue-700">
                .ics
              </span>
            </button>

            {/* Download only UPCOMING matches as .ics */}
            {upcomingMatches.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadUpcomingIcs}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-100/70 text-emerald-600 shrink-0">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-slate-800 group-hover:text-emerald-800">
                      Kun kommende kamper (.ics)
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {upcomingMatches.length} uspilte kamper
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-bold">
                  {upcomingMatches.length}k
                </span>
              </button>
            )}

            {/* Next match in Google Calendar */}
            {nextMatch && (
              <button
                type="button"
                onClick={handleOpenNextMatchInGoogle}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-semibold transition-colors cursor-pointer group border-t border-slate-100 mt-1"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-100/70 text-amber-700 shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-xs text-slate-800 group-hover:text-amber-900">
                      Neste kamp i Google Kalender
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal truncate max-w-[160px] block">
                      {nextMatch.date} kl. {nextMatch.time || '12:00'} vs {nextMatch.awayTeam.toLowerCase().includes('bønes') ? nextMatch.homeTeam : nextMatch.awayTeam}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700" />
              </button>
            )}
          </div>

          <div className="px-3 py-1.5 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-100 rounded-b-xl flex items-center justify-between">
            <span>Støtter iOS, Mac, Android, Outlook & Google</span>
          </div>
        </div>
      )}

      {/* Success alert pill */}
      {statusMessage && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
