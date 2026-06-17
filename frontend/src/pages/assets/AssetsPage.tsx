import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { Asset } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const typeLabels: Record<string, string> = {
  computer: 'Computadora',
  laptop: 'Laptop',
  printer: 'Impresora',
  ups: 'UPS',
  switch: 'Switch',
  router: 'Router',
  ip_phone: 'Teléfono IP',
  monitor: 'Monitor',
  other: 'Otro',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  maintenance: 'En Mantenimiento',
  disposed: 'Dado de Baja',
};

const statusBadge: Record<string, string> = {
  active: 'badge-green',
  inactive: 'badge-gray',
  maintenance: 'badge-yellow',
  disposed: 'badge-red',
};

export function AssetsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search;
    if (typeFilter) f.type = typeFilter;
    if (statusFilter) f.status = statusFilter;
    return f;
  }, [search, typeFilter, statusFilter]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Asset>({
    endpoint: '/assets',
    filters,
  });

  const columns: Column<Asset>[] = [
    { header: 'Código', accessor: 'internalCode' },
    { header: 'Tipo', accessor: (a) => typeLabels[a.type] },
    { header: 'Marca', accessor: 'brand' },
    { header: 'Modelo', accessor: 'model' },
    { header: 'Serie', accessor: 'serialNumber' },
    {
      header: 'Estado',
      accessor: (a) => <span className={statusBadge[a.status]}>{statusLabels[a.status]}</span>,
    },
    {
      header: 'Asignado a',
      accessor: (a) => a.assignedUser?.name || '-',
    },
  ];

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: any) => {
    try {
      if (selectedAsset) {
        await api.patch(`/assets/${selectedAsset.id}`, formData);
        toast.success('Activo actualizado');
      } else {
        await api.post('/assets', formData);
        toast.success('Activo creado');
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving asset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activos Informáticos</h1>
        <button onClick={handleCreate} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Activo
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar activos..." />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-44">
          <option value="">Todos los tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={refetch} className="btn-secondary p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage="No se encontraron activos" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <AssetFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} asset={selectedAsset} onSave={handleSave} />
    </div>
  );
}

function AssetFormModal({
  isOpen,
  onClose,
  asset,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    internalCode: '',
    type: 'computer',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'active',
    location: '',
    acquisitionDate: '',
    observations: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setForm({
      internalCode: asset?.internalCode || '',
      type: asset?.type || 'computer',
      brand: asset?.brand || '',
      model: asset?.model || '',
      serialNumber: asset?.serialNumber || '',
      status: asset?.status || 'active',
      location: asset?.location || '',
      acquisitionDate: asset?.acquisitionDate || '',
      observations: asset?.observations || '',
    });
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(form);
    setIsSubmitting(false);
    setForm({ internalCode: '', type: 'computer', brand: '', model: '', serialNumber: '', status: 'active', location: '', acquisitionDate: '', observations: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={asset ? 'Editar Activo' : 'Nuevo Activo'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Código Interno</label>
            <input type="text" value={form.internalCode} onChange={(e) => setForm({ ...form, internalCode: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Marca</label>
            <input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Modelo</label>
            <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">N° Serie</label>
            <input type="text" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ubicación</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha Adquisición</label>
            <input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observaciones</label>
          <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="input min-h-[80px]" />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Guardando...' : asset ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
