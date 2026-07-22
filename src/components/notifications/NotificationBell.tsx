import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Bell, AlarmClock, CalendarDays, Pencil, Building2, Megaphone, Info, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { AuthUser, NotificationType } from '../../types';

const TYPE_ICON: Record<NotificationType, ReactNode> = {
  order_deadline: <AlarmClock size={16} />,
  new_week: <CalendarDays size={16} />,
  plan_changed: <Pencil size={16} />,
  new_group: <Building2 size={16} />,
  admin_message: <Megaphone size={16} />,
  system: <Info size={16} />,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationBell({ currentUser }: { currentUser: AuthUser | null }) {
  const { items, unreadCount, markRead, markAllRead, remove } = useNotifications(currentUser);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ bottom: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // The bell can live inside an overflow:auto ancestor (e.g. the sidebar), which
  // clips an absolutely-positioned panel. Render it in a portal instead and
  // position it with fixed coordinates derived from the bell's own rect.
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const updatePosition = () => {
      const rect = ref.current!.getBoundingClientRect();
      setPanelPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <div className="notif" ref={ref}>
      <button
        className="notif__bell"
        onClick={() => setOpen(o => !o)}
        aria-label={`Benachrichtigungen${unreadCount ? ` (${unreadCount} ungelesen)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="notif__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && panelPos && createPortal(
        <div
          className="notif__panel"
          role="dialog"
          aria-label="Benachrichtigungen"
          ref={panelRef}
          style={{ bottom: panelPos.bottom, left: panelPos.left }}
        >
          <div className="notif__panel-head">
            <strong>Benachrichtigungen</strong>
            {unreadCount > 0 && (
              <button className="btn btn--ghost btn--xs" onClick={markAllRead}>
                Alle gelesen
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="notif__empty">Keine Benachrichtigungen.</p>
          ) : (
            <ul className="notif__list">
              {items.map(n => (
                <li
                  key={n.id}
                  className={`notif__item${n.read ? '' : ' notif__item--unread'}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <span className="notif__icon" aria-hidden="true">{TYPE_ICON[n.type] ?? <Info size={16} />}</span>
                  <span className="notif__body">
                    <span className="notif__title">{n.title}</span>
                    {n.message && <span className="notif__msg">{n.message}</span>}
                    <span className="notif__time">{formatTime(n.created)}</span>
                  </span>
                  <button
                    className="notif__dismiss"
                    onClick={e => { e.stopPropagation(); remove(n.id); }}
                    aria-label="Benachrichtigung entfernen"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
