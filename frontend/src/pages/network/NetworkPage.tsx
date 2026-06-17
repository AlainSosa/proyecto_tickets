import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { NetworkPoint } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', faulty: 'Dañado' };
const statusBadge: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', faulty: 'badge-red' };

export function NetworkPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<NetworkPoint | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search;
    if (statusFilter) f.status = statusFilter;
    return f;
  }, [search, statusFilter]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<NetworkPoint>({ endpoint: '/network-points', filters });

  const columns: Column<NetworkPoint>[] = [
    { header: 'Etiqueta', accessor: 'label' },
    { header: 'Ubicación', accessor: 'location' },
    { header: 'Patch Panel', accessor: 'patchPanel' },
    { header: 'Switch', accessor: (p) => p.switch?.internalCode || '-' },
    { header: 'Puerto', accessor: 'switchPort' },
    { header: 'Estado', accessor: (p) => <span className={statusBadge[p.status]}>{statusLabels[p.status]}</span> },
  ];

  const handleEdit = (item: NetworkPoint) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };

  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/network-points/${selected.id}`, formData); toast.success('Punto de red actualizado'); }
      else { await api.post('/network-points', formData); toast.success('Punto de red creado'); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Infraestructura de Red</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Nuevo Punto</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Buscar puntos..." /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="faulty">Dañado</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage="No se encontraron puntos de red" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <NetworkFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selected} onSave={handleSave} />
    </div>
  );
}

function NetworkFormModal({ isOpen, onClose, item, onSave }: { isOpen: boolean; onClose: () => void; item: NetworkPoint | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ label: '', location: '', patchPanel: '', switchPort: '', status: 'active', observations: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(item ? {
        label: item.label,
        location: item.location,
        patchPanel: item.patchPanel || '',
        switchPort: item.switchPort || '',
        status: item.status,
        observations: item.observations || '',
      } : { label: '', location: '', patchPanel: '', switchPort: '', status: 'active', observations: '' });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    await onSave(form); setIsSubmitting(false);
    setForm({ label: '', location: '', patchPanel: '', switchPort: '', status: 'active', observations: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Editar Punto de Red' : 'Nuevo Punto de Red'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Etiqueta</label><input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Estado</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input"><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="faulty">Dañado</option></select></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Ubicación</label><input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Patch Panel</label><input type="text" value={form.patchPanel} onChange={e => setForm({ ...form, patchPanel: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">Puerto Switch</label><input type="text" value={form.switchPort} onChange={e => setForm({ ...form, switchPort: e.target.value })} className="input" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Observaciones</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input min-h-[80px]" /></div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Guardando...' : item ? 'Actualizar' : 'Crear'}</button>
        </div>
      </form>
    </Modal>
  );
}
