import React, { useState, useRef, useEffect } from 'react';
import { Match } from '../types.js';
import {
  CalendarPlus,
  Calendar,
  Download,
  ExternalLink,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  getGoogleCalendarUrl,
  downloadMatchIcs
} from '../utils/calendarExport.js';

interface AddToCalendarButtonProps {
  match: Match;
  variant?: 'compact' | 'normal' | 'icon-only';
  className?: string;
  onSuccess?: () => void;
}

export const AddToCalendarButton: React.FC<AddToCalendarButtonProps> = ({
  match,
  variant = 'normal',
  className = '',
  onSuccess
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
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

  const handleOpenGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getGoogleCalendarUrl(match);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
    onSuccess?.();
  };

  const handleDownloadIcs = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadMatchIcs(match);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
    setIsOpen(false);
    onSuccess?.();
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      {variant === 'icon-only' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          title="Legg kampen til i kalender (Google, Apple, Outlook)"
          aria-label="Legg til i kalender"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 transition-all cursor-pointer"
          title="Legg til i kalender"
        >
          <CalendarPlus className="w-3 h-3 text-blue-600 shrink-0" />
          <span>Kalender</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-blue-400 transition-all cursor-pointer"
          title="Legg til i din kalender"
        >
          <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
          <span>Legg til i kalender</span>
          <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 z-50 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100 origin-top-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/80">
            <span className="font-extrabold text-[11px] text-slate-700 block">
              Legg til i kalender
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {match.date} kl. {match.time || '12:00'} • {match.venue}
            </span>
          </div>

          <div className="p-1 space-y-0.5">
            {/* Google Calendar */}
            <button
              type="button"
              onClick={handleOpenGoogle}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-100/70 text-blue-600 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="block leading-tight font-bold text-xs">Google Kalender</span>
                  <span className="text-[10px] text-slate-400 font-normal">Åpner i nettleser</span>
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
            </button>

            {/* Apple / Outlook / iCalendar (.ics) */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-emerald-100/70 text-emerald-600 shrink-0">
                  {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <span className="block leading-tight font-bold text-xs">
                    {downloaded ? 'Lastet ned!' : 'iCalendar-fil (.ics)'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Apple, Outlook & mobil
                  </span>
                </div>
              </div>
              <Download className="w-3 h-3 text-slate-400 group-hover:text-emerald-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
