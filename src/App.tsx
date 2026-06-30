import { useState, useCallback } from 'react';

// ── Context & Hooks ─────────────────────────────────────────────────────────────
import { useAuthentication } from './hooks/useAuthentication';
import { useUsers } from './hooks/useUsers';
import { useMeals } from './hooks/useMeals';
import { useOrders } from './hooks/useOrders';
import { useGroups } from './hooks/useGroups';
import { useMaintenance } from './hooks/useMaintenance';

// ── Components ──────────────────────────────────────────────────────────────────
import { LoginForm } from './components/LoginForm';
import { ToastContainer } from './components/ToastContainer';
import { WeekView } from './components/WeekView';
import { OrderForm } from './components/OrderForm';
import { UserManagement } from './components/UserManagement';
import { MaintenancePanel } from './components/MaintenancePanel';
import { GroupManagement } from './components/groups/GroupManagement';
import { GroupSelector } from './components/groups/GroupSelector';
import { ThemeToggle } from './components/theme/ThemeToggle';
import { Spinner } from './components/shared/Spinner';
import { EmptyState } from './components/shared/EmptyState';

// ── Types ───────────────────────────────────────────────────────────────────────
import type { ViewType, DayOfWeek, MealItem } from './types';
import { DAYS_OF_WEEK } from './lib/pocketbase';
import { initials, roleName } from './lib/utils';

// ── App ─────────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<ViewType>('current');

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const {
    currentUser,
    isAuthenticated,
    isLoggingIn,
    isSuperuser,
    isAdmin,
    handleLogin,
    handleLogout,
  } = useAuthentication();

  // ── Groups ────────────────────────────────────────────────────────────────────
  const { activeGroup, allGroups } = useGroups(currentUser);
  const groupId = activeGroup?.id ?? null;

  const linkedGroupId = activeGroup?.linked_group ?? null;
  const linkedGroupName = linkedGroupId
    ? allGroups.find(g => g.id === linkedGroupId)?.name
    : undefined;

  // ── Meal plans ────────────────────────────────────────────────────────────────
  // Always load own plans for groupId; fall back to linkedGroupId's plans when
  // the group has no own plans yet (isUsingLinkedPlan = true → read-only).
  const {
    current: currentPlan,
    upcoming: upcomingPlan,
    previous: previousPlan,
    isLoading: isLoadingMeals,
    isUsingLinkedPlan,
    addMeal,
    removeMeal,
    rotateWeek,
    createPlan,
  } = useMeals(groupId, linkedGroupId);

  const isSharedPlan = isUsingLinkedPlan;

  // ── Orders ────────────────────────────────────────────────────────────────────
  const {
    ordersByUser: currentOrders,
    isLoading: isLoadingCurrentOrders,
    placeOrder: placeCurrentOrder,
    deleteOrder: deleteCurrentOrder,
    deleteUserOrders: deleteCurrentUserOrders,
  } = useOrders(currentPlan?.id ?? null, groupId, currentUser);

  const {
    ordersByUser: upcomingOrders,
    isLoading: isLoadingUpcomingOrders,
    placeOrder: placeUpcomingOrder,
    deleteOrder: deleteUpcomingOrder,
    deleteUserOrders: deleteUpcomingUserOrders,
  } = useOrders(upcomingPlan?.id ?? null, groupId, currentUser);

  const {
    ordersByUser: previousOrders,
  } = useOrders(previousPlan?.id ?? null, groupId, currentUser);

  // ── Users ─────────────────────────────────────────────────────────────────────
  const {
    allUsers,
    isLoading: isLoadingUsers,
    createUser,
    changeGroup,
    deleteUser,
    toggleAdmin,
    updateInfo,
    resetPassword,
  } = useUsers(currentUser);

  // ── Maintenance ───────────────────────────────────────────────────────────────
  const { settings: maintenanceSettings, maintenanceInfo, update: updateMaintenance } =
    useMaintenance(isSuperuser);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAddCurrentMeal = useCallback(
    (day: string, meal: MealItem) => {
      if (!currentPlan) return;
      addMeal(currentPlan.id, currentPlan.meals, day, meal);
    },
    [currentPlan, addMeal]
  );

  const handleRemoveCurrentMeal = useCallback(
    (day: string, index: number) => {
      if (!currentPlan) return;
      removeMeal(currentPlan.id, currentPlan.meals, day, index);
    },
    [currentPlan, removeMeal]
  );

  const handleAddUpcomingMeal = useCallback(
    (day: string, meal: MealItem) => {
      if (!upcomingPlan) return;
      addMeal(upcomingPlan.id, upcomingPlan.meals, day, meal);
    },
    [upcomingPlan, addMeal]
  );

  const handleRemoveUpcomingMeal = useCallback(
    (day: string, index: number) => {
      if (!upcomingPlan) return;
      removeMeal(upcomingPlan.id, upcomingPlan.meals, day, index);
    },
    [upcomingPlan, removeMeal]
  );

  const handleCurrentOrder = useCallback(
    (day: DayOfWeek, mealNumber: string) => {
      if (!currentPlan) return;
      placeCurrentOrder(currentPlan, currentPlan.meals, day, mealNumber, true);
    },
    [currentPlan, placeCurrentOrder]
  );

  const handleUpcomingOrder = useCallback(
    (day: DayOfWeek, mealNumber: string) => {
      if (!upcomingPlan) return;
      placeUpcomingOrder(upcomingPlan, upcomingPlan.meals, day, mealNumber, false);
    },
    [upcomingPlan, placeUpcomingOrder]
  );

  // ── Server status (derived from data loading) ─────────────────────────────────
  const isOnline = !isLoadingMeals && !isLoadingCurrentOrders;

  // ── Login page ────────────────────────────────────────────────────────────────
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginForm onLogin={handleLogin} isLoading={isLoggingIn} />
        <ToastContainer />
      </>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      <ToastContainer />

      {/* ── Sidebar ── */}
      <aside className="sidebar" role="navigation" aria-label="Hauptnavigation">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">🍽</span>
          <span className="sidebar__name">Essensplaner</span>
        </div>

        {/* Group selector (superuser only) */}
        <div className="sidebar__group-selector">
          <GroupSelector currentUser={currentUser} />
        </div>

        <nav className="sidebar__nav">
          <NavItem
            icon="📅"
            label="Planung"
            active={view === 'upcoming'}
            onClick={() => setView('upcoming')}
          />
          <NavItem
            icon="🗓"
            label="Aktuelle Woche"
            active={view === 'current'}
            onClick={() => setView('current')}
          />
          <NavItem
            icon="📦"
            label="Archiv"
            active={view === 'archive'}
            onClick={() => setView('archive')}
          />
          {isAdmin && (
            <NavItem
              icon="👥"
              label="Nutzer"
              active={view === 'users'}
              onClick={() => setView('users')}
            />
          )}
          {isSuperuser && (
            <NavItem
              icon="🏢"
              label="Gruppen"
              active={view === 'groups'}
              onClick={() => setView('groups')}
            />
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user-info">
            <span className="sidebar__avatar" aria-hidden="true">
              {initials(currentUser.name)}
            </span>
            <div>
              <div className="sidebar__user-name">{currentUser.name}</div>
              <div className="sidebar__user-role">
                {roleName(currentUser.is_superuser, currentUser.is_admin)}
                {activeGroup && !isSuperuser && (
                  <span className="sidebar__group-badge">{activeGroup.name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="sidebar__footer-row">
            <ThemeToggle />
            <div
              className={`connection-badge${isOnline ? ' connection-badge--online' : ' connection-badge--offline'}`}
              role="status"
              aria-label={isOnline ? 'Online' : 'Offline'}
            >
              {isLoadingMeals ? (
                <><Spinner size="sm" /> Syncing…</>
              ) : (
                <>{isOnline ? '● Online' : '○ Offline'}</>
              )}
            </div>
            <button
              className="btn btn--ghost btn--sm btn--full"
              onClick={handleLogout}
            >
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content" id="main-content">
        {/* Maintenance banner */}
        {maintenanceInfo && (
          <div
            className={`maintenance-banner${maintenanceInfo.isUrgent ? ' maintenance-banner--urgent' : ''}`}
            role="alert"
          >
            <strong>⚠️ WARTUNGSARBEITEN:</strong> Beginn in ca.{' '}
            {maintenanceInfo.hoursUntil} Stunden · Dauer ca. {maintenanceInfo.duration}
            {maintenanceInfo.message && ` · ${maintenanceInfo.message}`}
          </div>
        )}

        {/* Group context banner */}
        {activeGroup && (
          <div
            className="group-banner"
            style={{ '--group-color': activeGroup.color } as React.CSSProperties}
          >
            <span
              className="group-banner__dot"
              aria-hidden="true"
            />
            <strong>{activeGroup.name}</strong>
            {activeGroup.description && (
              <span className="group-banner__desc"> – {activeGroup.description}</span>
            )}
          </div>
        )}

        {/* No group selected */}
        {!activeGroup && view !== 'groups' && (
          <EmptyState
            icon="🏢"
            title="Keine Gruppe ausgewählt"
            message={
              isSuperuser
                ? 'Bitte wähle oben eine Gruppe aus oder erstelle zuerst eine.'
                : 'Du bist keiner Gruppe zugewiesen. Bitte einen Admin kontaktieren.'
            }
            action={
              isSuperuser
                ? { label: 'Gruppen verwalten', onClick: () => setView('groups') }
                : undefined
            }
          />
        )}

        {/* ── Upcoming view ── */}
        {view === 'upcoming' && activeGroup && (
          <>
            <div className="page-header">
              <h2 className="page-title">📅 Planung – Nächste Woche</h2>
              {isAdmin && (
                <div className="page-header__actions">
                  {isSharedPlan && (
                    <button
                      className="btn btn--primary"
                      onClick={() => createPlan('upcoming')}
                    >
                      + Eigenen Plan anlegen
                    </button>
                  )}
                  {!isSharedPlan && !upcomingPlan && (
                    <button
                      className="btn btn--primary"
                      onClick={() => createPlan('upcoming')}
                    >
                      + Neuen Plan anlegen
                    </button>
                  )}
                  {!isSharedPlan && upcomingPlan && (
                    <button
                      className="btn btn--danger"
                      onClick={rotateWeek}
                    >
                      Woche abschließen & rotieren
                    </button>
                  )}
                </div>
              )}
            </div>

            {isSharedPlan && linkedGroupName && (
              <div className="info-banner">
                Geteilter Plan von <strong>{linkedGroupName}</strong> – Bestellungen werden getrennt abgerechnet.
              </div>
            )}

            {!upcomingPlan ? (
              <EmptyState
                icon="📋"
                message={
                  isSharedPlan
                    ? 'Die verlinkte Gruppe hat noch keinen Plan für nächste Woche.'
                    : 'Noch kein Planungsplan für nächste Woche vorhanden.'
                }
                action={
                  isAdmin
                    ? {
                        label: isSharedPlan ? 'Eigenen Plan anlegen' : 'Plan anlegen',
                        onClick: () => createPlan('upcoming'),
                      }
                    : undefined
                }
              />
            ) : (
              <>
                <WeekView
                  planId={upcomingPlan.id}
                  meals={upcomingPlan.meals}
                  ordersByUser={upcomingOrders}
                  allUsers={allUsers}
                  currentUser={currentUser}
                  isArchive={false}
                  isUpcomingView={true}
                  isLoading={isLoadingUpcomingOrders}
                  label="Planung"
                  onAddMeal={isAdmin && !isSharedPlan ? handleAddUpcomingMeal : undefined}
                  onRemoveMeal={isAdmin && !isSharedPlan ? handleRemoveUpcomingMeal : undefined}
                  onRemoveOrder={deleteUpcomingOrder}
                  onDeleteUserOrders={deleteUpcomingUserOrders}
                />
                <OrderForm
                  days={DAYS_OF_WEEK}
                  currentUser={currentUser}
                  allMeals={upcomingPlan.meals}
                  onOrder={handleUpcomingOrder}
                  isCurrentWeek={false}
                />
              </>
            )}
          </>
        )}

        {/* ── Current week view ── */}
        {view === 'current' && activeGroup && (
          <>
            <div className="page-header">
              <h2 className="page-title">🗓 Aktuelle Woche</h2>
              {isAdmin && (
                <>
                  {isSharedPlan && (
                    <button
                      className="btn btn--primary"
                      onClick={() => createPlan('current')}
                    >
                      + Eigenen Plan anlegen
                    </button>
                  )}
                  {!isSharedPlan && !currentPlan && (
                    <button
                      className="btn btn--primary"
                      onClick={() => createPlan('current')}
                    >
                      + Plan anlegen
                    </button>
                  )}
                </>
              )}
            </div>

            {isSharedPlan && linkedGroupName && (
              <div className="info-banner">
                Geteilter Plan von <strong>{linkedGroupName}</strong> – Bestellungen werden getrennt abgerechnet.
              </div>
            )}

            <div className="info-banner" role="note">
              📌 Änderungen sind nur für zukünftige Tage oder heute vor{' '}
              <strong>08:30 Uhr</strong> möglich.
            </div>

            {!currentPlan ? (
              <EmptyState
                icon="📋"
                message="Kein aktiver Wochenplan vorhanden."
                action={
                  isAdmin && !isSharedPlan
                    ? { label: 'Plan anlegen', onClick: () => createPlan('current') }
                    : undefined
                }
              />
            ) : (
              <>
                <WeekView
                  planId={currentPlan.id}
                  meals={currentPlan.meals}
                  ordersByUser={currentOrders}
                  allUsers={allUsers}
                  currentUser={currentUser}
                  isArchive={false}
                  isUpcomingView={false}
                  isLoading={isLoadingCurrentOrders}
                  label="Aktuelle_Woche"
                  onAddMeal={isAdmin && !isSharedPlan ? handleAddCurrentMeal : undefined}
                  onRemoveMeal={isAdmin && !isSharedPlan ? handleRemoveCurrentMeal : undefined}
                  onRemoveOrder={deleteCurrentOrder}
                  onDeleteUserOrders={deleteCurrentUserOrders}
                />
                <OrderForm
                  days={DAYS_OF_WEEK}
                  currentUser={currentUser}
                  allMeals={currentPlan.meals}
                  onOrder={handleCurrentOrder}
                  isCurrentWeek={true}
                />
              </>
            )}
          </>
        )}

        {/* ── Archive view ── */}
        {view === 'archive' && activeGroup && (
          <>
            <div className="page-header">
              <h2 className="page-title">📦 Vorwoche (Archiv)</h2>
            </div>
            {!previousPlan ? (
              <EmptyState
                icon="📭"
                message="Keine Daten im Archiv vorhanden."
              />
            ) : (
              <WeekView
                planId={previousPlan.id}
                meals={previousPlan.meals}
                ordersByUser={previousOrders}
                allUsers={allUsers}
                currentUser={currentUser}
                isArchive={true}
                isUpcomingView={false}
                label="Archiv"
                onRemoveOrder={() => {}}
              />
            )}
          </>
        )}

        {/* ── Users view ── */}
        {view === 'users' && isAdmin && (
          <>
            <div className="page-header">
              <h2 className="page-title">👥 Benutzerverwaltung</h2>
            </div>

            {isSuperuser && (
              <MaintenancePanel
                settings={maintenanceSettings}
                onChange={updateMaintenance}
              />
            )}

            <UserManagement
              users={allUsers}
              currentUser={currentUser}
              isLoading={isLoadingUsers}
              onCreate={createUser}
              onChangeGroup={changeGroup}
              onDelete={deleteUser}
              onToggleAdmin={toggleAdmin}
              onUpdateInfo={updateInfo}
              onResetPassword={resetPassword}
            />
          </>
        )}

        {/* ── Groups view (superuser only) ── */}
        {view === 'groups' && isSuperuser && (
          <>
            <div className="page-header">
              <h2 className="page-title">🏢 Gruppenverwaltung</h2>
            </div>
            <GroupManagement currentUser={currentUser} />
          </>
        )}
      </main>
    </div>
  );
}

// ── NavItem sub-component ──────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-item${active ? ' nav-item--active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-item__icon" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}
