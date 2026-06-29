import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { QuickReportButton, QuickReportColumn } from '../../components/ui/QuickReportButton';
import { User } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { AreaSelect } from '../../components/ui/AreaSelect';
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from '../../constants/institutionalAreas';

const roleLabelKeys = { admin: 'admin', technician: 'technician', user: 'user' } as const;
const roleBadge: Record<string, string> = { admin: 'badge-red', technician: 'badge-blue', user: 'badge-green' };

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const { t, locale } = useLanguage();
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (roleFilter) f.role = roleFilter; if (areaFilter) f.area = areaFilter;
    return f;
  }, [search, roleFilter, areaFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<User>({ endpoint: '/users', filters });

  const columns: Column<User>[] = [
    { header: t('name'), accessor: 'name' },
    { header: t('emailOrCpf'), accessor: 'email' },
    { header: t('role'), accessor: (u) => <span className={roleBadge[u.role]}>{t(roleLabelKeys[u.role])}</span> },
    { header: t('location'), accessor: 'area' },
    { header: t('enabled'), accessor: (u) => u.isActive ? <span className="badge-green">{t('yes')}</span> : <span className="badge-gray">{t('no')}</span> },
    { header: t('created'), accessor: (u) => new Date(u.createdAt).toLocaleDateString(locale) },
  ];

  const reportColumns: QuickReportColumn<User>[] = [
    { header: t('name'), value: (u) => u.name },
    { header: t('emailOrCpf'), value: (u) => u.email },
    { header: t('role'), value: (u) => t(roleLabelKeys[u.role]) },
    { header: t('location'), value: (u) => u.area },
    { header: t('enabled'), value: (u) => (u.isActive ? t('yes') : t('no')) },
    { header: t('created'), value: (u) => new Date(u.createdAt).toLocaleDateString(locale) },
  ];

  const handleEdit = (item: User) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/users/${selected.id}`, formData); toast.success(t('userUpdated')); }
      else { await api.post('/users', formData); toast.success(t('userCreated')); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || t('genericError')); }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`${t('deleteUserConfirm')} ${user.name}?`)) return;
    try { await api.delete(`/users/${user.id}`); toast.success(t('userDeleted')); refetch(); }
    catch (err: any) { toast.error(err.response?.data?.message || t('genericError')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('users')}</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> {t('newUser')}</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder={t('searchUsers')} /></div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-40">
          <option value="">{t('all')}</option><option value="admin">{t('admin')}</option><option value="technician">{t('technician')}</option><option value="user">{t('user')}</option>
        </select>
        <AreaSelect value={areaFilter} onChange={setAreaFilter} includeEmpty className="input w-48" />
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
        <QuickReportButton
          title={t('users')}
          rows={data}
          columns={reportColumns}
          disabled={isLoading}
        />
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage={t('noUsersFound')} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <UserFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={selected} onSave={handleSave} onDelete={selected ? () => handleDelete(selected) : undefined} />
    </div>
  );
}

function UserFormModal({ isOpen, onClose, user, onSave, onDelete }: { isOpen: boolean; onClose: () => void; user: User | null; onSave: (data: any) => void; onDelete?: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', area: DEFAULT_INSTITUTIONAL_AREA as InstitutionalArea });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLanguage();
  useEffect(() => {
    if (isOpen) {
      setForm(user ? {
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        area: user.area || DEFAULT_INSTITUTIONAL_AREA,
      } : { name: '', email: '', password: '', role: 'user', area: DEFAULT_INSTITUTIONAL_AREA });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const data: any = { name: form.name, email: form.email, role: form.role, area: form.area };
    if (form.password) data.password = form.password;
    await onSave(data); setIsSubmitting(false);
    setForm({ name: '', email: '', password: '', role: 'user', area: DEFAULT_INSTITUTIONAL_AREA });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? t('editUser') : t('newUser')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">{t('name')}</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" required /></div>
        <div><label className="block text-sm font-medium mb-1">{t('emailOrCpf')}</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" required /></div>
        <div><label className="block text-sm font-medium mb-1">{t('password')} {user && t('keepPassword')}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" minLength={user ? 0 : 6} required={!user} /></div>
        <div><label className="block text-sm font-medium mb-1">{t('role')}</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input"><option value="user">{t('user')}</option><option value="technician">{t('technician')}</option><option value="admin">{t('admin')}</option></select></div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('location')}</label>
          <AreaSelect value={form.area} onChange={(area) => setForm({ ...form, area: area as InstitutionalArea })} required />
        </div>
        <div className="flex justify-between pt-4">
          <div>{user && onDelete && <button type="button" onClick={onDelete} className="btn-danger">{t('delete')}</button>}</div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? t('saving') : user ? t('update') : t('create')}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
