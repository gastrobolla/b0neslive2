import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, RefreshCw } from 'lucide-react';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateReport = async (customPrompt?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/bones/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: customPrompt || query || 'Gi en full statusrapport for Bønes IL Fotball sine lag, nøkkelspillere, toppscorere og neste hjemmekamper.' })
      });
      const data = await res.json();
      setResponse(data.summary);
    } catch (err: any) {
      setResponse('Kunne ikke laste AI-rapport akkurat nå. Vennligst prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-modal-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        id="ai-modal"
        className="w-full max-w-2xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                Bønes IL Fotball • AI-Rapport & Innsikt
              </h3>
              <p className="text-xs text-slate-400">
                Drevet av Gemini 3.8 Flash & NFF Hordaland-data
              </p>
            </div>
          </div>

          <button
            id="btn-close-ai-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Quick Preset Prompts */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Hurtiganalyser:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setQuery('Hvordan ligger A-laget for menn an til opprykk til 3. divisjon, og hvem er nøkkelspillere?');
                  handleGenerateReport('Hvordan ligger A-laget for menn an til opprykk til 3. divisjon, og hvem er nøkkelspillere?');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                ⚽ A-lagets opprykksmuligheter
              </button>

              <button
                onClick={() => {
                  setQuery('Gi en oppsummering av alle kommende hjemmekamper på Bønesbanen denne uken og neste helg.');
                  handleGenerateReport('Gi en oppsummering av alle kommende hjemmekamper på Bønesbanen denne uken og neste helg.');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                🏟️ Hjemmekamper på Bønesbanen
              </button>

              <button
                onClick={() => {
                  setQuery('Hvem er klubbens største toppscorere og hvem soner eller risikerer karantene?');
                  handleGenerateReport('Hvem er klubbens største toppscorere og hvem soner eller risikerer karantene?');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                🟨 Toppscorere & Karantener
              </button>
            </div>
          </div>

          {/* AI Output Box */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 min-h-48 text-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                <p className="text-xs font-medium">Analyserer offisielle NFF-tabeller og kampskjemaer...</p>
              </div>
            ) : response ? (
              <div className="space-y-2 leading-relaxed text-slate-200 whitespace-pre-line text-xs sm:text-sm">
                {response}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-500 text-center px-4">
                <Bot className="w-8 h-8 text-slate-600" />
                <p className="font-semibold text-slate-300">Still et spørsmål eller velg en hurtiganalyse ovenfor</p>
                <p className="text-xs text-slate-500">
                  Få en oppdatert taktisk rapport om Bønes-lagene, målscorere og kommende oppgjør.
                </p>
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="flex items-center space-x-2">
            <input
              id="input-ai-prompt"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="F.eks: Hvilke lag leder sin avdeling?"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerateReport();
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
            />
            <button
              id="btn-submit-ai-prompt"
              onClick={() => handleGenerateReport()}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
