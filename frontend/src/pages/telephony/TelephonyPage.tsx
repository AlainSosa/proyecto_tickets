import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { Extension } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo' };
const statusBadge: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray' };

export function TelephonyPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Extension | null>(null);
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (statusFilter) f.status = statusFilter;
    return f;
  }, [search, statusFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Extension>({ endpoint: '/extensions', filters });

  const columns: Column<Extension>[] = [
    { header: 'Extensión', accessor: 'extensionNumber' },
    { header: 'Dirección IP', accessor: 'ipAddress' },
    { header: 'Usuario', accessor: (e) => e.assignedUser?.name || '-' },
    { header: 'Ubicación', accessor: 'location' },
    { header: 'Estado', accessor: (e) => <span className={statusBadge[e.status]}>{statusLabels[e.status]}</span> },
  ];

  const handleEdit = (item: Extension) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/extensions/${selected.id}`, formData); toast.success('Extensión actualizada'); }
      else { await api.post('/extensions', formData); toast.success('Extensión creada'); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Telefonía</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Nueva Extensión</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Buscar extensiones..." /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage="No se encontraron extensiones" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <TelephonyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selected} onSave={handleSave} />
    </div>
  );
}

function TelephonyFormModal({ isOpen, onClose, item, onSave }: { isOpen: boolean; onClose: () => void; item: Extension | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ extensionNumber: '', ipAddress: '', location: '', status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setForm(item ? {
        extensionNumber: item.extensionNumber,
        ipAddress: item.ipAddress || '',
        location: item.location || '',
        status: item.status,
      } : { extensionNumber: '', ipAddress: '', location: '', status: 'active' });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    await onSave(form); setIsSubmitting(false);
    setForm({ extensionNumber: '', ipAddress: '', location: '', status: 'active' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Editar Extensión' : 'Nueva Extensión'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Número de Extensión</label><input type="text" value={form.extensionNumber} onChange={e => setForm({ ...form, extensionNumber: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Estado</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Dirección IP</label><input type="text" value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">Ubicación</label><input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input" /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Guardando...' : item ? 'Actualizar' : 'Crear'}</button>
        </div>
      </form>
    </Modal>
  );
}
