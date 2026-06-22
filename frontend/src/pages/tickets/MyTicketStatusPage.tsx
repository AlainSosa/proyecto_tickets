import { useEffect, useMemo, useState } from 'react';
import { Clock, CheckCircle2, Search, TimerReset } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { Ticket } from '../../types';
import api from '../../services/api';

const statusBadge: Record<Ticket['status'], string> = {
  open: 'badge-blue',
  pending_assignment: 'badge-blue',
  assigned: 'badge-blue',
  pending: 'badge-blue',
  in_progress: 'badge-yellow',
  on_hold: 'badge-yellow',
  resolved: 'badge-green',
  closed: 'badge-gray',
  canceled: 'badge-gray',
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

export function MyTicketStatusPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [summaryTickets, setSummaryTickets] = useState<Ticket[]>([]);

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (user) next.requestedBy = String(user.id);
    if (search) next.search = search;
    if (statusFilter) next.status = statusFilter;
    return next;
  }, [search, statusFilter, user]);

  const { data, page, totalPages, total, isLoading, setPage } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters,
  });

  useEffect(() => {
    if (!user) return;
    api
      .get('/tickets', { params: { requestedBy: user.id, limit: 500 } })
      .then((response) => setSummaryTickets(response.data?.data || []))
      .catch(() => setSummaryTickets([]));
  }, [user]);

  const statusCounts = summaryTickets.reduce(
    (acc, ticket) => {
      acc[ticket.status] += 1;
      return acc;
    },
    { open: 0, pending_assignment: 0, assigned: 0, pending: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, canceled: 0 } as Record<Ticket['status'], number>,
  );

  const cards = [
    { label: t('total'), value: summaryTickets.length || total, icon: Search, className: 'text-primary-700 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-300' },
    { label: t('pendingAssignment'), value: statusCounts.pending_assignment + statusCounts.pending, icon: Clock, className: 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300' },
    { label: t('inProgress'), value: statusCounts.in_progress, icon: TimerReset, className: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300' },
    { label: t('resolved'), value: statusCounts.resolved, icon: CheckCircle2, className: 'text-brand-700 bg-brand-50 dark:bg-brand-900/20 dark:text-brand-300' },
  ];

  const columns: Column<Ticket>[] = [
    { header: 'ID', accessor: 'id', className: 'w-16' },
    { header: t('title'), accessor: 'title' },
    {
      header: t('status'),
      accessor: (ticket) => <span className={statusBadge[ticket.status]}>{t(statusLabelKeys[ticket.status])}</span>,
    },
    {
      header: t('priority'),
      accessor: (ticket) => (
        <span className={ticket.priority === 'critical' || ticket.priority === 'high' ? 'badge-red' : ticket.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}>
          {ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority')}
        </span>
      ),
    },
    { header: t('technician'), accessor: (ticket) => ticket.technician?.name || t('withoutAssignment') },
    { header: t('created'), accessor: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
    { header: t('lastUpdate'), accessor: (ticket) => new Date(ticket.updatedAt).toLocaleDateString(locale) },
  ];

  const reportColumns: QuickReportColumn<Ticket>[] = [
    { header: 'ID', value: (ticket) => ticket.id },
    { header: t('title'), value: (ticket) => ticket.title },
    { header: t('status'), value: (ticket) => t(statusLabelKeys[ticket.status]) },
    { header: t('priority'), value: (ticket) => ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority') },
    { header: t('technician'), value: (ticket) => ticket.technician?.name || t('withoutAssignment') },
    { header: t('created'), value: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
    { header: t('lastUpdate'), value: (ticket) => new Date(ticket.updatedAt).toLocaleDateString(locale) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('myTicketStatus')}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Consulta el estado de todas tus solicitudes realizadas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.className}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchTickets')} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">{t('allStatuses')}</option>
          <option value="pending">{t('pending')}</option>
          <option value="pending_assignment">{t('pendingAssignment')}</option>
          <option value="assigned">{t('assignedStatus')}</option>
          <option value="in_progress">{t('inProgress')}</option>
          <option value="on_hold">{t('onHold')}</option>
          <option value="resolved">{t('resolved')}</option>
          <option value="closed">{t('closed')}</option>
          <option value="canceled">{t('canceled')}</option>
        </select>
        <QuickReportButton title={t('myTicketStatus')} rows={data} columns={reportColumns} disabled={isLoading} />
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage={t('noTicketsFound')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
