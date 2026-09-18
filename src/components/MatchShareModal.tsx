import React, { useState, useEffect } from 'react';
import { Match } from '../types.js';
import {
  X,
  Share2,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Radio
} from 'lucide-react';

interface MatchShareModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDetails?: (match: Match) => void;
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting textarea fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
};

export const getMatchShareUrl = (match: Match): string => {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?tab=matches&match=${encodeURIComponent(match.id)}#match-card-${encodeURIComponent(match.id)}`;
};

export const getFormattedMatchText = (match: Match): string => {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const shareUrl = getMatchShareUrl(match);

  let header = '';
  if (isFinished) {
    header = `⚽ SLUTTRESULTAT:\n${match.homeTeam} ${match.homeScore ?? 0} – ${match.awayScore ?? 0} ${match.awayTeam}`;
  } else if (isLive) {
    header = `🔴 LIVE NÅ (${match.currentMinute || 0}'):\n${match.homeTeam} ${match.homeScore ?? 0} – ${match.awayScore ?? 0} ${match.awayTeam}`;
  } else {
    header = `📅 KOMMENDE KAMP:\n${match.homeTeam} vs ${match.awayTeam}`;
  }

  const divisionLine = `🏆 ${match.teamName} (${match.division || match.round})`;
  const dateLine = `🗓️ ${match.date} kl. ${match.time}`;
  const venueLine = `📍 ${match.venue}${match.venueCity ? `, ${match.venueCity}` : ''}`;

  let eventsSection = '';
  if (match.events && match.events.length > 0) {
    const goalEvents = match.events.filter(e => e.type === 'goal');
    if (goalEvents.length > 0) {
      eventsSection = `\n⚽ Mål:\n` + goalEvents.map(g => ` • ${g.minute}' ${g.player} (${g.team})`).join('\n');
    }
  }

  return `${header}\n${divisionLine}\n${dateLine}\n${venueLine}${eventsSection}\n\n👉 Se detaljer og lagoppstilling i Bønes Sofascore:\n${shareUrl}`;
};

export const MatchShareModal: React.FC<MatchShareModalProps> = ({
  match,
  isOpen,
  onClose,
  onViewDetails,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setHasNativeShare(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCopiedLink(false);
      setCopiedText(false);
      setShareSuccess(false);
    }
  }, [isOpen, match]);

  if (!isOpen || !match) return null;

  const shareUrl = getMatchShareUrl(match);
  const shareText = getFormattedMatchText(match);
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  const handleNativeShare = async () => {
    const title = `${match.homeTeam} vs ${match.awayTeam} - Bønes IL`;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Fallback to clipboard if share was rejected by browser
          await handleCopyLink();
        }
      }
    } else {
      await handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyText = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  return (
    <div
      id="match-share-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#165094] to-[#0B2545] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <Share2 className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">Del kamp</h2>
              <p className="text-[11px] text-blue-200">Bønes IL Sofascore</p>
            </div>
          </div>
          <button
            id="btn-close-share"
            onClick={onClose}
            className="p-1 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Match Preview Card */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="font-bold text-[#165094]">{match.teamName}</span>
              <div className="flex items-center space-x-1.5">
                {isLive ? (
                  <span className="bg-[#165094] text-white px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center space-x-1 animate-pulse">
                    <Radio className="w-2.5 h-2.5 text-emerald-300" />
                    <span>LIVE {match.currentMinute}'</span>
                  </span>
                ) : isFinished ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Ferdigspilt
                  </span>
                ) : (
                  <span className="bg-blue-100 text-[#165094] px-2 py-0.5 rounded text-[10px] font-bold">
                    Kommende
                  </span>
                )}
                <span className="text-[11px] text-slate-500 truncate max-w-[140px] sm:max-w-[200px]">
                  {match.division || match.round}
                </span>
              </div>
            </div>

            {/* Score / VS Display */}
            <div className="bg-white rounded-lg p-3 border border-slate-200/80 flex items-center justify-between">
              <div className="flex-1 text-center sm:text-left pr-2">
                <p className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                  {match.homeTeam}
                </p>
                <p className="text-[11px] text-slate-400">Hjemme</p>
              </div>

              <div className="px-3 py-1 text-center">
                {isFinished ? (
                  <div className="bg-[#0B2545] text-white px-3 py-1 rounded-lg font-mono font-extrabold text-base tracking-wider">
                    {match.homeScore} – {match.awayScore}
                  </div>
                ) : isLive ? (
                  <div className="bg-[#165094] text-white px-3 py-1 rounded-lg font-mono font-extrabold text-base tracking-wider">
                    {match.homeScore ?? 0} – {match.awayScore ?? 0}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono font-bold text-slate-400">VS</span>
                    <span className="text-[11px] font-semibold text-[#165094] bg-blue-50 px-2 py-0.5 rounded mt-0.5">
                      kl. {match.time}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-right pl-2">
                <p className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                  {match.awayTeam}
                </p>
                <p className="text-[11px] text-slate-400">Borte</p>
              </div>
            </div>

            {/* Venue & Kickoff Meta */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">
                  {new Date(match.date).toLocaleDateString('no-NO', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <span>kl. {match.time}</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[200px]">{match.venue}</span>
              </div>
            </div>
          </div>

          {/* Success Banner if Shared */}
          {shareSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Kampinformasjon ble delt vellykket!</span>
            </div>
          )}

          {/* Option 1: Native Web Share API Button */}
          <div className="space-y-1.5">
            <button
              id="btn-web-share"
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#165094] to-[#0B2545] hover:from-[#0F3A6D] hover:to-[#07192F] text-white rounded-xl font-bold text-sm shadow-sm hover:shadow transition-all active:scale-[0.99] cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-300" />
              <span>Del via apper (Web Share)</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              {hasNativeShare
                ? 'Åpner systemets delemeny for WhatsApp, Meldinger, Messenger, Spond m.m.'
                : 'Tips: På mobil/nettbrett åpnes systemets delemeny direkte. Bruk knappene under på PC.'}
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-xs font-semibold uppercase">Eller kopier</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Option 2: Copy Direct Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Direkte lenke til kampen:</span>
              {copiedLink && (
                <span className="text-emerald-600 flex items-center space-x-1 text-[11px] font-extrabold animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Lenke kopiert!</span>
                </span>
              )}
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="input-share-url"
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-100 border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono select-all focus:outline-none focus:ring-2 focus:ring-[#165094]"
              />
              <button
                id="btn-copy-link"
                onClick={handleCopyLink}
                className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#165094] hover:bg-[#0F3A6D] text-white'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Kopiert!' : 'Kopier lenke'}</span>
              </button>
            </div>
          </div>

          {/* Option 3: Copy Formatted Match Info (Score / Time / Details) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Kampinformasjon (tekst for SMS/chat):</span>
              {copiedText && (
                <span className="text-emerald-600 flex items-center space-x-1 text-[11px] font-extrabold animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Tekst kopiert!</span>
                </span>
              )}
            </label>
            <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-sans whitespace-pre-wrap max-h-32 overflow-y-auto">
              {shareText}
            </div>
            <button
              id="btn-copy-info"
              onClick={handleCopyText}
              className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs active:scale-95 cursor-pointer ${
                copiedText
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <MessageSquare className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedText ? 'Kampinfo kopiert til utklippstavle!' : 'Kopier kampinformasjon'}</span>
            </button>
          </div>

          {/* Direct navigation to match details if callback provided */}
          {onViewDetails && (
            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                id="btn-open-match-details"
                onClick={() => {
                  onClose();
                  onViewDetails(match);
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-[#165094] hover:text-[#0F3A6D] transition-colors py-1 cursor-pointer"
              >
                <span>Åpne fulle kampdetaljer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
