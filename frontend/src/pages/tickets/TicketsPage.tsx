import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { useAuth } from '../../context/AuthContext';
import { Ticket, TicketPriority, TicketStatus, User } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const statusBadge: Record<string, string> = {
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

function UserTicketForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/tickets', { title, description });
      toast.success(t('requestSent'));
      setTitle('');
      setDescription('');
      onCreated();
    } catch {
      toast.error(t('requestError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Send className="h-5 w-5 text-brand-600" />
        {t('supportRequest')}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder={t('authProblemPlaceholder')}
            required
            minLength={5}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[120px]"
            placeholder={t('detailedProblemPlaceholder')}
            required
            minLength={10}
          />
        </div>
        <div className="flex items-center justify-end">
          <button type="submit" disabled={isSubmitting} className="btn-primary gap-2">
            {isSubmitting ? t('sending') : t('sendRequest')}
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function UserTicketList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters: user ? { requestedBy: String(user.id) } : {},
  });

  const columns: Column<Ticket>[] = [
    { header: '#', accessor: 'id', className: 'w-12' },
    { header: t('title'), accessor: 'title' },
    {
      header: t('status'),
      accessor: (ticket) => (
        <span className={statusBadge[ticket.status]}>
          {t(statusLabelKeys[ticket.status])}
        </span>
      ),
    },
    {
      header: t('priority'),
      accessor: (ticket) => (
        <span className={ticket.priority === 'critical' || ticket.priority === 'high' ? 'badge-red' : ticket.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}>
          {ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority')}
        </span>
      ),
    },
    {
      header: t('technician'),
      accessor: (ticket) => ticket.technician?.name || t('withoutAssignment'),
    },
    {
      header: t('created'),
      accessor: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale),
    },
  ];

  const reportColumns: QuickReportColumn<Ticket>[] = [
    { header: '#', value: (ticket) => ticket.id },
    { header: t('title'), value: (ticket) => ticket.title },
    { header: t('status'), value: (ticket) => t(statusLabelKeys[ticket.status]) },
    { header: t('priority'), value: (ticket) => ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority') },
    { header: t('technician'), value: (ticket) => ticket.technician?.name || t('withoutAssignment') },
    { header: t('created'), value: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5 text-brand-600" />
          {t('myRequests')}
        </h2>
        <QuickReportButton title={t('myRequests')} rows={data} columns={reportColumns} disabled={isLoading} />
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)} emptyMessage={t('noRequests')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function TechnicianTicketList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filters = useMemo(() => {
    const f: Record<string, string> = { assignedTo: String(user!.id) };
    if (search) f.search = search;
    if (statusFilter) f.status = statusFilter;
    return f;
  }, [search, statusFilter, user]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters,
  });

  const columns: Column<Ticket>[] = [
    { header: '#', accessor: 'id', className: 'w-12' },
    { header: t('title'), accessor: 'title' },
    {
      header: t('status'),
      accessor: (ticket) => (
        <span className={statusBadge[ticket.status]}>
          {t(statusLabelKeys[ticket.status])}
        </span>
      ),
    },
    {
      header: t('priority'),
      accessor: (ticket) => (
        <span className={ticket.priority === 'critical' || ticket.priority === 'high' ? 'badge-red' : ticket.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}>
          {ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority')}
        </span>
      ),
    },
    {
      header: t('requester'),
      accessor: (ticket) => ticket.requester?.name || '-',
    },
    {
      header: t('created'),
      accessor: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale),
    },
  ];

  const reportColumns: QuickReportColumn<Ticket>[] = [
    { header: '#', value: (ticket) => ticket.id },
    { header: t('title'), value: (ticket) => ticket.title },
    { header: t('status'), value: (ticket) => t(statusLabelKeys[ticket.status]) },
    { header: t('priority'), value: (ticket) => ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority') },
    { header: t('requester'), value: (ticket) => ticket.requester?.name || '-' },
    { header: t('created'), value: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('assignedTickets')}</h1>
        <button onClick={refetch} className="btn-secondary p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchTickets')} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
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
        <QuickReportButton title={t('assignedTickets')} rows={data} columns={reportColumns} disabled={isLoading} />
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)} emptyMessage={t('noTicketsFound')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function AdminTicketList() {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);

  useEffect(() => {
    api.get('/users', { params: { role: 'technician', limit: 100 } }).then((r) => setTechnicians(r.data?.data || [])).catch(() => {});
  }, []);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search;
    if (statusFilter) f.status = statusFilter;
    if (priorityFilter) f.priority = priorityFilter;
    return f;
  }, [search, statusFilter, priorityFilter]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters,
  });

  const columns: Column<Ticket>[] = [
    { header: 'ID', accessor: 'id', className: 'w-16' },
    { header: t('title'), accessor: 'title' },
    {
      header: t('status'),
      accessor: (ticket) => (<span className={statusBadge[ticket.status]}>{t(statusLabelKeys[ticket.status])}</span>),
    },
    {
      header: t('priority'),
      accessor: (ticket) => (
        <span className={ticket.priority === 'critical' || ticket.priority === 'high' ? 'badge-red' : 'badge-yellow'}>
          {ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority')}
        </span>
      ),
    },
    { header: t('requester'), accessor: (ticket) => ticket.requester?.name || '-' },
    { header: t('technician'), accessor: (ticket) => ticket.technician?.name || t('withoutAssignment') },
    { header: t('created'), accessor: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
  ];

  const reportColumns: QuickReportColumn<Ticket>[] = [
    { header: 'ID', value: (ticket) => ticket.id },
    { header: t('title'), value: (ticket) => ticket.title },
    { header: t('status'), value: (ticket) => t(statusLabelKeys[ticket.status]) },
    { header: t('priority'), value: (ticket) => ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority') },
    { header: t('requester'), value: (ticket) => ticket.requester?.name || '-' },
    { header: t('technician'), value: (ticket) => ticket.technician?.name || t('withoutAssignment') },
    { header: t('created'), value: (ticket) => new Date(ticket.createdAt).toLocaleDateString(locale) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <button onClick={() => { setSelectedTicket(null); setIsModalOpen(true); }} className="btn-primary gap-2">
          <Plus className="h-4 w-4" /> {t('newTicket')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder={t('searchTickets')} /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
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
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input w-40">
          <option value="">{t('allPriorities')}</option>
          <option value="low">{t('low')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="high">{t('high')}</option>
          <option value="critical">{t('critical')}</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
        <QuickReportButton title="Tickets" rows={data} columns={reportColumns} disabled={isLoading} />
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)} emptyMessage={t('noTicketsFound')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTicket ? t('editTicket') : t('newTicket')}>
        <TicketFormModal
          ticket={selectedTicket}
          technicians={technicians}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => { setIsModalOpen(false); refetch(); }}
        />
      </Modal>
    </div>
  );
}

interface TicketFormProps {
  ticket: Ticket | null;
  technicians: User[];
  onClose: () => void;
  onSaved: () => void;
}

function TicketFormModal({ ticket, technicians, onClose, onSaved }: TicketFormProps) {
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [priority, setPriority] = useState<TicketPriority | ''>(ticket?.priority || '');
  const [status, setStatus] = useState<TicketStatus>(ticket?.status || 'pending_assignment');
  const [assignedTo, setAssignedTo] = useState(ticket?.assignedTo ? String(ticket.assignedTo) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = { title, description, priority: priority || null, assignedTo: assignedTo ? parseInt(assignedTo) : null };
      if (ticket) Object.assign(payload, { status });
      if (ticket) {
        await api.patch(`/tickets/${ticket.id}`, payload);
        toast.success(t('ticketUpdated'));
      } else {
        await api.post('/tickets', payload);
        toast.success(t('ticketCreated'));
      }
      onSaved();
    } catch {
      toast.error(t('ticketSavedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t('title')}</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('description')}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[100px]" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('priority')}</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | '')} className="input">
            <option value="">{t('undefinedPriority')}</option>
            <option value="low">{t('low')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="high">{t('high')}</option>
            <option value="critical">{t('critical')}</option>
          </select>
        </div>
        {ticket && (
          <div>
            <label className="block text-sm font-medium mb-1">{t('status')}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)} className="input">
              <option value="pending_assignment">{t('pendingAssignment')}</option>
              <option value="assigned">{t('assignedStatus')}</option>
              <option value="in_progress">{t('inProgress')}</option>
              <option value="on_hold">{t('onHold')}</option>
              <option value="resolved">{t('resolved')}</option>
              <option value="closed">{t('closed')}</option>
              <option value="canceled">{t('canceled')}</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('assignedTechnician')}</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="input">
          <option value="">{t('withoutAssignment')}</option>
          {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? t('saving') : ticket ? t('update') : t('create')}
        </button>
      </div>
    </form>
  );
}

export function TicketsPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  if (user.role === 'user') {
    return (
      <div className="space-y-8">
        <UserTicketForm onCreated={() => setRefreshKey((k) => k + 1)} />
        <UserTicketList key={refreshKey} />
      </div>
    );
  }

  if (user.role === 'technician') {
    return <TechnicianTicketList />;
  }

  return <AdminTicketList />;
}
