import React, { useState } from 'react';
import { TeamInfo } from '../types.js';
import {
  ExternalLink,
  Shield,
  Smartphone,
  Trophy,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  Info,
  ArrowUpRight,
  BookOpen,
  Share2,
  RefreshCw
} from 'lucide-react';

interface NffHubViewProps {
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onRealScrape?: () => void;
  isRealScraping?: boolean;
  lastRealScraped?: string;
  dailyScrapeSchedule?: string;
}

interface OfficialLinkItem {
  id: string;
  title: string;
  division: string;
  teamName: string;
  category: string;
  fotballNoUrl: string;
  minFotballUrl: string;
  tableUrl: string;
  homeGround: string;
  nffCode: string;
}

export const NffHubView: React.FC<NffHubViewProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  onRealScrape,
  isRealScraping,
  lastRealScraped,
  dailyScrapeSchedule
}) => {
  const [matchIdInput, setMatchIdInput] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Dynamically generate verified official links for all 16 Bønes IL teams
  const officialLinks: OfficialLinkItem[] = teams.map((t) => ({
    id: t.id,
    title: t.name,
    division: t.division,
    teamName: `${t.name} (FIKS ${t.fiksId || ''})`,
    category: t.category,
    fotballNoUrl: t.fiksId ? `https://www.fotball.no/fotballdata/lag/hjem/?fiksId=${t.fiksId}` : 'https://www.fotball.no',
    minFotballUrl: 'https://minfotball.fotball.no/',
    tableUrl: t.tourneyId ? `https://www.fotball.no/fotballdata/turnering/tabell/?fiksId=${t.tourneyId}` : 'https://www.fotball.no',
    homeGround: t.homeGround || 'Fjellsdalen idrettsplass',
    nffCode: t.nffCode
  }));

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const filteredLinks = selectedTeamId === 'all'
    ? officialLinks
    : officialLinks.filter(item => item.id === selectedTeamId);

  return (
    <div id="nff-hub-container" className="space-y-6">

      {/* Official Status Banner (Alternativ 3 Transparency) */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-red-950 text-white p-5 rounded-2xl border border-blue-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                Alternativ 3 Aktiv
              </span>
              <span className="bg-blue-800/80 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Offisiell NFF & MinFotball Portal
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Bønes Idrettslag – Offisielle Serier og NFF-Snarveier
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              NFF krever kommersielle lisensavtaler for direkte API-tilgang (FIKS EPS). Med dette alternativet har du direkte, gratis tilgang til de 100 % offisielle serietabellene, kampskjemaene og troppene på <strong>fotball.no</strong> og i <strong>Min Fotball</strong> for alle Bønes ILs lag.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              id="nff-btn-klubb-hjem"
              href="https://www.fotball.no/fotballdata/klubb/hjem/?fiksId=965"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <span>Bønes IL på fotball.no</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              id="nff-btn-minfotball"
              href="https://minfotball.fotball.no/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Min Fotball App</span>
            </a>
          </div>
        </div>
      </div>

      {/* Web-Scraping & Daglig Oppdatering Status Box */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Ekte Web-Scraping Aktiv
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {dailyScrapeSchedule || 'Daglig oppdatering (hver 24. time)'}
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              Automatisk synkronisering mot fotball.no & bonesil.no
            </h4>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Dashboardet skraper og parser de offisielle nettsidene til NFF (turnering FIKS 205982, klubb FIKS 1618) og Bønes IL (bonesil.no) en gang i døgnet for å hente ekte tabellplasseringer, kamper, målscorere, disiplinærhistorikk og klubbnyheter.
            </p>
            {lastRealScraped && (
              <p className="text-[11px] font-mono text-slate-500 pt-0.5">
                Sist fullførte skraping: <strong className="text-slate-800">{lastRealScraped}</strong>
              </p>
            )}
          </div>

          {onRealScrape && (
            <div className="shrink-0">
              <button
                id="btn-trigger-real-scrape-hub"
                onClick={onRealScrape}
                disabled={isRealScraping}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isRealScraping
                    ? 'bg-emerald-800 text-emerald-100 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-600/30'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRealScraping ? 'animate-spin' : ''}`} />
                <span>{isRealScraping ? 'Skraper nå...' : 'Kjør skraping nå'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Club Facts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fotballkrets</p>
            <p className="text-sm font-extrabold text-slate-900">NFF Hordaland</p>
            <a
              href="https://www.fotball.no/kretser/hordaland/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:underline flex items-center space-x-0.5"
            >
              <span>Kretsside</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hovedarena (11er)</p>
            <p className="text-sm font-extrabold text-slate-900">Fjellsdalen idrettsplass</p>
            <p className="text-[11px] text-slate-500">Kunstgress • Fjellsdalen 11</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nærbane (9er/7er)</p>
            <p className="text-sm font-extrabold text-slate-900">Bønesbanen Kunstgress</p>
            <p className="text-[11px] text-slate-500">Ved Bønes skole</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">A-lag herrer</p>
            <p className="text-sm font-extrabold text-slate-900">5. divisjon Menn Avd. 01</p>
            <p className="text-[11px] text-slate-500">NFF Hordaland</p>
          </div>
        </div>

      </div>

      {/* Match Lookup by FIKS / Match ID or URL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
              <Search className="w-4 h-4 text-red-600" />
              <span>Hurtigoppslag på fotball.no</span>
            </h4>
            <p className="text-xs text-slate-500">
              Skriv inn kamp-ID, fiks-ID eller et lag for å åpne direkte på fotball.no
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="input-fiks-match-search"
              type="text"
              placeholder="F.eks. Bønes, Fjellsdalen eller kamp-ID..."
              value={matchIdInput}
              onChange={(e) => setMatchIdInput(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <a
              id="btn-perform-fiks-search"
              href={`https://www.fotball.no/sok/?query=${encodeURIComponent(matchIdInput || 'Bønes')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold whitespace-nowrap flex items-center space-x-1"
            >
              <span>Søk NFF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Team Cards with Official Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-slate-900 text-base">
            Offisielle divisjoner & direktelenker for Bønes IL
          </h4>
          <span className="text-xs text-slate-500">
            Viser {filteredLinks.length} av {officialLinks.length} serier
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLinks.map((item) => (
            <div
              key={item.id}
              id={`nff-link-card-${item.id}`}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {item.category} • {item.nffCode}
                    </span>
                    <h5 className="font-black text-slate-900 text-base mt-1">
                      {item.title}
                    </h5>
                    <p className="text-xs font-semibold text-blue-900">
                      {item.division}
                    </p>
                  </div>

                  <span className="shrink-0 bg-red-50 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-100">
                    Bønes IL
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <p className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 inline shrink-0" />
                    <span>Hjemmebane: <strong>{item.homeGround}</strong></span>
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <a
                  href={item.tableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Trophy className="w-3 h-3 text-amber-300" />
                  <span>Offisiell Tabell</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>

                <a
                  href={item.fotballNoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Terminliste</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>

                <a
                  href={item.minFotballUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all"
                >
                  <Smartphone className="w-3 h-3 text-slate-600" />
                  <span>Min Fotball</span>
                </a>

                <button
                  onClick={() => handleCopy(item.fotballNoUrl, item.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all ml-auto"
                  title="Kopier lenke"
                >
                  {copiedLink === item.id ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Disciplinary & Regulations Quick Ref */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <h5 className="font-bold text-slate-900 flex items-center space-x-1.5 text-sm">
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>NFF Hordaland – Karantenereglement og soning</span>
        </h5>
        <p>
          I henhold til <strong>NFFs sanksjonsreglement § 5-3</strong> ilegges automatisk én kamps karantene etter 3, 5, 7 osv. gule kort i seriespill for seniorer og juniorer. For ungdomsklasser gjelder kretsens egne soningsregler ved direkte røde kort eller akkumulering.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="https://www.fotball.no/lov-og-reglement/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-semibold flex items-center space-x-1"
          >
            <span>NFF Lov- og reglementsamling</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="https://www.fotball.no/kretser/hordaland/aktivitet/dommer/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-semibold flex items-center space-x-1"
          >
            <span>NFF Hordaland Dommeroppsett</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

    </div>
  );
};
