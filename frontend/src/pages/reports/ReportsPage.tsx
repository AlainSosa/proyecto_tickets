import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Download,
  FileText,
  Printer,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { dashboardApi } from '../../services/dashboardApi';
import api from '../../services/api';
import {
  Asset,
  AuditLog,
  DashboardAreaDatum,
  DashboardCategoryDatum,
  DashboardMonthDatum,
  DashboardStatusDatum,
  DashboardSummary,
  DashboardTechnicianMetric,
  NetworkPoint,
  Ticket,
  TicketPriority,
} from '../../types';
import {
  buildReportHeader,
  buildPrintableReportDocument,
  buildReportTable,
  escapeHtml,
  openPrintableReport,
  QuickReportColumn,
  ReportPreviewStyles,
} from '../../components/ui/QuickReportButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface ReportData {
  summary: DashboardSummary | null;
  ticketsByStatus: DashboardStatusDatum[];
  ticketsByMonth: DashboardMonthDatum[];
  ticketsByCategory: DashboardCategoryDatum[];
  ticketsByArea: DashboardAreaDatum[];
  ticketsByPriority: Record<TicketPriority, number>;
  technicianMetrics: DashboardTechnicianMetric[];
  resolutionTrend: DashboardMonthDatum[];
  recentTickets: Ticket[];
  criticalTickets: Ticket[];
  maintenanceAssets: Asset[];
  inactiveNetworkPoints: NetworkPoint[];
  auditLogs: AuditLog[];
}

const emptyData: ReportData = {
  summary: null,
  ticketsByStatus: [],
  ticketsByMonth: [],
  ticketsByCategory: [],
  ticketsByArea: [],
  ticketsByPriority: { low: 0, medium: 0, high: 0, critical: 0 },
  technicianMetrics: [],
  resolutionTrend: [],
  recentTickets: [],
  criticalTickets: [],
  maintenanceAssets: [],
  inactiveNetworkPoints: [],
  auditLogs: [],
};

const statusLabelKeys = { pending: 'pending', in_progress: 'inProgress', resolved: 'finalized' } as const;
const priorityLabelKeys = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' } as const;
const priorityLabels: Record<TicketPriority, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
type ReportPeriod = 'day' | 'month' | 'year';

function toInputDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getReportRange(period: ReportPeriod, value: string) {
  if (period === 'day') {
    const start = new Date(`${value}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
  }
  if (period === 'month') {
    const [year, month] = value.split('-').map(Number);
    return {
      dateFrom: new Date(year, month - 1, 1).toISOString(),
      dateTo: new Date(year, month, 1).toISOString(),
    };
  }
  const year = Number(value);
  return {
    dateFrom: new Date(year, 0, 1).toISOString(),
    dateTo: new Date(year + 1, 0, 1).toISOString(),
  };
}

function getPeriodLabel(period: ReportPeriod, value: string) {
  if (period === 'day') return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', { dateStyle: 'long' });
  if (period === 'month') {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  return `Año ${value}`;
}

function buildMetrics(metrics: Array<[string, number | string]>) {
  return `<section class="summary">${metrics
    .map(([label, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`)
    .join('')}</section>`;
}

function buildIntro(periodLabel: string, purpose: string, findings: string[]) {
  return `
    <section class="report-context">
      <p><strong>Periodo analizado:</strong> ${escapeHtml(periodLabel)}</p>
      <p><strong>Objetivo:</strong> ${escapeHtml(purpose)}</p>
    </section>
    <section class="report-findings">
      <h2>Lectura ejecutiva</h2>
      <ul>${findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join('')}</ul>
    </section>
  `;
}

function compactJson(value: Record<string, unknown> | null) {
  if (!value) return '-';
  return Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`).join(' | ');
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    ticket_created: 'Ticket creado',
    ticket_updated: 'Ticket actualizado',
    ticket_comment_added: 'Comentario agregado',
  };
  return labels[action] || action.replace(/_/g, ' ');
}

export function ReportsPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<ReportData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [periodValue, setPeriodValue] = useState(() => toInputDate().slice(0, 7));

  const ticketColumns = useMemo<QuickReportColumn<Ticket>[]>(() => [
    { header: 'ID', value: (item) => item.id },
    { header: t('title'), value: (item) => item.title },
    { header: t('status'), value: (item) => t(statusLabelKeys[item.status]) },
    { header: t('priority'), value: (item) => item.priority ? t(priorityLabelKeys[item.priority]) : t('undefinedPriority') },
    { header: 'Área', value: (item) => item.location },
    { header: t('technician'), value: (item) => item.technician?.name || t('withoutAssignment') },
    { header: t('created'), value: (item) => new Date(item.createdAt).toLocaleDateString(locale) },
  ], [locale, t]);

  const statusColumns = useMemo<QuickReportColumn<DashboardStatusDatum>[]>(() => [
    { header: 'Estado', value: (item) => t(statusLabelKeys[item.status]) },
    { header: 'Cantidad', value: (item) => item.value },
  ], [t]);

  const monthColumns: QuickReportColumn<DashboardMonthDatum>[] = [
    { header: 'Periodo', value: (item) => item.label },
    { header: 'Cantidad', value: (item) => item.value },
  ];
  const categoryColumns: QuickReportColumn<DashboardCategoryDatum>[] = [
    { header: 'Categoría', value: (item) => item.category },
    { header: 'Tickets', value: (item) => item.value },
  ];
  const areaColumns: QuickReportColumn<DashboardAreaDatum>[] = [
    { header: 'Área institucional', value: (item) => item.area },
    { header: 'Tickets', value: (item) => item.value },
  ];
  const technicianColumns: QuickReportColumn<DashboardTechnicianMetric>[] = [
    { header: 'Técnico', value: (item) => item.technicianName },
    { header: 'Asignados', value: (item) => item.assignedTickets },
    { header: 'Finalizados', value: (item) => item.resolvedTickets },
    { header: 'Cumplimiento', value: (item) => item.assignedTickets ? `${Math.round((item.resolvedTickets / item.assignedTickets) * 100)}%` : '0%' },
    { header: 'Promedio de resolución', value: (item) => `${item.averageResolutionHours} h` },
  ];
  const priorityColumns: QuickReportColumn<{ priority: TicketPriority; value: number }>[] = [
    { header: 'Prioridad', value: (item) => priorityLabels[item.priority] },
    { header: 'Tickets', value: (item) => item.value },
  ];
  const assetColumns: QuickReportColumn<Asset>[] = [
    { header: 'Código', value: (item) => item.internalCode },
    { header: 'Equipo', value: (item) => `${item.brand} ${item.model}` },
    { header: 'Ubicación', value: (item) => item.location || '-' },
    { header: 'Observaciones', value: (item) => item.observations || '-' },
  ];
  const networkColumns: QuickReportColumn<NetworkPoint>[] = [
    { header: 'Punto', value: (item) => item.label },
    { header: 'Ubicación', value: (item) => item.location },
    { header: 'Patch panel', value: (item) => item.patchPanel || '-' },
    { header: 'Puerto', value: (item) => item.switchPort || '-' },
  ];
  const auditColumns: QuickReportColumn<AuditLog>[] = [
    { header: 'Fecha y hora', value: (item) => new Date(item.createdAt).toLocaleString(locale) },
    { header: 'Usuario', value: (item) => item.user?.name || '-' },
    { header: 'Acción', value: (item) => auditActionLabel(item.action) },
    { header: 'Registro', value: (item) => `${item.entity}${item.entityId ? ` #${item.entityId}` : ''}` },
    { header: 'IP', value: (item) => item.ipAddress || '-' },
    { header: 'Cambio', value: (item) => `${compactJson(item.oldData)} → ${compactJson(item.newData)}` },
  ];

  const loadReports = async () => {
    setIsLoading(true);
    setError('');
    const params = getReportRange(period, periodValue);
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
        auditResponse,
      ] = await Promise.all([
        dashboardApi.summary(params),
        dashboardApi.ticketsByStatus(params),
        dashboardApi.ticketsByMonth(params),
        dashboardApi.ticketsByCategory(params),
        dashboardApi.ticketsByArea(params),
        dashboardApi.ticketsByPriority(params),
        dashboardApi.technicianMetrics(params),
        dashboardApi.resolutionTrend(params),
        dashboardApi.recentTickets(params),
        dashboardApi.criticalTickets(params),
        dashboardApi.maintenanceAssets(),
        dashboardApi.inactiveNetworkPoints(),
        user?.role === 'admin'
          ? api.get('/audit', { params: { ...params, page: 1, limit: 500 } })
          : Promise.resolve({ data: { data: [] } }),
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
        auditLogs: auditResponse.data?.data || [],
      });
    } catch {
      setError('No se pudieron cargar los datos del periodo seleccionado.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handlePeriodChange = (next: ReportPeriod) => {
    setPeriod(next);
    if (next === 'day') setPeriodValue(toInputDate());
    if (next === 'month') setPeriodValue(toInputDate().slice(0, 7));
    if (next === 'year') setPeriodValue(String(new Date().getFullYear()));
  };

  const summary = data.summary;
  const periodLabel = getPeriodLabel(period, periodValue);
  const completionRate = summary?.totalTickets ? Math.round((summary.resolvedTickets / summary.totalTickets) * 100) : 0;
  const unassigned = summary ? Math.max(0, summary.pendingTickets - summary.assignedTickets) : 0;
  const topArea = [...data.ticketsByArea].sort((a, b) => b.value - a.value)[0];
  const topCategory = [...data.ticketsByCategory].sort((a, b) => b.value - a.value)[0];
  const priorityRows = (Object.keys(data.ticketsByPriority) as TicketPriority[]).map((priority) => ({
    priority,
    value: data.ticketsByPriority[priority],
  }));

  const generateOperationsReport = () => setPreview({
    title: 'Informe operativo de soporte técnico',
    body: `
      ${buildIntro(periodLabel, 'Evaluar la demanda recibida y el avance general del servicio de soporte.', [
        `Se registraron ${summary?.totalTickets || 0} tickets y se finalizó el ${completionRate}% del total.`,
        `${summary?.pendingTickets || 0} casos permanecen pendientes y ${summary?.inProgressTickets || 0} están en proceso.`,
        topCategory ? `La categoría con mayor demanda fue ${topCategory.category}, con ${topCategory.value} tickets.` : 'No se registraron categorías con demanda.',
        topArea ? `El área con más solicitudes fue ${topArea.area}, con ${topArea.value} tickets.` : 'No se registraron solicitudes por área.',
      ])}
      ${buildMetrics([
        ['Tickets registrados', summary?.totalTickets || 0],
        ['Pendientes', summary?.pendingTickets || 0],
        ['En proceso', summary?.inProgressTickets || 0],
        ['Finalizados', summary?.resolvedTickets || 0],
        ['Tasa de finalización', `${completionRate}%`],
        ['Sin técnico asignado', unassigned],
      ])}
      <h2>Distribución por estado</h2>${buildReportTable(data.ticketsByStatus, statusColumns)}
      <h2>Demanda por categoría</h2>${buildReportTable(data.ticketsByCategory, categoryColumns)}
      <h2>Demanda por área institucional</h2>${buildReportTable(data.ticketsByArea, areaColumns)}
      <h2>Tickets registrados en el periodo</h2>${buildReportTable(data.recentTickets, ticketColumns)}
    `,
  });

  const generatePerformanceReport = () => {
    const leader = [...data.technicianMetrics].sort((a, b) => b.resolvedTickets - a.resolvedTickets)[0];
    setPreview({
      title: 'Informe de desempeño técnico',
      body: `
        ${buildIntro(periodLabel, 'Analizar la carga de trabajo, resultados y tiempos de resolución del equipo técnico.', [
          `${data.technicianMetrics.length} técnicos presentan actividad registrada en el sistema.`,
          leader ? `${leader.technicianName} registra la mayor cantidad de casos finalizados: ${leader.resolvedTickets}.` : 'No hay actividad técnica para comparar.',
          `Durante el periodo se finalizaron ${summary?.resolvedTickets || 0} tickets.`,
        ])}
        ${buildMetrics([
          ['Técnicos evaluados', data.technicianMetrics.length],
          ['Tickets asignados', data.technicianMetrics.reduce((sum, item) => sum + item.assignedTickets, 0)],
          ['Tickets finalizados', data.technicianMetrics.reduce((sum, item) => sum + item.resolvedTickets, 0)],
          ['Finalización general', `${completionRate}%`],
        ])}
        <h2>Rendimiento por técnico</h2>${buildReportTable(data.technicianMetrics, technicianColumns)}
        <h2>Tendencia de finalización</h2>${buildReportTable(data.resolutionTrend, monthColumns)}
      `,
    });
  };

  const generateRiskReport = () => setPreview({
    title: 'Informe de riesgos y pendientes',
    body: `
      ${buildIntro(periodLabel, 'Identificar situaciones que requieren intervención administrativa o técnica prioritaria.', [
        `${summary?.criticalTickets || 0} tickets de prioridad alta o crítica requieren seguimiento.`,
        `${unassigned} tickets pendientes todavía no tienen técnico responsable.`,
        `${data.maintenanceAssets.length} activos están en mantenimiento y ${data.inactiveNetworkPoints.length} puntos de red presentan inactividad.`,
      ])}
      ${buildMetrics([
        ['Alta o crítica', summary?.criticalTickets || 0],
        ['Pendientes sin asignar', unassigned],
        ['Activos en mantenimiento', data.maintenanceAssets.length],
        ['Puntos de red inactivos', data.inactiveNetworkPoints.length],
      ])}
      <h2>Distribución por prioridad</h2>${buildReportTable(priorityRows, priorityColumns)}
      <h2>Tickets prioritarios pendientes</h2>${buildReportTable(data.criticalTickets, ticketColumns)}
      <h2>Activos en mantenimiento</h2>${buildReportTable(data.maintenanceAssets, assetColumns)}
      <h2>Puntos de red inactivos</h2>${buildReportTable(data.inactiveNetworkPoints, networkColumns)}
    `,
  });

  const generateTraceabilityReport = () => setPreview({
    title: 'Informe de trazabilidad y auditoría',
    body: `
      ${buildIntro(periodLabel, 'Documentar las acciones realizadas y los cambios registrados para control institucional.', [
        `Se encontraron ${data.auditLogs.length} acciones auditadas durante el periodo.`,
        'Cada registro identifica al usuario, fecha, dirección IP y valores modificados cuando corresponde.',
        'La información se presenta en orden cronológico descendente para facilitar revisiones.',
      ])}
      ${buildMetrics([
        ['Acciones auditadas', data.auditLogs.length],
        ['Usuarios participantes', new Set(data.auditLogs.map((item) => item.userId)).size],
        ['Tickets con actividad', new Set(data.auditLogs.filter((item) => item.entity === 'ticket').map((item) => item.entityId)).size],
      ])}
      <h2>Registro detallado de acciones</h2>${buildReportTable(data.auditLogs, auditColumns)}
    `,
  });

  const reports = [
    {
      title: 'Operación del soporte',
      description: 'Demanda, estados, áreas y categorías para explicar qué trabajo recibió el equipo y cómo avanzó.',
      detail: 'Ayuda a evaluar volumen y situación general.',
      icon: Activity,
      tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      action: generateOperationsReport,
    },
    {
      title: 'Desempeño técnico',
      description: 'Carga asignada, tickets finalizados y tiempo promedio de resolución por técnico.',
      detail: 'Ayuda a comparar capacidad y resultados.',
      icon: Users,
      tone: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
      action: generatePerformanceReport,
    },
    {
      title: 'Riesgos y pendientes',
      description: 'Casos críticos, tickets sin asignar, equipos en mantenimiento y red inactiva.',
      detail: 'Ayuda a priorizar acciones inmediatas.',
      icon: ShieldAlert,
      tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      action: generateRiskReport,
    },
    {
      title: 'Trazabilidad y auditoría',
      description: 'Registro real de acciones, usuarios, fechas, IP y valores modificados.',
      detail: 'Ayuda a demostrar control y responsabilidad.',
      icon: ScrollText,
      tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      action: generateTraceabilityReport,
    },
  ].filter((report) => report.title !== 'Trazabilidad y auditoría' || user?.role === 'admin');

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">Información institucional</p>
          <h1 className="mt-1 text-2xl font-bold">{t('reports')}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Informes orientados a decisiones, seguimiento del soporte y rendición de cuentas.
          </p>
        </div>
        <button type="button" onClick={loadReports} className="btn-secondary gap-2" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de periodo</label>
            <select value={period} onChange={(event) => handlePeriodChange(event.target.value as ReportPeriod)} className="input w-40">
              <option value="day">Día</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Periodo analizado</label>
            {period === 'day' && <input type="date" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="input w-44" />}
            {period === 'month' && <input type="month" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="input w-44" />}
            {period === 'year' && <input type="number" min="2000" max="2100" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="input w-32" />}
          </div>
          <button type="button" onClick={loadReports} className="btn-primary gap-2" disabled={isLoading || !periodValue}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Analizar periodo
          </button>
          <p className="pb-2 text-sm font-medium capitalize text-slate-500">{periodLabel}</p>
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Seleccione el informe que necesita</h2>
        <p className="mt-1 text-sm text-slate-500">Cada informe responde a una necesidad distinta de gestión.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reports.map((report) => (
            <article key={report.title} className="card flex min-h-72 flex-col p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${report.tone}`}>
                <report.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-primary-900 dark:text-white">{report.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{report.description}</p>
              <p className="mt-3 border-l-2 border-brand-500 pl-3 text-xs leading-5 text-slate-500">{report.detail}</p>
              <button type="button" onClick={report.action} disabled={isLoading} className="btn-primary mt-auto gap-2">
                <FileText className="h-4 w-4" />
                Generar informe
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">Resumen del periodo</h2>
        <p className="mt-1 text-sm text-slate-500">Indicadores clave antes de generar un informe.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Tickets registrados', summary?.totalTickets || 0],
            ['Tasa de finalización', `${completionRate}%`],
            ['Alta o crítica', summary?.criticalTickets || 0],
            ['Pendientes sin asignar', unassigned],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{value}</p>
              <p className="mt-1 break-words text-sm leading-5 text-slate-600 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {preview && (
        <ReportPreview
          title={preview.title}
          body={preview.body}
          generatedBy={user ? `${user.name} (${user.email})` : undefined}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function ReportPreview({
  title,
  body,
  generatedBy,
  onClose,
}: {
  title: string;
  body: string;
  generatedBy?: string;
  onClose: () => void;
}) {
  const downloadReport = () => {
    const blob = new Blob([buildPrintableReportDocument(title, body, generatedBy)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
        <div className="flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Vista previa</p>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadReport} className="btn-secondary gap-2">
              <Download className="h-4 w-4" />
              Descargar reporte
            </button>
            <button type="button" onClick={() => openPrintableReport(title, body, generatedBy)} className="btn-primary gap-2">
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
            <button type="button" onClick={onClose} className="btn-secondary p-2" title="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white p-[18mm] text-slate-900 shadow-2xl">
          <ReportPreviewStyles />
          <div className="border-t-[6px] border-brand-600 pt-6">
            <div dangerouslySetInnerHTML={{ __html: buildReportHeader(title, undefined, generatedBy) }} />
            <div className="report-preview-content" dangerouslySetInnerHTML={{ __html: body }} />
          </div>
        </div>
      </div>
    </div>
  );
}
