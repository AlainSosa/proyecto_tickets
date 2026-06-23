import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { Extension } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { AreaSelect } from '../../components/ui/AreaSelect';
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from '../../constants/institutionalAreas';

const statusLabelKeys = { active: 'active', inactive: 'inactive' } as const;
const statusBadge: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray' };

export function TelephonyPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Extension | null>(null);
  const { t } = useLanguage();
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (statusFilter) f.status = statusFilter; if (locationFilter) f.location = locationFilter;
    return f;
  }, [search, statusFilter, locationFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<Extension>({ endpoint: '/extensions', filters });

  const columns: Column<Extension>[] = [
    { header: t('extension'), accessor: 'extensionNumber' },
    { header: t('ipAddress'), accessor: 'ipAddress' },
    { header: t('user'), accessor: (e) => e.assignedUser?.name || '-' },
    { header: t('location'), accessor: 'location' },
    { header: t('status'), accessor: (e) => <span className={statusBadge[e.status]}>{t(statusLabelKeys[e.status])}</span> },
  ];

  const reportColumns: QuickReportColumn<Extension>[] = [
    { header: t('extension'), value: (e) => e.extensionNumber },
    { header: t('ipAddress'), value: (e) => e.ipAddress || '-' },
    { header: t('user'), value: (e) => e.assignedUser?.name || '-' },
    { header: t('location'), value: (e) => e.location || '-' },
    { header: t('status'), value: (e) => t(statusLabelKeys[e.status]) },
  ];

  const handleEdit = (item: Extension) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/extensions/${selected.id}`, formData); toast.success(t('extensionUpdated')); }
      else { await api.post('/extensions', formData); toast.success(t('extensionCreated')); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || t('genericError')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('telephony')}</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> {t('newExtension')}</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder={t('searchExtensions')} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">{t('all')}</option><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option>
        </select>
        <AreaSelect value={locationFilter} onChange={setLocationFilter} includeEmpty className="input w-48" />
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
        <QuickReportButton
          title={t('telephony')}
          rows={data}
          columns={reportColumns}
          disabled={isLoading}
        />
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage={t('noExtensionsFound')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <TelephonyFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} item={selected} onSave={handleSave} />
    </div>
  );
}

function TelephonyFormModal({ isOpen, onClose, item, onSave }: { isOpen: boolean; onClose: () => void; item: Extension | null; onSave: (data: any) => void }) {
  const [form, setForm] = useState({ extensionNumber: '', ipAddress: '', location: DEFAULT_INSTITUTIONAL_AREA as InstitutionalArea, status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();
  useEffect(() => {
    if (isOpen) {
      setForm(item ? {
        extensionNumber: item.extensionNumber,
        ipAddress: item.ipAddress || '',
        location: item.location || DEFAULT_INSTITUTIONAL_AREA,
        status: item.status,
      } : { extensionNumber: '', ipAddress: '', location: DEFAULT_INSTITUTIONAL_AREA, status: 'active' });
    }
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    await onSave(form); setIsSubmitting(false);
    setForm({ extensionNumber: '', ipAddress: '', location: DEFAULT_INSTITUTIONAL_AREA, status: 'active' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? t('editExtension') : t('newExtension')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">{t('extensionNumber')}</label><input type="text" value={form.extensionNumber} onChange={e => setForm({ ...form, extensionNumber: e.target.value })} className="input" data-no-auto-capitalize="true" required /></div>
          <div><label className="block text-sm font-medium mb-1">{t('status')}</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input"><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></select></div>
          <div><label className="block text-sm font-medium mb-1">{t('ipAddress')}</label><input type="text" value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} className="input" data-no-auto-capitalize="true" /></div>
          <div><label className="block text-sm font-medium mb-1">{t('location')}</label><AreaSelect value={form.location} onChange={location => setForm({ ...form, location: location as InstitutionalArea })} required /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? t('saving') : item ? t('update') : t('create')}</button>
        </div>
      </form>
    </Modal>
  );
}
