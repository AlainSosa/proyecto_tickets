import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ClipboardCheck, Download, FileText, Presentation, Printer, RefreshCw, X } from 'lucide-react';
import { dashboardApi } from '../../services/dashboardApi';
import {
  Asset,
  DashboardCategoryDatum,
  DashboardMonthDatum,
  DashboardStatusDatum,
  DashboardSummary,
  NetworkPoint,
  Ticket,
} from '../../types';
import {
  buildReportTable,
  buildPrintableReportDocument,
  openPrintableReport,
  QuickReportColumn,
  ReportPreviewStyles,
} from '../../components/ui/QuickReportButton';
import { useLanguage } from '../../context/LanguageContext';

interface ReportData {
  summary: DashboardSummary | null;
  ticketsByStatus: DashboardStatusDatum[];
  ticketsByMonth: DashboardMonthDatum[];
  ticketsByCategory: DashboardCategoryDatum[];
  recentTickets: Ticket[];
  criticalTickets: Ticket[];
  maintenanceAssets: Asset[];
  inactiveNetworkPoints: NetworkPoint[];
}

const emptyData: ReportData = {
  summary: null,
  ticketsByStatus: [],
  ticketsByMonth: [],
  ticketsByCategory: [],
  recentTickets: [],
  criticalTickets: [],
  maintenanceAssets: [],
  inactiveNetworkPoints: [],
};

const statusLabelKeys = {
  open: 'open',
  pending_assignment: 'pendingAssignment',
  assigned: 'assignedStatus',
  pending: 'pending',
  in_progress: 'inProgress',
  on_hold: 'onHold',
  resolved: 'resolved',
  closed: 'closed',
  canceled: 'canceled',
} as const;

const priorityLabelKeys = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;

export function ReportsPage() {
  const { t, locale } = useLanguage();
  const [data, setData] = useState<ReportData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);

  const ticketColumns = useMemo<QuickReportColumn<Ticket>[]>(
    () => [
      { header: 'ID', value: (ticket) => ticket.id },
      { header: t('title'), value: (ticket) => ticket.title },
      { header: t('status'), value: (ticket) => t(statusLabelKeys[ticket.status]) },
      { header: t('priority'), value: (ticket) => ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority') },
      { header: t('requester'), value: (ticket) => ticket.requester?.name || '-' },
      { header: t('technician'), value: (ticket) => ticket.technician?.name || t('withoutAssignment') },
      { header: t('created'), value: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
    ],
    [locale, t],
  );

  const assetColumns = useMemo<QuickReportColumn<Asset>[]>(
    () => [
      { header: t('code'), value: (asset) => asset.internalCode },
      { header: t('type'), value: (asset) => asset.type },
      { header: t('brand'), value: (asset) => asset.brand },
      { header: t('model'), value: (asset) => asset.model },
      { header: t('serial'), value: (asset) => asset.serialNumber },
      { header: t('location'), value: (asset) => asset.location || '-' },
    ],
    [t],
  );

  const networkColumns = useMemo<QuickReportColumn<NetworkPoint>[]>(
    () => [
      { header: t('label'), value: (point) => point.label },
      { header: t('location'), value: (point) => point.location },
      { header: t('patchPanel'), value: (point) => point.patchPanel || '-' },
      { header: 'Switch', value: (point) => point.switch?.internalCode || '-' },
      { header: t('switchPort'), value: (point) => point.switchPort || '-' },
      { header: t('status'), value: (point) => point.status },
    ],
    [t],
  );

  const statusColumns = useMemo<QuickReportColumn<DashboardStatusDatum>[]>(
    () => [
      { header: t('status'), value: (item) => t(statusLabelKeys[item.status]) },
      { header: t('total'), value: (item) => item.value },
    ],
    [t],
  );

  const monthColumns = useMemo<QuickReportColumn<DashboardMonthDatum>[]>(
    () => [
      { header: 'Mes', value: (item) => item.label },
      { header: t('tickets'), value: (item) => item.value },
    ],
    [t],
  );

  const categoryColumns = useMemo<QuickReportColumn<DashboardCategoryDatum>[]>(
    () => [
      { header: 'Categoría', value: (item) => item.category },
      { header: t('total'), value: (item) => item.value },
    ],
    [t],
  );

  const loadReports = async () => {
    setIsLoading(true);
    setError('');
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
      setError('No se pudieron cargar los datos de reportes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const summaryMetrics = data.summary
    ? [
        ['Tickets abiertos', data.summary.openTickets],
        ['Tickets en proceso', data.summary.inProgressTickets],
        ['Tickets críticos', data.summary.criticalTickets],
        ['Resueltos este mes', data.summary.resolvedThisMonth],
        ['Activos informáticos', data.summary.totalAssets],
        ['Activos en mantenimiento', data.summary.assetsInMaintenance],
        ['Puntos de red', data.summary.totalNetworkPoints],
        ['Puntos inactivos', data.summary.inactiveNetworkPoints],
      ]
    : [];

  const summaryHtml = summaryMetrics.length
    ? `<section class="summary">${summaryMetrics
        .map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`)
        .join('')}</section>`
    : '<p class="empty">No hay KPIs disponibles.</p>';

  const generateManagementReport = () => {
    setPreview({
      title: 'Reporte de gestión de soporte técnico',
      body: `
        <p>Resumen operativo para seguimiento de tickets, activos informáticos y puntos de red.</p>
        ${summaryHtml}
        <h2>Tickets por estado</h2>
        ${buildReportTable(data.ticketsByStatus, statusColumns)}
        <h2>Tickets por mes</h2>
        ${buildReportTable(data.ticketsByMonth, monthColumns)}
        <h2>Últimos tickets creados</h2>
        ${buildReportTable(data.recentTickets, ticketColumns)}
      `,
    });
  };

  const generateAuditReport = () => {
    setPreview({
      title: 'Reporte formal de auditoría',
      body: `
        <p>Informe orientado a revisión de pendientes críticos, activos en mantenimiento e infraestructura inactiva.</p>
        ${summaryHtml}
        <h2>Tickets críticos pendientes</h2>
        ${buildReportTable(data.criticalTickets, ticketColumns)}
        <h2>Activos en mantenimiento</h2>
        ${buildReportTable(data.maintenanceAssets, assetColumns)}
        <h2>Puntos de red inactivos</h2>
        ${buildReportTable(data.inactiveNetworkPoints, networkColumns)}
      `,
    });
  };

  const generatePresentationReport = () => {
    setPreview({
      title: 'Reporte ejecutivo para presentación',
      body: `
        <p>Vista ejecutiva para presentación de indicadores, volumen mensual e incidencias por categoría.</p>
        ${summaryHtml}
        <h2>Incidencias por categoría</h2>
        ${buildReportTable(data.ticketsByCategory, categoryColumns)}
        <h2>Evolución mensual de tickets</h2>
        ${buildReportTable(data.ticketsByMonth, monthColumns)}
        <h2>Casos críticos para seguimiento</h2>
        ${buildReportTable(data.criticalTickets, ticketColumns)}
      `,
    });
  };

  const reports = [
    {
      title: 'Reporte de gestión',
      description: 'Indicadores generales, evolución mensual y últimos tickets para seguimiento operativo.',
      icon: BarChart3,
      action: generateManagementReport,
    },
    {
      title: 'Reporte de auditoría',
      description: 'Pendientes críticos, activos en mantenimiento y puntos de red inactivos.',
      icon: ClipboardCheck,
      action: generateAuditReport,
    },
    {
      title: 'Reporte para presentación',
      description: 'Resumen ejecutivo listo para imprimir o guardar como PDF.',
      icon: Presentation,
      action: generatePresentationReport,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('reports')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Reportes formales para gestión, auditoría y presentación.
          </p>
        </div>
        <button type="button" onClick={loadReports} className="btn-secondary gap-2" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <div key={report.title} className="card p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <report.icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{report.title}</h2>
            <p className="mt-2 min-h-[60px] text-sm leading-6 text-slate-600 dark:text-slate-400">
              {report.description}
            </p>
            <button type="button" onClick={report.action} disabled={isLoading} className="btn-primary mt-5 w-full gap-2">
              <FileText className="h-4 w-4" />
              Generar reporte
            </button>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vista previa de indicadores</h2>
        {isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryMetrics.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{value}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <ReportPreview
          title={preview.title}
          body={preview.body}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

function ReportPreview({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  const downloadReport = () => {
    const html = buildPrintableReportDocument(title, body);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
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
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Vista previa A4</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadReport} className="btn-secondary gap-2">
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
            <button type="button" onClick={() => openPrintableReport(title, body)} className="btn-primary gap-2">
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button type="button" onClick={onClose} className="btn-secondary p-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white p-[18mm] text-slate-900 shadow-2xl">
          <ReportPreviewStyles />
          <div className="border-t-[6px] border-brand-600 pt-6">
            <header className="mb-7 flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-[26px] font-bold text-primary-700">{title}</h1>
                <p className="mt-2 text-sm text-slate-600">Soporte Técnico - Embaixada do Brasil</p>
              </div>
              <p className="text-right text-xs text-slate-500">
                Generado el<br />
                {new Date().toLocaleString()}
              </p>
            </header>
            <div
              className="report-preview-content"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
