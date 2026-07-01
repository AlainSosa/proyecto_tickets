import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { AreaSelect } from '../../components/ui/AreaSelect';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { useAuth } from '../../context/AuthContext';
import { Ticket, TicketPriority, User } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw, Send, CheckCircle2, FileUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from '../../constants/institutionalAreas';
import { getTicketStatusBadge, getTicketStatusLabelKey, TICKET_STATUSES } from '../../constants/ticketStatuses';

const ticketCategories = ['Red', 'Impresoras', 'Computadoras', 'Telefonía', 'Correo', 'Software', 'Otros'];

const priorityLabelKeys = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;

function UserTicketForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const location = user?.area || DEFAULT_INSTITUTIONAL_AREA;
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const nextFiles = [...attachments, ...selectedFiles].slice(0, 5);
    if (attachments.length + selectedFiles.length > 5) {
      toast.error(t('maxAttachmentsError'));
    }
    setAttachments(nextFiles);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', 'Otros');
      formData.append('location', location);
      attachments.forEach((file) => formData.append('attachments', file));

      await api.post('/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('requestSent'));
      setTitle('');
      setDescription('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          <div>
            <label className="block text-sm font-medium mb-1">{t('location')}</label>
            <input value={location} className="input cursor-not-allowed bg-slate-50 dark:bg-slate-800" readOnly />
            <p className="mt-1 text-xs text-slate-500">Área asignada al usuario.</p>
          </div>
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
        <div>
          <label className="block text-sm font-medium mb-1">{t('attachments')}</label>
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAttachmentChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary gap-2"
              disabled={attachments.length >= 5}
            >
              <FileUp className="h-4 w-4" />
              {t('selectFiles')}
            </button>
            <p className="mt-2 text-xs text-slate-500">{t('maxAttachmentsHint')}</p>
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-800">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700"
                      aria-label={`${t('removeFile')} ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

function TechnicianTicketList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const filters = useMemo(() => {
    const f: Record<string, string> = { assignedTo: String(user!.id) };
    if (search) f.search = search;
    if (statusFilter) f.status = statusFilter;
    if (locationFilter) f.location = locationFilter;
    return f;
  }, [search, statusFilter, locationFilter, user]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters,
  });

  const columns: Column<Ticket>[] = [
    { header: '#', accessor: 'id', className: 'w-12' },
    { header: t('title'), accessor: 'title' },
    { header: 'Categoría', accessor: 'category' },
    {
      header: t('status'),
      accessor: (ticket) => (
        <span className={getTicketStatusBadge(ticket.status)}>
          {t(getTicketStatusLabelKey(ticket.status))}
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
    {
      header: '',
      accessor: (ticket) => ticket.status === 'resolved'
        ? <CheckCircle2 className="h-5 w-5 text-green-600" aria-label={t('resolved')} />
        : null,
      className: 'w-12',
    },
  ];

  const reportColumns: QuickReportColumn<Ticket>[] = [
    { header: '#', value: (ticket) => ticket.id },
    { header: t('title'), value: (ticket) => ticket.title },
    { header: 'Categoría', value: (ticket) => ticket.category },
    { header: t('status'), value: (ticket) => t(getTicketStatusLabelKey(ticket.status)) },
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
          {TICKET_STATUSES.map((ticketStatus) => (
            <option key={ticketStatus} value={ticketStatus}>{t(getTicketStatusLabelKey(ticketStatus))}</option>
          ))}
        </select>
        <AreaSelect value={locationFilter} onChange={setLocationFilter} includeEmpty className="input w-48" />
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
  const [locationFilter, setLocationFilter] = useState('');
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
    if (locationFilter) f.location = locationFilter;
    return f;
  }, [search, statusFilter, priorityFilter, locationFilter]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters,
  });

  const columns: Column<Ticket>[] = [
    { header: 'ID', accessor: 'id', className: 'w-16' },
    { header: t('title'), accessor: 'title' },
    { header: 'Categoría', accessor: 'category' },
    {
      header: t('status'),
      accessor: (ticket) => (<span className={getTicketStatusBadge(ticket.status)}>{t(getTicketStatusLabelKey(ticket.status))}</span>),
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
    {
      header: '',
      accessor: (ticket) => ticket.status === 'resolved'
        ? <CheckCircle2 className="h-5 w-5 text-green-600" aria-label={t('resolved')} />
        : null,
      className: 'w-12',
    },
  ];

  const reportColumns: QuickReportColumn<Ticket>[] = [
    { header: 'ID', value: (ticket) => ticket.id },
    { header: t('title'), value: (ticket) => ticket.title },
    { header: 'Categoría', value: (ticket) => ticket.category },
    { header: t('status'), value: (ticket) => t(getTicketStatusLabelKey(ticket.status)) },
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
          {TICKET_STATUSES.map((ticketStatus) => (
            <option key={ticketStatus} value={ticketStatus}>{t(getTicketStatusLabelKey(ticketStatus))}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input w-40">
          <option value="">{t('allPriorities')}</option>
          <option value="low">{t('low')}</option>
          <option value="medium">{t('medium')}</option>
          <option value="high">{t('high')}</option>
          <option value="critical">{t('critical')}</option>
        </select>
        <AreaSelect value={locationFilter} onChange={setLocationFilter} includeEmpty className="input w-48" />
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
  const [category, setCategory] = useState(ticket?.category || ticketCategories[0]);
  const [location, setLocation] = useState<InstitutionalArea>(ticket?.location || DEFAULT_INSTITUTIONAL_AREA);
  const [attachments, setAttachments] = useState((ticket?.attachments || []).join('\n'));
  const [priority, setPriority] = useState<TicketPriority | ''>(ticket?.priority || '');
  const [assignedTo, setAssignedTo] = useState(ticket?.assignedTo ? String(ticket.assignedTo) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        description,
        category,
        location,
        attachments: attachments.split('\n').map((item) => item.trim()).filter(Boolean),
        priority: priority || null,
        assignedTo: assignedTo ? parseInt(assignedTo) : null,
      };
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
      <div>
        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {ticketCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('location')}</label>
          <AreaSelect value={location} onChange={(value) => setLocation(value as InstitutionalArea)} required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('attachments')}</label>
        <textarea value={attachments} onChange={(e) => setAttachments(e.target.value)} className="input min-h-[80px]" placeholder="Un enlace por línea" />
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

  if (!user) return null;

  if (user.role === 'user') {
    return <UserTicketForm onCreated={() => {}} />;
  }

  if (user.role === 'technician') {
    return <TechnicianTicketList />;
  }

  return <AdminTicketList />;
}
