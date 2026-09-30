import { useState } from 'react';
import {
  LogOut,
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  Ticket,
  CalendarDays,
  UserCheck,
  UserCircle,
  Hand,
  Bell,
  BarChart3,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Palette,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-context';
import { NotificationBell, NotificationSidebar } from '@/components/notifications/NotificationBell';

const NAV_ITEMS = [
  { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/staff/enrollment-intakes', label: 'Enrollment intakes', icon: UserCheck },
  { to: '/staff/applications', label: 'Assigned requests', icon: ClipboardList },
  { to: '/staff/unassigned', label: 'Unassigned pool', icon: Hand },
  { to: '/staff/queue', label: 'Walk-in queue', icon: Ticket },
  { to: '/staff/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/staff/workload', label: 'Workload', icon: BarChart3 },
  { to: '/staff/notifications', label: 'Notifications', icon: Bell },
  { to: '/staff/profile', label: 'Profile', icon: UserCircle },
  { to: '/staff/theme', label: 'Theme & Colors', icon: Palette },
];

export function DashboardLayout({ children, title, subtitle }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Logout?',
      description: 'You will need to sign in again to continue.',
      confirmLabel: 'Logout',
    });
    if (!ok) return;
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      <aside
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white/85 border-r border-divider shadow-[4px_0_24px_rgba(10,102,64,0.06)] transition-[width] duration-300',
          sidebarCollapsed ? 'w-20' : 'w-60',
        )}
      >
        <SidebarContent
          user={user}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((value) => !value)}
        />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 w-full bg-heading/35 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[82vw] max-w-80 flex-col bg-white/95 border-r border-divider shadow-[12px_0_40px_rgba(5,46,28,0.16)]">
            <div className="flex h-14 items-center justify-between border-b border-divider pr-3">
              <div className="flex items-center gap-3 px-5">
                <BrandMark />
                <span className="text-sm font-bold tracking-tight text-heading">
                  Staff Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-label hover:bg-input-bg hover:text-primary"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            <SidebarFooter user={user} />
          </aside>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-300',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-60',
        )}
      >
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-divider/80 bg-white/85 px-4 py-3 shadow-[0_1px_8px_rgba(10,102,64,0.05)] backdrop-blur-md sm:px-6">
          <div className="lg:hidden flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-input-border bg-white text-primary shadow-sm"
              aria-label="Open navigation"
            >
              <Menu className="h-4.5 w-4.5" strokeWidth={2.2} />
            </button>
            <BrandMark compact />
            <span className="truncate text-sm font-bold tracking-tight text-heading">
              Staff Portal
            </span>
          </div>

          {(title || subtitle) && (
            <div className="hidden min-w-0 flex-1 lg:block">
              {title ? <p className="truncate text-sm font-bold text-heading">{title}</p> : null}
              {subtitle ? <p className="truncate text-xs text-label">{subtitle}</p> : null}
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none text-heading">{user?.name}</p>
              <p className="mt-0.5 text-xs capitalize text-text-muted">{user?.role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-mint-pale to-mint-light text-xs font-bold text-primary shadow-[0_2px_6px_rgba(10,102,64,0.12)]">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'ST'}
            </div>

            <div className="hidden h-5 w-px bg-divider sm:block" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-input-border bg-white/70 px-2.5 py-1.5 text-xs font-medium text-label transition-all duration-300 hover:border-mint hover:bg-input-bg hover:text-primary sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-page-bg">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
            {(title || subtitle) && (
              <div className="mb-6 lg:hidden">
                {title ? <p className="text-lg font-bold text-heading">{title}</p> : null}
                {subtitle ? <p className="mt-1 text-sm text-label">{subtitle}</p> : null}
              </div>
            )}
            {children}
          </div>
        </main>
        <NotificationSidebar />
      </div>
    </div>
  );
}

function BrandMark({ compact = false }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br from-primary to-primary-bright shadow-[0_2px_8px_rgba(10,102,64,0.25)]',
        compact ? 'h-8 w-8 rounded-xl' : 'h-8 w-8 rounded-xl',
      )}
    >
      <GraduationCap className="h-4 w-4 text-white" strokeWidth={2.2} />
    </div>
  );
}

function SidebarContent({ user, collapsed, onToggle }) {
  return (
    <>
      <div
        className={cn(
          'flex h-14 items-center border-b border-divider px-4',
          collapsed ? 'justify-center' : 'justify-between gap-3',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          {!collapsed && (
            <span className="truncate text-sm font-bold tracking-tight text-heading">
              Staff Portal
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-label transition-colors hover:bg-input-bg hover:text-primary"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>
      {collapsed && (
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-input-border bg-white text-primary transition-colors hover:bg-input-bg"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
      <SidebarNav collapsed={collapsed} />
      <SidebarFooter user={user} collapsed={collapsed} />
    </>
  );
}

function SidebarNav({ onNavigate, collapsed = false }) {
  return (
    <nav className="flex-1 space-y-0.5 px-3 py-5">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-hidden group',
              collapsed ? 'justify-center px-0' : 'gap-3 px-4',
              isActive
                ? 'text-heading bg-gradient-to-r from-mint/20 to-mint-light/10 shadow-sm'
                : 'text-label hover:text-heading',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-gradient-to-b from-primary to-primary-bright" />
              )}
              {!isActive && (
                <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-mint-pale/70 to-input-bg/40" />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 relative z-10 transition-all duration-500',
                  isActive
                    ? 'text-primary scale-110'
                    : 'text-text-muted group-hover:scale-110 group-hover:text-primary',
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!collapsed && <span className="relative z-10">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({ user, collapsed = false }) {
  const instituteName = user?.institute?.name ?? 'Institute';
  const initials = instituteName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn('border-t border-divider p-4', collapsed && 'px-3')}>
      {collapsed ? (
        <div
          title={instituteName}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-input-border bg-input-bg text-xs font-bold text-primary"
        >
          {initials || 'IN'}
        </div>
      ) : (
        <div className="rounded-2xl border border-input-border bg-input-bg px-4 py-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary-bright">
            Institute
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-heading">{instituteName}</p>
        </div>
      )}
    </div>
  );
}
