import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Monitor,
  Network,
  Phone,
  Wrench,
  Users,
  FileText,
  CircleCheckBig,
  ChevronLeft,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { to: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'technician'] },
  { to: '/tickets', labelKey: 'tickets', icon: Ticket, roles: ['admin', 'technician', 'user'] },
  { to: '/my-ticket-status', labelKey: 'myTicketStatus', icon: CircleCheckBig, roles: ['user'] },
  { to: '/assets', labelKey: 'assets', icon: Monitor, roles: ['admin', 'technician'] },
  { to: '/network', labelKey: 'network', icon: Network, roles: ['admin', 'technician'] },
  { to: '/telephony', labelKey: 'telephony', icon: Phone, roles: ['admin', 'technician'] },
  { to: '/maintenance', labelKey: 'maintenance', icon: Wrench, roles: ['admin', 'technician'] },
  { to: '/reports', labelKey: 'reports', icon: FileText, roles: ['admin', 'technician'] },
  { to: '/users', labelKey: 'users', icon: Users, roles: ['admin'] },
  { to: '/audit', labelKey: 'audit', icon: ShieldCheck, roles: ['admin'] },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const visibleLinks = user
    ? links.filter((link) => link.roles.includes(user.role))
    : [];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-700 dark:bg-slate-900 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 min-h-16 shrink-0 items-center justify-between border-b-4 border-accent-500 bg-primary-500 px-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold">{t('appName')}</h1>
              <p className="text-xs text-white/75">{t('embassy')}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10 lg:hidden">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-brand-900/20 dark:text-brand-300 dark:ring-brand-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <link.icon className="h-5 w-5" />
              {t(link.labelKey as Parameters<typeof t>[0])}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
