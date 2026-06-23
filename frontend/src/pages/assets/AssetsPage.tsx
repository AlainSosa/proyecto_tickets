import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { Asset } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { AreaSelect } from '../../components/ui/AreaSelect';
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from '../../constants/institutionalAreas';

const typeLabelKeys = { computer: 'computer', laptop: 'laptop', printer: 'printer', ups: 'ups', switch: 'switch', router: 'router', ip_phone: 'ipPhone', monitor: 'monitor', other: 'other' } as const;
const statusLabelKeys = { active: 'active', inactive: 'inactive', maintenance: 'maintenanceStatus', disposed: 'disposed' } as const;

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
  const [locationFilter, setLocationFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { t, locale } = useLanguage();

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search;
    if (typeFilter) f.type = typeFilter;
    if (statusFilter) f.status = statusFilter;
    if (locationFilter) f.location = locationFilter;
    return f;
  }, [search, typeFilter, statusFilter, locationFilter]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Asset>({
    endpoint: '/assets',
    filters,
  });

  const columns: Column<Asset>[] = [
    { header: t('code'), accessor: 'internalCode' },
    { header: t('type'), accessor: (a) => t(typeLabelKeys[a.type]) },
    { header: t('brand'), accessor: 'brand' },
    { header: t('model'), accessor: 'model' },
    { header: t('serial'), accessor: 'serialNumber' },
    {
      header: t('status'),
      accessor: (a) => <span className={statusBadge[a.status]}>{t(statusLabelKeys[a.status])}</span>,
    },
    {
      header: t('assignedTo'),
      accessor: (a) => a.assignedUser?.name || '-',
    },
  ];

  const reportColumns: QuickReportColumn<Asset>[] = [
    { header: t('code'), value: (a) => a.internalCode },
    { header: t('type'), value: (a) => t(typeLabelKeys[a.type]) },
    { header: t('brand'), value: (a) => a.brand },
    { header: t('model'), value: (a) => a.model },
    { header: t('serial'), value: (a) => a.serialNumber },
    { header: t('status'), value: (a) => t(statusLabelKeys[a.status]) },
    { header: t('assignedTo'), value: (a) => a.assignedUser?.name || '-' },
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
        toast.success(t('assetUpdated'));
      } else {
        await api.post('/assets', formData);
        toast.success(t('assetCreated'));
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('genericError'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('computerAssets')}</h1>
        <button onClick={handleCreate} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          {t('newAsset')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchAssets')} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-44">
          <option value="">{t('allTypes')}</option>
          {Object.entries(typeLabelKeys).map(([k, key]) => (
            <option key={k} value={k}>{t(key)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-44">
          <option value="">{t('allStatuses')}</option>
          {Object.entries(statusLabelKeys).map(([k, key]) => (
            <option key={k} value={k}>{t(key)}</option>
          ))}
        </select>
        <AreaSelect value={locationFilter} onChange={setLocationFilter} includeEmpty className="input w-48" />
        <button onClick={refetch} className="btn-secondary p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
        <QuickReportButton
          title={t('computerAssets')}
          rows={data}
          columns={reportColumns}
          disabled={isLoading}
        />
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage={t('noAssetsFound')} />
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
    location: DEFAULT_INSTITUTIONAL_AREA as InstitutionalArea,
    acquisitionDate: '',
    observations: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();

  const resetForm = () => {
    setForm({
      internalCode: asset?.internalCode || '',
      type: asset?.type || 'computer',
      brand: asset?.brand || '',
      model: asset?.model || '',
      serialNumber: asset?.serialNumber || '',
      status: asset?.status || 'active',
        location: asset?.location || DEFAULT_INSTITUTIONAL_AREA,
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
    setForm({ internalCode: '', type: 'computer', brand: '', model: '', serialNumber: '', status: 'active', location: DEFAULT_INSTITUTIONAL_AREA, acquisitionDate: '', observations: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={asset ? t('editAsset') : t('newAsset')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('internalCode')}</label>
            <input type="text" value={form.internalCode} onChange={(e) => setForm({ ...form, internalCode: e.target.value })} className="input" data-no-auto-capitalize="true" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('type')}</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
              {Object.entries(typeLabelKeys).map(([k, key]) => (
                <option key={k} value={k}>{t(key)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('brand')}</label>
            <input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('model')}</label>
            <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('serial')}</label>
            <input type="text" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="input" data-no-auto-capitalize="true" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('status')}</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
              {Object.entries(statusLabelKeys).map(([k, key]) => (
                <option key={k} value={k}>{t(key)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('location')}</label>
            <AreaSelect value={form.location} onChange={(location) => setForm({ ...form, location: location as InstitutionalArea })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('acquisitionDate')}</label>
            <input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('observations')}</label>
          <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} className="input min-h-[80px]" />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? t('saving') : asset ? t('update') : t('create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
