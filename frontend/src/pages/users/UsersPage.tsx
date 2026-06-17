import { useState, useMemo, useEffect } from 'react';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { User } from '../../types';
import api from '../../services/api';
import { Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const roleLabels: Record<string, string> = { admin: 'Administrador', technician: 'Técnico', user: 'Usuario' };
const roleBadge: Record<string, string> = { admin: 'badge-red', technician: 'badge-blue', user: 'badge-green' };

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (search) f.search = search; if (roleFilter) f.role = roleFilter;
    return f;
  }, [search, roleFilter]);
  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<User>({ endpoint: '/users', filters });

  const columns: Column<User>[] = [
    { header: 'Nombre', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Rol', accessor: (u) => <span className={roleBadge[u.role]}>{roleLabels[u.role]}</span> },
    { header: 'Activo', accessor: (u) => u.isActive ? <span className="badge-green">Sí</span> : <span className="badge-gray">No</span> },
    { header: 'Creado', accessor: (u) => new Date(u.createdAt).toLocaleDateString() },
  ];

  const handleEdit = (item: User) => { setSelected(item); setIsModalOpen(true); };
  const handleCreate = () => { setSelected(null); setIsModalOpen(true); };
  const handleSave = async (formData: any) => {
    try {
      if (selected) { await api.patch(`/users/${selected.id}`, formData); toast.success('Usuario actualizado'); }
      else { await api.post('/users', formData); toast.success('Usuario creado'); }
      setIsModalOpen(false); refetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar usuario ${user.name}?`)) return;
    try { await api.delete(`/users/${user.id}`); toast.success('Usuario eliminado'); refetch(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button onClick={handleCreate} className="btn-primary gap-2"><Plus className="h-4 w-4" /> Nuevo Usuario</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Buscar usuarios..." /></div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-40">
          <option value="">Todos</option><option value="admin">Administrador</option><option value="technician">Técnico</option><option value="user">Usuario</option>
        </select>
        <button onClick={refetch} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={handleEdit} emptyMessage="No se encontraron usuarios" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <UserFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={selected} onSave={handleSave} onDelete={selected ? () => handleDelete(selected) : undefined} />
    </div>
  );
}

function UserFormModal({ isOpen, onClose, user, onSave, onDelete }: { isOpen: boolean; onClose: () => void; user: User | null; onSave: (data: any) => void; onDelete?: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setForm(user ? {
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
      } : { name: '', email: '', password: '', role: 'user' });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const data: any = { name: form.name, email: form.email, role: form.role };
    if (form.password) data.password = form.password;
    await onSave(data); setIsSubmitting(false);
    setForm({ name: '', email: '', password: '', role: 'user' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Editar Usuario' : 'Nuevo Usuario'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" required /></div>
        <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input" required /></div>
        <div><label className="block text-sm font-medium mb-1">Contraseña {user && '(dejar vacío para mantener)'}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" minLength={user ? 0 : 6} required={!user} /></div>
        <div><label className="block text-sm font-medium mb-1">Rol</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input"><option value="user">Usuario</option><option value="technician">Técnico</option><option value="admin">Administrador</option></select></div>
        <div className="flex justify-between pt-4">
          <div>{user && onDelete && <button type="button" onClick={onDelete} className="btn-danger">Eliminar</button>}</div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
