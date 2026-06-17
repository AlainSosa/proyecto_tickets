import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { Consumable } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const typeLabels: Record<string, string> = { toner: 'Toner', keyboard: 'Teclado', mouse: 'Mouse', cable: 'Cable', adapter: 'Adaptador', supplies: 'Insumos', other: 'Otro' };
const statusLabels: Record<string, string> = { available: 'Disponible', low: 'Stock Bajo', out_of_stock: 'Sin Stock' };
const statusBadge: Record<string, string> = { available: 'badge-green', low: 'badge-yellow', out_of_stock: 'badge-red' };

export function ConsumablesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Consumable | null>(null);
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (typeFilter) f.type = typeFilter; if (statusFilter) f.status = statusFilter;
    return f;
  }, [search, typeFilter, statusFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Consumable>({ endpoint: '/consumables', filters });

  const columns: Column<Consumable>[] = [
    { header: 'Nombre', accessor: 'name' },
    { header: 'Tipo', accessor: (c) => typeLabels[c.type] },
    { header: 'Stock', accessor: (c) => <span className="font-semibold">{c.stock}</span> },
    { header: 'Stock Mín.', accessor: 'minStock' },
    { header: 'Estado', accessor: (c) => <span className={statusBadge[c.status]}>{statusLabels[c.status]}</span> },
    { header: 'Ingreso', accessor: (c) => c.entryDate ? new Date(c.entryDate).toLocaleDateString() : '-' },
  ];

  const handleEdit = (item: Consumable) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/consumables/${selected.id}`, formData); toast.success('Consumible actualizado'); }
      else { await api.post('/consumables', formData); toast.success('Consumible creado'); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventario de Consumibles</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Nuevo Consumible</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Buscar consumibles..." /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-36">
          <option value="">Todos</option>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36">
          <option value="">Todos</option><option value="available">Disponible</option><option value="low">Stock Bajo</option><option value="out_of_stock">Sin Stock</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage="No se encontraron consumibles" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <ConsumableFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selected} onSave={handleSave} />
    </div>
  );
}

function ConsumableFormModal({ isOpen, onClose, item, onSave }: { isOpen: boolean; onClose: () => void; item: Consumable | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ name: '', type: 'supplies', stock: '0', minStock: '1', entryDate: '', observations: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setForm(item ? {
        name: item.name,
        type: item.type,
        stock: String(item.stock),
        minStock: String(item.minStock),
        entryDate: item.entryDate || '',
        observations: item.observations || '',
      } : { name: '', type: 'supplies', stock: '0', minStock: '1', entryDate: '', observations: '' });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    await onSave({ ...form, stock: parseInt(form.stock), minStock: parseInt(form.minStock) });
    setIsSubmitting(false); setForm({ name: '', type: 'supplies', stock: '0', minStock: '1', entryDate: '', observations: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Editar Consumible' : 'Nuevo Consumible'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">Tipo</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Stock</label><input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">Stock Mínimo</label><input type="number" min="0" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">Fecha Ingreso</label><input type="date" value={form.entryDate} onChange={e => setForm({ ...form, entryDate: e.target.value })} className="input" /></div>
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
