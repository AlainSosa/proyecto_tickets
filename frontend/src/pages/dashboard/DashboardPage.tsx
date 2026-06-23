import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  Ticket,
  UserRoundCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
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
  DashboardAreaDatum,
  DashboardCategoryDatum,
  DashboardMonthDatum,
  DashboardStatusDatum,
  DashboardSummary,
  DashboardTechnicianMetric,
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

const SEMANTIC_COLORS = {
  green: '#16A34A',
  yellow: '#EAB308',
  orange: '#F97316',
  red: '#DC2626',
  blue: '#2563EB',
  gray: '#94A3B8',
  brazilGreen: '#009739',
  brazilBlue: '#002776',
} as const;

const statusColors: Record<DashboardStatusDatum['status'], string> = {
  pending: SEMANTIC_COLORS.yellow,
  in_progress: SEMANTIC_COLORS.blue,
  resolved: SEMANTIC_COLORS.green,
};

const priorityColors: Record<string, string> = {
  low: SEMANTIC_COLORS.green,
  medium: SEMANTIC_COLORS.yellow,
  high: SEMANTIC_COLORS.orange,
  critical: SEMANTIC_COLORS.red,
  undefined: SEMANTIC_COLORS.gray,
};

const categoryColors = [
  SEMANTIC_COLORS.blue,
  SEMANTIC_COLORS.green,
  SEMANTIC_COLORS.yellow,
  SEMANTIC_COLORS.orange,
  SEMANTIC_COLORS.red,
  SEMANTIC_COLORS.brazilBlue,
  SEMANTIC_COLORS.gray,
];

const statusLabels: Record<DashboardStatusDatum['status'], string> = {
  pending: 'Pendientes',
  in_progress: 'En proceso',
  resolved: 'Finalizados',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

function formatPercent(value: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      {label && <p className="mb-1 font-semibold text-primary-900 dark:text-white">{label}</p>}
      {payload.map((item: any) => (
        <p key={`${item.name}-${item.dataKey}`} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
          <span>{item.name || item.dataKey}: <strong>{item.value}</strong></span>
        </p>
      ))}
    </div>
  );
}

interface DashboardData {
  summary: DashboardSummary;
  ticketsByStatus: DashboardStatusDatum[];
  ticketsByMonth: DashboardMonthDatum[];
  ticketsByCategory: DashboardCategoryDatum[];
  ticketsByArea: DashboardAreaDatum[];
  ticketsByPriority: Record<string, number>;
  technicianMetrics: DashboardTechnicianMetric[];
  resolutionTrend: DashboardMonthDatum[];
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
        ticketsByArea,
        ticketsByPriority,
        technicianMetrics,
        resolutionTrend,
        recentTickets,
        criticalTickets,
        maintenanceAssets,
        inactiveNetworkPoints,
      ] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.ticketsByStatus(),
        dashboardApi.ticketsByMonth(),
        dashboardApi.ticketsByCategory(),
        dashboardApi.ticketsByArea(),
        dashboardApi.ticketsByPriority(),
        dashboardApi.technicianMetrics(),
        dashboardApi.resolutionTrend(),
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
        ticketsByArea,
        ticketsByPriority,
        technicianMetrics,
        resolutionTrend,
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
    const total = (data?.ticketsByStatus || []).reduce((sum, item) => sum + item.value, 0);
    return (data?.ticketsByStatus || []).map((item) => ({
      name: statusLabels[item.status],
      status: item.status,
      value: item.value,
      percent: formatPercent(item.value, total),
    }));
  }, [data]);

  const priorityChartData = useMemo(() => {
    const items = ['critical', 'high', 'medium', 'low'].map((priority) => ({
      priority,
      name: priorityLabels[priority],
      value: data?.ticketsByPriority?.[priority] || 0,
    }));
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map((item) => ({ ...item, percent: formatPercent(item.value, total) }));
  }, [data]);

  const hasStatusData = statusChartData.some((item) => item.value > 0);
  const hasMonthData = (data?.ticketsByMonth || []).some((item) => item.value > 0);
  const hasCategoryData = (data?.ticketsByCategory || []).some((item) => item.value > 0);
  const hasAreaData = (data?.ticketsByArea || []).some((item) => item.value > 0);
  const hasPriorityData = priorityChartData.some((item) => item.value > 0);
  const hasTechnicianData = (data?.technicianMetrics || []).some((item) => item.assignedTickets > 0 || item.resolvedTickets > 0);
  const hasResolutionTrend = (data?.resolutionTrend || []).some((item) => item.value > 0);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError onRetry={loadDashboard} />;

  const { summary } = data;
  const completionRate = summary.totalTickets > 0
    ? Math.round((summary.resolvedTickets / summary.totalTickets) * 100)
    : 0;
  const unassignedTickets = Math.max(0, summary.pendingTickets - summary.assignedTickets);
  const attentionCount = summary.criticalTickets + unassignedTickets;

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Centro de control</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">Dashboard ejecutivo</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Prioridades, evolución y capacidad operativa del soporte técnico institucional.
          </p>
        </div>
        <button type="button" onClick={loadDashboard} className="btn-secondary gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3">
        <div className="flex min-w-0 items-center gap-4 border-b border-slate-200 p-5 dark:border-slate-700 md:border-b-0 md:border-r">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">Tasa de finalización</p>
            <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{completionRate}%</p>
            <p className="mt-1 text-xs leading-4 text-slate-500">{summary.resolvedTickets} de {summary.totalTickets} tickets</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-4 border-b border-slate-200 p-5 dark:border-slate-700 md:border-b-0 md:border-r">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">Pendientes sin asignar</p>
            <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{unassignedTickets}</p>
            <p className="mt-1 text-xs leading-4 text-slate-500">Requieren responsable técnico</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-4 p-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${attentionCount > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">Atención inmediata</p>
            <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{attentionCount}</p>
            <p className="mt-1 text-xs leading-4 text-slate-500">Críticos y casos sin asignación</p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Panorama operativo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Lectura rápida del estado actual y la evolución de solicitudes.</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <DashboardChart title="Estado actual de los tickets" description="Permite identificar cuánto trabajo está pendiente, activo o finalizado." isEmpty={!hasStatusData} height="large">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                innerRadius={64}
                outerRadius={104}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={({ name, value, percent }) => value > 0 ? `${name}: ${percent}` : ''}
              >
                {statusChartData.map((item) => (
                  <Cell key={item.status} fill={statusColors[item.status]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={40} />
            </PieChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Demanda mensual de soporte" description="Muestra el volumen recibido y ayuda a detectar crecimiento o temporadas de mayor carga." isEmpty={!hasMonthData} height="large">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ticketsByMonth} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Tickets creados" fill={SEMANTIC_COLORS.blue} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Origen y criticidad</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dónde se concentra la demanda y qué tipo de atención requiere.</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <DashboardChart title="Incidencias por categoría" description="Servicios técnicos que generan más solicitudes." isEmpty={!hasCategoryData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ticketsByCategory} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" width={95} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Tickets" radius={[0, 6, 6, 0]}>
                {data.ticketsByCategory.map((_, index) => (
                  <Cell key={index} fill={categoryColors[index % categoryColors.length]} />
                ))}
                <LabelList dataKey="value" position="right" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>
        <DashboardChart title="Demanda por área institucional" description="Dependencias con mayor necesidad de soporte." isEmpty={!hasAreaData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ticketsByArea} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="area" width={110} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Tickets" fill={SEMANTIC_COLORS.brazilGreen} radius={[0, 6, 6, 0]}>
                <LabelList dataKey="value" position="right" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Distribución por prioridad" description="Semáforo de criticidad para enfocar recursos." isEmpty={!hasPriorityData}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityChartData}
                innerRadius={60}
                outerRadius={96}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={({ name, value, percent }) => value > 0 ? `${name}: ${percent}` : ''}
              >
                {priorityChartData.map((item) => (
                  <Cell key={item.priority} fill={priorityColors[item.priority]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend verticalAlign="bottom" height={48} />
            </PieChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Capacidad y resultados</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Carga asignada, productividad técnica y evolución de cierres.</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <DashboardChart title="Rendimiento de técnicos" description="Comparación directa entre carga asignada y casos finalizados." isEmpty={!hasTechnicianData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.technicianMetrics} margin={{ top: 18, right: 10, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="technicianName" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="assignedTickets" name="Asignados" fill={SEMANTIC_COLORS.blue} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="assignedTickets" position="top" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
              <Bar dataKey="resolvedTickets" name="Finalizados" fill={SEMANTIC_COLORS.green} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="resolvedTickets" position="top" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title="Tendencia de finalización" description="Evolución mensual de tickets finalizados." isEmpty={!hasResolutionTrend}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.resolutionTrend} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" name="Finalizados" stroke={SEMANTIC_COLORS.green} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div className="card overflow-hidden p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Indicadores por técnico</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Comparación individual de carga, resultados y tiempo promedio de atención.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700">
              <tr>
                <th className="py-3 pr-4">Técnico</th>
                <th className="py-3 pr-4">Asignados</th>
                <th className="py-3 pr-4">Finalizados</th>
                <th className="py-3 pr-4">Promedio resolución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.technicianMetrics.map((item) => (
                <tr key={item.technicianId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-4 pr-4 font-medium">{item.technicianName}</td>
                  <td className="py-4 pr-4">{item.assignedTickets}</td>
                  <td className="py-4 pr-4">{item.resolvedTickets}</td>
                  <td className="py-4 pr-4">{item.averageResolutionHours} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <RecentTicketsTable tickets={data.recentTickets} />
        <CriticalTicketsTable tickets={data.criticalTickets} />
        <MaintenanceAssetsTable assets={data.maintenanceAssets} />
        <NetworkPointsTable points={data.inactiveNetworkPoints} />
      </div>

      <div className="border-t border-slate-200 pt-7 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Resumen general</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Totales consolidados para consulta y presentación institucional.</p>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard title="Total de tickets" value={summary.totalTickets} icon={Ticket} tone="blue" helper="Solicitudes registradas" />
        <StatCard title="Tickets pendientes" value={summary.pendingTickets} icon={AlertTriangle} tone="yellow" helper="Aún requieren atención" />
        <StatCard title="Tickets en proceso" value={summary.inProgressTickets} icon={Clock} tone="blue" helper="Atención técnica activa" />
        <StatCard title="Tickets finalizados" value={summary.resolvedTickets} icon={CheckCircle2} tone="green" helper="Atenciones completadas" />
        <StatCard title="Alta o crítica" value={summary.criticalTickets} icon={ShieldAlert} tone="red" helper="Requieren seguimiento prioritario" />
        <StatCard title="Finalizados este mes" value={summary.resolvedThisMonth} icon={CheckCircle2} tone="green" helper="Resultado del periodo actual" />
        <StatCard title="Prioridad baja" value={summary.byPriority.low} icon={Ticket} tone="green" />
        <StatCard title="Prioridad media" value={summary.byPriority.medium} icon={Ticket} tone="yellow" />
        <StatCard title="Prioridad alta" value={summary.byPriority.high} icon={ShieldAlert} tone="orange" />
        <StatCard title="Prioridad crítica" value={summary.byPriority.critical} icon={ShieldAlert} tone="red" />
      </div>
    </div>
  );
}
