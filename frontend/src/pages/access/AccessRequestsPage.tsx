import { useMemo, useState } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { AccessRequest } from '../../types';
import api from '../../services/api';
import { Check, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

const statusBadge: Record<AccessRequest['status'], string> = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
};

const statusLabelKeys = {
  pending: 'accessPending',
  approved: 'accessApproved',
  rejected: 'accessRejected',
} as const;

export function AccessRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<AccessRequest | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, locale } = useLanguage();

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    return f;
  }, [statusFilter]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<AccessRequest>({
    endpoint: '/access-requests',
    limit: 10,
    filters,
  });

  const columns: Column<AccessRequest>[] = [
    { header: t('name'), accessor: 'name' },
    { header: t('emailOrCpf'), accessor: 'email' },
    { header: t('requestedArea'), accessor: 'area' },
    {
      header: t('requestedAt'),
      accessor: (r) => new Date(r.createdAt).toLocaleDateString(locale),
    },
    {
      header: t('date'),
      accessor: (r) => <span className={statusBadge[r.status]}>{t(statusLabelKeys[r.status])}</span>,
    },
  ];

  const openDetail = (request: AccessRequest) => {
    setSelected(request);
  };

  const handleApprove = async (password: string) => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/access-requests/${selected.id}/approve`, { password });
      toast.success(t('requestApproved'));
      setIsApproveModalOpen(false);
      setSelected(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (request: AccessRequest) => {
    if (!confirm(`${t('rejectAccessConfirm')}`)) return;
    try {
      await api.patch(`/access-requests/${request.id}/reject`);
      toast.success(t('requestRejected'));
      setSelected(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('genericError'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('accessRequests')}</h1>
        <button onClick={refetch} className="btn-secondary p-2">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-48">
          <option value="">{t('accessAllStatuses')}</option>
          <option value="pending">{t('accessPending')}</option>
          <option value="approved">{t('accessApproved')}</option>
          <option value="rejected">{t('accessRejected')}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onRowClick={openDetail}
        emptyMessage={t('noAccessRequests')}
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={Boolean(selected) && !isApproveModalOpen} onClose={() => setSelected(null)} title={t('accessDetail')}>
        {selected && (
          <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('applicant')}</dt>
                <dd className="mt-1 text-sm font-medium">{selected.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('emailOrCpf')}</dt>
                <dd className="mt-1 text-sm">{selected.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('requestedArea')}</dt>
                <dd className="mt-1 text-sm">{selected.area}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('phone')}</dt>
                <dd className="mt-1 text-sm">{selected.phone || '—'}</dd>
              </div>
            </dl>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('requestMessage')}</dt>
              <dd className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                {selected.message || '—'}
              </dd>
            </div>
            {selected.status === 'pending' && (
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => handleReject(selected)} className="btn-danger gap-2">
                  <X className="h-4 w-4" /> {t('reject')}
                </button>
                <button type="button" onClick={() => setIsApproveModalOpen(true)} className="btn-primary gap-2">
                  <Check className="h-4 w-4" /> {t('approve')}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ApproveModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApprove}
        isSubmitting={isSubmitting}
        applicantName={selected?.name || ''}
      />
    </div>
  );
}

function ApproveModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  applicantName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isSubmitting: boolean;
  applicantName: string;
}) {
  const [password, setPassword] = useState('');
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('approveAccessTitle')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (password) onConfirm(password);
        }}
        className="space-y-4"
      >
        <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-primary-800">
          {t('approveAccessIntro')}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('applicant')}</label>
          <input type="text" value={applicantName} readOnly className="input bg-slate-50 dark:bg-slate-800" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('initialPassword')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            minLength={6}
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('cancel')}
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary gap-2">
            <Check className="h-4 w-4" />
            {isSubmitting ? t('saving') : t('approve')}
          </button>
        </div>
      </form>
    </Modal>
  );
}