import { useMemo, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { useLanguage } from '../../context/LanguageContext';

function compactJson(value: Record<string, unknown> | null) {
  if (!value) return '-';
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(' | ');
}

export function AuditPage() {
  const { locale } = useLanguage();
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (search) next.search = search;
    if (entity) next.entity = entity;
    return next;
  }, [search, entity]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<AuditLog>({
    endpoint: '/audit',
    filters,
    limit: 20,
  });

  const columns: Column<AuditLog>[] = [
    { header: 'Fecha', accessor: (row) => new Date(row.createdAt).toLocaleString(locale) },
    { header: 'Usuario', accessor: (row) => row.user?.name || '-' },
    { header: 'Acción', accessor: 'action' },
    { header: 'Entidad', accessor: (row) => `${row.entity}${row.entityId ? ` #${row.entityId}` : ''}` },
    { header: 'IP', accessor: (row) => row.ipAddress || '-' },
    { header: 'Datos anteriores', accessor: (row) => compactJson(row.oldData) },
    { header: 'Datos nuevos', accessor: (row) => compactJson(row.newData) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary-900 dark:text-white">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            Auditoría
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registro inalterable de acciones, usuarios, IP y datos modificados.
          </p>
        </div>
        <button onClick={refetch} className="btn-secondary gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar acción, entidad o IP..." />
        </div>
        <select value={entity} onChange={(event) => setEntity(event.target.value)} className="input w-44">
          <option value="">Todas las entidades</option>
          <option value="ticket">Tickets</option>
        </select>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="No hay registros de auditoría" />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
