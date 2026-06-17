import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { Maintenance } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const typeLabels: Record<string, string> = { preventive: 'Preventivo', corrective: 'Correctivo' };
const typeBadge: Record<string, string> = { preventive: 'badge-blue', corrective: 'badge-yellow' };

export function MaintenancePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Maintenance | null>(null);
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (typeFilter) f.type = typeFilter;
    return f;
  }, [search, typeFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Maintenance>({ endpoint: '/maintenance', filters });

  const columns: Column<Maintenance>[] = [
    { header: 'Equipo', accessor: (m) => m.asset ? `${m.asset.internalCode} - ${m.asset.brand}` : '-' },
    { header: 'Tipo', accessor: (m) => <span className={typeBadge[m.type]}>{typeLabels[m.type]}</span> },
    { header: 'Programado', accessor: (m) => m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString() : '-' },
    { header: 'Realizado', accessor: (m) => m.performedDate ? new Date(m.performedDate).toLocaleDateString() : 'Pendiente' },
    { header: 'Técnico', accessor: (m) => m.technician?.name || '-' },
    { header: 'Próximo', accessor: (m) => m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate).toLocaleDateString() : '-' },
  ];

  const handleEdit = (item: Maintenance) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/maintenance/${selected.id}`, formData); toast.success('Mantenimiento actualizado'); }
      else { await api.post('/maintenance', formData); toast.success('Mantenimiento registrado'); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mantenimiento</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Nuevo Mantenimiento</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Buscar..." /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-40">
          <option value="">Todos</option><option value="preventive">Preventivo</option><option value="corrective">Correctivo</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage="No se encontraron registros" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <MaintenanceFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selected} onSave={handleSave} />
    </div>
  );
}

function MaintenanceFormModal({ isOpen, onClose, item, onSave }: { isOpen: boolean; onClose: () => void; item: Maintenance | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ assetId: '', type: 'preventive', scheduledDate: '', performedDate: '', observations: '', nextMaintenanceDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setForm(item ? {
        assetId: String(item.assetId),
        type: item.type,
        scheduledDate: item.scheduledDate || '',
        performedDate: item.performedDate || '',
        observations: item.observations || '',
        nextMaintenanceDate: item.nextMaintenanceDate || '',
      } : { assetId: '', type: 'preventive', scheduledDate: '', performedDate: '', observations: '', nextMaintenanceDate: '' });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    await onSave({ ...form, assetId: parseInt(form.assetId) });
    setIsSubmitting(false);
    setForm({ assetId: '', type: 'preventive', scheduledDate: '', performedDate: '', observations: '', nextMaintenanceDate: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">ID del Activo</label><input type="number" value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Tipo</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input"><option value="preventive">Preventivo</option><option value="corrective">Correctivo</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Programada</label><input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Realizada</label><input type="date" value={form.performedDate} onChange={e => setForm({ ...form, performedDate: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">Próximo Mantenimiento</label><input type="date" value={form.nextMaintenanceDate} onChange={e => setForm({ ...form, nextMaintenanceDate: e.target.value })} className="input" /></div>
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
