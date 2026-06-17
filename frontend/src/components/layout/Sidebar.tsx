import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Monitor,
  Network,
  Phone,
  Package,
  Wrench,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'technician'] },
  { to: '/tickets', label: 'Tickets', icon: Ticket, roles: ['admin', 'technician', 'user'] },
  { to: '/assets', label: 'Activos', icon: Monitor, roles: ['admin', 'technician'] },
  { to: '/network', label: 'Red', icon: Network, roles: ['admin', 'technician'] },
  { to: '/telephony', label: 'Telefonía', icon: Phone, roles: ['admin', 'technician'] },
  { to: '/consumables', label: 'Consumibles', icon: Package, roles: ['admin', 'technician'] },
  { to: '/maintenance', label: 'Mantenimiento', icon: Wrench, roles: ['admin', 'technician'] },
  { to: '/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const visibleLinks = user
    ? links.filter((link) => link.roles.includes(user.role))
    : [];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SG</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">Soporte</h1>
              <p className="text-xs text-gray-500">Sistema de Gestión</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
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
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
