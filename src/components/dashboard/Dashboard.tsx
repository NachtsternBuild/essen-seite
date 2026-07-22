import { useMemo, type ReactNode } from 'react';
import {
  UtensilsCrossed,
  Building2,
  ClipboardList,
  CheckCircle2,
  Euro,
  Hourglass,
  PartyPopper,
  BarChart3,
  Receipt,
  Users,
  Star,
  ShieldCheck,
  UserCog,
  Wrench,
  Calendar,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { StatCard } from '../shared/StatCard';
import { EmptyState } from '../shared/EmptyState';
import { summarizeOrdersByUser } from '../../lib/statistics';
import { formatPrice, initials } from '../../lib/utils';
import { DAYS_OF_WEEK } from '../../lib/pocketbase';
import type { AuthUser, Group, MealPlan, OrdersByUser, ViewType } from '../../types';

interface DashboardProps {
  currentUser: AuthUser;
  isSuperuser: boolean;
  isAdmin: boolean;
  activeGroup: Group | null;
  allGroups: Group[];
  allUsers: AuthUser[];
  currentPlan: MealPlan | null;
  currentOrders: OrdersByUser;
  upcomingPlan: MealPlan | null;
  upcomingOrders: OrdersByUser;
  onNavigate: (view: ViewType) => void;
}

/** Today's weekday as one of the 5 plan days, or null on weekends. */
function todayPlanDay(): string | null {
  const d = new Date().getDay(); // 0=Sun … 6=Sat
  return d >= 1 && d <= 5 ? DAYS_OF_WEEK[d - 1] : null;
}

function planHasMeals(plan: MealPlan | null): boolean {
  return !!plan && Object.values(plan.meals ?? {}).some(items => (items?.length ?? 0) > 0);
}

/**
 * Picks the week the dashboard should focus on: the current week when it has a
 * menu, otherwise the upcoming (planned) week. This avoids an empty overview
 * when the menu/orders live on the upcoming plan.
 */
function focusWeek(props: DashboardProps): {
  plan: MealPlan | null;
  orders: OrdersByUser;
  label: string;
  view: ViewType;
  isCurrent: boolean;
} {
  const { currentPlan, currentOrders, upcomingPlan, upcomingOrders } = props;
  const useUpcoming = !planHasMeals(currentPlan) && planHasMeals(upcomingPlan);
  return useUpcoming
    ? { plan: upcomingPlan, orders: upcomingOrders, label: 'Nächste Woche', view: 'upcoming', isCurrent: false }
    : { plan: currentPlan, orders: currentOrders, label: 'Aktuelle Woche', view: 'current', isCurrent: true };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  return 'Guten Abend';
}

export function Dashboard(props: DashboardProps) {
  const { isAdmin, isSuperuser } = props;

  return (
    <div className="dashboard">
      <HeroCard {...props} />

      {/* ── Weekly summaries (everyone) ── */}
      <WeekSummary {...props} />
      {isAdmin && !isSuperuser && <GroupSummary {...props} />}
      {isSuperuser && <SystemSummary {...props} />}

      {/* ── Tool management (admins & superuser only) ── */}
      {isAdmin && <ManagementPanel {...props} />}
    </div>
  );
}

// ── Hero (shown to everyone) ─────────────────────────────────────────────────────

function HeroCard(props: DashboardProps) {
  const { currentUser, isSuperuser, isAdmin, activeGroup } = props;
  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const roleLabel = isSuperuser ? 'Superuser' : isAdmin ? 'Administrator' : 'Benutzer';
  const firstName = currentUser.name.split(' ')[0];

  return (
    <header className="dashboard__hero">
      <div className="dashboard__hero-main">
        <div className="dashboard__hero-avatar" aria-hidden="true">
          {initials(currentUser.name)}
        </div>
        <div className="dashboard__hero-text">
          <p className="dashboard__hero-eyebrow">{dateStr}</p>
          <h2 className="dashboard__hero-greeting">
            {greeting()}, {firstName}!
          </h2>
          <p className="dashboard__hero-sub">
            Schön, dass du wieder da bist – hier ist dein Überblick auf einen Blick.
          </p>
        </div>
      </div>
      <div className="dashboard__hero-badges">
        <span className="dashboard__hero-badge">{roleLabel}</span>
        {activeGroup && (
          <span
            className="dashboard__hero-badge dashboard__hero-badge--group"
            style={{ '--group-color': activeGroup.color } as React.CSSProperties}
          >
            {activeGroup.name}
          </span>
        )}
      </div>
    </header>
  );
}

// ── Personal weekly summary (shown to everyone) ──────────────────────────────────

function WeekSummary(props: DashboardProps) {
  const { currentUser, activeGroup, onNavigate } = props;
  const focus = focusWeek(props);
  const myOrders = useMemo(
    () => focus.orders[currentUser.name] ?? {},
    [focus.orders, currentUser.name]
  );
  const orderedDays = Object.keys(myOrders);
  const myTotal = useMemo(
    () => Object.values(myOrders).reduce((s, m) => s + (typeof m.meal_price === 'number' ? m.meal_price : 0), 0),
    [myOrders]
  );
  const today = todayPlanDay();
  // "Today's menu" only makes sense for the current week.
  const todayMeals = focus.isCurrent && today && focus.plan ? focus.plan.meals?.[today] ?? [] : [];
  const missingDays = DAYS_OF_WEEK.filter(d => !orderedDays.includes(d));

  return (
    <section className="card">
      <div className="dashboard__panel-head">
        <h3 className="card__title"><UtensilsCrossed size={18} /> Meine Woche</h3>
        {activeGroup && <span className="badge badge--muted">{focus.label}</span>}
      </div>

      {!activeGroup ? (
        <EmptyState icon={<Building2 size={48} strokeWidth={1.5} />} message="Du bist noch keiner Gruppe zugeordnet." />
      ) : !planHasMeals(focus.plan) ? (
        <EmptyState
          icon={<ClipboardList size={48} strokeWidth={1.5} />}
          message="Für diese und die nächste Woche ist noch kein Menü eingetragen."
          action={{ label: 'Woche planen', onClick: () => onNavigate('upcoming') }}
        />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon={<CheckCircle2 size={22} />} label={`Bestellt (${focus.label})`} value={`${orderedDays.length}/5`} accent />
            <StatCard icon={<Euro size={22} />} label="Mein Betrag" value={`${formatPrice(myTotal)} €`} />
            <StatCard
              icon={<Hourglass size={22} />}
              label="Offene Tage"
              value={missingDays.length}
              hint={missingDays.length ? missingDays.join(', ') : <>Alles bestellt <PartyPopper size={13} /></>}
            />
          </div>

          {focus.isCurrent && today && (
            <div className="dashboard__today">
              <h4 className="dashboard__subtitle">Heute ({today})</h4>
              {todayMeals.length === 0 ? (
                <p className="form-hint">Kein Menü für heute eingetragen.</p>
              ) : (
                <ul className="dashboard__menu-list">
                  {todayMeals.map(m => (
                    <li key={m.number}>
                      <strong>{m.number}</strong> {m.name} · {formatPrice(m.price)} €
                      {myOrders[today]?.meal_number === m.number && (
                        <span className="badge badge--success"> bestellt</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="dashboard__actions">
            <button className="btn btn--primary btn--sm" onClick={() => onNavigate(focus.view)}>
              {focus.isCurrent ? 'Zur aktuellen Woche' : 'Zur Planung'}
            </button>
            {focus.isCurrent && (
              <button className="btn btn--ghost btn--sm" onClick={() => onNavigate('upcoming')}>
                Nächste Woche planen
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ── Group weekly summary (admins) ────────────────────────────────────────────────

function GroupSummary(props: DashboardProps) {
  const { activeGroup } = props;
  const focus = focusWeek(props);
  const summary = useMemo(() => summarizeOrdersByUser(focus.orders), [focus.orders]);
  if (!activeGroup) return null;

  return (
    <section className="card">
      <div className="dashboard__panel-head">
        <h3 className="card__title"><BarChart3 size={18} /> Gruppenwoche – {activeGroup.name}</h3>
        <span className="badge badge--muted">{focus.label}</span>
      </div>
      <div className="stat-grid">
        <StatCard icon={<Receipt size={22} />} label="Bestellungen (Woche)" value={summary.orders} accent />
        <StatCard icon={<Users size={22} />} label="Teilnehmer" value={summary.participants} />
        <StatCard icon={<Euro size={22} />} label="Umsatz (Woche)" value={`${formatPrice(summary.revenue)} €`} />
        <StatCard
          icon={<Star size={22} />}
          label="Top-Menü"
          value={summary.topMeal ? `Nr. ${summary.topMeal.number}` : '—'}
          hint={summary.topMeal?.name}
        />
      </div>
    </section>
  );
}

// ── System summary (superuser) ───────────────────────────────────────────────────

function SystemSummary({ allGroups, allUsers }: DashboardProps) {
  const activeGroups = allGroups.filter(g => !g.archived).length;
  const archived = allGroups.length - activeGroups;
  const admins = allUsers.filter(u => u.is_admin && !u.is_superuser).length;
  const superusers = allUsers.filter(u => u.is_superuser).length;

  return (
    <section className="card">
      <h3 className="card__title"><ShieldCheck size={18} /> Systemübersicht</h3>
      <div className="stat-grid">
        <StatCard icon={<Building2 size={22} />} label="Aktive Gruppen" value={activeGroups} accent hint={archived ? `${archived} archiviert` : undefined} />
        <StatCard icon={<Users size={22} />} label="Nutzer gesamt" value={allUsers.length} />
        <StatCard icon={<UserCog size={22} />} label="Administratoren" value={admins} />
        <StatCard icon={<ShieldCheck size={22} />} label="Superuser" value={superusers} />
      </div>
    </section>
  );
}

// ── Tool management (admins & superuser only) ────────────────────────────────────

function ManagementPanel({ isSuperuser, onNavigate }: DashboardProps) {
  return (
    <section className="card dashboard__tools">
      <div className="dashboard__panel-head">
        <h3 className="card__title"><Wrench size={18} /> Verwaltung &amp; Werkzeuge</h3>
        <span className="badge badge--muted">{isSuperuser ? 'Superuser' : 'Administrator'}</span>
      </div>
      <div className="dashboard__tool-grid">
        <ToolButton
          icon={<Users size={22} />}
          label="Nutzer"
          desc="Konten & Rollen verwalten"
          onClick={() => onNavigate('users')}
        />
        {isSuperuser && (
          <ToolButton
            icon={<Building2 size={22} />}
            label="Gruppen"
            desc="Gruppen & Verknüpfungen"
            onClick={() => onNavigate('groups')}
          />
        )}
        <ToolButton
          icon={<Calendar size={22} />}
          label="Planung"
          desc="Wochenmenü pflegen"
          onClick={() => onNavigate('upcoming')}
        />
        <ToolButton
          icon={<TrendingUp size={22} />}
          label="Statistiken"
          desc="Auswertungen & Vergleich"
          onClick={() => onNavigate('stats')}
        />
      </div>
    </section>
  );
}

function ToolButton({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button className="dashboard__tool" onClick={onClick}>
      <span className="dashboard__tool-icon" aria-hidden="true">{icon}</span>
      <span className="dashboard__tool-text">
        <span className="dashboard__tool-label">{label}</span>
        <span className="dashboard__tool-desc">{desc}</span>
      </span>
      <span className="dashboard__tool-arrow" aria-hidden="true"><ChevronRight size={18} /></span>
    </button>
  );
}
