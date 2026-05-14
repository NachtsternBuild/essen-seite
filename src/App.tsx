import { useState, useEffect, useMemo, useCallback } from 'react';
import { pb, COLLECTION_NAME, USER_COLLECTION, DAYS_OF_WEEK } from './lib/pocketbase';
import { isLocked, calculateUserTotal, downloadFile } from './lib/utils';
import { useToasts } from './lib/useToasts';

import { LoginForm } from './components/LoginForm';
import { ToastContainer } from './components/ToastContainer';
import { WeekView } from './components/WeekView';
import { OrderForm } from './components/OrderForm';
import { UserManagement } from './components/UserManagement';
import { MaintenancePanel } from './components/MaintenancePanel';

import type { AppData, AuthUser, ViewType, Meal, WeekData } from './types';
import './App.css';

// ─── Default data shape ───────────────────────────────────────────────────────

const EMPTY_WEEK: AppData = {
  upcoming: { meals: {}, orders: {} },
  current: { meals: {}, orders: {} },
  previous: null,
  maintenance_active: false,
  maintenance_start: '',
  maintenance_duration: '',
};

// ─── Root component ───────────────────────────────────────────────────────────

export default function App() {
  const { toasts, addToast, removeToast } = useToasts();

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    pb.authStore.isValid ? (pb.authStore.model as unknown as AuthUser) : null
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ── App data state ──────────────────────────────────────────────────────────
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('meal_planner_data');
    return saved ? JSON.parse(saved) : EMPTY_WEEK;
  });
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewType>('current');

  // ── PocketBase auth listener ────────────────────────────────────────────────
  useEffect(() => {
    return pb.authStore.onChange(() => {
      setCurrentUser(
        pb.authStore.isValid ? (pb.authStore.model as unknown as AuthUser) : null
      );
    });
  }, []);

  // ── Fetch helpers ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const users = await pb.collection(USER_COLLECTION).getFullList<AuthUser>({
        sort: 'name',
      });
      setAllUsers(users);
    } catch {
      // non-fatal
    }
  }, []);

  // ── Initial data load ───────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        if (record.content) {
          setData({
            ...EMPTY_WEEK,
            ...record.content,
            upcoming: record.content.upcoming ?? { meals: {}, orders: {} },
            current: record.content.current ?? { meals: {}, orders: {} },
            previous: record.content.previous ?? null,
          });
        }
        await fetchUsers();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    }
    init();
  }, [fetchUsers]);

  // ── Debounced data sync to PocketBase ───────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('meal_planner_data', JSON.stringify(data));
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const record = await pb.collection(COLLECTION_NAME).getFirstListItem('');
        await pb.collection(COLLECTION_NAME).update(record.id, { content: data });
        setIsOnline(true);
      } catch {
        try {
          await pb.collection(COLLECTION_NAME).create({ content: data });
          setIsOnline(true);
        } catch {
          setIsOnline(false);
        }
      } finally {
        setIsSyncing(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  // ─── Auth handlers ──────────────────────────────────────────────────────────

  const handleLogin = async (email: string, password: string) => {
    setIsLoggingIn(true);
    try {
      await pb.collection(USER_COLLECTION).authWithPassword(email, password);
      await fetchUsers();
      addToast(`Willkommen zurück!`, 'success');
    } catch {
      addToast('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setView('current');
    addToast('Abgemeldet.', 'info');
  };

  // ─── Authorization guard ────────────────────────────────────────────────────

  const checkRole = useCallback(
    (required: 'user' | 'admin' | 'superuser', targetName?: string): boolean => {
      if (!currentUser) {
        addToast('Bitte zuerst anmelden!', 'warning');
        return false;
      }
      if (currentUser.is_superuser) return true;
      if (required === 'superuser') {
        addToast('Keine Berechtigung (Superuser erforderlich).', 'error');
        return false;
      }
      if (required === 'admin' && !currentUser.is_admin) {
        addToast('Keine Berechtigung (Admin erforderlich).', 'error');
        return false;
      }
      if (targetName && targetName !== currentUser.name && !currentUser.is_admin) {
        addToast('Keine Berechtigung für diesen Nutzer.', 'error');
        return false;
      }
      return true;
    },
    [currentUser, addToast]
  );

  // ─── Day locking ─────────────────────────────────────────────────────────────

  const unlockedDays = useMemo(
    () => DAYS_OF_WEEK.filter(d => !isLocked(d)),
    // recalculate at most once per minute — in practice this is fine for a
    // planning app; no setInterval needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ─── Meal handlers ────────────────────────────────────────────────────────────

  const addMeal = (day: string, meal: Meal) => {
    if (!checkRole('admin')) return;
    setData(prev => ({
      ...prev,
      current: {
        ...prev.current,
        meals: { ...prev.current.meals, [day]: [...(prev.current.meals[day] ?? []), meal] },
      },
    }));
  };

  const removeMealTemplate = (day: string, index: number) => {
    if (!checkRole('admin')) return;
    setData(prev => {
      const mealToDelete = prev.current.meals[day]?.[index];
      if (!mealToDelete) return prev;
      const newMeals = { ...prev.current.meals };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      const newOrders = { ...prev.current.orders };
      Object.keys(newOrders).forEach(person => {
        const uo = { ...newOrders[person] };
        if (uo[day]?.number === mealToDelete.number) delete uo[day];
        if (Object.keys(uo).length === 0) delete newOrders[person];
        else newOrders[person] = uo;
      });
      return { ...prev, current: { ...prev.current, meals: newMeals, orders: newOrders } };
    });
  };

  const addUpcomingMeal = (day: string, meal: Meal) => {
    if (!checkRole('admin')) return;
    setData(prev => ({
      ...prev,
      upcoming: {
        ...prev.upcoming,
        meals: { ...prev.upcoming.meals, [day]: [...(prev.upcoming.meals[day] ?? []), meal] },
      },
    }));
  };

  const removeUpcomingMealTemplate = (day: string, index: number) => {
    if (!checkRole('admin')) return;
    setData(prev => {
      const newMeals = { ...prev.upcoming.meals };
      newMeals[day] = newMeals[day].filter((_, i) => i !== index);
      return { ...prev, upcoming: { ...prev.upcoming, meals: newMeals } };
    });
  };

  // ─── Order handlers ───────────────────────────────────────────────────────────

  const updateCurrentOrder = (day: string, mealNumber: string) => {
    if (!currentUser) { addToast('Bitte anmelden!', 'warning'); return; }
    if (isLocked(day)) {
      addToast('Nach 08:30 Uhr sind keine Änderungen für heute mehr möglich!', 'warning');
      return;
    }
    setData(prev => {
      const meal = prev.current.meals[day]?.find(m => m.number === mealNumber);
      if (!meal) { addToast('Menü-Nummer nicht gefunden!', 'error'); return prev; }
      return {
        ...prev,
        current: {
          ...prev.current,
          orders: {
            ...prev.current.orders,
            [currentUser.name]: {
              ...(prev.current.orders[currentUser.name] ?? {}),
              [day]: { ...meal, edited: true },
            },
          },
        },
      };
    });
    addToast(`Bestellung für ${day} gespeichert.`, 'success');
  };

  const addUpcomingOrder = (day: string, mealNumber: string) => {
    if (!currentUser || !checkRole('user', currentUser.name)) return;
    const meal = data.upcoming.meals[day]?.find(m => m.number === mealNumber);
    if (!meal) { addToast('Menü-Nummer in der Planung nicht gefunden!', 'error'); return; }
    setData(prev => ({
      ...prev,
      upcoming: {
        ...prev.upcoming,
        orders: {
          ...prev.upcoming.orders,
          [currentUser.name]: {
            ...(prev.upcoming.orders[currentUser.name] ?? {}),
            [day]: meal,
          },
        },
      },
    }));
    addToast(`Vorbestellung für ${day} gespeichert.`, 'success');
  };

  const removeSingleOrder = (person: string, day: string) => {
    if (!checkRole('user', person)) return;
    setData(prev => {
      const newUserOrders = { ...prev.current.orders[person] };
      delete newUserOrders[day];
      const newOrders = { ...prev.current.orders };
      if (Object.keys(newUserOrders).length === 0) delete newOrders[person];
      else newOrders[person] = newUserOrders;
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
  };

  const removeUserCompletely = (person: string) => {
    if (!checkRole('user', person)) return;
    if (!window.confirm(`Alle Bestellungen von ${person} wirklich löschen?`)) return;
    setData(prev => {
      const newOrders = { ...prev.current.orders };
      delete newOrders[person];
      return { ...prev, current: { ...prev.current, orders: newOrders } };
    });
    addToast(`Bestellungen von ${person} gelöscht.`, 'info');
  };

  // ─── Week rotation ────────────────────────────────────────────────────────────

  const resetWeek = () => {
    if (!checkRole('admin')) return;
    if (!window.confirm('Wochenplanung wirklich abschließen? Die aktuelle Woche wird archiviert.')) return;
    setData(prev => ({
      ...prev,
      previous: prev.current,
      current: prev.upcoming,
      upcoming: { meals: {}, orders: {} },
    }));
    addToast('Woche wurde rotiert. Neue Woche ist jetzt aktiv.', 'success');
  };

  // ─── User CRUD (admin) ────────────────────────────────────────────────────────

  const createUser = async (u: { name: string; email: string; password: string; is_admin: boolean; info?: string }) => {
    if (!checkRole('admin')) return;
    try {
      await pb.collection(USER_COLLECTION).create({
        name: u.name,
        email: u.email,
        password: u.password,
        passwordConfirm: u.password,
        is_admin: u.is_admin,
        info: u.info ?? '',
      });
      await fetchUsers();
      addToast(`Nutzer "${u.name}" erfolgreich angelegt.`, 'success');
    } catch {
      addToast('Fehler beim Erstellen (E-Mail bereits vergeben?)', 'error');
    }
  };

  const deleteUserRecord = async (id: string) => {
    if (!checkRole('admin')) return;
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    if (user.is_superuser && !currentUser?.is_superuser) {
      addToast('Superuser können nicht gelöscht werden.', 'error');
      return;
    }
    if (user.is_admin && !currentUser?.is_superuser) {
      addToast('Admins können nur von Superusern gelöscht werden.', 'error');
      return;
    }
    if (!window.confirm(`Zugang von "${user.name}" permanent löschen?`)) return;
    try {
      await pb.collection(USER_COLLECTION).delete(id);
      await fetchUsers();
      addToast(`Nutzer "${user.name}" gelöscht.`, 'info');
    } catch {
      addToast('Löschen fehlgeschlagen.', 'error');
    }
  };

  const toggleAdmin = async (id: string, value: boolean) => {
    if (!checkRole('superuser')) return;
    try {
      await pb.collection(USER_COLLECTION).update(id, { is_admin: value });
      await fetchUsers();
      addToast('Rolle aktualisiert.', 'success');
    } catch {
      addToast('Fehler beim Aktualisieren.', 'error');
    }
  };

  const updateUserInfo = async (id: string, info: string) => {
    if (!checkRole('superuser')) return;
    try {
      await pb.collection(USER_COLLECTION).update(id, { info });
      await fetchUsers();
      addToast('Info aktualisiert.', 'success');
    } catch {
      addToast('Fehler beim Aktualisieren.', 'error');
    }
  };

  const handleResetPassword = (id: string, name: string) => {
    const newPw = prompt(`Neues Passwort für ${name}:`);
    if (!newPw) return;
    pb.collection(USER_COLLECTION)
      .update(id, { password: newPw, passwordConfirm: newPw })
      .then(() => addToast(`Passwort für ${name} zurückgesetzt.`, 'success'))
      .catch(() => addToast('Fehler beim Zurücksetzen.', 'error'));
  };

  // ─── Maintenance ──────────────────────────────────────────────────────────────

  const updateMaintenance = (active: boolean, start?: string, duration?: string) => {
    setData(prev => ({
      ...prev,
      maintenance_active: active,
      maintenance_start: start ?? prev.maintenance_start,
      maintenance_duration: duration ?? prev.maintenance_duration,
    }));
  };

  const maintenanceInfo = useMemo(() => {
    if (!data.maintenance_active || !data.maintenance_start) return null;
    const start = new Date(data.maintenance_start);
    const diffHours = Math.round((start.getTime() - Date.now()) / 3_600_000);
    return {
      hoursUntil: diffHours,
      duration: data.maintenance_duration || 'unbekannt',
      isUrgent: diffHours <= 2 && diffHours >= 0,
    };
  }, [data.maintenance_active, data.maintenance_start, data.maintenance_duration]);

  // ─── Export helpers ───────────────────────────────────────────────────────────

  const makeExporters = (weekData: WeekData, label: string) => ({
    exportTXT: () => {
      let txt = `ABRECHNUNG: ${label.toUpperCase()}\n${'='.repeat(40)}\n\n`;
      Object.entries(weekData.orders).forEach(([person, orders]) => {
        txt += `${person.padEnd(15)} | ${Object.keys(orders).length} Essen | ${calculateUserTotal(orders).toFixed(2)} €\n`;
        Object.entries(orders).forEach(([day, meal]) => {
          txt += `  - ${day}: #${meal.number} (${meal.name})\n`;
        });
        txt += `${'-'.repeat(40)}\n`;
      });
      const total = Object.values(weekData.orders)
        .reduce((s, o) => s + calculateUserTotal(o), 0).toFixed(2);
      txt += `\nGESAMTSUMME: ${total} €`;
      downloadFile(txt, `Abrechnung_${label}.txt`, 'text/plain;charset=utf-8;');
    },
    exportCSV: () => {
      let csv = 'Name;Anzahl;Summe;Details\n';
      Object.entries(weekData.orders).forEach(([person, orders]) => {
        const details = Object.entries(orders).map(([d, m]) => `${d}: #${m.number}`).join(' | ');
        csv += `${person};${Object.keys(orders).length};${calculateUserTotal(orders).toFixed(2)} €;"${details}"\n`;
      });
      const total = Object.values(weekData.orders)
        .reduce((s, o) => s + calculateUserTotal(o), 0).toFixed(2);
      csv += `\nGESAMT;;${total} €;`;
      downloadFile(csv, `Abrechnung_${label}.csv`, 'text/csv;charset=utf-8;');
    },
    exportPDF: async () => {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Abrechnung: ${label.replace('_', ' ')}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 28);
      const rows = Object.entries(weekData.orders).map(([person, orders]) => [
        person,
        `${Object.keys(orders).length}×`,
        `${calculateUserTotal(orders).toFixed(2)} €`,
        Object.entries(orders).map(([d, m]) => `${d}: #${m.number}`).join(', '),
      ]);
      const total = Object.values(weekData.orders)
        .reduce((s, o) => s + calculateUserTotal(o), 0).toFixed(2);
      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Anzahl', 'Summe', 'Details']],
        body: rows,
        foot: [['GESAMT', '', `${total} €`, '']],
        theme: 'striped',
        styles: { fontSize: 10 },
      });
      doc.save(`Abrechnung_${label}.pdf`);
    },
  });

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (!pb.authStore.isValid || !currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} isLoading={isLoggingIn} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const currentExporters = makeExporters(data.current, 'Aktuelle_Woche');
  const upcomingExporters = makeExporters(data.upcoming, 'Planung');
  const archiveExporters = makeExporters(data.previous ?? { meals: {}, orders: {} }, 'Archiv');

  return (
    <div className="app-layout">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Sidebar / App Shell ── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">🍽</span>
          <span className="sidebar__name">Essensplaner</span>
        </div>

        <nav className="sidebar__nav">
          <button className={`nav-item${view === 'upcoming' ? ' nav-item--active' : ''}`} onClick={() => setView('upcoming')}>
            <span className="nav-item__icon">📅</span> Planung
          </button>
          <button className={`nav-item${view === 'current' ? ' nav-item--active' : ''}`} onClick={() => setView('current')}>
            <span className="nav-item__icon">🗓</span> Aktuelle Woche
          </button>
          <button className={`nav-item${view === 'archive' ? ' nav-item--active' : ''}`} onClick={() => setView('archive')}>
            <span className="nav-item__icon">📦</span> Archiv
          </button>
          {currentUser.is_admin && (
            <button className={`nav-item${view === 'users' ? ' nav-item--active' : ''}`} onClick={() => setView('users')}>
              <span className="nav-item__icon">👥</span> Nutzer
            </button>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user-info">
            <span className="sidebar__avatar">{currentUser.name.charAt(0).toUpperCase()}</span>
            <div>
              <div className="sidebar__user-name">{currentUser.name}</div>
              <div className="sidebar__user-role">
                {currentUser.is_superuser ? 'Superuser' : currentUser.is_admin ? 'Admin' : 'Nutzer'}
              </div>
            </div>
          </div>
          <div className={`connection-badge${isOnline ? ' connection-badge--online' : ' connection-badge--offline'}`}>
            {isSyncing ? (
              <><span className="spinner spinner--sm" /> Syncing…</>
            ) : (
              <>{isOnline ? '● Online' : '○ Offline'}</>
            )}
          </div>
          <button className="btn btn--ghost btn--sm btn--full" onClick={handleLogout}>
            Abmelden
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        {/* Maintenance banner */}
        {maintenanceInfo && (
          <div className={`maintenance-banner${maintenanceInfo.isUrgent ? ' maintenance-banner--urgent' : ''}`}>
            <strong>⚠️ WARTUNGSARBEITEN:</strong> Beginn in ca. {maintenanceInfo.hoursUntil} Stunden
            {' · '} Dauer ca. {maintenanceInfo.duration}
          </div>
        )}

        {/* ── Upcoming view ── */}
        {view === 'upcoming' && (
          <>
            <div className="page-header">
              <h2 className="page-title">📅 Planung – Nächste Woche</h2>
              {currentUser.is_admin && (
                <button className="btn btn--danger" onClick={resetWeek}>
                  Woche abschließen & rotieren
                </button>
              )}
            </div>
            <WeekView
              weekData={data.upcoming}
              allUsers={allUsers}
              currentUser={currentUser}
              isArchive={false}
              isUpcomingView={true}
              onAddMeal={addUpcomingMeal}
              onRemoveMeal={removeUpcomingMealTemplate}
              onRemoveOrder={removeSingleOrder}
              onRemoveUser={removeUserCompletely}
              onExportTXT={upcomingExporters.exportTXT}
              onExportCSV={upcomingExporters.exportCSV}
              onExportPDF={upcomingExporters.exportPDF}
            />
            <OrderForm
              days={[...DAYS_OF_WEEK]}
              currentUser={currentUser}
              allMeals={data.upcoming.meals}
              onOrder={addUpcomingOrder}
            />
          </>
        )}

        {/* ── Current week view ── */}
        {view === 'current' && (
          <>
            <div className="page-header">
              <h2 className="page-title">🗓 Aktuelle Woche</h2>
            </div>
            <div className="info-banner">
              📌 Änderungen sind nur für zukünftige Tage oder heute vor <strong>08:30 Uhr</strong> möglich.
            </div>
            <WeekView
              weekData={data.current}
              allUsers={allUsers}
              currentUser={currentUser}
              isArchive={false}
              isUpcomingView={false}
              onAddMeal={addMeal}
              onRemoveMeal={removeMealTemplate}
              onRemoveOrder={removeSingleOrder}
              onRemoveUser={removeUserCompletely}
              onExportTXT={currentExporters.exportTXT}
              onExportCSV={currentExporters.exportCSV}
              onExportPDF={currentExporters.exportPDF}
            />
            <OrderForm
              days={unlockedDays as unknown as string[]}
              currentUser={currentUser}
              allMeals={data.current.meals}
              onOrder={updateCurrentOrder}
            />
          </>
        )}

        {/* ── Archive view ── */}
        {view === 'archive' && (
          <>
            <div className="page-header">
              <h2 className="page-title">📦 Vorwoche (Archiv)</h2>
            </div>
            {data.previous ? (
              <WeekView
                weekData={data.previous}
                allUsers={allUsers}
                currentUser={currentUser}
                isArchive={true}
                isUpcomingView={false}
                onRemoveOrder={() => {}}
                onRemoveUser={() => {}}
                onExportTXT={archiveExporters.exportTXT}
                onExportCSV={archiveExporters.exportCSV}
                onExportPDF={archiveExporters.exportPDF}
              />
            ) : (
              <div className="empty-state">
                <span className="empty-state__icon">📭</span>
                <p>Keine Daten im Archiv vorhanden.</p>
              </div>
            )}
          </>
        )}

        {/* ── Users/Admin view ── */}
        {view === 'users' && currentUser.is_admin && (
          <>
            <div className="page-header">
              <h2 className="page-title">👥 Benutzerverwaltung</h2>
            </div>

            {currentUser.is_superuser && (
              <MaintenancePanel
                active={data.maintenance_active ?? false}
                start={data.maintenance_start ?? ''}
                duration={data.maintenance_duration ?? ''}
                onChange={updateMaintenance}
              />
            )}

            <UserManagement
              users={allUsers}
              currentUser={currentUser}
              onCreate={createUser}
              onDelete={deleteUserRecord}
              onToggleAdmin={toggleAdmin}
              onUpdateInfo={updateUserInfo}
              onResetPassword={handleResetPassword}
            />
          </>
        )}
      </main>
    </div>
  );
}
