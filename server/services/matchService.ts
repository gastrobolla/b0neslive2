import {
  Match,
  MatchEvent,
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

    // DISALLOW public creation of goals and cards
    if (req.action === 'goal' as any) {
      throw new Error(
        'Innlegging av mål er forbeholdt offisielle NFF-rapporter for å sikre nøyaktig statistikk. Du kan legge inn en kommentar eller målgivende pasning.'
      );
    }
    if (req.action === 'card' as any) {
      throw new Error(
        'Innlegging av gule og røde kort er forbeholdt offisielle NFF-rapporter for å sikre nøyaktig statistikk. Du kan legge inn en situasjonskommentar.'
      );
    }
    if (req.action === 'score_adjust' as any) {
      throw new Error(
        'Manuell endring av kampscore er ikke tillatt. Resultat beregnes utelukkende fra offisielle kamphendelser.'
      );
    }

    const reporter = req.reporterName.trim();
    const minute = Math.max(0, Math.min(120, Number(req.minute) || 0));
    const now = new Date().toISOString();

    // 1. Status change (pause, andre omgang, ferdig)
    if (req.action === 'status_change') {
      const targetStatus = req.matchStatus || 'live';
      match.status = targetStatus;
      match.currentMinute = minute > 0 ? minute : match.currentMinute;
      match.lastUpdatedAt = now;
      match.lastUpdatedSource = 'lagleder';
      match.reportedBy = reporter;

      const commentText = req.description || `Kampstatus oppdatert til ${targetStatus} av ${reporter}`;
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
        message: `Kampstatus ble oppdatert til ${targetStatus}.`,
      };
    }

    // 2. Sub / bytte
    if (req.action === 'sub') {
      const subDesc = req.description || `Spillerbytte for ${req.team || match.teamName}: ${req.player || 'Ukjent spiller'}`;
      const subEvent: MatchEvent = {
        id: generateDeterministicEventId(
          match.id,
          minute,
          'sub',
          sanitizeSlug(req.player || reporter),
          req.team || match.teamName
        ),
        matchId: match.id,
        minute,
        type: 'sub',
        player: req.player || reporter,
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
        message: `Bytte i det ${minute}. minutt ble registrert.`,
      };
    }

    // 3. Assist comment / comment to existing goal
    if ((req.action as string) === 'assist_comment' || (req.action as string) === 'event_comment') {
      // Find latest goal for the team or attach assist
      const teamGoals = (match.events || []).filter(
        (e) => e.type === 'goal' && (e.team === req.team || (!req.team && e.team?.includes('Bønes')))
      );
      const targetGoal = teamGoals.length > 0 ? teamGoals[teamGoals.length - 1] : null;

      if (targetGoal && req.player) {
        // Enrich the existing official goal with assist details without modifying goal count
        targetGoal.assistPlayer = req.player;
        targetGoal.reportedBy = reporter;
        if (req.description) {
          targetGoal.description = `${targetGoal.description} (Målgivende: ${req.player}. ${req.description})`;
        } else {
          targetGoal.description = `${targetGoal.description} (Målgivende: ${req.player})`;
        }
        await this.repo.updateMatchEvents(match.id, match.events || []);
        return {
          match,
          message: `Målgivende pasning (${req.player}) ble lagt til på målet.`,
        };
      }
    }

    // 4. General match commentary or supplementary observation
    const commentDesc = req.description || `Kommentar fra ${reporter}: ${req.player ? req.player + ' - ' : ''}`;
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
