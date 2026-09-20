import React, { useState, useMemo } from 'react';
import { Match, MatchEvent, TeamInfo, MatchWeather } from '../types.js';
import { getDeterministicFallbackWeather } from '../utils/weather.js';
import { WeatherWidget } from './WeatherWidget.js';
import {
  Newspaper,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  Shield,
  Calendar,
  MapPin,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
  Award,
  Flame,
  CheckCircle2,
  Thermometer,
  Droplets,
  Wind
} from 'lucide-react';

interface BtMatchSummaryProps {
  match: Match;
  events?: MatchEvent[];
  team?: TeamInfo;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
}

// Generate a deterministic integer hash from a string
function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const BtMatchSummary: React.FC<BtMatchSummaryProps> = ({
  match,
  events = [],
  team,
  onSelectPlayer,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
  const opponent = isBonesHome ? match.awayTeam : match.homeTeam;
  const bonesTeamName = match.teamName || (isBonesHome ? match.homeTeam : match.awayTeam);

  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const bonesScore = isBonesHome ? homeScore : awayScore;
  const oppScore = isBonesHome ? awayScore : homeScore;

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';

  const isWin = isFinished && bonesScore > oppScore;
  const isDraw = isFinished && bonesScore === oppScore;
  const isLoss = isFinished && bonesScore < oppScore;
  const goalDiff = Math.abs(bonesScore - oppScore);

  // Extract goal and card events
  const goalEvents = events.filter((e) => e.type === 'goal').sort((a, b) => a.minute - b.minute);
  const cardEvents = events.filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
  const yellowCards = events.filter((e) => e.type === 'yellow_card');
  const redCards = events.filter((e) => e.type === 'red_card');

  const bonesGoals = goalEvents.filter(
    (e) => (e.team && e.team.toLowerCase().includes('bønes')) || (!e.team && isBonesHome)
  );

  // Group scorers for quick interactive chips
  const bonesScorersCount: Record<string, number> = {};
  for (const g of bonesGoals) {
    if (g.player) {
      bonesScorersCount[g.player] = (bonesScorersCount[g.player] || 0) + 1;
    }
  }

  // Generate unique, rich deterministic journalistic article per match
  const article = useMemo(() => {
    const seed = stringHash(`${match.id}-${match.fiksId || ''}-${match.homeTeam}-${match.awayTeam}-${match.date}`);
    const pick = (arr: string[]) => arr[seed % arr.length];
    const pickIdx = (arr: string[], offset: number) => arr[(seed + offset) % arr.length];

    const venue = match.venue || (match.isHome ? 'Fjellsdalen idrettsplass' : 'Bortebane');
    const division = match.division || 'NFF Hordaland';

    const dateFormatted = new Date(match.date).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // 1. Journalistic Headline Generator
    let headline = '';
    if (isUpcoming) {
      const upcomingHeadlines = [
        `Før avspark på ${venue}: ${bonesTeamName} klare for intens batalje mot ${opponent}`,
        `Storkamp i ${division}: ${bonesTeamName} jakter tre poeng mot ${opponent}`,
        `Lader opp til helgens oppgjør: ${bonesTeamName} tar imot ${opponent} til dyst`,
        `Poengstrid i vente: ${bonesTeamName} og ${opponent} braker sammen på ${venue}`
      ];
      headline = pick(upcomingHeadlines);
    } else if (isLive) {
      headline = `DIREKTE fra ${venue}: ${bonesTeamName} ${bonesScore}–${oppScore} ${opponent} (${match.currentMinute || 45}' min)`;
    } else if (isWin) {
      if (goalDiff >= 3) {
        const bigWinHeadlines = [
          `Målfest på ${venue}: ${bonesTeamName} feide ${opponent} av banen i ${homeScore}–${awayScore}-triumf!`,
          `Scoringsshow for ${bonesTeamName}: Vant overlegent ${homeScore}–${awayScore} mot ${opponent}`,
          `Klasseforskjell i ${division}: ${bonesTeamName} herjet og sikret ${homeScore}–${awayScore}`,
          `Målkavalkade på kunstgresset: ${bonesTeamName} storspilte mot ${opponent}`
        ];
        headline = pick(bigWinHeadlines);
      } else if (oppScore === 0) {
        const cleanSheetHeadlines = [
          `Holdt nullen og tok alle poengene: ${bonesTeamName} slo ${opponent} ${homeScore}–${awayScore}`,
          `Defensiv oppvisning og kliniske scoringer: Solid ${homeScore}–${awayScore}-seier for ${bonesTeamName}`,
          `Full kontroll på ${venue}: ${bonesTeamName} holdt buret rent mot ${opponent}`,
          `Kompakt forsvarsmur sikret tre poeng: ${bonesTeamName} triumferte ${homeScore}–${awayScore}`
        ];
        headline = pick(cleanSheetHeadlines);
      } else {
        const tightWinHeadlines = [
          `Jubel for ${bonesTeamName}: Sikret sterk ${homeScore}–${awayScore}-seier over ${opponent}`,
          `Neglebitende avslutning på ${venue}: ${bonesTeamName} trakk det lengste strået mot ${opponent}`,
          `Dramatisk lokaloppgjør: ${bonesTeamName} kjempet i land tre poeng mot ${opponent}`,
          `Viktig triumf i ${division}: ${bonesTeamName} seiret ${homeScore}–${awayScore} etter heroisk innsats`
        ];
        headline = pick(tightWinHeadlines);
      }
    } else if (isDraw) {
      if (bonesScore >= 2) {
        const highDrawHeadlines = [
          `Ellevilt målkalas og poengdeling: ${bonesTeamName} og ${opponent} spilte ${homeScore}–${awayScore}`,
          `Fotballdrama på ${venue}: Delte poengene etter ${homeScore}–${awayScore}-fyrverkeri`,
          `Målrik thriller i ${division}: ${bonesTeamName} og ${opponent} i intens poengdeling`,
          `Målene rant inn på ${venue}: Uavgjort ${homeScore}–${awayScore} mellom ${bonesTeamName} og ${opponent}`
        ];
        headline = pick(highDrawHeadlines);
      } else {
        const lowDrawHeadlines = [
          `Taktisk stillingskrig på ${venue}: Ett poeng til hver etter ${homeScore}–${awayScore}`,
          `Målfattig, men nervepirrende: ${bonesTeamName} og ${opponent} delte poengene`,
          `Poengdeling etter intens duell: ${bonesTeamName} spilte ${homeScore}–${awayScore} mot ${opponent}`,
          `Jevnt til siste sekund: Uavgjort mellom ${bonesTeamName} og ${opponent}`
        ];
        headline = pick(lowDrawHeadlines);
      }
    } else {
      if (goalDiff === 1) {
        const tightLossHeadlines = [
          `Surt ettmålstap for ${bonesTeamName}: ${opponent} vant ${homeScore}–${awayScore} på ${venue}`,
          `Nære poeng på ${venue}: ${bonesTeamName} måtte gi tapt etter heroisk sluttspurt`,
          `Stang ut for ${bonesTeamName}: ${opponent} knep seieren med ${homeScore}–${awayScore}`,
          `Tett og fartsfylt, men poengløst: ${bonesTeamName} falt 1 mål bak ${opponent}`
        ];
        headline = pick(tightLossHeadlines);
      } else {
        const lossHeadlines = [
          `Tøff batalje for ${bonesTeamName}: Måtte se seg slått ${homeScore}–${awayScore} av ${opponent}`,
          `Effektiv motstander på ${venue}: ${opponent} ble for sterke for ${bonesTeamName}`,
          `Læringspunkter i ${division}: ${bonesTeamName} tapte ${homeScore}–${awayScore} for ${opponent}`,
          `Høyt tempo på ${venue}: ${bonesTeamName} kjempet tappert mot et velorganisert ${opponent}`
        ];
        headline = pick(lossHeadlines);
      }
    }

    // Weather conditions & predefined pitch status
    const weather: MatchWeather = match.weather || getDeterministicFallbackWeather(match);
    const weatherMessage = isUpcoming
      ? weather.pitchStatus.preMatchMessage
      : weather.pitchStatus.postMatchSummary;

    // 2. Journalistic Ingress
    const openingAtmosphere = pickIdx([
      `Under spilleforhold preget av «${weather.pitchStatus.badge}» (${weather.temperature}°C) og med god stemning på ${venue}`,
      `Det var duket for en skikkelig kraftprøve da flomlysene lyste opp ${venue} (${weather.pitchStatus.badge})`,
      `Fra første fløytesignal var intensiteten til å ta og føle på mellom de to lagene på ${venue}`,
      `Det ble servert ekte bergensk lokalfotballsjel da lagene entret kunstgresset på ${venue} i ${weather.conditionText.toLowerCase()}`,
      `Med viktige poeng på spill i ${division} var rammen satt for en nervepirrende dyst på ${venue}`
    ], 3);

    let ingress = '';
    if (isUpcoming) {
      ingress = `BERGEN / LOKALFOTBALL: ${openingAtmosphere}. ${bonesTeamName} gjør sine siste taktiske finjusteringer før møtet med ${opponent}. Kampen har avspark ${dateFormatted} kl. ${match.time}, og begge leire forventer et tøft og velspilt oppgjør.`;
    } else if (isLive) {
      ingress = `DIREKTE FRA BERGEN: Kampen på ${venue} er i full gang! Stillingen er ${homeScore}–${awayScore} etter ${match.currentMinute || 45} spilte minutter. ${bonesTeamName} og ${opponent} kjemper om hvert eneste gresstrå i ${division}.`;
    } else {
      ingress = `BERGEN / LOKALFOTBALL: ${openingAtmosphere}. Oppgjøret i ${division} endte med ${homeScore}–${awayScore} i protokollen etter nitti minutter med full innsats, fysiske dueller og taktiske trekk.`;
    }

    // 3. Chronological Narrative Breakdown
    const detailedNarrativeParts: string[] = [];

    if (goalEvents.length > 0) {
      goalEvents.forEach((g, idx) => {
        const isBonesScorer = (g.team && g.team.toLowerCase().includes('bønes')) || (!g.team && isBonesHome);
        const scoringTeam = isBonesScorer ? bonesTeamName : opponent;
        const phrasing = pickIdx([
          `sendte ballen kontant i nettmaskene etter en presis pasning i bakrommet`,
          `var nådeløs i sekstenmeteren og overlistet keeper med en velplassert avslutning`,
          `dukket opp på bakerste stolpe og trillet ballen behersket over mållinjen`,
          `fant åpningen fra distanse og løftet læret lekkert inn i målhjørnet`,
          `utnyttet en retur fra forsvaret og banket inn scoringen til vill jubel`
        ], idx * 7);

        detailedNarrativeParts.push(
          `${g.minute}. min: ${g.player || 'Målscorer'} (${scoringTeam}) ${phrasing}. (${g.description ? `${g.description}` : 'Mål'})`
        );
      });
    } else if (isFinished) {
      if (bonesScore === 0 && oppScore === 0) {
        detailedNarrativeParts.push(
          `1.–45. min: Kampen åpnet i et høyt tempo der begge lag la seg godt til rette i sine defensive soner. Verken ${bonesTeamName} eller ${opponent} ga bort store rom på ${venue}.`,
          `46.–90. min: Etter pause satset begge lag på raske kontringer og dødballer, men strålende keeperspill og resolutt duellering i boksene sørget for at ingen av lagene maktet å sprekke nullen.`
        );
      } else {
        detailedNarrativeParts.push(
          `1. omgang: Oppgjøret mellom ${bonesTeamName} og ${opponent} ble preget av tette midtbanedueller og høyt gjenvinningspress. Forsvarsrekkene sto stødig på ${venue}.`,
          `2. omgang: I den andre omgangen åpnet rommene seg mer. Sluttresultatet ble fastsatt til ${homeScore}–${awayScore} etter helhjertet innsats fra begge mannskap.`
        );
      }
    }

    // 4. Extended Analysis & Tactical Insight (Unikt per kamp)
    const tacticalFocus = pickIdx([
      `Bønes-laget viste spesielt gode takter i omstillingsfasen, der kjappe vendinger på kantene skapte trøbbel for motstanderens bakre ledd.`,
      `Defensivt lå laget kompakt med korte avstander mellom leddene, noe som tvang motstanderen til å slå mye langt mot et robust midtforsvar.`,
      `Pasningskvaliteten på den raske kunstgressmatten på ${venue} var tidvis på høyt nivå, og laget maktet å diktere banespillet i lengre perioder.`,
      `Gjennom tøff duellstyrke og oppofrende presspill maktet ${bonesTeamName} å bryte opp motstanderens rytme tidlig på banen.`
    ], 11);

    const standingsConsequence = isWin
      ? `Med denne seieren og 3 nye poeng på kontoen tar ${bonesTeamName} et solid steg oppover på tabellen i ${division}. Dette gir god arbeidsro og verdifull selvtillit foran de kommende oppgjørene.`
      : isDraw
      ? `Ett poeng inn på kontoen gjør at ${bonesTeamName} holder følge med konkurrentene i ${division}. Uavgjort-resultatet gir et stabilt fundament å bygge videre på.`
      : isFinished
      ? `Selv om det ikke ble poeng denne gangen, viste ${bonesTeamName} periodevis godt spill som gir gode svar for trenerapparatet inn mot neste serierunde i ${division}.`
      : `Dette oppgjøret kan vise seg å bli en nøkkelkamp i ${division}. En seier her vil befeste lagets posisjon i avdelingen.`;

    const coachTakeaway = pickIdx([
      `– Laginnsatsen, strukturen og viljen til å ta løpene for hverandre var på plass i dag. Vi tar med oss de positive sekvensene videre, rapporteres det fra støtteapparatet.`,
      `– Det er gledelig å se hvordan guttene og jentene backer hverandre opp når kampen bølger frem og tilbake. Dette viser den gode lagånden i klubben.`,
      `– Vi holder oss til kampplanen og viser tålmodighet i spillet. Det skal motstanderne merke også i de neste rundene.`,
      `– Å spille kamper på ${venue} foran et støttende publikum gir en herlig ramme for lokalfotballen i Bergen.`
    ], 17);

    return {
      headline,
      ingress,
      detailedNarrativeParts,
      tacticalFocus,
      standingsConsequence,
      coachTakeaway,
      venue,
      division,
      dateFormatted,
      weather,
      weatherMessage
    };
  }, [match, events, isFinished, isLive, isUpcoming, isWin, isDraw, isLoss, bonesScore, oppScore, homeScore, awayScore, goalDiff, bonesTeamName, opponent, isBonesHome]);

  return (
    <section
      id={`bt-match-summary-${match.id}`}
      className="mt-4 bg-gradient-to-br from-[#07192F] via-[#0B2545] to-[#133A6B] text-white rounded-2xl border border-blue-900/60 shadow-md overflow-hidden transition-all"
    >
      {/* Top BT Header Brand Bar */}
      <div className="bg-[#051424] px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          {/* BT Red Logo Badge */}
          <div className="px-2 py-0.5 rounded bg-[#E31B23] text-white font-black text-xs tracking-wider shadow-xs flex items-center space-x-1">
            <span>BT</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xs tracking-wide text-white uppercase">
                Bergens Tidende Lokalfotball
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                bt.no/tag/boenes-idrettslag
              </span>
            </div>
            <p className="text-[10px] text-slate-300">
              Journalistisk kampdekning for Bønes IL • NFF Hordaland
            </p>
          </div>
        </div>

        {/* Link directly to BT Bønes tag */}
        <div className="flex items-center space-x-2">
          <a
            id="bt-link-button"
            href="https://www.bt.no/tag/boenes-idrettslag"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs font-bold text-amber-300 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Åpne Bergens Tidende sine Bønes IL-artikler"
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>Les på bt.no</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isExpanded ? 'Skjul referat' : 'Vis referat'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Article Header & Byline */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-blue-200">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-amber-300" />
                <span className="capitalize">{article.dateFormatted}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span className="font-semibold text-white">{article.venue}</span>
              </span>
              <span>•</span>
              <span className="text-amber-300 font-bold">{article.division}</span>
              <span>•</span>
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 border border-white/15 text-[10px] font-bold">
                <span>{article.weather.temperature}°C</span>
                <span>•</span>
                <span>{article.weather.pitchStatus.badge}</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
              {article.headline}
            </h3>

            <p className="text-xs sm:text-sm text-blue-100/95 leading-relaxed font-serif italic border-l-3 border-[#E31B23] pl-3 py-1 bg-white/5 rounded-r-lg">
              {article.ingress}
            </p>
          </div>

          {/* Vær & Baneforhold under kampen (BT Lokalfotball) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-black uppercase tracking-wider text-[11px] text-blue-200">
                  {isUpcoming ? 'Værvarsel & Forventede Baneforhold' : 'Banerapport & Spilleforhold'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black border bg-blue-500/20 text-cyan-200 border-cyan-400/30">
                {article.weather.pitchStatus.badge}
              </span>
            </div>

            <p className="text-blue-100 text-xs leading-relaxed bg-blue-950/40 p-2.5 rounded-lg border border-white/10">
              {article.weatherMessage}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-blue-200/90 pt-0.5">
              <span className="flex items-center space-x-1">
                <Thermometer className="w-3 h-3 text-amber-300" />
                <span>{article.weather.temperature}°C (føles {article.weather.feelsLike}°)</span>
              </span>
              <span className="flex items-center space-x-1">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span>Nedbør: {article.weather.precipitationMm} mm</span>
              </span>
              <span className="flex items-center space-x-1">
                <Wind className="w-3 h-3 text-teal-300" />
                <span>Vind: {article.weather.windSpeedMs} m/s</span>
              </span>
              <span className="text-slate-300">
                Underlag: <strong className="text-white">{article.weather.pitchStatus.ballSpeed}</strong>
              </span>
            </div>
          </div>

          {/* Match Score & Goalscorers Interactive Snapshot */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="text-center px-3 py-1.5 bg-[#051424] rounded-lg border border-white/15">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Resultat</span>
                <span className="text-xl font-mono font-black text-amber-300">
                  {homeScore} – {awayScore}
                </span>
              </div>
              <div>
                <p className="font-bold text-white text-xs">{match.homeTeam} vs {match.awayTeam}</p>
                <p className="text-[11px] text-slate-300 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-emerald-400 inline" />
                  <span>{article.venue}</span>
                </p>
              </div>
            </div>

            {/* Quick Scorers List */}
            {Object.keys(bonesScorersCount).length > 0 && (
              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                <span className="text-[10px] uppercase font-bold text-blue-200 block">Scoringer for Bønes:</span>
                <div className="flex flex-wrap sm:justify-end gap-1.5 mt-0.5">
                  {Object.entries(bonesScorersCount).map(([scorerName, count]) => (
                    <button
                      key={scorerName}
                      onClick={() => onSelectPlayer && onSelectPlayer(scorerName, match.teamId)}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                      title="Trykk for spillerstatistikk"
                    >
                      <span>⚽ {scorerName}</span>
                      {count > 1 && <span className="text-[10px] opacity-80">({count})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kronologisk Kampsammendrag fra Hendelsene */}
          <div className="space-y-2 text-xs text-slate-200 leading-relaxed">
            <h4 className="font-bold uppercase tracking-wider text-[11px] text-amber-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Kronologisk kampsammendrag</span>
            </h4>

            {article.detailedNarrativeParts.length > 0 ? (
              <div className="space-y-2 bg-black/25 rounded-xl p-3 border border-white/10 text-xs">
                {article.detailedNarrativeParts.map((desc, i) => (
                  <p key={i} className="flex items-start space-x-2 text-slate-200 leading-relaxed">
                    <span className="text-amber-400 font-bold shrink-0">▸</span>
                    <span>{desc}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="bg-black/20 rounded-xl p-3 border border-white/5 text-[11px] text-slate-300">
                Oppgjøret mellom {bonesTeamName} og {opponent} ble gjennomført på {article.venue}.
              </p>
            )}
          </div>

          {/* Utvidet analyse: Tabellkonsekvenser, taktisk kontekst & laginnsats */}
          <div className="bg-gradient-to-r from-blue-950/80 to-slate-900/80 rounded-xl p-4 border border-white/10 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Utvidet Lokalfotball-analyse & Tabellstatus</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">BT Lokalfotball</span>
            </div>

            {/* Tactical narrative paragraph */}
            <p className="text-blue-100 text-xs leading-relaxed">
              {article.tacticalFocus}
            </p>

            {/* Table consequences paragraph */}
            <div className="flex items-start space-x-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-slate-200 text-xs leading-relaxed">
                {article.standingsConsequence}
              </p>
            </div>

            {/* Coach quote / reflection */}
            <blockquote className="border-l-2 border-amber-400 pl-3 italic text-blue-200 text-xs">
              {article.coachTakeaway}
            </blockquote>

            {/* Disciplinary & Match Snapshot Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-300">
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Disiplinært: {yellowCards.length} gult{yellowCards.length === 1 ? '' : 'e'} / {redCards.length} rødt
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  Lag: {bonesTeamName}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">
                  Bane: {article.venue}
                </span>
              </div>
            </div>

            {/* Direct Link to bt.no/tag/boenes-idrettslag */}
            <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 text-[11px]">
              <span className="text-slate-300">
                Se tabeller, børs og fullstendige artikler for Bønes IL hos Bergens Tidende:
              </span>
              <a
                href="https://www.bt.no/tag/boenes-idrettslag"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-300 hover:text-white font-bold underline inline-flex items-center space-x-1"
              >
                <span>bt.no/tag/boenes-idrettslag</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>
      )}
    </section>
  );
};
