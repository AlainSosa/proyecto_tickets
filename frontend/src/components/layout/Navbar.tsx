import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, Menu, Bell } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 px-4 lg:px-6">
      <button onClick={onToggleSidebar} className="lg:hidden rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 relative">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
      </button>

      <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-3 pl-4 border-l">
        <div className="text-right">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role === 'technician' ? 'Técnico' : user?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
        </div>
        <button onClick={handleLogout} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
