import { Op } from 'sequelize';
import { Asset, Ticket, User } from '../database/models';
import { INSTITUTIONAL_AREAS } from '../constants/institutionalAreas';

type RiskLevel = 'low' | 'medium' | 'high';

interface DateRange {
  dateFrom?: Date;
  dateTo?: Date;
}

interface PredictiveAnalysisResult {
  period: {
    dateFrom: Date;
    dateTo: Date;
    days: number;
  };
  thresholds: {
    mediumRiskTickets: number;
    highRiskTickets: number;
    periodDays: number;
  };
  recurringAssets: Array<{
    assetId: number;
    internalCode: string;
    type: Asset['type'];
    location: Asset['location'];
    assignedUser: string | null;
    ticketCount: number;
    mainIncidentType: string;
    riskLevel: RiskLevel;
    riskLabel: string;
    recommendation: string;
  }>;
  criticalAreas: Array<{
    area: string;
    ticketCount: number;
    previousTicketCount: number;
    trendPercent: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recurringUsers: Array<{
    userId: number;
    userName: string;
    area: User['area'];
    ticketCount: number;
    mainIncidentType: string;
    frequencyPerWeek: number;
    riskLevel: RiskLevel;
    recommendation: string;
  }>;
  technicianWorkload: Array<{
    technicianId: number;
    technicianName: string;
    assignedTickets: number;
    resolvedTickets: number;
    averageResolutionHours: number;
    currentLoad: number;
    workloadLevel: RiskLevel;
  }>;
  criticalAssets: Array<{
    assetId: number;
    internalCode: string;
    type: Asset['type'];
    location: Asset['location'];
    historicalTicketCount: number;
    mainIncidentType: string;
    averageDaysBetweenFailures: number | null;
    probabilityScore: number;
    riskLevel: RiskLevel;
    riskLabel: string;
  }>;
  repetitiveIncidents: Array<{
    category: string;
    ticketCount: number;
    riskLevel: RiskLevel;
  }>;
  monthlyTrends: Array<{
    month: string;
    label: string;
    value: number;
  }>;
  recommendations: string[];
}

const DEFAULT_PERIOD_DAYS = 30;
const LOOKBACK_DAYS = 365;
const MEDIUM_RISK_THRESHOLD = 3;
const HIGH_RISK_THRESHOLD = 6;
const TOP_LIMIT = 6;
const CATEGORY_VALUES = ['Red', 'Impresoras', 'Computadoras', 'Telefonía', 'Correo', 'Software', 'Otros'];

function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function getEffectiveRange(range?: DateRange) {
  const dateTo = range?.dateTo || new Date();
  const dateFrom = range?.dateFrom || subtractDays(dateTo, DEFAULT_PERIOD_DAYS);
  return { dateFrom, dateTo };
}

function getPreviousRange(range: { dateFrom: Date; dateTo: Date }) {
  const periodMs = range.dateTo.getTime() - range.dateFrom.getTime();
  const dateTo = new Date(range.dateFrom);
  const dateFrom = new Date(range.dateFrom.getTime() - periodMs);
  return { dateFrom, dateTo };
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferCategory(ticket: Pick<Ticket, 'title' | 'description' | 'category'>): string {
  if (ticket.category && CATEGORY_VALUES.includes(ticket.category)) return ticket.category;
  const text = normalizeText(`${ticket.title} ${ticket.description}`);

  if (/(red|wifi|internet|switch|router|patch|punto de red|network|lan|vpn)/.test(text)) return 'Red';
  if (/(impresora|printer|toner|scanner|escaner)/.test(text)) return 'Impresoras';
  if (/(computadora|equipo|pc|laptop|monitor|teclado|mouse|cpu)/.test(text)) return 'Computadoras';
  if (/(telefono|telefonia|extension|ramal|ip phone|voip)/.test(text)) return 'Telefonía';
  if (/(correo|email|mail|outlook|gmail|buzon)/.test(text)) return 'Correo';
  if (/(software|sistema|aplicacion|programa|licencia|office|windows)/.test(text)) return 'Software';

  return 'Otros';
}

function riskFromCount(count: number): RiskLevel {
  if (count >= HIGH_RISK_THRESHOLD) return 'high';
  if (count >= MEDIUM_RISK_THRESHOLD) return 'medium';
  return 'low';
}

function riskLabel(risk: RiskLevel): string {
  return risk === 'high' ? 'Riesgo Alto' : risk === 'medium' ? 'Riesgo Medio' : 'Riesgo Bajo';
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function topCategory(tickets: Ticket[]): { category: string; count: number } {
  const counts = new Map<string, number>();
  for (const ticket of tickets) {
    const category = inferCategory(ticket);
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)[0] || { category: 'Otros', count: 0 };
}

function averageDaysBetweenFailures(tickets: Ticket[]): number | null {
  if (tickets.length < 2) return null;
  const ordered = [...tickets].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const gaps = ordered.slice(1).map((ticket, index) => (
    daysBetween(new Date(ordered[index].createdAt), new Date(ticket.createdAt))
  ));
  return Number((gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length).toFixed(1));
}

function ticketMentionsAsset(ticket: Ticket, asset: Asset): boolean {
  const code = normalizeText(asset.internalCode);
  const text = normalizeText(`${ticket.title} ${ticket.description} ${ticket.location || ''}`);
  const sameAssignedUser = Boolean(asset.assignedTo && ticket.requestedBy === asset.assignedTo);
  return text.includes(code) || sameAssignedUser;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export class PredictiveAnalysisService {
  async getAnalysis(range?: DateRange): Promise<PredictiveAnalysisResult> {
    const currentRange = getEffectiveRange(range);
    const previousRange = getPreviousRange(currentRange);
    const historicalFrom = subtractDays(currentRange.dateTo, LOOKBACK_DAYS);

    const [tickets, previousTickets, historicalTickets, assets, users, technicians] = await Promise.all([
      Ticket.findAll({
        where: { createdAt: { [Op.gte]: currentRange.dateFrom, [Op.lt]: currentRange.dateTo } },
        include: [
          { model: User, as: 'requester', attributes: ['id', 'name', 'email', 'area'] },
          { model: User, as: 'technician', attributes: ['id', 'name', 'email'] },
        ],
        order: [['createdAt', 'DESC']],
      }),
      Ticket.findAll({
        where: { createdAt: { [Op.gte]: previousRange.dateFrom, [Op.lt]: previousRange.dateTo } },
      }),
      Ticket.findAll({
        where: { createdAt: { [Op.gte]: historicalFrom, [Op.lt]: currentRange.dateTo } },
        order: [['createdAt', 'ASC']],
      }),
      Asset.findAll({
        include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email', 'area'] }],
        order: [['internalCode', 'ASC']],
      }),
      User.findAll({ where: { role: 'user' }, attributes: ['id', 'name', 'email', 'area'] }),
      User.findAll({ where: { role: 'technician' }, attributes: ['id', 'name', 'email'] }),
    ]);

    const periodDays = daysBetween(currentRange.dateFrom, currentRange.dateTo);
    const recurringAssets = this.buildRecurringAssets(tickets, assets);
    const criticalAssets = this.buildCriticalAssets(historicalTickets, assets, currentRange.dateTo);
    const criticalAreas = this.buildCriticalAreas(tickets, previousTickets);
    const recurringUsers = this.buildRecurringUsers(tickets, users, periodDays);
    const technicianWorkload = this.buildTechnicianWorkload(tickets, technicians);
    const repetitiveIncidents = this.buildRepetitiveIncidents(tickets);
    const monthlyTrends = this.buildMonthlyTrends(historicalTickets, currentRange.dateTo);
    const recommendations = this.buildRecommendations({
      recurringAssets,
      criticalAssets,
      criticalAreas,
      recurringUsers,
      repetitiveIncidents,
    });

    return {
      period: {
        dateFrom: currentRange.dateFrom,
        dateTo: currentRange.dateTo,
        days: periodDays,
      },
      thresholds: {
        mediumRiskTickets: MEDIUM_RISK_THRESHOLD,
        highRiskTickets: HIGH_RISK_THRESHOLD,
        periodDays: DEFAULT_PERIOD_DAYS,
      },
      recurringAssets,
      criticalAreas,
      recurringUsers,
      technicianWorkload,
      criticalAssets,
      repetitiveIncidents,
      monthlyTrends,
      recommendations,
    };
  }

  private buildRecurringAssets(tickets: Ticket[], assets: Asset[]) {
    return assets
      .map((asset) => {
        const assetTickets = tickets.filter((ticket) => ticketMentionsAsset(ticket, asset));
        const mainIncident = topCategory(assetTickets);
        const risk = riskFromCount(assetTickets.length);

        return {
          assetId: asset.id,
          internalCode: asset.internalCode,
          type: asset.type,
          location: asset.location,
          assignedUser: (asset as any).assignedUser?.name || null,
          ticketCount: assetTickets.length,
          mainIncidentType: mainIncident.category,
          riskLevel: risk,
          riskLabel: riskLabel(risk),
          recommendation: assetTickets.length > 0
            ? `Se recomienda realizar mantenimiento preventivo al equipo ${asset.internalCode}.`
            : 'Sin recurrencia en el periodo seleccionado.',
        };
      })
      .filter((item) => item.ticketCount > 0)
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, TOP_LIMIT);
  }

  private buildCriticalAssets(tickets: Ticket[], assets: Asset[], referenceDate: Date) {
    return assets
      .map((asset) => {
        const assetTickets = tickets.filter((ticket) => ticketMentionsAsset(ticket, asset));
        const recentTickets = assetTickets.filter((ticket) => (
          new Date(ticket.createdAt).getTime() >= subtractDays(referenceDate, DEFAULT_PERIOD_DAYS).getTime()
        ));
        const mainIncident = topCategory(assetTickets);
        const averageDays = averageDaysBetweenFailures(assetTickets);
        const recurrenceScore = assetTickets.length * 10;
        const recentScore = recentTickets.length * 6;
        const incidentScore = Math.min(mainIncident.count * 4, 20);
        const frequencyScore = averageDays ? Math.max(0, 20 - averageDays) : 0;
        const score = Math.round(recurrenceScore + recentScore + incidentScore + frequencyScore);
        const risk = score >= 80 ? 'high' : score >= 40 ? 'medium' : 'low';

        return {
          assetId: asset.id,
          internalCode: asset.internalCode,
          type: asset.type,
          location: asset.location,
          historicalTicketCount: assetTickets.length,
          mainIncidentType: mainIncident.category,
          averageDaysBetweenFailures: averageDays,
          probabilityScore: score,
          riskLevel: risk as RiskLevel,
          riskLabel: riskLabel(risk as RiskLevel),
        };
      })
      .filter((item) => item.historicalTicketCount > 0)
      .sort((a, b) => b.probabilityScore - a.probabilityScore)
      .slice(0, TOP_LIMIT);
  }

  private buildCriticalAreas(tickets: Ticket[], previousTickets: Ticket[]) {
    return INSTITUTIONAL_AREAS
      .map((area) => {
        const currentCount = tickets.filter((ticket) => ticket.location === area).length;
        const previousCount = previousTickets.filter((ticket) => ticket.location === area).length;
        const trend: 'up' | 'down' | 'stable' = currentCount > previousCount ? 'up' : currentCount < previousCount ? 'down' : 'stable';
        return {
          area,
          ticketCount: currentCount,
          previousTicketCount: previousCount,
          trendPercent: percentChange(currentCount, previousCount),
          trend,
        };
      })
      .filter((item) => item.ticketCount > 0 || item.previousTicketCount > 0)
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, TOP_LIMIT);
  }

  private buildRecurringUsers(tickets: Ticket[], users: User[], periodDays: number) {
    return users
      .map((user) => {
        const userTickets = tickets.filter((ticket) => ticket.requestedBy === user.id);
        const mainIncident = topCategory(userTickets);
        const frequencyPerWeek = Number(((userTickets.length / periodDays) * 7).toFixed(1));
        const risk = riskFromCount(userTickets.length);

        return {
          userId: user.id,
          userName: user.name,
          area: user.area,
          ticketCount: userTickets.length,
          mainIncidentType: mainIncident.category,
          frequencyPerWeek,
          riskLevel: risk,
          recommendation: userTickets.length >= MEDIUM_RISK_THRESHOLD
            ? `El usuario ${user.name} registra incidencias repetitivas relacionadas con ${mainIncident.category.toLowerCase()}; se recomienda revisar su equipo o realizar capacitación.`
            : 'Frecuencia dentro de parámetros normales.',
        };
      })
      .filter((item) => item.ticketCount > 0)
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, TOP_LIMIT);
  }

  private buildTechnicianWorkload(tickets: Ticket[], technicians: User[]) {
    return technicians
      .map((technician) => {
        const assignedTickets = tickets.filter((ticket) => ticket.assignedTo === technician.id);
        const resolved = assignedTickets.filter((ticket) => ticket.status === 'resolved');
        const active = assignedTickets.filter((ticket) => ticket.status !== 'resolved');
        const resolutionHours = resolved
          .filter((ticket) => ticket.resolutionDate)
          .map((ticket) => (
            (new Date(ticket.resolutionDate!).getTime() - new Date(ticket.createdAt).getTime()) / 36e5
          ));
        const averageResolutionHours = resolutionHours.length
          ? Number((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length).toFixed(1))
          : 0;
        const workloadLevel: RiskLevel = active.length >= 8 ? 'high' : active.length >= 4 ? 'medium' : 'low';

        return {
          technicianId: technician.id,
          technicianName: technician.name,
          assignedTickets: assignedTickets.length,
          resolvedTickets: resolved.length,
          averageResolutionHours,
          currentLoad: active.length,
          workloadLevel,
        };
      })
      .sort((a, b) => b.currentLoad - a.currentLoad || b.assignedTickets - a.assignedTickets);
  }

  private buildRepetitiveIncidents(tickets: Ticket[]) {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      const category = inferCategory(ticket);
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, ticketCount]) => ({
        category,
        ticketCount,
        riskLevel: riskFromCount(ticketCount),
      }))
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, TOP_LIMIT);
  }

  private buildMonthlyTrends(tickets: Ticket[], dateTo: Date) {
    const firstMonth = addMonths(startOfMonth(dateTo), -5);
    const buckets = new Map<string, { month: string; label: string; value: number }>();
    for (let index = 0; index < 6; index += 1) {
      const date = addMonths(firstMonth, index);
      buckets.set(monthKey(date), { month: monthKey(date), label: monthLabel(date), value: 0 });
    }

    for (const ticket of tickets) {
      const key = monthKey(new Date(ticket.createdAt));
      const bucket = buckets.get(key);
      if (bucket) bucket.value += 1;
    }

    return Array.from(buckets.values());
  }

  private buildRecommendations(data: {
    recurringAssets: Array<{ internalCode: string; riskLevel: RiskLevel; ticketCount: number }>;
    criticalAssets: Array<{ internalCode: string; riskLevel: RiskLevel; mainIncidentType: string }>;
    criticalAreas: Array<{ area: string; trendPercent: number; trend: string }>;
    recurringUsers: Array<{ userName: string; mainIncidentType: string; riskLevel: RiskLevel }>;
    repetitiveIncidents: Array<{ category: string; ticketCount: number; riskLevel: RiskLevel }>;
  }) {
    const recommendations: string[] = [];
    const highRiskAsset = data.recurringAssets.find((item) => item.riskLevel === 'high') || data.criticalAssets.find((item) => item.riskLevel === 'high');
    const growingArea = data.criticalAreas.find((item) => item.trend === 'up' && item.trendPercent > 0);
    const recurringUser = data.recurringUsers.find((item) => item.riskLevel !== 'low');
    const repetitiveIncident = data.repetitiveIncidents.find((item) => item.riskLevel !== 'low');

    if (highRiskAsset) {
      recommendations.push(`Se recomienda realizar mantenimiento preventivo al equipo ${highRiskAsset.internalCode}.`);
    }
    if (growingArea) {
      recommendations.push(`El área de ${growingArea.area} presenta un incremento del ${growingArea.trendPercent}% de incidencias respecto al periodo anterior.`);
    }
    if (recurringUser) {
      recommendations.push(`El usuario ${recurringUser.userName} registra incidencias repetitivas relacionadas con ${recurringUser.mainIncidentType.toLowerCase()}.`);
    }
    if (repetitiveIncident) {
      recommendations.push(`La categoría ${repetitiveIncident.category} concentra ${repetitiveIncident.ticketCount} incidencias; se recomienda revisar causas recurrentes.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('No se detectan patrones críticos en el periodo seleccionado; mantener el monitoreo preventivo.');
    }

    return recommendations.slice(0, 5);
  }
}
