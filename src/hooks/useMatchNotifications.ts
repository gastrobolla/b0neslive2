import { useState, useEffect, useRef } from 'react';
import { Match } from '../types.js';
import {
  BonesNotification,
  NotificationSettings,
  loadNotificationSettings,
  saveNotificationSettings,
  loadNotificationHistory,
  appendNotificationHistory,
  clearNotificationHistory,
  playGoalSound,
  playKickoffWhistleSound,
  sendBrowserNotification,
  requestNotificationPermission,
} from '../utils/notificationSystem.js';

interface UseMatchNotificationsResult {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  notifications: BonesNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  clearHistory: () => void;
  activeToast: BonesNotification | null;
  dismissToast: () => void;
  testNotification: (type: 'goal' | 'kickoff') => void;
  requestPermission: () => Promise<NotificationPermission>;
}

export function useMatchNotifications(
  matches: Match[],
  favoriteTeamIds: string[] = []
): UseMatchNotificationsResult {
  const [settings, setSettings] = useState<NotificationSettings>(loadNotificationSettings);
  const [notifications, setNotifications] = useState<BonesNotification[]>(loadNotificationHistory);
  const [activeToast, setActiveToast] = useState<BonesNotification | null>(null);

  // Store previous match status and scores in ref to detect state transitions
  const prevMatchesMapRef = useRef<Map<string, { status: string; homeScore: number; awayScore: number; eventCount: number }>>(
    new Map()
  );
  const isFirstRunRef = useRef(true);

  // Save settings when changed
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveNotificationSettings(updated);
      return updated;
    });
  };

  // Request browser permission
  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') {
      updateSettings({ browserNotifications: true });
    }
    return res;
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('bones_notification_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Clear history
  const handleClearHistory = () => {
    clearNotificationHistory();
    setNotifications([]);
  };

  // Dismiss toast
  const dismissToast = () => {
    setActiveToast(null);
  };

  // Dispatch a new notification
  const dispatchNotification = (notif: BonesNotification) => {
    // 1. Play audio chime if enabled
    if (settings.soundEnabled) {
      if (notif.type === 'goal') {
        playGoalSound();
      } else if (notif.type === 'kickoff') {
        playKickoffWhistleSound();
      }
    }

    // 2. Spawn real browser notification if enabled
    if (settings.browserNotifications) {
      sendBrowserNotification(notif.title, {
        body: notif.body,
      });
    }

    // 3. Show in-app animated toast
    setActiveToast(notif);

    // 4. Save to history
    appendNotificationHistory(notif);
    setNotifications((prev) => [notif, ...prev].slice(0, 50));
  };

  // Manual test notification
  const testNotification = (type: 'goal' | 'kickoff') => {
    if (type === 'goal') {
      const testGoal: BonesNotification = {
        id: `test-goal-${Date.now()}`,
        type: 'goal',
        title: '⚽ MÅL TIL BØNES! (Test)',
        body: 'Bønes G14-1 scorer! 2 - 1 ved Henrik Vindenes (67\') mot Fyllingsdalen.',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        matchId: 'test-match',
        teamId: 'g14-1',
        homeTeam: 'Bønes G14-1',
        awayTeam: 'Fyllingsdalen',
        score: '2 - 1',
        scorer: 'Henrik Vindenes',
        minute: 67,
        read: false,
      };
      dispatchNotification(testGoal);
    } else {
      const testKickoff: BonesNotification = {
        id: `test-kickoff-${Date.now()}`,
        type: 'kickoff',
        title: '🏁 KAMPSTART! (Test)',
        body: 'Kampen mellom Bønes Menn 1 og Juristforeningen har startet på Bønesbanen!',
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        matchId: 'test-match-2',
        teamId: 'menn-1',
        homeTeam: 'Bønes Menn 1',
        awayTeam: 'Juristforeningen',
        read: false,
      };
      dispatchNotification(testKickoff);
    }
  };

  // Monitor match transitions whenever matches array updates
  useEffect(() => {
    if (!settings.enabled || !matches || matches.length === 0) return;

    const currentMap = prevMatchesMapRef.current;

    // Skip trigger on first run, just populate initial states
    if (isFirstRunRef.current) {
      matches.forEach((m) => {
        currentMap.set(m.id, {
          status: m.status,
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          eventCount: m.events?.length ?? 0,
        });
      });
      isFirstRunRef.current = false;
      return;
    }

    // Inspect each match for status changes (kickoff) and score changes (goal)
    matches.forEach((m) => {
      const prev = currentMap.get(m.id);
      if (!prev) {
        currentMap.set(m.id, {
          status: m.status,
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          eventCount: m.events?.length ?? 0,
        });
        return;
      }

      // Check favorites filter
      const isFavoriteMatch = favoriteTeamIds.includes(m.teamId);
      if (settings.favoritesOnly && !isFavoriteMatch) {
        // Still update state map to avoid re-triggering later
        currentMap.set(m.id, {
          status: m.status,
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          eventCount: m.events?.length ?? 0,
        });
        return;
      }

      // 1. Kickoff Transition (upcoming -> live)
      if (settings.kickoffAlerts && prev.status === 'upcoming' && m.status === 'live') {
        const kickoffNotif: BonesNotification = {
          id: `kickoff-${m.id}-${Date.now()}`,
          type: 'kickoff',
          title: `🏁 KAMPSTART: ${m.homeTeam} vs ${m.awayTeam}`,
          body: `Kampen i ${m.division} har nå startet på ${m.venue}!`,
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          matchId: m.id,
          teamId: m.teamId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          read: false,
        };
        dispatchNotification(kickoffNotif);
      }

      // 2. Goal Event / Score change
      const currentHome = m.homeScore ?? 0;
      const currentAway = m.awayScore ?? 0;
      const scoreIncreased = currentHome > prev.homeScore || currentAway > prev.awayScore;

      if (settings.goalAlerts && scoreIncreased && (m.status === 'live' || m.status === 'finished')) {
        const homeScored = currentHome > prev.homeScore;
        const scoringTeam = homeScored ? m.homeTeam : m.awayTeam;
        const isBonesScoring = scoringTeam.toLowerCase().includes('bønes');

        // Look for latest goal event
        const goalEvents = (m.events || []).filter((e) => e.type === 'goal');
        const latestGoal = goalEvents.length > 0 ? goalEvents[goalEvents.length - 1] : null;
        const scorerName = latestGoal?.player || 'Bønes-spiller';
        const minute = latestGoal?.minute || m.currentMinute;

        const goalNotif: BonesNotification = {
          id: `goal-${m.id}-${currentHome}-${currentAway}-${Date.now()}`,
          type: 'goal',
          title: isBonesScoring ? `⚽ MÅL TIL BØNES! (${currentHome} - ${currentAway})` : `⚽ Mål: ${scoringTeam} (${currentHome} - ${currentAway})`,
          body: `${scoringTeam} scorer${minute ? ` i det ${minute}. minutt` : ''}! ${scorerName ? `Målscorer: ${scorerName}. ` : ''}Stilling: ${m.homeTeam} ${currentHome} - ${currentAway} ${m.awayTeam}.`,
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          matchId: m.id,
          teamId: m.teamId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          score: `${currentHome} - ${currentAway}`,
          scorer: scorerName,
          minute: minute,
          read: false,
        };
        dispatchNotification(goalNotif);
      }

      // Update map for next tick
      currentMap.set(m.id, {
        status: m.status,
        homeScore: currentHome,
        awayScore: currentAway,
        eventCount: m.events?.length ?? 0,
      });
    });
  }, [matches, settings, favoriteTeamIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    settings,
    updateSettings,
    notifications,
    unreadCount,
    markAllAsRead,
    clearHistory: handleClearHistory,
    activeToast,
    dismissToast,
    testNotification,
    requestPermission: handleRequestPermission,
  };
}
