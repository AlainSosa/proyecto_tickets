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
import { Language, useLanguage } from '../../context/LanguageContext';
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

function getPeriodLabel(period: ReportPeriod, value: string, locale: string, language: Language) {
  if (period === 'day') return new Date(`${value}T00:00:00`).toLocaleDateString(locale, { dateStyle: 'long' });
  if (period === 'month') {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  return language === 'pt' ? `Ano ${value}` : `Año ${value}`;
}

function buildMetrics(metrics: Array<[string, number | string]>) {
  return `<section class="summary">${metrics
    .map(([label, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`)
    .join('')}</section>`;
}

function buildIntro(periodLabel: string, purpose: string, findings: string[], language: Language) {
  const labels = language === 'pt'
    ? { period: 'Período analisado', purpose: 'Objetivo', reading: 'Leitura executiva' }
    : { period: 'Periodo analizado', purpose: 'Objetivo', reading: 'Lectura ejecutiva' };

  return `
    <section class="report-context">
      <p><strong>${labels.period}:</strong> ${escapeHtml(periodLabel)}</p>
      <p><strong>${labels.purpose}:</strong> ${escapeHtml(purpose)}</p>
    </section>
    <section class="report-findings">
      <h2>${labels.reading}</h2>
      <ul>${findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join('')}</ul>
    </section>
  `;
}

function compactJson(value: Record<string, unknown> | null) {
  if (!value) return '-';
  return Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`).join(' | ');
}

function auditActionLabel(action: string, language: Language) {
  const labels: Record<string, string> = language === 'pt'
    ? {
      ticket_created: 'Ticket criado',
      ticket_updated: 'Ticket atualizado',
      ticket_comment_added: 'Comentário adicionado',
    }
    : {
      ticket_created: 'Ticket creado',
      ticket_updated: 'Ticket actualizado',
      ticket_comment_added: 'Comentario agregado',
    };
  return labels[action] || action.replace(/_/g, ' ');
}

export function ReportsPage() {
  const { t, locale, language } = useLanguage();
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

  const text = useMemo(() => language === 'pt' ? {
    institutionalInfo: 'Informação institucional',
    reportsIntro: 'Relatórios orientados a decisões, acompanhamento do suporte e prestação de contas.',
    periodType: 'Tipo de período',
    analyzedPeriod: 'Período analisado',
    day: 'Dia',
    month: 'Mês',
    year: 'Ano',
    analyzePeriod: 'Analisar período',
    loadError: 'Não foi possível carregar os dados do período selecionado.',
    selectReport: 'Selecione o relatório necessário',
    selectReportHelp: 'Cada relatório responde a uma necessidade diferente de gestão.',
    generateReport: 'Gerar relatório',
    periodSummary: 'Resumo do período',
    periodSummaryHelp: 'Indicadores principais antes de gerar um relatório.',
    quantity: 'Quantidade',
    period: 'Período',
    category: 'Categoria',
    institutionalArea: 'Área institucional',
    compliance: 'Cumprimento',
    resolutionAverage: 'Média de resolução',
    code: 'Código',
    equipment: 'Equipamento',
    register: 'Registro',
    change: 'Alteração',
    operationalReport: 'Relatório operacional de suporte técnico',
    performanceReport: 'Relatório de desempenho técnico',
    riskReport: 'Relatório de riscos e pendências',
    traceabilityReport: 'Relatório de rastreabilidade e auditoria',
    operationTitle: 'Operação do suporte',
    operationDescription: 'Demanda, estados, áreas e categorias para explicar que trabalho a equipe recebeu e como avançou.',
    operationDetail: 'Ajuda a avaliar volume e situação geral.',
    performanceTitle: 'Desempenho técnico',
    performanceDescription: 'Carga atribuída, tickets finalizados e tempo médio de resolução por técnico.',
    performanceDetail: 'Ajuda a comparar capacidade e resultados.',
    riskTitle: 'Riscos e pendências',
    riskDescription: 'Casos críticos, tickets sem atribuição, equipamentos em manutenção e rede inativa.',
    riskDetail: 'Ajuda a priorizar ações imediatas.',
    traceabilityTitle: 'Rastreabilidade e auditoria',
    traceabilityDescription: 'Registro real de ações, usuários, datas, IP e valores modificados.',
    traceabilityDetail: 'Ajuda a demonstrar controle e responsabilidade.',
    registeredTickets: 'Tickets registrados',
    completionRate: 'Taxa de finalização',
    highOrCritical: 'Alta ou crítica',
    unassignedPending: 'Pendentes sem atribuição',
    noTechnicalActivity: 'Não há atividade técnica para comparar.',
  } : {
    institutionalInfo: 'Información institucional',
    reportsIntro: 'Informes orientados a decisiones, seguimiento del soporte y rendición de cuentas.',
    periodType: 'Tipo de periodo',
    analyzedPeriod: 'Periodo analizado',
    day: 'Día',
    month: 'Mes',
    year: 'Año',
    analyzePeriod: 'Analizar periodo',
    loadError: 'No se pudieron cargar los datos del periodo seleccionado.',
    selectReport: 'Seleccione el informe que necesita',
    selectReportHelp: 'Cada informe responde a una necesidad distinta de gestión.',
    generateReport: 'Generar informe',
    periodSummary: 'Resumen del periodo',
    periodSummaryHelp: 'Indicadores clave antes de generar un informe.',
    quantity: 'Cantidad',
    period: 'Periodo',
    category: 'Categoría',
    institutionalArea: 'Área institucional',
    compliance: 'Cumplimiento',
    resolutionAverage: 'Promedio de resolución',
    code: 'Código',
    equipment: 'Equipo',
    register: 'Registro',
    change: 'Cambio',
    operationalReport: 'Informe operativo de soporte técnico',
    performanceReport: 'Informe de desempeño técnico',
    riskReport: 'Informe de riesgos y pendientes',
    traceabilityReport: 'Informe de trazabilidad y auditoría',
    operationTitle: 'Operación del soporte',
    operationDescription: 'Demanda, estados, áreas y categorías para explicar qué trabajo recibió el equipo y cómo avanzó.',
    operationDetail: 'Ayuda a evaluar volumen y situación general.',
    performanceTitle: 'Desempeño técnico',
    performanceDescription: 'Carga asignada, tickets finalizados y tiempo promedio de resolución por técnico.',
    performanceDetail: 'Ayuda a comparar capacidad y resultados.',
    riskTitle: 'Riesgos y pendientes',
    riskDescription: 'Casos críticos, tickets sin asignar, equipos en mantenimiento y red inactiva.',
    riskDetail: 'Ayuda a priorizar acciones inmediatas.',
    traceabilityTitle: 'Trazabilidad y auditoría',
    traceabilityDescription: 'Registro real de acciones, usuarios, fechas, IP y valores modificados.',
    traceabilityDetail: 'Ayuda a demostrar control y responsabilidad.',
    registeredTickets: 'Tickets registrados',
    completionRate: 'Tasa de finalización',
    highOrCritical: 'Alta o crítica',
    unassignedPending: 'Pendientes sin asignar',
    noTechnicalActivity: 'No hay actividad técnica para comparar.',
  }, [language]);

  const reportOptions = useMemo(() => ({
    emptyMessage: t('noReportData'),
    systemName: t('reportSystemName'),
    generatedAtLabel: language === 'pt' ? 'Gerado em' : 'Generado el',
    generatedByLabel: t('generatedBy'),
    printSavePdfLabel: t('printSavePdf'),
    lang: language === 'pt' ? 'pt-BR' : 'es',
  }), [language, t]);

  const statusColumns = useMemo<QuickReportColumn<DashboardStatusDatum>[]>(() => [
    { header: t('status'), value: (item) => t(statusLabelKeys[item.status]) },
    { header: text.quantity, value: (item) => item.value },
  ], [t, text.quantity]);

  const monthColumns: QuickReportColumn<DashboardMonthDatum>[] = [
    { header: text.period, value: (item) => item.label },
    { header: text.quantity, value: (item) => item.value },
  ];
  const categoryColumns: QuickReportColumn<DashboardCategoryDatum>[] = [
    { header: text.category, value: (item) => item.category },
    { header: 'Tickets', value: (item) => item.value },
  ];
  const areaColumns: QuickReportColumn<DashboardAreaDatum>[] = [
    { header: text.institutionalArea, value: (item) => item.area },
    { header: 'Tickets', value: (item) => item.value },
  ];
  const technicianColumns: QuickReportColumn<DashboardTechnicianMetric>[] = [
    { header: t('technician'), value: (item) => item.technicianName },
    { header: t('assigned'), value: (item) => item.assignedTickets },
    { header: t('finalized'), value: (item) => item.resolvedTickets },
    { header: text.compliance, value: (item) => item.assignedTickets ? `${Math.round((item.resolvedTickets / item.assignedTickets) * 100)}%` : '0%' },
    { header: text.resolutionAverage, value: (item) => `${item.averageResolutionHours} h` },
  ];
  const priorityColumns: QuickReportColumn<{ priority: TicketPriority; value: number }>[] = [
    { header: t('priority'), value: (item) => t(priorityLabelKeys[item.priority]) },
    { header: 'Tickets', value: (item) => item.value },
  ];
  const assetColumns: QuickReportColumn<Asset>[] = [
    { header: text.code, value: (item) => item.internalCode },
    { header: text.equipment, value: (item) => `${item.brand} ${item.model}` },
    { header: t('location'), value: (item) => item.location || '-' },
    { header: t('observations'), value: (item) => item.observations || '-' },
  ];
  const networkColumns: QuickReportColumn<NetworkPoint>[] = [
    { header: t('label'), value: (item) => item.label },
    { header: t('location'), value: (item) => item.location },
    { header: 'Patch panel', value: (item) => item.patchPanel || '-' },
    { header: t('switchPort'), value: (item) => item.switchPort || '-' },
  ];
  const auditColumns: QuickReportColumn<AuditLog>[] = [
    { header: t('date'), value: (item) => new Date(item.createdAt).toLocaleString(locale) },
    { header: t('user'), value: (item) => item.user?.name || '-' },
    { header: t('action'), value: (item) => auditActionLabel(item.action, language) },
    { header: text.register, value: (item) => `${item.entity}${item.entityId ? ` #${item.entityId}` : ''}` },
    { header: 'IP', value: (item) => item.ipAddress || '-' },
    { header: text.change, value: (item) => `${compactJson(item.oldData)} -> ${compactJson(item.newData)}` },
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
      setError(text.loadError);
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
  const periodLabel = getPeriodLabel(period, periodValue, locale, language);
  const completionRate = summary?.totalTickets ? Math.round((summary.resolvedTickets / summary.totalTickets) * 100) : 0;
  const unassigned = summary ? Math.max(0, summary.pendingTickets - summary.assignedTickets) : 0;
  const topArea = [...data.ticketsByArea].sort((a, b) => b.value - a.value)[0];
  const topCategory = [...data.ticketsByCategory].sort((a, b) => b.value - a.value)[0];
  const priorityRows = (Object.keys(data.ticketsByPriority) as TicketPriority[]).map((priority) => ({
    priority,
    value: data.ticketsByPriority[priority],
  }));

  const generateOperationsReport = () => setPreview({
    title: text.operationalReport,
    body: `
      ${buildIntro(periodLabel, language === 'pt' ? 'Avaliar a demanda recebida e o avanço geral do serviço de suporte.' : 'Evaluar la demanda recibida y el avance general del servicio de soporte.', [
        language === 'pt' ? `Foram registrados ${summary?.totalTickets || 0} tickets e ${completionRate}% do total foi finalizado.` : `Se registraron ${summary?.totalTickets || 0} tickets y se finalizó el ${completionRate}% del total.`,
        language === 'pt' ? `${summary?.pendingTickets || 0} casos permanecem pendentes e ${summary?.inProgressTickets || 0} estão em processo.` : `${summary?.pendingTickets || 0} casos permanecen pendientes y ${summary?.inProgressTickets || 0} están en proceso.`,
        topCategory ? (language === 'pt' ? `A categoria com maior demanda foi ${topCategory.category}, com ${topCategory.value} tickets.` : `La categoría con mayor demanda fue ${topCategory.category}, con ${topCategory.value} tickets.`) : (language === 'pt' ? 'Não foram registradas categorias com demanda.' : 'No se registraron categorías con demanda.'),
        topArea ? (language === 'pt' ? `A área com mais solicitações foi ${topArea.area}, com ${topArea.value} tickets.` : `El área con más solicitudes fue ${topArea.area}, con ${topArea.value} tickets.`) : (language === 'pt' ? 'Não foram registradas solicitações por área.' : 'No se registraron solicitudes por área.'),
      ], language)}
      ${buildMetrics([
        [text.registeredTickets, summary?.totalTickets || 0],
        [t('pending'), summary?.pendingTickets || 0],
        [t('inProgress'), summary?.inProgressTickets || 0],
        [t('finalized'), summary?.resolvedTickets || 0],
        [text.completionRate, `${completionRate}%`],
        [t('withoutAssignment'), unassigned],
      ])}
      <h2>${language === 'pt' ? 'Distribuição por estado' : 'Distribución por estado'}</h2>${buildReportTable(data.ticketsByStatus, statusColumns, reportOptions)}
      <h2>${language === 'pt' ? 'Demanda por categoria' : 'Demanda por categoría'}</h2>${buildReportTable(data.ticketsByCategory, categoryColumns, reportOptions)}
      <h2>${language === 'pt' ? 'Demanda por área institucional' : 'Demanda por área institucional'}</h2>${buildReportTable(data.ticketsByArea, areaColumns, reportOptions)}
      <h2>${language === 'pt' ? 'Tickets registrados no período' : 'Tickets registrados en el periodo'}</h2>${buildReportTable(data.recentTickets, ticketColumns, reportOptions)}
    `,
  });

  const generatePerformanceReport = () => {
    const leader = [...data.technicianMetrics].sort((a, b) => b.resolvedTickets - a.resolvedTickets)[0];
    setPreview({
      title: text.performanceReport,
      body: `
        ${buildIntro(periodLabel, language === 'pt' ? 'Analisar a carga de trabalho, resultados e tempos de resolução da equipe técnica.' : 'Analizar la carga de trabajo, resultados y tiempos de resolución del equipo técnico.', [
          language === 'pt' ? `${data.technicianMetrics.length} técnicos apresentam atividade registrada no sistema.` : `${data.technicianMetrics.length} técnicos presentan actividad registrada en el sistema.`,
          leader ? (language === 'pt' ? `${leader.technicianName} registra a maior quantidade de casos finalizados: ${leader.resolvedTickets}.` : `${leader.technicianName} registra la mayor cantidad de casos finalizados: ${leader.resolvedTickets}.`) : text.noTechnicalActivity,
          language === 'pt' ? `Durante o período foram finalizados ${summary?.resolvedTickets || 0} tickets.` : `Durante el periodo se finalizaron ${summary?.resolvedTickets || 0} tickets.`,
        ], language)}
        ${buildMetrics([
          [language === 'pt' ? 'Técnicos avaliados' : 'Técnicos evaluados', data.technicianMetrics.length],
          [language === 'pt' ? 'Tickets atribuídos' : 'Tickets asignados', data.technicianMetrics.reduce((sum, item) => sum + item.assignedTickets, 0)],
          [language === 'pt' ? 'Tickets finalizados' : 'Tickets finalizados', data.technicianMetrics.reduce((sum, item) => sum + item.resolvedTickets, 0)],
          [language === 'pt' ? 'Finalização geral' : 'Finalización general', `${completionRate}%`],
        ])}
        <h2>${language === 'pt' ? 'Desempenho por técnico' : 'Rendimiento por técnico'}</h2>${buildReportTable(data.technicianMetrics, technicianColumns, reportOptions)}
        <h2>${language === 'pt' ? 'Tendência de finalização' : 'Tendencia de finalización'}</h2>${buildReportTable(data.resolutionTrend, monthColumns, reportOptions)}
      `,
    });
  };

  const generateRiskReport = () => setPreview({
    title: text.riskReport,
    body: `
      ${buildIntro(periodLabel, language === 'pt' ? 'Identificar situações que requerem intervenção administrativa ou técnica prioritária.' : 'Identificar situaciones que requieren intervención administrativa o técnica prioritaria.', [
        language === 'pt' ? `${summary?.criticalTickets || 0} tickets de prioridade alta ou crítica requerem acompanhamento.` : `${summary?.criticalTickets || 0} tickets de prioridad alta o crítica requieren seguimiento.`,
        language === 'pt' ? `${unassigned} tickets pendentes ainda não têm técnico responsável.` : `${unassigned} tickets pendientes todavía no tienen técnico responsable.`,
        language === 'pt' ? `${data.maintenanceAssets.length} ativos estão em manutenção e ${data.inactiveNetworkPoints.length} pontos de rede apresentam inatividade.` : `${data.maintenanceAssets.length} activos están en mantenimiento y ${data.inactiveNetworkPoints.length} puntos de red presentan inactividad.`,
      ], language)}
      ${buildMetrics([
        [text.highOrCritical, summary?.criticalTickets || 0],
        [text.unassignedPending, unassigned],
        [language === 'pt' ? 'Ativos em manutenção' : 'Activos en mantenimiento', data.maintenanceAssets.length],
        [language === 'pt' ? 'Pontos de rede inativos' : 'Puntos de red inactivos', data.inactiveNetworkPoints.length],
      ])}
      <h2>${language === 'pt' ? 'Distribuição por prioridade' : 'Distribución por prioridad'}</h2>${buildReportTable(priorityRows, priorityColumns, reportOptions)}
      <h2>${language === 'pt' ? 'Tickets prioritários pendentes' : 'Tickets prioritarios pendientes'}</h2>${buildReportTable(data.criticalTickets, ticketColumns, reportOptions)}
      <h2>${language === 'pt' ? 'Ativos em manutenção' : 'Activos en mantenimiento'}</h2>${buildReportTable(data.maintenanceAssets, assetColumns, reportOptions)}
      <h2>${language === 'pt' ? 'Pontos de rede inativos' : 'Puntos de red inactivos'}</h2>${buildReportTable(data.inactiveNetworkPoints, networkColumns, reportOptions)}
    `,
  });

  const generateTraceabilityReport = () => setPreview({
    title: text.traceabilityReport,
    body: `
      ${buildIntro(periodLabel, language === 'pt' ? 'Documentar as ações realizadas e as alterações registradas para controle institucional.' : 'Documentar las acciones realizadas y los cambios registrados para control institucional.', [
        language === 'pt' ? `Foram encontradas ${data.auditLogs.length} ações auditadas durante o período.` : `Se encontraron ${data.auditLogs.length} acciones auditadas durante el periodo.`,
        language === 'pt' ? 'Cada registro identifica usuário, data, endereço IP e valores modificados quando corresponde.' : 'Cada registro identifica al usuario, fecha, dirección IP y valores modificados cuando corresponde.',
        language === 'pt' ? 'A informação é apresentada em ordem cronológica descendente para facilitar revisões.' : 'La información se presenta en orden cronológico descendente para facilitar revisiones.',
      ], language)}
      ${buildMetrics([
        [language === 'pt' ? 'Ações auditadas' : 'Acciones auditadas', data.auditLogs.length],
        [language === 'pt' ? 'Usuários participantes' : 'Usuarios participantes', new Set(data.auditLogs.map((item) => item.userId)).size],
        [language === 'pt' ? 'Tickets com atividade' : 'Tickets con actividad', new Set(data.auditLogs.filter((item) => item.entity === 'ticket').map((item) => item.entityId)).size],
      ])}
      <h2>${language === 'pt' ? 'Registro detalhado de ações' : 'Registro detallado de acciones'}</h2>${buildReportTable(data.auditLogs, auditColumns, reportOptions)}
    `,
  });

  const reports = [
    {
      title: text.operationTitle,
      description: text.operationDescription,
      detail: text.operationDetail,
      icon: Activity,
      tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      action: generateOperationsReport,
    },
    {
      title: text.performanceTitle,
      description: text.performanceDescription,
      detail: text.performanceDetail,
      icon: Users,
      tone: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
      action: generatePerformanceReport,
    },
    {
      title: text.riskTitle,
      description: text.riskDescription,
      detail: text.riskDetail,
      icon: ShieldAlert,
      tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      action: generateRiskReport,
    },
    {
      title: text.traceabilityTitle,
      description: text.traceabilityDescription,
      detail: text.traceabilityDetail,
      icon: ScrollText,
      tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      action: generateTraceabilityReport,
    },
  ].filter((report) => report.title !== text.traceabilityTitle || user?.role === 'admin');

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">{text.institutionalInfo}</p>
          <h1 className="mt-1 text-2xl font-bold">{t('reports')}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            {text.reportsIntro}
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
            <label className="mb-1 block text-sm font-medium">{text.periodType}</label>
            <select value={period} onChange={(event) => handlePeriodChange(event.target.value as ReportPeriod)} className="input w-40">
              <option value="day">{text.day}</option>
              <option value="month">{text.month}</option>
              <option value="year">{text.year}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.analyzedPeriod}</label>
            {period === 'day' && <input type="date" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="input w-44" />}
            {period === 'month' && <input type="month" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="input w-44" />}
            {period === 'year' && <input type="number" min="2000" max="2100" value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} className="input w-32" />}
          </div>
          <button type="button" onClick={loadReports} className="btn-primary gap-2" disabled={isLoading || !periodValue}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {text.analyzePeriod}
          </button>
          <p className="pb-2 text-sm font-medium capitalize text-slate-500">{periodLabel}</p>
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section>
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.selectReport}</h2>
        <p className="mt-1 text-sm text-slate-500">{text.selectReportHelp}</p>
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
                {text.generateReport}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-primary-900 dark:text-white">{text.periodSummary}</h2>
        <p className="mt-1 text-sm text-slate-500">{text.periodSummaryHelp}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [text.registeredTickets, summary?.totalTickets || 0],
            [text.completionRate, `${completionRate}%`],
            [text.highOrCritical, summary?.criticalTickets || 0],
            [text.unassignedPending, unassigned],
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
          reportOptions={reportOptions}
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
  reportOptions,
  generatedBy,
  onClose,
}: {
  title: string;
  body: string;
  reportOptions: Parameters<typeof buildPrintableReportDocument>[3];
  generatedBy?: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  const downloadReport = () => {
    const blob = new Blob([buildPrintableReportDocument(title, body, generatedBy, reportOptions)], { type: 'text/html;charset=utf-8' });
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
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('preview')}</p>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadReport} className="btn-secondary gap-2">
              <Download className="h-4 w-4" />
              {t('downloadReport')}
            </button>
            <button type="button" onClick={() => openPrintableReport(title, body, generatedBy, reportOptions)} className="btn-primary gap-2">
              <Printer className="h-4 w-4" />
              {t('printPdf')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary p-2" title={t('close')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white p-[18mm] text-slate-900 shadow-2xl">
          <ReportPreviewStyles />
          <div className="border-t-[6px] border-brand-600 pt-6">
            <div dangerouslySetInnerHTML={{ __html: buildReportHeader(title, undefined, generatedBy, reportOptions) }} />
            <div className="report-preview-content" dangerouslySetInnerHTML={{ __html: body }} />
          </div>
        </div>
      </div>
    </div>
  );
}
