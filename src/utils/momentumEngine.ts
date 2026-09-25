import { Match, MatchEvent, MatchMomentumSummary, MomentumPoint } from '../types.js';

/**
 * Synthetic Attack Momentum Engine for Grassroots & Semi-Pro Football.
 * 
 * Reconstructs a fluid, minute-by-minute SofaScore Attack Momentum timeline (-100 to +100)
 * from real NFF match events, goal intervals, score progressions, card pressure,
 * and game-state dynamics (such as late trailing-team desperation sieges).
 */
export function calculateMatchMomentum(match: Match): MatchMomentumSummary {
  const isBonesHome = (match.homeTeam || '').toLowerCase().includes('bønes');
  const div = (match.division || '').toLowerCase();
  const matchDuration = div.includes('13') || div.includes('14') ? 70 : div.includes('15') || div.includes('16') ? 80 : 90;
  const halfTimeMinute = Math.round(matchDuration / 2);
  const clutchStartMinute = matchDuration - 15;

  const events = [...(match.events || [])].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  // Determine effective minutes to plot
  let maxMinute = matchDuration;
  if (match.status === 'upcoming') {
    maxMinute = 0;
  }

  // Pre-index key events
  const goals = events.filter((e) => e.type === 'goal');
  const cards = events.filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
  const redCards = events.filter((e) => e.type === 'red_card');
  const subs = events.filter((e) => e.type === 'sub');

  // Helper to determine if an event belongs to Home or Away
  const isHomeEvent = (e: MatchEvent): boolean => {
    if (e.team) {
      return e.team.toLowerCase().includes(match.homeTeam.toLowerCase());
    }
    return isBonesHome;
  };

  // Track running score throughout match
  const scoreAtMinute = (minute: number) => {
    let h = 0;
    let a = 0;
    for (const g of goals) {
      if ((g.minute || 0) <= minute) {
        if (isHomeEvent(g)) h++;
        else a++;
      }
    }
    return { home: h, away: a };
  };

  // Step 1: Compute raw minute-by-minute momentum impulses
  const rawPoints: { minute: number; homeForce: number; awayForce: number; net: number }[] = [];

  for (let m = 1; m <= matchDuration; m++) {
    // Base flow: slight home advantage (+5) with low sinusoidal natural match rhythm
    const rhythm = Math.sin((m / 6) * Math.PI) * 10 + Math.cos((m / 11) * Math.PI) * 6;
    let homeForce = 35 + rhythm + 5;
    let awayForce = 35 - rhythm;

    const currentScore = scoreAtMinute(m);
    const scoreDiff = currentScore.home - currentScore.away; // > 0 = home leads, < 0 = away leads

    // 1. Goal Impact (Buildup, Strike, and Aftermath)
    for (const g of goals) {
      const gMin = g.minute || 0;
      const gIsHome = isHomeEvent(g);
      const delta = m - gMin;

      // Attacking pressure leading up to goal (-3 to 0 mins)
      if (delta >= -3 && delta < 0) {
        const buildUpIntensity = (4 + delta) * 16; // 16 to 48
        if (gIsHome) homeForce += buildUpIntensity;
        else awayForce += buildUpIntensity;
      }
      // Exact goal minute
      else if (delta === 0) {
        if (gIsHome) {
          homeForce += 65;
          awayForce = Math.max(5, awayForce - 25);
        } else {
          awayForce += 65;
          homeForce = Math.max(5, homeForce - 25);
        }
      }
      // Post-goal momentum high (1 to 4 mins after goal)
      else if (delta > 0 && delta <= 4) {
        const decay = (5 - delta) * 8;
        if (gIsHome) homeForce += decay;
        else awayForce += decay;
      }
      // Immediate trailing team response push (5 to 10 mins after conceding if still trailing by 1)
      else if (delta > 4 && delta <= 10) {
        if (gIsHome && scoreDiff === 1) {
          awayForce += 18; // Away tries to respond
        } else if (!gIsHome && scoreDiff === -1) {
          homeForce += 18; // Home tries to respond
        }
      }
    }

    // 2. Red Card Disadvantage
    for (const r of redCards) {
      const rMin = r.minute || 0;
      if (m >= rMin) {
        if (isHomeEvent(r)) {
          homeForce = Math.max(10, homeForce - 30);
          awayForce += 25;
        } else {
          awayForce = Math.max(10, awayForce - 30);
          homeForce += 25;
        }
      }
    }

    // 3. Yellow Card cluster pressure
    for (const c of cards) {
      const cMin = c.minute || 0;
      if (Math.abs(m - cMin) <= 3) {
        if (isHomeEvent(c)) {
          // Home conceded a foul/card under pressure
          awayForce += 12;
        } else {
          homeForce += 12;
        }
      }
    }

    // 4. Substitution Energy Injection
    for (const s of subs) {
      const sMin = s.minute || 0;
      if (m >= sMin && m <= sMin + 5) {
        if (isHomeEvent(s)) homeForce += 14;
        else awayForce += 14;
      }
    }

    // 5. Game-State Crunch-Time Pressure (Last 15 mins)
    if (m >= clutchStartMinute) {
      if (scoreDiff === 1) {
        // Home leads 2-1 or 1-0: Away team mounts desperate all-out attack
        awayForce += 32;
        homeForce = Math.max(15, homeForce - 10);
      } else if (scoreDiff === -1) {
        // Away leads 1-2: Home team mounts all-out attack
        homeForce += 32;
        awayForce = Math.max(15, awayForce - 10);
      } else if (scoreDiff === 0) {
        // Tied match in final minutes: both teams trade high-intensity attacks
        homeForce += 15;
        awayForce += 15;
      }
    }

    // Calculate preliminary net: -100 to +100
    const net = Math.max(-100, Math.min(100, homeForce - awayForce));
    rawPoints.push({ minute: m, homeForce, awayForce, net });
  }

  // Step 2: Gaussian / Moving Average Smoothing for Authentic SofaScore waves
  const timeline: MomentumPoint[] = [];

  for (let i = 0; i < rawPoints.length; i++) {
    const cur = rawPoints[i];
    const prev = rawPoints[Math.max(0, i - 1)];
    const next = rawPoints[Math.min(rawPoints.length - 1, i + 1)];

    // Weighted 3-point filter: (0.25 * prev + 0.5 * cur + 0.25 * next)
    const smoothedNet = Math.round(prev.net * 0.22 + cur.net * 0.56 + next.net * 0.22);
    const clampedNet = Math.max(-100, Math.min(100, smoothedNet));

    // Convert net to positive home and away levels
    const homeMomentum = clampedNet > 0 ? Math.min(100, clampedNet) : Math.max(0, 20 + clampedNet * 0.2);
    const awayMomentum = clampedNet < 0 ? Math.min(100, Math.abs(clampedNet)) : Math.max(0, 20 - clampedNet * 0.2);

    const minEvents = events.filter((e) => (e.minute || 0) === cur.minute);

    // Tactical narrative label for notable phases
    let narrative: string | undefined;
    if (minEvents.some((e) => e.type === 'goal')) {
      const g = minEvents.find((e) => e.type === 'goal')!;
      narrative = `⚽ Mål: ${g.player || 'Scoring'} (${g.team || ''})`;
    } else if (minEvents.some((e) => e.type === 'red_card')) {
      narrative = '🟥 Rødt kort!';
    } else if (cur.minute >= clutchStartMinute && Math.abs(clampedNet) >= 30) {
      narrative = clampedNet > 0 ? `${match.homeTeam} i massivt sluttpress` : `${match.awayTeam} i massivt sluttpress`;
    } else if (clampedNet >= 50) {
      narrative = `${match.homeTeam} tungt etablert på motstanders halvdel`;
    } else if (clampedNet <= -50) {
      narrative = `${match.awayTeam} tungt etablert på motstanders halvdel`;
    }

    timeline.push({
      minute: cur.minute,
      homeMomentum: Math.round(homeMomentum),
      awayMomentum: Math.round(awayMomentum),
      netMomentum: clampedNet,
      scoreAtMinute: scoreAtMinute(cur.minute),
      events: minEvents.length > 0 ? minEvents : undefined,
      narrative
    });
  }

  // Step 3: Statistical Dominance Aggregation
  let homePointsSum = 0;
  let awayPointsSum = 0;
  let h1Home = 0;
  let h1Away = 0;
  let h2Home = 0;
  let h2Away = 0;

  for (const pt of timeline) {
    const hWeight = Math.max(0, pt.netMomentum);
    const aWeight = Math.max(0, -pt.netMomentum);

    homePointsSum += hWeight + 20;
    awayPointsSum += aWeight + 20;

    if (pt.minute <= halfTimeMinute) {
      h1Home += hWeight + 20;
      h1Away += aWeight + 20;
    } else {
      h2Home += hWeight + 20;
      h2Away += aWeight + 20;
    }
  }

  const totalPoints = Math.max(1, homePointsSum + awayPointsSum);
  const homeDominancePct = Math.round((homePointsSum / totalPoints) * 100);
  const awayDominancePct = 100 - homeDominancePct;

  const totalH1 = Math.max(1, h1Home + h1Away);
  const totalH2 = Math.max(1, h2Home + h2Away);

  // Pressure peaks detection (spikes of high intensity)
  const pressurePeaks: MatchMomentumSummary['pressurePeaks'] = [];
  for (let i = 2; i < timeline.length - 2; i++) {
    const pt = timeline[i];
    if (pt.netMomentum >= 60 && pt.netMomentum > timeline[i - 1].netMomentum && pt.netMomentum > timeline[i + 1].netMomentum) {
      pressurePeaks.push({
        minute: pt.minute,
        team: 'home',
        intensity: pt.netMomentum,
        label: `${match.homeTeam} overtak (${pt.minute}')`
      });
    } else if (pt.netMomentum <= -60 && pt.netMomentum < timeline[i - 1].netMomentum && pt.netMomentum < timeline[i + 1].netMomentum) {
      pressurePeaks.push({
        minute: pt.minute,
        team: 'away',
        intensity: Math.abs(pt.netMomentum),
        label: `${match.awayTeam} overtak (${pt.minute}')`
      });
    }
  }

  // Crunch-time phase summary
  let clutchPhase: MatchMomentumSummary['clutchPhase'];
  const clutchSlice = timeline.filter((p) => p.minute >= clutchStartMinute);
  if (clutchSlice.length > 0) {
    const avgNet = clutchSlice.reduce((s, p) => s + p.netMomentum, 0) / clutchSlice.length;
    const dominantTeam = avgNet >= 15 ? match.homeTeam : avgNet <= -15 ? match.awayTeam : 'Jevnspilt';
    const description =
      dominantTeam === 'Jevnspilt'
        ? `Intense sluttminutter med bølgende spill fram og tilbake (${clutchStartMinute}'-${matchDuration}')`
        : `${dominantTeam} dominerte banespillet i sluttminuttene (${clutchStartMinute}'-${matchDuration}')`;

    clutchPhase = {
      startMinute: clutchStartMinute,
      dominantTeam,
      description
    };
  }

  return {
    timeline,
    matchDuration,
    halfTimeMinute,
    homeDominancePct,
    awayDominancePct,
    firstHalfDominance: {
      home: Math.round((h1Home / totalH1) * 100),
      away: Math.round((h1Away / totalH1) * 100)
    },
    secondHalfDominance: {
      home: Math.round((h2Home / totalH2) * 100),
      away: Math.round((h2Away / totalH2) * 100)
    },
    clutchPhase,
    pressurePeaks
  };
}
