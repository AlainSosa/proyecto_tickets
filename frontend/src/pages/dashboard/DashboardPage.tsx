import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Ticket,
  TrendingUp,
  UserRoundCheck,
  Users,
  Wrench,
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
  PredictiveAnalysis,
  PredictiveRiskLevel,
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
import { useLanguage } from '../../context/LanguageContext';

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

const predictiveRiskColors: Record<PredictiveRiskLevel, string> = {
  low: SEMANTIC_COLORS.green,
  medium: SEMANTIC_COLORS.yellow,
  high: SEMANTIC_COLORS.red,
};

const predictiveRiskClasses: Record<PredictiveRiskLevel, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300',
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300',
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
  predictiveAnalysis: PredictiveAnalysis;
}

type DashboardView = 'summary' | 'predictive' | 'details';

const dashboardViews: Array<{
  id: DashboardView;
}> = [
  { id: 'summary' },
  { id: 'predictive' },
  { id: 'details' },
];

function RiskBadge({ risk }: { risk: PredictiveRiskLevel }) {
  const { language } = useLanguage();
  const labels = language === 'pt'
    ? { low: 'Baixo', medium: 'Médio', high: 'Alto' }
    : { low: 'Bajo', medium: 'Medio', high: 'Alto' };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${predictiveRiskClasses[risk]}`}>
      {labels[risk]}
    </span>
  );
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
  const { t, language } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>('summary');

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
        predictiveAnalysis,
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
        dashboardApi.predictiveAnalysis(),
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
        predictiveAnalysis,
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

  const text = useMemo(() => {
    if (language === 'pt') {
      return {
        statusLabels: { pending: 'Pendentes', in_progress: 'Em processo', resolved: 'Finalizados' },
        priorityLabels: { low: t('low'), medium: t('medium'), high: t('high'), critical: t('critical') },
        views: {
          summary: { label: 'Resumo', helper: 'Indicadores principais' },
          predictive: { label: 'Preditivo', helper: 'Riscos e recomendações' },
          details: { label: 'Detalhe', helper: 'Listas e totais' },
        },
        controlCenter: 'Centro de controle',
        executivePanel: 'Painel executivo',
        executiveDescription: 'Prioridades, evolução e capacidade operacional do suporte técnico institucional.',
        completionRate: 'Taxa de finalização',
        ofTickets: 'de',
        unassignedPending: 'Pendentes sem atribuição',
        requireTechnician: 'Requerem responsável técnico',
        immediateAttention: 'Atenção imediata',
        criticalAndUnassigned: 'Críticos e casos sem atribuição',
        operationalOverview: 'Panorama operacional',
        operationalOverviewHelp: 'Leitura rápida do estado atual e da evolução das solicitações.',
        currentTicketStatus: 'Estado atual dos tickets',
        currentTicketStatusHelp: 'Permite identificar quanto trabalho está pendente, ativo ou finalizado.',
        monthlySupportDemand: 'Demanda mensal de suporte',
        monthlySupportDemandHelp: 'Mostra o volume recebido e ajuda a detectar crescimento ou períodos de maior carga.',
        createdTickets: 'Tickets criados',
        originCriticality: 'Origem e criticidade',
        originCriticalityHelp: 'Onde a demanda se concentra e que tipo de atendimento requer.',
        categoryIncidents: 'Incidências por categoria',
        categoryIncidentsHelp: 'Serviços técnicos que geram mais solicitações.',
        areaDemand: 'Demanda por área institucional',
        areaDemandHelp: 'Setores com maior necessidade de suporte.',
        priorityDistribution: 'Distribuição por prioridade',
        priorityDistributionHelp: 'Semáforo de criticidade para focar recursos.',
        capacityResults: 'Capacidade e resultados',
        capacityResultsHelp: 'Carga atribuída, produtividade técnica e evolução de fechamentos.',
        technicianPerformance: 'Desempenho dos técnicos',
        technicianPerformanceHelp: 'Comparação direta entre carga atribuída e casos finalizados.',
        assigned: 'Atribuídos',
        finalized: 'Finalizados',
        completionTrend: 'Tendência de finalização',
        completionTrendHelp: 'Evolução mensal de tickets finalizados.',
        technicianIndicators: 'Indicadores por técnico',
        technicianIndicatorsHelp: 'Comparação individual de carga, resultados e tempo médio de atendimento.',
        averageResolution: 'Média de resolução',
        proactiveSupport: 'Suporte proativo',
        predictiveAnalysis: 'Análise preditiva',
        predictiveDescription: 'Detecção preventiva baseada em regras de negócio, recorrência histórica e comportamento de tickets.',
        executiveReading: 'Leitura executiva',
        whatNeedsAttention: 'O que requer atenção agora',
        automaticRecommendations: 'Recomendações automáticas para priorizar ações preventivas.',
        highRiskAssets: 'Equipamentos com maior risco',
        preventiveReview: 'Requerem revisão preventiva',
        criticalAreas: 'Áreas críticas',
        increaseCompared: 'Com aumento em relação ao período anterior',
        recurringUsers: 'Usuários recorrentes',
        repeatedRequests: 'Solicitações repetitivas detectadas',
        recommendations: 'Recomendações',
        generatedAutomatically: 'Geradas automaticamente',
        monthlyTrends: 'Tendências mensais',
        monthlyTrendsHelp: 'Volume histórico usado para antecipar períodos de maior demanda.',
        criticalAreasHelp: 'Ranking por volume e variação em relação ao período anterior.',
        repetitiveIncidents: 'Incidências repetitivas',
        repetitiveIncidentsHelp: 'Tipos de solicitação que aparecem com maior frequência.',
        riskAssetsHelp: 'Recorrência por equipamento e recomendação de manutenção.',
        criticalAssets: 'Equipamentos críticos',
        criticalAssetsHelp: 'Probabilidade de falha estimada por frequência, tipo de incidência e tempo entre falhas.',
        equipment: 'Equipamento',
        incident: 'Incidência',
        score: 'Pontuação',
        risk: 'Risco',
        noCriticalAssets: 'Nenhum equipamento crítico detectado.',
        recurringUsersHelp: 'Frequência de solicitações e tipo de incidência predominante.',
        perWeek: 'por semana',
        noRecurringUsers: 'Nenhum usuário recorrente no período.',
        predictiveWorkload: 'Carga preditiva por técnico',
        predictiveWorkloadHelp: 'Tickets atribuídos, resolvidos, carga atual e tempo médio.',
        load: 'Carga',
        resolvedPlural: 'Resolvidos',
        average: 'Média',
        generalSummary: 'Resumo geral',
        generalSummaryHelp: 'Totais consolidados para consulta e apresentação institucional.',
        totalTickets: 'Total de tickets',
        registeredRequests: 'Solicitações registradas',
        stillNeedAttention: 'Ainda requerem atendimento',
        activeTechnicalWork: 'Atendimento técnico ativo',
        completedAttendances: 'Atendimentos concluídos',
        highOrCritical: 'Alta ou crítica',
        priorityFollowUp: 'Requerem acompanhamento prioritário',
        finalizedThisMonth: 'Finalizados este mês',
        currentPeriodResult: 'Resultado do período atual',
        lowPriority: 'Prioridade baixa',
        mediumPriority: 'Prioridade média',
        highPriority: 'Prioridade alta',
        criticalPriority: 'Prioridade crítica',
      };
    }

    return {
      statusLabels: { pending: 'Pendientes', in_progress: 'En proceso', resolved: 'Finalizados' },
      priorityLabels: { low: t('low'), medium: t('medium'), high: t('high'), critical: t('critical') },
      views: {
        summary: { label: 'Resumen', helper: 'Indicadores principales' },
        predictive: { label: 'Predictivo', helper: 'Riesgos y recomendaciones' },
        details: { label: 'Detalle', helper: 'Listas y totales' },
      },
      controlCenter: 'Centro de control',
      executivePanel: 'Panel ejecutivo',
      executiveDescription: 'Prioridades, evolución y capacidad operativa del soporte técnico institucional.',
      completionRate: 'Tasa de finalización',
      ofTickets: 'de',
      unassignedPending: 'Pendientes sin asignar',
      requireTechnician: 'Requieren responsable técnico',
      immediateAttention: 'Atención inmediata',
      criticalAndUnassigned: 'Críticos y casos sin asignación',
      operationalOverview: 'Panorama operativo',
      operationalOverviewHelp: 'Lectura rápida del estado actual y la evolución de solicitudes.',
      currentTicketStatus: 'Estado actual de los tickets',
      currentTicketStatusHelp: 'Permite identificar cuánto trabajo está pendiente, activo o finalizado.',
      monthlySupportDemand: 'Demanda mensual de soporte',
      monthlySupportDemandHelp: 'Muestra el volumen recibido y ayuda a detectar crecimiento o temporadas de mayor carga.',
      createdTickets: 'Tickets creados',
      originCriticality: 'Origen y criticidad',
      originCriticalityHelp: 'Dónde se concentra la demanda y qué tipo de atención requiere.',
      categoryIncidents: 'Incidencias por categoría',
      categoryIncidentsHelp: 'Servicios técnicos que generan más solicitudes.',
      areaDemand: 'Demanda por área institucional',
      areaDemandHelp: 'Dependencias con mayor necesidad de soporte.',
      priorityDistribution: 'Distribución por prioridad',
      priorityDistributionHelp: 'Semáforo de criticidad para enfocar recursos.',
      capacityResults: 'Capacidad y resultados',
      capacityResultsHelp: 'Carga asignada, productividad técnica y evolución de cierres.',
      technicianPerformance: 'Rendimiento de técnicos',
      technicianPerformanceHelp: 'Comparación directa entre carga asignada y casos finalizados.',
      assigned: 'Asignados',
      finalized: 'Finalizados',
      completionTrend: 'Tendencia de finalización',
      completionTrendHelp: 'Evolución mensual de tickets finalizados.',
      technicianIndicators: 'Indicadores por técnico',
      technicianIndicatorsHelp: 'Comparación individual de carga, resultados y tiempo promedio de atención.',
      averageResolution: 'Promedio resolución',
      proactiveSupport: 'Soporte proactivo',
      predictiveAnalysis: 'Análisis Predictivo',
      predictiveDescription: 'Detección preventiva basada en reglas de negocio, recurrencia histórica y comportamiento de tickets.',
      executiveReading: 'Lectura ejecutiva',
      whatNeedsAttention: 'Qué requiere atención ahora',
      automaticRecommendations: 'Recomendaciones automáticas para priorizar acciones preventivas.',
      highRiskAssets: 'Equipos con mayor riesgo',
      preventiveReview: 'Requieren revisión preventiva',
      criticalAreas: 'Áreas críticas',
      increaseCompared: 'Con incremento frente al periodo anterior',
      recurringUsers: 'Usuarios recurrentes',
      repeatedRequests: 'Solicitudes repetitivas detectadas',
      recommendations: 'Recomendaciones',
      generatedAutomatically: 'Generadas automáticamente',
      monthlyTrends: 'Tendencias mensuales',
      monthlyTrendsHelp: 'Volumen histórico usado para anticipar periodos de mayor demanda.',
      criticalAreasHelp: 'Ranking por volumen y variación respecto al periodo anterior.',
      repetitiveIncidents: 'Incidencias repetitivas',
      repetitiveIncidentsHelp: 'Tipos de solicitud que aparecen con mayor frecuencia.',
      riskAssetsHelp: 'Recurrencia por equipo y recomendación de mantenimiento.',
      criticalAssets: 'Equipos críticos',
      criticalAssetsHelp: 'Probabilidad de falla estimada por frecuencia, tipo de incidencia y tiempo entre fallas.',
      equipment: 'Equipo',
      incident: 'Incidencia',
      score: 'Puntaje',
      risk: 'Riesgo',
      noCriticalAssets: 'Sin equipos críticos detectados.',
      recurringUsersHelp: 'Frecuencia de solicitudes y tipo de incidencia predominante.',
      perWeek: 'por semana',
      noRecurringUsers: 'Sin usuarios recurrentes en el periodo.',
      predictiveWorkload: 'Carga predictiva por técnico',
      predictiveWorkloadHelp: 'Tickets asignados, resueltos, carga actual y tiempo promedio.',
      load: 'Carga',
      resolvedPlural: 'Resueltos',
      average: 'Promedio',
      generalSummary: 'Resumen general',
      generalSummaryHelp: 'Totales consolidados para consulta y presentación institucional.',
      totalTickets: 'Total de tickets',
      registeredRequests: 'Solicitudes registradas',
      stillNeedAttention: 'Aún requieren atención',
      activeTechnicalWork: 'Atención técnica activa',
      completedAttendances: 'Atenciones completadas',
      highOrCritical: 'Alta o crítica',
      priorityFollowUp: 'Requieren seguimiento prioritario',
      finalizedThisMonth: 'Finalizados este mes',
      currentPeriodResult: 'Resultado del periodo actual',
      lowPriority: 'Prioridad baja',
      mediumPriority: 'Prioridad media',
      highPriority: 'Prioridad alta',
      criticalPriority: 'Prioridad crítica',
    };
  }, [language, t]);

  const statusChartData = useMemo(() => {
    const total = (data?.ticketsByStatus || []).reduce((sum, item) => sum + item.value, 0);
    return (data?.ticketsByStatus || []).map((item) => ({
      name: text.statusLabels[item.status],
      status: item.status,
      value: item.value,
      percent: formatPercent(item.value, total),
    }));
  }, [data, text]);

  const priorityChartData = useMemo(() => {
    const items = ['critical', 'high', 'medium', 'low'].map((priority) => ({
      priority,
      name: text.priorityLabels[priority as keyof typeof text.priorityLabels],
      value: data?.ticketsByPriority?.[priority] || 0,
    }));
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map((item) => ({ ...item, percent: formatPercent(item.value, total) }));
  }, [data, text]);

  const hasStatusData = statusChartData.some((item) => item.value > 0);
  const hasMonthData = (data?.ticketsByMonth || []).some((item) => item.value > 0);
  const hasCategoryData = (data?.ticketsByCategory || []).some((item) => item.value > 0);
  const hasAreaData = (data?.ticketsByArea || []).some((item) => item.value > 0);
  const hasPriorityData = priorityChartData.some((item) => item.value > 0);
  const hasTechnicianData = (data?.technicianMetrics || []).some((item) => item.assignedTickets > 0 || item.resolvedTickets > 0);
  const hasResolutionTrend = (data?.resolutionTrend || []).some((item) => item.value > 0);
  const hasPredictiveMonthlyTrends = (data?.predictiveAnalysis.monthlyTrends || []).some((item) => item.value > 0);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError onRetry={loadDashboard} />;

  const { summary } = data;
  const { predictiveAnalysis } = data;
  const completionRate = summary.totalTickets > 0
    ? Math.round((summary.resolvedTickets / summary.totalTickets) * 100)
    : 0;
  const unassignedTickets = Math.max(0, summary.pendingTickets - summary.assignedTickets);
  const attentionCount = summary.criticalTickets + unassignedTickets;

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">{text.controlCenter}</p>
          <h1 className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{text.executivePanel}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {text.executiveDescription}
          </p>
        </div>
        <button type="button" onClick={loadDashboard} className="btn-secondary gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" />
          {t('refresh')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid min-w-[520px] grid-cols-3 gap-1">
          {dashboardViews.map((view) => {
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                className={`rounded-md px-4 py-3 text-left transition ${
                  isActive
                    ? 'bg-primary-900 text-white shadow-sm dark:bg-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block text-sm font-semibold">{text.views[view.id].label}</span>
                <span className={`mt-1 block text-xs ${isActive ? 'text-white/75' : 'text-slate-400'}`}>
                  {text.views[view.id].helper}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeView === 'summary' && (
        <>
      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3">
        <div className="flex min-w-0 items-center gap-4 border-b border-slate-200 p-5 dark:border-slate-700 md:border-b-0 md:border-r">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">{text.completionRate}</p>
            <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{completionRate}%</p>
            <p className="mt-1 text-xs leading-4 text-slate-500">{summary.resolvedTickets} {text.ofTickets} {summary.totalTickets} tickets</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-4 border-b border-slate-200 p-5 dark:border-slate-700 md:border-b-0 md:border-r">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">{text.unassignedPending}</p>
            <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{unassignedTickets}</p>
            <p className="mt-1 text-xs leading-4 text-slate-500">{text.requireTechnician}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-4 p-5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${attentionCount > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-slate-500">{text.immediateAttention}</p>
            <p className="mt-1 text-2xl font-bold text-primary-900 dark:text-white">{attentionCount}</p>
            <p className="mt-1 text-xs leading-4 text-slate-500">{text.criticalAndUnassigned}</p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.operationalOverview}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.operationalOverviewHelp}</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <DashboardChart title={text.currentTicketStatus} description={text.currentTicketStatusHelp} isEmpty={!hasStatusData} height="large">
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

        <DashboardChart title={text.monthlySupportDemand} description={text.monthlySupportDemandHelp} isEmpty={!hasMonthData} height="large">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ticketsByMonth} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name={text.createdTickets} fill={SEMANTIC_COLORS.blue} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.originCriticality}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.originCriticalityHelp}</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <DashboardChart title={text.categoryIncidents} description={text.categoryIncidentsHelp} isEmpty={!hasCategoryData}>
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
        <DashboardChart title={text.areaDemand} description={text.areaDemandHelp} isEmpty={!hasAreaData}>
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

        <DashboardChart title={text.priorityDistribution} description={text.priorityDistributionHelp} isEmpty={!hasPriorityData}>
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
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.capacityResults}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.capacityResultsHelp}</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <DashboardChart title={text.technicianPerformance} description={text.technicianPerformanceHelp} isEmpty={!hasTechnicianData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.technicianMetrics} margin={{ top: 18, right: 10, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="technicianName" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="assignedTickets" name={text.assigned} fill={SEMANTIC_COLORS.blue} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="assignedTickets" position="top" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
              <Bar dataKey="resolvedTickets" name={text.finalized} fill={SEMANTIC_COLORS.green} radius={[6, 6, 0, 0]}>
                <LabelList dataKey="resolvedTickets" position="top" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title={text.completionTrend} description={text.completionTrendHelp} isEmpty={!hasResolutionTrend}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.resolutionTrend} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" name={text.finalized} stroke={SEMANTIC_COLORS.green} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div className="card overflow-hidden p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.technicianIndicators}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.technicianIndicatorsHelp}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700">
              <tr>
                <th className="py-3 pr-4">{t('technician')}</th>
                <th className="py-3 pr-4">{text.assigned}</th>
                <th className="py-3 pr-4">{text.finalized}</th>
                <th className="py-3 pr-4">{text.averageResolution}</th>
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
        </>
      )}

      {activeView === 'predictive' && (
        <>
      <div className="border-t border-slate-200 pt-7 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">{text.proactiveSupport}</p>
        <h2 className="mt-1 text-xl font-bold text-primary-900 dark:text-white">{text.predictiveAnalysis}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {text.predictiveDescription}
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">{text.executiveReading}</p>
            <h2 className="mt-1 text-lg font-semibold text-primary-900 dark:text-white">{text.whatNeedsAttention}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {text.automaticRecommendations}
            </p>
          </div>
          <BrainCircuit className="h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {predictiveAnalysis.recommendations.map((recommendation) => (
            <div key={recommendation} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              {recommendation}
            </div>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={text.highRiskAssets}
          value={predictiveAnalysis.recurringAssets.filter((item) => item.riskLevel !== 'low').length}
          icon={Wrench}
          tone={predictiveAnalysis.recurringAssets.some((item) => item.riskLevel === 'high') ? 'red' : 'yellow'}
          helper={text.preventiveReview}
        />
        <StatCard
          title={text.criticalAreas}
          value={predictiveAnalysis.criticalAreas.filter((item) => item.trend === 'up').length}
          icon={TrendingUp}
          tone="orange"
          helper={text.increaseCompared}
        />
        <StatCard
          title={text.recurringUsers}
          value={predictiveAnalysis.recurringUsers.filter((item) => item.riskLevel !== 'low').length}
          icon={Users}
          tone="blue"
          helper={text.repeatedRequests}
        />
        <StatCard
          title={text.recommendations}
          value={predictiveAnalysis.recommendations.length}
          icon={Lightbulb}
          tone="green"
          helper={text.generatedAutomatically}
        />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <DashboardChart title={text.monthlyTrends} description={text.monthlyTrendsHelp} isEmpty={!hasPredictiveMonthlyTrends}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={predictiveAnalysis.monthlyTrends} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" name="Tickets" stroke={SEMANTIC_COLORS.brazilBlue} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title={text.criticalAreas} description={text.criticalAreasHelp} isEmpty={predictiveAnalysis.criticalAreas.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={predictiveAnalysis.criticalAreas} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="area" width={110} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="ticketCount" name="Tickets" fill={SEMANTIC_COLORS.orange} radius={[0, 6, 6, 0]}>
                <LabelList dataKey="ticketCount" position="right" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>

        <DashboardChart title={text.repetitiveIncidents} description={text.repetitiveIncidentsHelp} isEmpty={predictiveAnalysis.repetitiveIncidents.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={predictiveAnalysis.repetitiveIncidents} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="ticketCount" name="Tickets" radius={[0, 6, 6, 0]}>
                {predictiveAnalysis.repetitiveIncidents.map((item) => (
                  <Cell key={item.category} fill={predictiveRiskColors[item.riskLevel]} />
                ))}
                <LabelList dataKey="ticketCount" position="right" className="fill-slate-600 dark:fill-slate-200" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChart>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="card min-w-0 overflow-hidden p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-primary-900 dark:text-white">{text.highRiskAssets}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.riskAssetsHelp}</p>
            </div>
            <BrainCircuit className="h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" />
          </div>
          <div className="space-y-3">
            {predictiveAnalysis.recurringAssets.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700">{text.noCriticalAssets}</p>
            )}
            {predictiveAnalysis.recurringAssets.map((item) => (
              <div key={item.assetId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-primary-900 dark:text-white">{item.internalCode}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.ticketCount} tickets · {item.mainIncidentType}</p>
                  </div>
                  <RiskBadge risk={item.riskLevel} />
                </div>
                <p className="mt-3 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card min-w-0 overflow-hidden p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-primary-900 dark:text-white">{text.criticalAssets}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.criticalAssetsHelp}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700">
                <tr>
                  <th className="py-3 pr-4">{text.equipment}</th>
                  <th className="py-3 pr-4">{text.incident}</th>
                  <th className="py-3 pr-4">{text.score}</th>
                  <th className="py-3 pr-4">{text.risk}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {predictiveAnalysis.criticalAssets.map((item) => (
                  <tr key={item.assetId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-4 pr-4 font-medium">{item.internalCode}</td>
                    <td className="py-4 pr-4">{item.mainIncidentType}</td>
                    <td className="py-4 pr-4">{item.probabilityScore}</td>
                    <td className="py-4 pr-4"><RiskBadge risk={item.riskLevel} /></td>
                  </tr>
                ))}
                {predictiveAnalysis.criticalAssets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-500">{text.noCriticalAssets}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <section className="card min-w-0 overflow-hidden p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-primary-900 dark:text-white">{text.recurringUsers}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.recurringUsersHelp}</p>
          </div>
          <div className="space-y-3">
            {predictiveAnalysis.recurringUsers.map((item) => (
              <div key={item.userId} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-primary-900 dark:text-white">{item.userName}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.area} · {item.mainIncidentType} · {item.frequencyPerWeek} {text.perWeek}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-primary-900 dark:text-white">{item.ticketCount}</p>
                  <RiskBadge risk={item.riskLevel} />
                </div>
              </div>
            ))}
            {predictiveAnalysis.recurringUsers.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700">{text.noRecurringUsers}</p>
            )}
          </div>
        </section>

        <section className="card min-w-0 overflow-hidden p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-primary-900 dark:text-white">{text.predictiveWorkload}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{text.predictiveWorkloadHelp}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700">
                <tr>
                  <th className="py-3 pr-4">{t('technician')}</th>
                  <th className="py-3 pr-4">{text.load}</th>
                  <th className="py-3 pr-4">{text.resolvedPlural}</th>
                  <th className="py-3 pr-4">{text.average}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {predictiveAnalysis.technicianWorkload.map((item) => (
                  <tr key={item.technicianId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-4 pr-4 font-medium">{item.technicianName}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <span>{item.currentLoad}</span>
                        <RiskBadge risk={item.workloadLevel} />
                      </div>
                    </td>
                    <td className="py-4 pr-4">{item.resolvedTickets}</td>
                    <td className="py-4 pr-4">{item.averageResolutionHours} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

        </>
      )}

      {activeView === 'details' && (
        <>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <RecentTicketsTable tickets={data.recentTickets} />
        <CriticalTicketsTable tickets={data.criticalTickets} />
        <MaintenanceAssetsTable assets={data.maintenanceAssets} />
        <NetworkPointsTable points={data.inactiveNetworkPoints} />
      </div>

      <div className="border-t border-slate-200 pt-7 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.generalSummary}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.generalSummaryHelp}</p>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard title={text.totalTickets} value={summary.totalTickets} icon={Ticket} tone="blue" helper={text.registeredRequests} />
        <StatCard title={t('pendingTickets')} value={summary.pendingTickets} icon={AlertTriangle} tone="yellow" helper={text.stillNeedAttention} />
        <StatCard title={t('inProgress')} value={summary.inProgressTickets} icon={Clock} tone="blue" helper={text.activeTechnicalWork} />
        <StatCard title={text.finalized} value={summary.resolvedTickets} icon={CheckCircle2} tone="green" helper={text.completedAttendances} />
        <StatCard title={text.highOrCritical} value={summary.criticalTickets} icon={ShieldAlert} tone="red" helper={text.priorityFollowUp} />
        <StatCard title={text.finalizedThisMonth} value={summary.resolvedThisMonth} icon={CheckCircle2} tone="green" helper={text.currentPeriodResult} />
        <StatCard title={text.lowPriority} value={summary.byPriority.low} icon={Ticket} tone="green" />
        <StatCard title={text.mediumPriority} value={summary.byPriority.medium} icon={Ticket} tone="yellow" />
        <StatCard title={text.highPriority} value={summary.byPriority.high} icon={ShieldAlert} tone="orange" />
        <StatCard title={text.criticalPriority} value={summary.byPriority.critical} icon={ShieldAlert} tone="red" />
      </div>
        </>
      )}
    </div>
  );
}
