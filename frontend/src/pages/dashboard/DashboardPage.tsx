import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStats, Ticket } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Ticket as TicketIcon,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Wrench,
  TrendingUp,
  Send,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  in_progress: 'badge-blue',
  resolved: 'badge-green',
  closed: 'badge-gray',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

function UserDashboard() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  const { user } = useAuth();

  const loadTickets = () => {
    api.get(`/tickets?limit=5&requestedBy=${user!.id}`)
      .then((res) => setRecentTickets(res.data?.data || []))
      .catch(() => {});
  };

  useEffect(() => { loadTickets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/tickets', { title, description, priority });
      toast.success('Solicitud enviada correctamente');
      setTitle('');
      setDescription('');
      setPriority('medium');
      loadTickets();
    } catch {
      toast.error('Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de Usuario</h1>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-brand-600" />
          Nueva Solicitud de Soporte
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Describe brevemente tu problema"
              required
              minLength={5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input min-h-[100px]"
              placeholder="Explica detalladamente el problema..."
              required
              minLength={10}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <label className="block text-sm font-medium mb-1">Prioridad</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary mt-6 gap-2">
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            Mis Solicitudes Recientes
          </h2>
          <button onClick={() => navigate('/tickets')} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentTickets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No has realizado ninguna solicitud aún.</p>
        ) : (
          <div className="space-y-2">
            {recentTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString()} · {t.technician?.name || 'Sin asignar'}
                  </p>
                </div>
                <span className={statusBadge[t.status]}>{statusLabels[t.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/tickets?assignedTo=${user!.id}&limit=10`)
      .then((res) => setTickets(res.data?.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const pendingTickets = tickets.filter((t) => t.status === 'pending');
  const inProgressTickets = tickets.filter((t) => t.status === 'in_progress');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel del Técnico</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Asignados</p>
          <p className="text-3xl font-bold mt-1">{tickets.length}</p>
        </div>
        <div className="card p-6 border-l-4 border-yellow-400">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{pendingTickets.length}</p>
        </div>
        <div className="card p-6 border-l-4 border-blue-400">
          <p className="text-sm text-gray-500 dark:text-gray-400">En Proceso</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{inProgressTickets.length}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-600" />
          Tickets Pendientes
        </h2>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ) : pendingTickets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No tienes tickets pendientes.</p>
        ) : (
          <div className="space-y-2">
            {pendingTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{t.title}</p>
                    <span className={t.priority === 'critical' ? 'badge-red' : t.priority === 'high' ? 'badge-red' : t.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}>
                      {t.priority === 'critical' ? 'Crítica' : t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t.requester?.name || '-'} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-brand-600" />
          En Proceso
        </h2>
        {inProgressTickets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No tienes tickets en proceso.</p>
        ) : (
          <div className="space-y-2">
            {inProgressTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t.requester?.name || '-'} · {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const priorityData = [
    { name: 'Baja', value: stats.tickets.byPriority.low },
    { name: 'Media', value: stats.tickets.byPriority.medium },
    { name: 'Alta', value: stats.tickets.byPriority.high },
    { name: 'Crítica', value: stats.tickets.byPriority.critical },
  ];

  const assetData = [
    { name: 'Computadoras', value: stats.assets.byType.computers },
    { name: 'Impresoras', value: stats.assets.byType.printers },
    { name: 'Red', value: stats.assets.byType.network },
    { name: 'Otros', value: stats.assets.byType.others },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tickets Abiertos</p>
              <p className="text-3xl font-bold mt-1">{stats.tickets.openTickets}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TicketIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Total: {stats.tickets.totalTickets}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tickets Cerrados</p>
              <p className="text-3xl font-bold mt-1">{stats.tickets.closedTickets}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Equipos Registrados</p>
              <p className="text-3xl font-bold mt-1">{stats.assets.total}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Monitor className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{stats.assets.active} activos</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mantenimientos Pendientes</p>
              <p className="text-3xl font-bold mt-1">{stats.maintenance.pending}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{stats.maintenance.overdue} vencidos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-brand-600" />
            Tickets por Prioridad
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill="#009739" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Equipos por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {assetData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'user') return <UserDashboard />;
  if (user.role === 'technician') return <TechnicianDashboard />;
  return <AdminDashboard />;
}
