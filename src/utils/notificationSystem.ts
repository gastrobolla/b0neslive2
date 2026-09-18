// Bønes IL Sofascore Web Notification & Audio Engine
// Uses the standard Web Notifications API and Web Audio API synthesizer for zero-dependency sound alerts

export interface BonesNotification {
  id: string;
  type: 'goal' | 'kickoff' | 'fulltime' | 'test';
  title: string;
  body: string;
  timestamp: string;
  matchId?: string;
  teamId?: string;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  scorer?: string;
  minute?: number;
  read?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
  kickoffAlerts: boolean;
  goalAlerts: boolean;
  favoritesOnly: boolean;
}

const SETTINGS_KEY = 'bones_notification_settings';
const HISTORY_KEY = 'bones_notification_history';

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  browserNotifications: true,
  soundEnabled: true,
  kickoffAlerts: true,
  goalAlerts: true,
  favoritesOnly: false,
};

// Load settings from localStorage
export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save settings to localStorage
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// Load notification history
export function loadNotificationHistory(): BonesNotification[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save notification to history
export function appendNotificationHistory(notification: BonesNotification): void {
  try {
    const history = loadNotificationHistory();
    const updated = [notification, ...history].slice(0, 50); // keep last 50
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// Clear notification history
export function clearNotificationHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

// Web Audio API Synthesizer: Zero external audio file reliance
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play an energetic celebration chime for a Goal!
 * Ascending chord: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
 */
export function playGoalSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },
      { freq: 659.25, time: 0.12, duration: 0.15 },
      { freq: 783.99, time: 0.24, duration: 0.18 },
      { freq: 1046.50, time: 0.38, duration: 0.45 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + n.time);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + n.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.duration);
    });
  } catch (err) {
    console.warn('Audio playback not permitted or supported:', err);
  }
}

/**
 * Play a referee whistle sound for Kickoff!
 * High-pitched trill whistle (two quick bursts)
 */
export function playKickoffWhistleSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const bursts = [
      { time: 0, duration: 0.14 },
      { time: 0.2, duration: 0.32 },
    ];

    bursts.forEach((b) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, ctx.currentTime + b.time);
      osc.frequency.linearRampToValueAtTime(2800, ctx.currentTime + b.time + b.duration);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + b.time);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + b.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + b.time + b.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + b.time);
      osc.stop(ctx.currentTime + b.time + b.duration);
    });
  } catch (err) {
    console.warn('Audio playback not permitted or supported:', err);
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Trigger real browser system notification
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notifOptions: NotificationOptions = {
      icon: '/bones-logo.svg',
      badge: '/bones-logo.svg',
      tag: 'bones-match-alert',
      ...options,
    };

    const notif = new Notification(title, notifOptions);

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('Could not spawn browser notification:', err);
    return null;
  }
}
