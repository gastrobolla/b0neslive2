import {
  Match,
  MatchEvent,
  MatchEventType,
  MatchLineup,
  LaglederReportRequest,
} from '../../src/types.js';
import { IMatchRepository } from '../repositories/matchRepository.js';
import { matchRepository } from '../repositories/jsonMatchRepository.js';
import { nffProvider } from '../providers/nffProvider.js';
import {
  generateDeterministicEventId,
  calculateMatchScore,
  sanitizeSlug,
} from '../../src/utils/derivedStats.js';

export class MatchService {
  constructor(private repo: IMatchRepository = matchRepository) {}

  /**
   * Retrieves all matches or filtered matches
   */
  async getMatches(filters?: Parameters<IMatchRepository['queryMatches']>[0]): Promise<Match[]> {
    if (!filters) {
      return this.repo.getAllMatches();
    }
    return this.repo.queryMatches(filters);
  }

  /**
   * Retrieves a single match by ID
   */
  async getMatchById(id: string): Promise<Match | undefined> {
    return this.repo.getMatchById(id);
  }

  /**
   * Handles user/lagleder reports.
   * STRICT POLICY: Goal and Card creation from public/lagleder input is prohibited.
   * Only comments, notes, assists enrichment, and substitutions are accepted as supplementary data.
   */
  async handleLaglederReport(req: LaglederReportRequest): Promise<{ match: Match; message: string }> {
    const match = await this.repo.getMatchById(req.matchId);
    if (!match) {
      throw new Error(`Kamp med ID ${req.matchId} ble ikke funnet.`);
    }

    if (!req.reporterName || !req.reporterName.trim()) {
      throw new Error('Navn og rolle på rapportør er påkrevd.');
    }

    const reporter = req.reporterName.trim();
    const minute = Math.max(0, Math.min(120, Number(req.minute) || 0));
    const now = new Date().toISOString();

    // 1. Goal reporting (direct live goal registration with scorer and optional assist)
    if (req.action === 'goal') {
      const isHome = req.team === match.homeTeam || req.team.toLowerCase().includes(match.homeTeam.toLowerCase());
      if (isHome) {
        match.homeScore = (match.homeScore ?? 0) + 1;
      } else {
        match.awayScore = (match.awayScore ?? 0) + 1;
      }
      match.status = 'live';
      match.currentMinute = minute > 0 ? minute : match.currentMinute;
      match.lastUpdatedAt = now;
      match.lastUpdatedSource = 'lagleder';
      match.reportedBy = reporter;

      const scorerName = req.player || 'Ukjent spiller';
      const assistName = req.assistPlayer || undefined;
      let goalDesc = `⚽ Mål for ${req.team}: ${scorerName}`;
      if (req.goalType === 'penalty') goalDesc += ' (Straffespark)';
      else if (req.goalType === 'own_goal') goalDesc += ' (Selvmål)';
      else if (req.goalType === 'freekick') goalDesc += ' (Frispark)';
      else if (req.goalType === 'header') goalDesc += ' (Heading)';

      if (assistName) {
        goalDesc += ` (Målgivende: ${assistName})`;
      }
      if (req.description) {
        goalDesc += ` - ${req.description}`;
      }

      const goalEvent: MatchEvent = {
        id: generateDeterministicEventId(
          match.id,
          minute,
          'goal',
          sanitizeSlug(scorerName),
          req.team || match.teamName
        ),
        matchId: match.id,
        minute,
        type: 'goal',
        player: scorerName,
        assistPlayer: assistName,
        team: req.team || match.teamName,
        teamId: match.teamId,
        description: goalDesc,
        source: 'lagleder',
        reportedBy: reporter,
        createdAt: now,
      };

      const updated = await this.repo.addSupplementaryComment(match.id, goalEvent);
      return {
        match: updated,
        message: `Mål for ${req.team} (${scorerName}${assistName ? ' / assist: ' + assistName : ''}) i det ${minute}. minutt ble registrert! Ny stilling: ${match.homeScore ?? 0} - ${match.awayScore ?? 0}.`,
      };
    }

    // 2. Card reporting (yellow or red card directly linked to player and reason)
    if (req.action === 'card') {
      const isRed = req.cardType === 'red';
      const eventType: MatchEventType = isRed ? 'red_card' : 'yellow_card';
      const playerName = req.player || 'Ukjent spiller';
      let cardDesc = `${isRed ? '🟥 Rødt kort' : '🟨 Gult kort'} til ${playerName} (${req.team})`;
      if (req.cardReason) {
        cardDesc += `: ${req.cardReason}`;
      }
      if (req.description) {
        cardDesc += ` (${req.description})`;
      }

      const cardEvent: MatchEvent = {
        id: generateDeterministicEventId(
          match.id,
          minute,
          eventType,
          sanitizeSlug(playerName),
          req.team || match.teamName
        ),
        matchId: match.id,
        minute,
        type: eventType,
        player: playerName,
        team: req.team || match.teamName,
        teamId: match.teamId,
        description: cardDesc,
        linkedEventId: req.targetEventId,
        source: 'lagleder',
        reportedBy: reporter,
        createdAt: now,
      };

      const updated = await this.repo.addSupplementaryComment(match.id, cardEvent);
      return {
        match: updated,
        message: `${isRed ? 'Rødt kort' : 'Gult kort'} til ${playerName} i det ${minute}. minutt ble registrert.`,
      };
    }

    // 3. Status change (pause, andre omgang, ferdig)
    if (req.action === 'status_change') {
      const targetStatus = req.matchStatus || 'live';
      match.status = targetStatus;
      match.currentMinute = minute > 0 ? minute : match.currentMinute;
      match.lastUpdatedAt = now;
      match.lastUpdatedSource = 'lagleder';
      match.reportedBy = reporter;

      let statusLabel = targetStatus === 'live' ? 'Pågår nå (Live)' : targetStatus === 'finished' ? 'Ferdigspilt' : 'Ikke startet';
      if (req.matchPeriod === 'halftime') statusLabel = 'Pause';
      else if (req.matchPeriod === '2nd_half') statusLabel = '2. omgang i gang';
      else if (req.matchPeriod === 'fulltime') statusLabel = 'Sluttresultat';

      const commentText = req.description || `Kampstatus oppdatert til ${statusLabel} (${minute}') av ${reporter}`;
      const statusEvent: MatchEvent = {
        id: generateDeterministicEventId(
          match.id,
          minute,
          'whistle',
          sanitizeSlug(reporter),
          req.team || match.teamName
        ),
        matchId: match.id,
        minute,
        type: 'whistle',
        player: reporter,
        team: req.team || match.teamName,
        teamId: match.teamId,
        description: commentText,
        source: 'lagleder',
        reportedBy: reporter,
        createdAt: now,
      };

      const updated = await this.repo.addSupplementaryComment(match.id, statusEvent);
      return {
        match: updated,
        message: `Kampstatus ble oppdatert til ${statusLabel}.`,
      };
    }

    // 4. Sub / bytte (linked to player out and player in)
    if (req.action === 'sub') {
      const inPlayer = req.subInPlayer || req.player || 'Ukjent spiller';
      const outPlayer = req.subOutPlayer || 'Ukjent spiller';
      const subDesc = req.description || `🔄 Bytte for ${req.team || match.teamName}: Ut: ${outPlayer} ➔ Inn: ${inPlayer}`;
      const subEvent: MatchEvent = {
        id: generateDeterministicEventId(
          match.id,
          minute,
          'sub',
          sanitizeSlug(inPlayer),
          req.team || match.teamName
        ),
        matchId: match.id,
        minute,
        type: 'sub',
        player: inPlayer,
        subInPlayer: inPlayer,
        subOutPlayer: outPlayer,
        team: req.team || match.teamName,
        teamId: match.teamId,
        description: subDesc,
        source: 'lagleder',
        reportedBy: reporter,
        createdAt: now,
      };

      const updated = await this.repo.addSupplementaryComment(match.id, subEvent);
      return {
        match: updated,
        message: `Bytte (${outPlayer} ut, ${inPlayer} inn) i det ${minute}. minutt ble registrert.`,
      };
    }

    // 5. Assist comment / link assist to specific goal
    if ((req.action as string) === 'assist_comment' || (req.action as string) === 'event_comment') {
      let targetGoal = req.targetGoalId
        ? (match.events || []).find((e) => e.id === req.targetGoalId && e.type === 'goal')
        : null;

      if (!targetGoal) {
        const teamGoals = (match.events || []).filter(
          (e) => e.type === 'goal' && (e.team === req.team || (!req.team && e.team?.includes('Bønes')))
        );
        targetGoal = teamGoals.length > 0 ? teamGoals[teamGoals.length - 1] : null;
      }

      const assistPlayerName = req.assistPlayer || req.player;

      if (targetGoal && assistPlayerName) {
        targetGoal.assistPlayer = assistPlayerName;
        targetGoal.reportedBy = reporter;
        if (req.description) {
          targetGoal.description = `${targetGoal.description} (Målgivende: ${assistPlayerName}. ${req.description})`;
        } else if (!targetGoal.description.includes(`Målgivende: ${assistPlayerName}`)) {
          targetGoal.description = `${targetGoal.description} (Målgivende: ${assistPlayerName})`;
        }
        await this.repo.updateMatchEvents(match.id, match.events || []);
        return {
          match,
          message: `Målgivende pasning (${assistPlayerName}) ble knyttet til ${targetGoal.player || 'målet'} (${targetGoal.minute}')!`,
        };
      }
    }

    // 6. General match commentary or event observation (can be linked to goal or card)
    const linkedEvent = req.targetEventId || req.targetGoalId
      ? (match.events || []).find((e) => e.id === (req.targetEventId || req.targetGoalId))
      : undefined;

    let commentDesc = req.description || `Kommentar fra ${reporter}`;
    if (req.player) {
      commentDesc = `[${req.player}] ${commentDesc}`;
    }
    if (linkedEvent) {
      commentDesc += ` (Knyttet til: ${linkedEvent.type === 'goal' ? '⚽ Mål' : linkedEvent.type === 'red_card' ? '🟥 Rødt kort' : '🟨 Gult kort'} i det ${linkedEvent.minute}. minutt)`;
    }
    const commentEvent: MatchEvent = {
      id: generateDeterministicEventId(
        match.id,
        minute,
        'comment',
        sanitizeSlug(reporter),
        req.team || match.teamName
      ),
      matchId: match.id,
      minute,
      type: 'comment',
      player: req.player || reporter,
      team: req.team || match.teamName,
      teamId: match.teamId,
      description: commentDesc,
      source: 'lagleder',
      reportedBy: reporter,
      createdAt: now,
    };

    const updated = await this.repo.addSupplementaryComment(match.id, commentEvent);
    return {
      match: updated,
      message: `Kamphendelse/kommentar ble registrert i tidslinjen.`,
    };
  }

  /**
   * Syncs official match events and lineup from NFF.
   * "Det er bare en stor synk, og alle oppdateringer etter det er jo bare endring av tilleggsdata. Ikke erstatninger."
   */
  async syncMatchFromNff(matchId: string): Promise<Match> {
    const match = await this.repo.getMatchById(matchId);
    if (!match) {
      throw new Error(`Kamp med ID ${matchId} ble ikke funnet.`);
    }

    // 1. Fetch official events from NFF
    const officialEvents = await nffProvider.fetchMatchEvents(match);

    // 2. Fetch official lineup from NFF
    const lineupResult = await nffProvider.fetchMatchLineup(match);

    // 3. Update lineup if retrieved and mark official
    if (lineupResult && lineupResult.bonesLineup) {
      match.lineup = lineupResult.bonesLineup;
      match.homeLineup = lineupResult.homeLineup;
      match.awayLineup = lineupResult.awayLineup;
      match.isOfficialFiks = true;
    }

    // 4. Update events preserving supplementary user additions (comments, assists)
    if (officialEvents && officialEvents.length > 0) {
      await this.repo.updateMatchEvents(matchId, officialEvents);
    } else {
      await this.repo.upsertMatch(match);
    }

    return (await this.repo.getMatchById(matchId)) || match;
  }
}

export const matchService = new MatchService();
