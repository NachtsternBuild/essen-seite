import { useState, useEffect } from 'react';
import { useThemeContext } from '../../context/ThemeContext';
import { ACCENT_PRESETS } from '../../lib/accent';
import { usePermissions } from '../../context/PermissionContext';
import { useToastContext } from '../../context/ToastContext';
import { AuditLogPanel } from './AuditLogPanel';
import { SystemSettingsForm } from '../groups/SystemSettingsForm';
import { Spinner } from '../shared/Spinner';
import { settingsService } from '../../services/settingsService';
import { getPref, setPref, PREF_DESKTOP_NOTIFICATIONS } from '../../lib/preferences';
import type { AppSettings, AuthUser, ThemeMode, ViewType } from '../../types';

interface SettingsProps {
  currentUser: AuthUser | null;
  isSuperuser: boolean;
  onNavigate: (view: ViewType) => void;
  statisticsEnabled: boolean;
  setStatisticsEnabled: (value: boolean) => void;
}

type Tab = 'appearance' | 'notifications' | 'groups' | 'log' | 'system';

const THEME_LABELS: Record<ThemeMode, string> = {
  light: '☀️ Hell',
  dark: '🌙 Dunkel',
  system: '💻 System',
};

export function Settings({
  currentUser,
  isSuperuser,
  onNavigate,
  statisticsEnabled,
  setStatisticsEnabled,
}: SettingsProps) {
  const { can } = usePermissions();
  const canLog = can('VIEW_AUDIT_LOG');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'appearance', label: 'Darstellung' },
    { id: 'notifications', label: 'Benachrichtigungen' },
    ...(isSuperuser ? [{ id: 'groups' as Tab, label: 'Gruppen-Standards' }] : []),
    ...(canLog ? [{ id: 'log' as Tab, label: 'Protokoll' }] : []),
    { id: 'system', label: 'System' },
  ];
  const [tab, setTab] = useState<Tab>('appearance');

  return (
    <div className="settings">
      <div className="settings__tabs" role="tablist" aria-label="Einstellungsbereiche">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`settings__tab${tab === t.id ? ' settings__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="settings__panel card" role="tabpanel">
        {tab === 'appearance' && <AppearancePanel />}
        {tab === 'notifications' && <NotificationsPanel />}
        {tab === 'groups' && <GroupDefaultsPanel />}
        {tab === 'log' && <AuditLogPanel enabled={canLog} />}
        {tab === 'system' && (
          <SystemPanel
            currentUser={currentUser}
            isSuperuser={isSuperuser}
            onNavigate={onNavigate}
            statisticsEnabled={statisticsEnabled}
            setStatisticsEnabled={setStatisticsEnabled}
          />
        )}
      </div>
    </div>
  );
}

// ── Appearance (theme + accent) ─────────────────────────────────────────────────

function AppearancePanel() {
  const { theme, setTheme, accent, setAccent } = useThemeContext();

  return (
    <div className="settings-section">
      <h3 className="card__title">Erscheinungsbild</h3>

      <div className="form-group">
        <label className="form-label">Theme</label>
        <div className="settings-theme-choices">
          {(Object.keys(THEME_LABELS) as ThemeMode[]).map(mode => (
            <button
              key={mode}
              className={`settings-choice${theme === mode ? ' settings-choice--active' : ''}`}
              onClick={() => setTheme(mode)}
              aria-pressed={theme === mode}
            >
              {THEME_LABELS[mode]}
            </button>
          ))}
        </div>
        <span className="form-hint">„System" folgt automatisch der Einstellung deines Betriebssystems.</span>
      </div>

      <div className="form-group">
        <label className="form-label">Akzentfarbe</label>
        <div className="settings-accent-grid">
          {ACCENT_PRESETS.map(c => (
            <button
              key={c}
              className={`settings-accent${accent === c ? ' settings-accent--active' : ''}`}
              style={{ background: c }}
              onClick={() => setAccent(c)}
              aria-label={`Akzentfarbe ${c}`}
              aria-pressed={accent === c}
            />
          ))}
          <label className="settings-accent settings-accent--custom" title="Eigene Farbe">
            <input
              type="color"
              value={accent ?? '#d97706'}
              onChange={e => setAccent(e.target.value)}
              aria-label="Eigene Akzentfarbe wählen"
            />
          </label>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => setAccent(null)} disabled={!accent}>
          Auf Standard zurücksetzen
        </button>
      </div>
    </div>
  );
}

// ── Group defaults (global Systemeinstellungen, superuser) ──────────────────────

function GroupDefaultsPanel() {
  const { addToast } = useToastContext();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    settingsService.getAppSettings().then(setSettings).catch(() => {});
  }, []);

  const save = async (data: AppSettings) => {
    try {
      const saved = await settingsService.updateAppSettings(data);
      setSettings(saved);
      addToast('Gruppen-Standards gespeichert.', 'success');
    } catch {
      addToast('Fehler beim Speichern.', 'error');
    }
  };

  return (
    <div className="settings-section">
      <h3 className="card__title">Standardwerte für neue Gruppen</h3>
      {!settings ? (
        <Spinner />
      ) : (
        <SystemSettingsForm
          initial={settings}
          onSubmit={save}
          onCancel={() => settingsService.getAppSettings().then(setSettings).catch(() => {})}
        />
      )}
    </div>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────────

function NotificationsPanel() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [enabled, setEnabled] = useState(() => getPref(PREF_DESKTOP_NOTIFICATIONS, false));
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );

  const toggle = async () => {
    if (!enabled) {
      let perm = permission;
      if (supported && perm === 'default') {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm === 'granted') {
        setPref(PREF_DESKTOP_NOTIFICATIONS, true);
        setEnabled(true);
      }
    } else {
      setPref(PREF_DESKTOP_NOTIFICATIONS, false);
      setEnabled(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="card__title">Benachrichtigungen</h3>
      {!supported ? (
        <p className="form-hint">Dein Browser unterstützt keine Desktop-Benachrichtigungen.</p>
      ) : (
        <>
          <label className="settings-toggle-row">
            <input type="checkbox" checked={enabled} onChange={toggle} />
            <span>
              <strong>Desktop-Benachrichtigungen</strong>
              <span className="form-hint">
                Neue Benachrichtigungen (neue Woche, Planänderungen …) auch als System-Hinweis anzeigen.
              </span>
            </span>
          </label>
          {permission === 'denied' && (
            <p className="form-hint">
              Benachrichtigungen sind im Browser blockiert. Bitte in den Browser-Einstellungen erlauben.
            </p>
          )}
        </>
      )}
      <p className="form-hint">
        Die Glocke in der Seitenleiste zeigt deine Benachrichtigungen immer an – unabhängig von dieser Einstellung.
      </p>
    </div>
  );
}

// ── System ───────────────────────────────────────────────────────────────────────

function SystemPanel({
  currentUser,
  isSuperuser,
  onNavigate,
  statisticsEnabled,
  setStatisticsEnabled,
}: SettingsProps) {
  const { can } = usePermissions();
  return (
    <div className="settings-section">
      <h3 className="card__title">System</h3>
      <dl className="settings-info">
        <div><dt>Anwendung</dt><dd>Essensplaner · Professional</dd></div>
        <div><dt>Angemeldet als</dt><dd>{currentUser?.name ?? '—'}</dd></div>
        <div><dt>Rolle</dt><dd>{isSuperuser ? 'Superuser' : currentUser?.is_admin ? 'Administrator' : 'Benutzer'}</dd></div>
      </dl>

      <div className="dashboard__actions">
        {isSuperuser && (
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('groups')}>Gruppen & Systemeinstellungen</button>
        )}
        {can('MANAGE_TRASH') && (
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('trash')}>Papierkorb</button>
        )}
      </div>

      {isSuperuser && (
        <div className="form-group">
          <label className="form-label">Funktionen (systemweit)</label>
          <label className="settings-toggle-row">
            <input
              type="checkbox"
              checked={statisticsEnabled}
              onChange={e => setStatisticsEnabled(e.target.checked)}
            />
            <span>
              <strong>Statistiken</strong>
              <span className="form-hint">
                Schaltet den Menüpunkt „Statistiken" für alle Nutzer und Admins ein oder aus.
                Nur Superuser können das ändern.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
