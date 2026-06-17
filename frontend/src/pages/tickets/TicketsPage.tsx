import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { Ticket, User } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  in_progress: 'badge-blue',
  resolved: 'badge-green',
  closed: 'badge-gray',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

function UserTicketForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/tickets', { title, description, priority });
      toast.success('Solicitud enviada correctamente');
      setTitle('');
      setDescription('');
      setPriority('medium');
      onCreated();
    } catch {
      toast.error('Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Send className="h-5 w-5 text-brand-600" />
        Nueva Solicitud de Soporte
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Describe brevemente tu problema"
            required
            minLength={5}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[120px]"
            placeholder="Explica detalladamente el problema que estás experimentando..."
            required
            minLength={10}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48">
            <label className="block text-sm font-medium mb-1">Prioridad</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary mt-6 gap-2">
            {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function UserTicketList() {
  const { user } = useAuth();
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Ticket>({
    endpoint: '/tickets',
    filters: user ? { requestedBy: String(user.id) } : {},
  });

  const columns: Column<Ticket>[] = [
    { header: '#', accessor: 'id', className: 'w-12' },
    { header: 'Título', accessor: 'title' },
    {
      header: 'Estado',
      accessor: (t) => (
        <span className={statusBadge[t.status]}>
          {statusLabels[t.status]}
        </span>
      ),
    },
    {
      header: 'Prioridad',
      accessor: (t) => (
        <span className={t.priority === 'critical' || t.priority === 'high' ? 'badge-red' : t.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}>
          {priorityLabels[t.priority]}
        </span>
      ),
    },
    {
      header: 'Técnico',
      accessor: (t) => t.technician?.name || 'Sin asignar',
    },
    {
      header: 'Creado',
      accessor: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-brand-600" />
        Mis Solicitudes
      </h2>
      <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="No has realizado ninguna solicitud aún." />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function TechnicianTicketList() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    { header: 'Título', accessor: 'title' },
    {
      header: 'Estado',
      accessor: (t) => (
        <span className={statusBadge[t.status]}>
          {statusLabels[t.status]}
        </span>
      ),
    },
    {
      header: 'Prioridad',
      accessor: (t) => (
        <span className={t.priority === 'critical' || t.priority === 'high' ? 'badge-red' : t.priority === 'medium' ? 'badge-yellow' : 'badge-gray'}>
          {priorityLabels[t.priority]}
        </span>
      ),
    },
    {
      header: 'Solicitante',
      accessor: (t) => t.requester?.name || '-',
    },
    {
      header: 'Creado',
      accessor: (t) => new Date(t.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Tickets Asignados</h1>
        <button onClick={refetch} className="btn-secondary p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar tickets..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En Proceso</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={(t) => navigate(`/tickets/${t.id}`)} emptyMessage="No tienes tickets asignados." />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function AdminTicketList() {
  const navigate = useNavigate();
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
    { header: 'Título', accessor: 'title' },
    {
      header: 'Estado',
      accessor: (t) => (<span className={statusBadge[t.status]}>{statusLabels[t.status]}</span>),
    },
    {
      header: 'Prioridad',
      accessor: (t) => (
        <span className={t.priority === 'critical' || t.priority === 'high' ? 'badge-red' : 'badge-yellow'}>
          {priorityLabels[t.priority]}
        </span>
      ),
    },
    { header: 'Solicitante', accessor: (t) => t.requester?.name || '-' },
    { header: 'Técnico', accessor: (t) => t.technician?.name || 'Sin asignar' },
    { header: 'Creado', accessor: (t) => new Date(t.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <button onClick={() => { setSelectedTicket(null); setIsModalOpen(true); }} className="btn-primary gap-2">
          <Plus className="h-4 w-4" /> Nuevo Ticket
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Buscar tickets..." /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En Proceso</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input w-40">
          <option value="">Todas las prioridades</option>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={(t) => navigate(`/tickets/${t.id}`)} emptyMessage="No se encontraron tickets" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTicket ? 'Editar Ticket' : 'Nuevo Ticket'}>
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
  const [priority, setPriority] = useState(ticket?.priority || 'medium');
  const [status, setStatus] = useState(ticket?.status || 'pending');
  const [assignedTo, setAssignedTo] = useState(ticket?.assignedTo ? String(ticket.assignedTo) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = { title, description, priority, assignedTo: assignedTo ? parseInt(assignedTo) : null };
      if (ticket) Object.assign(payload, { status });
      if (ticket) {
        await api.put(`/tickets/${ticket.id}`, payload);
        toast.success('Ticket actualizado');
      } else {
        await api.post('/tickets', payload);
        toast.success('Ticket creado');
      }
      onSaved();
    } catch {
      toast.error('Error al guardar el ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Título</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[100px]" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
        {ticket && (
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Proceso</option>
              <option value="resolved">Resuelto</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Asignar a Técnico</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="input">
          <option value="">Sin asignar</option>
          {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Guardando...' : ticket ? 'Actualizar' : 'Crear Ticket'}
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
