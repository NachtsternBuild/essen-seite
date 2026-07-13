import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { getPref, PREF_DESKTOP_NOTIFICATIONS } from '../lib/preferences';
import type { AuthUser, Notification } from '../types';

/** Poll interval for fresh notifications (ms). */
const POLL_MS = 60_000;

/** Shows a browser notification for newly-arrived unread items, if opted in. */
function maybeShowDesktop(previousIds: Set<string>, items: Notification[]): void {
  if (!getPref(PREF_DESKTOP_NOTIFICATIONS, false)) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  for (const n of items) {
    if (!n.read && !previousIds.has(n.id)) {
      try {
        new Notification(n.title, { body: n.message || undefined, tag: n.id });
      } catch {
        // ignore (e.g. permission revoked mid-session)
      }
    }
  }
}

export function useNotifications(currentUser: AuthUser | null) {
  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const userId = currentUser?.id ?? null;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      seenIdsRef.current = new Set();
      initializedRef.current = false;
      return;
    }
    setIsLoading(true);
    try {
      const fresh = await notificationService.listForUser(userId);
      // Only surface desktop popups for items arriving after the first load,
      // so logging in doesn't replay every existing unread notification.
      if (initializedRef.current) maybeShowDesktop(seenIdsRef.current, fresh);
      seenIdsRef.current = new Set(fresh.map(n => n.id));
      initializedRef.current = true;
      setItems(fresh);
    } catch {
      // best-effort; notifications are non-critical
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
    if (timerRef.current) clearInterval(timerRef.current);
    if (userId) {
      timerRef.current = setInterval(reload, POLL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reload, userId]);

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch {
      void reload();
    }
  }, [reload]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead(userId);
    } catch {
      void reload();
    }
  }, [userId, reload]);

  const remove = useCallback(async (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
    try {
      await notificationService.remove(id);
    } catch {
      void reload();
    }
  }, [reload]);

  const unreadCount = items.filter(n => !n.read).length;

  return { items, unreadCount, isLoading, reload, markRead, markAllRead, remove };
}
