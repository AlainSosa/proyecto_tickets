import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitBranch,
  Monitor,
  Network,
  ShieldAlert,
  Ticket,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi } from '../../services/dashboardApi';
import {
  Asset,
  DashboardCategoryDatum,
  DashboardMonthDatum,
  DashboardStatusDatum,
  DashboardSummary,
  NetworkPoint,
  Ticket as TicketType,
} from '../../types';
import { StatCard } from './components/StatCard';
import { DashboardChart } from './components/DashboardChart';
import {
  CriticalTicketsTable,
  MaintenanceAssetsTable,
  NetworkPointsTable,
  RecentTicketsTable,
} from './components/DashboardTables';

const CHART_COLORS = ['#002776', '#FFDF00', '#009739', '#64748B', '#005A3C', '#0F766E', '#94A3B8'];

const statusLabels: Record<DashboardStatusDatum['status'], string> = {
  open: 'Abiertos',
  pending_assignment: 'Pendientes de asignación',
  assigned: 'Asignados',
  pending: 'Pendientes',
  in_progress: 'En proceso',
  on_hold: 'En espera',
  resolved: 'Resueltos',
  closed: 'Cerrados',
  canceled: 'Cancelados',
};

interface DashboardData {
  summary: DashboardSummary;
  ticketsByStatus: DashboardStatusDatum[];
  ticketsByMonth: DashboardMonthDatum[];
  ticketsByCategory: DashboardCategoryDatum[];
  recentTickets: TicketType[];
  criticalTickets: TicketType[];
  maintenanceAssets: Asset[];
  inactiveNetworkPoints: NetworkPoint[];
}

function DashboardSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card h-32 min-w-0 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card h-80 min-w-0 animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-primary-900 dark:text-white">
        No se pudo cargar el dashboard
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Revisa la conexión con el servidor e intenta nuevamente.
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mt-5">
        Reintentar
      </button>
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const [
        summary,
        ticketsByStatus,
        ticketsByMonth,
        ticketsByCategory,
        recentTickets,
        criticalTickets,
        maintenanceAssets,
        inactiveNetworkPoints,
      ] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.ticketsByStatus(),
        dashboardApi.ticketsByMonth(),
        dashboardApi.ticketsByCategory(),
        dashboardApi.recentTickets(),
        dashboardApi.criticalTickets(),
        dashboardApi.maintenanceAssets(),
        dashboardApi.inactiveNetworkPoints(),
      ]);

      setData({
        summary,
        ticketsByStatus,
        ticketsByMonth,
        ticketsByCategory,
        recentTickets,
        criticalTickets,
        maintenanceAssets,
        inactiveNetworkPoints,
      });
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const statusChartData = useMemo(() => {
    return (data?.ticketsByStatus || []).map((item) => ({
      name: statusLabels[item.status],
      value: item.value,
    }));
  }, [data]);

  const hasStatusData = statusChartData.some((item) => item.value > 0);
  const hasMonthData = (data?.ticketsByMonth || []).some((item) => item.value > 0);
  const hasCategoryData = (data?.ticketsByCategory || []).some((item) => item.value > 0);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError onRetry={loadDashboard} />;

  const { summary } = data;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 dark:text-white">Dashboard principal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vista ejecutiva de soporte técnico, activos informáticos y puntos de red.
          </p>
        </div>
        <button type="button" onClick={loadDashboard} className="btn-secondary">
          Actualizar
        </button>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tickets abiertos" value={summary.openTickets} icon={Ticket} tone="blue" />
        <StatCard title="Tickets en proceso" value={summary.inProgressTickets} icon={Clock} tone="yellow" />
        <StatCard title="Tickets críticos / alta" value={summary.criticalTickets} icon={ShieldAlert} tone="red" />
        <StatCard title="Resueltos este mes" value={summary.resolvedThisMonth} icon={CheckCircle2} tone="green" />
        <StatCard title="Total de activos" value={summary.totalAssets} icon={Monitor} tone="blue" />
        <StatCard title="Activos en mantenimiento" value={summary.assetsInMaintenance} icon={Wrench} tone="yellow" />
        <StatCard title="Puntos de red" value={summary.totalNetworkPoints} icon={GitBranch} tone="green" />
        <StatCard title="Puntos inactivos" value={summary.inactiveNetworkPoints} icon={Network} tone="red" />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <DashboardChart title="Tickets por estado" isEmpty={!hasStatusData}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusChartData} innerRadius={62} outerRadius={96} paddingAngle={4} dataKey="value" nameKey="name">
                {statusChartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Tickets por mes" isEmpty={!hasMonthData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ticketsByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#009739" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Incidencias por categoría" isEmpty={!hasCategoryData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ticketsByCategory} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" width={95} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#002776" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <RecentTicketsTable tickets={data.recentTickets} />
        <CriticalTicketsTable tickets={data.criticalTickets} />
        <MaintenanceAssetsTable assets={data.maintenanceAssets} />
        <NetworkPointsTable points={data.inactiveNetworkPoints} />
      </div>
    </div>
  );
}
