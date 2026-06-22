import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { Maintenance } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const typeLabelKeys = { preventive: 'preventive', corrective: 'corrective' } as const;
const typeBadge: Record<string, string> = { preventive: 'badge-blue', corrective: 'badge-yellow' };

export function MaintenancePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Maintenance | null>(null);
  const { t, locale } = useLanguage();
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (typeFilter) f.type = typeFilter;
    return f;
  }, [search, typeFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Maintenance>({ endpoint: '/maintenance', filters });

  const columns: Column<Maintenance>[] = [
    { header: t('equipment'), accessor: (m) => m.asset ? `${m.asset.internalCode} - ${m.asset.brand}` : '-' },
    { header: t('type'), accessor: (m) => <span className={typeBadge[m.type]}>{t(typeLabelKeys[m.type])}</span> },
    { header: t('scheduled'), accessor: (m) => m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString(locale) : '-' },
    { header: t('performed'), accessor: (m) => m.performedDate ? new Date(m.performedDate).toLocaleDateString(locale) : t('pending') },
    { header: t('technician'), accessor: (m) => m.technician?.name || '-' },
    { header: t('nextMaintenance'), accessor: (m) => m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate).toLocaleDateString(locale) : '-' },
  ];

  const reportColumns: QuickReportColumn<Maintenance>[] = [
    { header: t('equipment'), value: (m) => (m.asset ? `${m.asset.internalCode} - ${m.asset.brand}` : '-') },
    { header: t('type'), value: (m) => t(typeLabelKeys[m.type]) },
    { header: t('scheduled'), value: (m) => (m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString(locale) : '-') },
    { header: t('performed'), value: (m) => (m.performedDate ? new Date(m.performedDate).toLocaleDateString(locale) : t('pending')) },
    { header: t('technician'), value: (m) => m.technician?.name || '-' },
    { header: t('nextMaintenance'), value: (m) => (m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate).toLocaleDateString(locale) : '-') },
  ];

  const handleEdit = (item: Maintenance) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/maintenance/${selected.id}`, formData); toast.success(t('maintenanceUpdated')); }
      else { await api.post('/maintenance', formData); toast.success(t('maintenanceCreated')); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || t('genericError')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('maintenanceTitle')}</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> {t('newMaintenance')}</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder={t('search')} /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-40">
          <option value="">{t('all')}</option><option value="preventive">{t('preventive')}</option><option value="corrective">{t('corrective')}</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
        <QuickReportButton
          title={t('maintenanceTitle')}
          rows={data}
          columns={reportColumns}
          disabled={isLoading}
        />
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage={t('noMaintenanceFound')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <MaintenanceFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selected} onSave={handleSave} />
    </div>
  );
}

function MaintenanceFormModal({ isOpen, onClose, item, onSave }: { isOpen: boolean; onClose: () => void; item: Maintenance | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ assetId: '', type: 'preventive', scheduledDate: '', performedDate: '', observations: '', nextMaintenanceDate: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();
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
    <Modal isOpen={isOpen} onClose={onClose} title={item ? t('editMaintenance') : t('newMaintenance')} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('assetId')}</label><input type="number" value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })} className="input" required /></div>
          <div><label className="block text-sm font-medium mb-1">{t('type')}</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input"><option value="preventive">{t('preventive')}</option><option value="corrective">{t('corrective')}</option></select></div>
          <div><label className="block text-sm font-medium mb-1">{t('scheduledDate')}</label><input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('performedDate')}</label><input type="date" value={form.performedDate} onChange={e => setForm({ ...form, performedDate: e.target.value })} className="input" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('nextMaintenanceDate')}</label><input type="date" value={form.nextMaintenanceDate} onChange={e => setForm({ ...form, nextMaintenanceDate: e.target.value })} className="input" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">{t('observations')}</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} className="input min-h-[80px]" /></div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? t('saving') : item ? t('update') : t('create')}</button>
        </div>
      </form>
    </Modal>
  );
}
