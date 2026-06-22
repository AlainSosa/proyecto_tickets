import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, Menu, Bell, UserRound } from 'lucide-react';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 min-h-16 shrink-0 items-center gap-4 border-b-4 border-accent-500 bg-brazil-gradient px-4 text-white shadow-sm lg:px-6">
      <button onClick={onToggleSidebar} className="rounded-lg p-2 text-white/90 hover:bg-white/10 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <button className="relative rounded-lg p-2 text-white/90 hover:bg-white/10">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500" />
      </button>

      <button onClick={toggleTheme} className="rounded-lg p-2 text-white/90 hover:bg-white/10">
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <LanguageToggle variant="solid" />

      <div className="flex items-center gap-3 border-l border-white/20 pl-4">
        <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white/10 sm:flex">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs capitalize text-white/75">{user?.role === 'technician' ? t('technician') : user?.role === 'admin' ? t('admin') : t('user')}</p>
        </div>
        <button onClick={handleLogout} className="rounded-lg p-2 text-white/90 hover:bg-white/10">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
